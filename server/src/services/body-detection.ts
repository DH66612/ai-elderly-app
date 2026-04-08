/**
 * 百度人体检测服务
 * 使用人体检测与属性识别API进行跌倒检测
 * 改进版：结合位置、面积、姿态综合判断
 */
import crypto from 'crypto';

const BAIDU_API_HOST = 'https://aip.baidubce.com';
const HUMAN_DETECTION_PATH = '/rest/2.0/image-classify/v1/body_attr';

// 检测阈值配置
const FALL_RATIO_THRESHOLD = 1.2;      // 宽高比阈值
const FALL_CONFIDENCE_THRESHOLD = 0.6; // 置信度阈值
const POSITION_WEIGHT = 0.3;           // 位置权重
const AREA_WEIGHT = 0.2;               // 面积权重
const RATIO_WEIGHT = 0.5;              // 宽高比权重

/**
 * 获取百度Access Token
 */
export async function getAccessToken(): Promise<string> {
  const API_KEY = process.env.BAIDU_API_KEY || process.env.BAIDU_OCR_API_KEY || '';
  const SECRET_KEY = process.env.BAIDU_SECRET_KEY || process.env.BAIDU_OCR_SECRET_KEY || '';
  
  if (!API_KEY || !SECRET_KEY) {
    throw new Error('百度API密钥未配置');
  }

  const tokenUrl = `${BAIDU_API_HOST}/oauth/2.0/token?grant_type=client_credentials&client_id=${API_KEY}&client_secret=${SECRET_KEY}`;
  
  const response = await fetch(tokenUrl, { method: 'POST' });
  const data = await response.json();
  
  if (data.access_token) {
    return data.access_token;
  }
  
  throw new Error(`获取Access Token失败: ${JSON.stringify(data)}`);
}

/**
 * 人体检测分析结果
 */
export interface BodyDetectionResult {
  found: boolean;
  isAbnormal: boolean;
  confidence: number;
  analysis: string;
  pose: 'standing' | 'sitting' | 'crouching' | 'lying' | 'unknown';
  bodies: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    ratio: number;
    confidence: number;
    area: number;
    bottomY: number;  // 人体底部Y坐标
    centerY: number;  // 人体中心Y坐标
  }>;
  imageWidth: number;
  imageHeight: number;
}

/**
 * 姿态分析结果
 */
interface PoseAnalysis {
  pose: 'standing' | 'sitting' | 'crouching' | 'lying' | 'unknown';
  isAbnormal: boolean;
  confidence: number;
  reason: string;
}

/**
 * 使用百度人体检测API分析图片
 */
export async function analyzeBodyDetection(
  imageBase64: string,
  accessToken: string
): Promise<BodyDetectionResult> {
  const url = `${BAIDU_API_HOST}${HUMAN_DETECTION_PATH}?access_token=${accessToken}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      image: imageBase64,
      attr_filter: 'gender,age,upper_color,lower_color',
    }).toString(),
  });

  const data = await response.json();
  
  if (data.error_code) {
    throw new Error(`百度API错误: ${data.error_msg || data.error_code}`);
  }

  return parseBodyDetectionResult(data);
}

/**
 * 解析百度人体检测结果
 */
function parseBodyDetectionResult(data: any): BodyDetectionResult {
  const result: BodyDetectionResult = {
    found: false,
    isAbnormal: false,
    confidence: 0,
    analysis: '',
    pose: 'unknown',
    bodies: [],
    imageWidth: 0,
    imageHeight: 0,
  };

  const person_num = data.person_num || 0;
  
  if (person_num === 0) {
    result.analysis = '画面中未检测到人体';
    return result;
  }

  result.found = true;

  const person_info = data.person_info || [];
  
  if (person_info.length === 0) {
    result.analysis = '人体信息获取失败';
    return result;
  }

  // 获取图像尺寸（如果有）
  result.imageWidth = data.width || 640;
  result.imageHeight = data.height || 480;

  let hasFallDetected = false;
  let fallConfidence = 0;
  let fallReason = '';

  for (const person of person_info) {
    const location = person.location || {};
    const { left, top, width, height, score } = location;
    
    if (!width || !height) continue;

    const ratio = width / height;
    const area = width * height;
    const bottomY = top + height;        // 人体底部Y坐标
    const centerY = top + height / 2;    // 人体中心Y坐标
    
    const bodyResult = {
      x: left || 0,
      y: top || 0,
      width,
      height,
      ratio,
      confidence: score || 0.5,
      area,
      bottomY,
      centerY,
    };
    
    result.bodies.push(bodyResult);

    console.log(`[BodyDetection] 人体: 位置(${left},${top}) 大小${width}x${height} 比例${ratio.toFixed(2)} 底部Y${bottomY}`);

    // 综合姿态分析
    const poseAnalysis = analyzePose(bodyResult, result.imageWidth, result.imageHeight);
    
    console.log(`[BodyDetection] 姿态判定: ${poseAnalysis.pose} (置信度${(poseAnalysis.confidence * 100).toFixed(0)}%)`);

    // 只有躺着/倒地才触发异常
    if (poseAnalysis.isAbnormal) {
      hasFallDetected = true;
      if (poseAnalysis.confidence > fallConfidence) {
        fallConfidence = poseAnalysis.confidence;
        fallReason = poseAnalysis.reason;
      }
    }
  }

  // 生成最终结果
  if (hasFallDetected) {
    result.isAbnormal = true;
    result.confidence = fallConfidence;
    result.analysis = fallReason || '检测到疑似跌倒姿态';
    result.pose = 'lying';
  } else {
    result.isAbnormal = false;
    result.confidence = 0.2;
    
    if (person_info.length > 0) {
      const avgRatio = result.bodies.reduce((sum, b) => sum + b.ratio, 0) / result.bodies.length;
      result.analysis = `检测到${person_num}个人体，姿态正常(站立/坐立/蹲下)`;
      result.pose = 'standing';
    } else {
      result.analysis = '未检测到明显异常';
    }
  }

  return result;
}

/**
 * 分析人体姿态
 * 结合宽高比、位置、面积综合判断
 */
function analyzePose(
  body: { x: number; y: number; width: number; height: number; ratio: number; confidence: number; area: number; bottomY: number; centerY: number },
  imageWidth: number,
  imageHeight: number
): PoseAnalysis {
  
  // 1. 位置分析：计算人体在画面中的相对位置
  // 跌倒时人体通常贴近地面（画面底部）
  const bottomRatio = body.bottomY / imageHeight;           // 底部占比（1 = 在画面最底部）
  const centerRatio = body.centerY / imageHeight;           // 中心占比（0.5 = 画面中间）
  
  // 2. 面积分析：倒地时人体框面积通常较大
  const maxPossibleArea = imageWidth * imageHeight;
  const areaRatio = body.area / maxPossibleArea;           // 面积占比
  
  // 3. 宽高比分析
  const isHorizontal = body.ratio > FALL_RATIO_THRESHOLD;
  const isVeryHorizontal = body.ratio > 1.8;               // 极端横向（几乎完全躺下）

  console.log(`[PoseAnalysis] 位置: 底部占比${(bottomRatio * 100).toFixed(0)}% 中心占比${(centerRatio * 100).toFixed(0)}% 面积占比${(areaRatio * 100).toFixed(1)}%`);

  // ========== 姿态判断逻辑 ==========
  
  // 站立：宽高比 < 0.8，人体框在画面中上部
  if (body.ratio < 0.8 && centerRatio < 0.6) {
    return {
      pose: 'standing',
      isAbnormal: false,
      confidence: 0.9,
      reason: '检测到站立姿态'
    };
  }
  
  // 坐着：宽高比 0.8-1.3，人体中心在画面中下部，底部不在最底部
  if (body.ratio >= 0.8 && body.ratio <= 1.3 && centerRatio >= 0.4 && centerRatio <= 0.75 && bottomRatio < 0.95) {
    return {
      pose: 'sitting',
      isAbnormal: false,
      confidence: 0.85,
      reason: '检测到坐姿'
    };
  }
  
  // 蹲下：宽高比 > 1.0，人体框较小（面积占比 < 15%），中心偏下
  if (body.ratio > 1.0 && areaRatio < 0.15 && centerRatio > 0.65) {
    return {
      pose: 'crouching',
      isAbnormal: false,
      confidence: 0.8,
      reason: '检测到蹲下/弯腰姿态'
    };
  }
  
  // ========== 跌倒判断（关键逻辑）==========
  
  // 条件1：宽高比明显大于1（横向发展）
  // 条件2：人体底部贴近画面底部（真正倒在地面上）
  // 条件3：面积占比不能太小（太小可能是坐着的人被裁剪）
  
  if (isHorizontal && bottomRatio > 0.85 && areaRatio > 0.05) {
    
    // 计算跌倒置信度
    let fallScore = 0;
    let reasons: string[] = [];
    
    // 宽高比贡献
    if (isVeryHorizontal) {
      fallScore += RATIO_WEIGHT * 1.0;
      reasons.push('宽高比极大(横向发展)');
    } else if (body.ratio > 1.5) {
      fallScore += RATIO_WEIGHT * 0.8;
      reasons.push('宽高比明显异常');
    }
    
    // 位置贡献：底部越贴近地面，跌倒可能性越高
    if (bottomRatio > 0.95) {
      fallScore += POSITION_WEIGHT * 1.0;
      reasons.push('紧贴地面');
    } else if (bottomRatio > 0.9) {
      fallScore += POSITION_WEIGHT * 0.7;
      reasons.push('贴近地面');
    }
    
    // 面积贡献：倒地时面积通常较大
    if (areaRatio > 0.2) {
      fallScore += AREA_WEIGHT * 1.0;
      reasons.push('人体框面积较大');
    } else if (areaRatio > 0.1) {
      fallScore += AREA_WEIGHT * 0.6;
    }
    
    if (fallScore >= FALL_CONFIDENCE_THRESHOLD) {
      return {
        pose: 'lying',
        isAbnormal: true,
        confidence: fallScore,
        reason: `检测到疑似跌倒: ${reasons.join(' + ')}`
      };
    }
  }
  
  // 无法确定姿态
  return {
    pose: 'unknown',
    isAbnormal: false,
    confidence: 0.3,
    reason: '无法确定具体姿态'
  };
}

/**
 * 综合跌倒检测（结合多帧分析）
 */
export class FallDetector {
  private frameHistory: Array<{
    timestamp: number;
    result: BodyDetectionResult;
  }> = [];
  
  private readonly maxHistorySize = 5;
  private readonly frameWindowMs = 30000; // 30秒窗口

  /**
   * 添加一帧检测结果
   */
  addFrame(result: BodyDetectionResult): { isAbnormal: boolean; confidence: number; reason: string } {
    const now = Date.now();
    
    this.frameHistory.push({
      timestamp: now,
      result,
    });

    this.frameHistory = this.frameHistory.filter(
      f => now - f.timestamp < this.frameWindowMs
    );

    if (this.frameHistory.length > this.maxHistorySize) {
      this.frameHistory = this.frameHistory.slice(-this.maxHistorySize);
    }

    return this.analyzeHistory();
  }

  /**
   * 分析历史帧
   */
  private analyzeHistory(): { isAbnormal: boolean; confidence: number; reason: string } {
    if (this.frameHistory.length < 2) {
      return { isAbnormal: false, confidence: 0, reason: '帧数不足' };
    }

    const abnormalFrames = this.frameHistory.filter(f => f.result.isAbnormal);
    const totalFrames = this.frameHistory.length;

    // 超过60%的帧都是跌倒姿态
    if (abnormalFrames.length >= Math.ceil(totalFrames * 0.6)) {
      const avgConfidence = abnormalFrames.reduce(
        (sum, f) => sum + f.result.confidence, 0
      ) / abnormalFrames.length;

      // 必须是最近的帧也异常
      const recentFrames = this.frameHistory.slice(-2);
      const recentAbnormal = recentFrames.filter(f => f.result.isAbnormal);
      
      if (recentAbnormal.length >= 1) {
        return {
          isAbnormal: true,
          confidence: avgConfidence,
          reason: `连续${recentAbnormal.length}帧检测到跌倒姿态`,
        };
      }
    }

    return { isAbnormal: false, confidence: 0, reason: '' };
  }

  /**
   * 重置检测器
   */
  reset(): void {
    this.frameHistory = [];
  }
}
