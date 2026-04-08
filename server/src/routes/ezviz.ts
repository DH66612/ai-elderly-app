/**
 * 萤石开放平台API路由
 * 文档：https://open.ys7.com/doc/zh/book/zh-book-api.html
 * 
 * 使用步骤：
 * 1. 注册萤石开放平台账号：https://open.ys7.com/
 * 2. 创建应用，获取 AppKey 和 AppSecret
 * 3. 在萤石App中绑定摄像头，获取设备序列号
 * 4. 调用API添加设备到应用，获取直播地址
 * 
 * 跌倒检测功能：
 * - 使用萤石AI智能分析能力进行跌倒检测
 * - 支持云端实时分析和对录像的历史分析
 * - 需要设备支持AI分析功能（部分设备需要开通云存储）
 */
import express from 'express';
import type { Request, Response } from 'express';

const router = express.Router();

// 萤石开放平台配置（从环境变量获取）
const EZVIZ_APP_KEY = process.env.EZVIZ_APP_KEY || '';
const EZVIZ_APP_SECRET = process.env.EZVIZ_APP_SECRET || '';

// 萤石API基础地址
const EZVIZ_API_BASE = 'https://open.ys7.com/api/lapp';

// Token缓存
let accessToken: string | null = null;
let tokenExpireTime: number = 0;

/**
 * 获取AccessToken
 * 萤石Token有效期7天，建议缓存
 */
async function getAccessToken(): Promise<string> {
  // 检查缓存的Token是否有效（提前1小时刷新）
  if (accessToken && Date.now() < tokenExpireTime - 3600000) {
    return accessToken;
  }

  if (!EZVIZ_APP_KEY || !EZVIZ_APP_SECRET) {
    throw new Error('萤石开放平台未配置，请设置 EZVIZ_APP_KEY 和 EZVIZ_APP_SECRET 环境变量');
  }

  const url = new URL(`${EZVIZ_API_BASE}/token/get`);
  const params = new URLSearchParams({
    appKey: EZVIZ_APP_KEY,
    appSecret: EZVIZ_APP_SECRET,
  });

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json() as {
    code: string;
    msg?: string;
    data?: {
      accessToken: string;
      expireTime: number;
    };
  };

  if (data.code !== '200' || !data.data) {
    throw new Error(`获取AccessToken失败: ${data.msg || data.code}`);
  }

  accessToken = data.data.accessToken;
  tokenExpireTime = data.data.expireTime;
  
  console.log('[Ezviz] AccessToken获取成功，有效期至:', new Date(tokenExpireTime).toISOString());
  
  return accessToken;
}

/**
 * 构建萤石API请求
 */
async function ezvizRequest(apiPath: string, params: Record<string, string>): Promise<any> {
  const token = await getAccessToken();
  
  const url = new URL(`${EZVIZ_API_BASE}${apiPath}`);
  const body = new URLSearchParams({
    accessToken: token,
    ...params,
  });

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await response.json() as {
    code: string;
    msg?: string;
    data?: any;
  };
  
  if (data.code !== '200') {
    throw new Error(`萤石API错误: ${data.msg || data.code}`);
  }
  
  return data.data;
}

/**
 * GET /api/v1/ezviz/status
 * 检查萤石平台配置状态
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const configured = !!(EZVIZ_APP_KEY && EZVIZ_APP_SECRET);
    
    if (!configured) {
      return res.json({
        success: true,
        data: {
          configured: false,
          message: '萤石开放平台未配置',
          setupGuide: [
            '1. 注册萤石开放平台账号：https://open.ys7.com/',
            '2. 创建应用，获取 AppKey 和 AppSecret',
            '3. 在服务器环境变量中设置：',
            '   EZVIZ_APP_KEY=你的AppKey',
            '   EZVIZ_APP_SECRET=你的AppSecret',
            '4. 在萤石App中绑定摄像头',
            '5. 获取设备序列号（在摄像头标签或App中查看）',
          ],
        },
      });
    }

    // 尝试获取Token验证配置
    try {
      await getAccessToken();
      return res.json({
        success: true,
        data: {
          configured: true,
          message: '萤石开放平台已配置',
        },
      });
    } catch (tokenError) {
      return res.json({
        success: true,
        data: {
          configured: false,
          message: `配置有误: ${tokenError instanceof Error ? tokenError.message : '未知错误'}`,
        },
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: '检查状态失败' });
  }
});

/**
 * GET /api/v1/ezviz/devices
 * 获取设备列表
 */
router.get('/devices', async (req: Request, res: Response) => {
  try {
    const data = await ezvizRequest('/device/list', {
      pageStart: '0',
      pageSize: '50',
    });

    // 转换设备数据格式
    const devices = (data || []).map((device: any) => ({
      deviceSerial: device.deviceSerial,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      status: device.status, // 0-离线, 1-在线
      alarmStatus: device.alarmStatus,
      isEncrypt: device.isEncrypt,
      channelCount: device.channelCount,
      isShared: device.isShared,
      // 其他有用字段
      defense: device.defense,
      isBelong: device.isBelong,
    }));

    res.json({ success: true, data: devices });
  } catch (error) {
    console.error('[Ezviz] 获取设备列表失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : '获取设备列表失败',
      data: [], // 返回空数组，避免前端报错
    });
  }
});

/**
 * POST /api/v1/ezviz/device/add
 * 添加设备
 * Body: { deviceSerial: string, validateCode: string }
 */
router.post('/device/add', async (req: Request, res: Response) => {
  try {
    const { deviceSerial, validateCode } = req.body;

    if (!deviceSerial || !validateCode) {
      return res.status(400).json({
        success: false,
        error: '缺少设备序列号或验证码',
      });
    }

    await ezvizRequest('/device/add', {
      deviceSerial,
      validateCode,
    });

    res.json({
      success: true,
      message: '设备添加成功',
      data: { deviceSerial },
    });
  } catch (error) {
    console.error('[Ezviz] 添加设备失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : '添加设备失败',
    });
  }
});

/**
 * DELETE /api/v1/ezviz/device/:deviceSerial
 * 删除设备
 */
router.delete('/device/:deviceSerial', async (req: Request, res: Response) => {
  try {
    const deviceSerial = Array.isArray(req.params.deviceSerial) 
      ? req.params.deviceSerial[0] 
      : req.params.deviceSerial;

    await ezvizRequest('/device/delete', {
      deviceSerial,
    });

    res.json({ success: true, message: '设备删除成功' });
  } catch (error) {
    console.error('[Ezviz] 删除设备失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : '删除设备失败',
    });
  }
});

/**
 * POST /api/v1/ezviz/live/address
 * 获取直播地址
 * Body: { deviceSerial: string, channelNo?: number, quality?: 1-2 }
 * quality: 1-高清, 2-标清
 */
router.post('/live/address', async (req: Request, res: Response) => {
  try {
    const { deviceSerial, channelNo = 1, quality = 1 } = req.body;

    if (!deviceSerial) {
      return res.status(400).json({
        success: false,
        error: '缺少设备序列号',
      });
    }

    const data = await ezvizRequest('/live/address/get', {
      deviceSerial,
      channelNo: String(channelNo),
      quality: String(quality),
    });

    // 返回直播地址信息
    res.json({
      success: true,
      data: {
        deviceSerial,
        channelNo,
        url: data?.url, // HLS地址，可直接播放
        hdUrl: data?.hdUrl, // 高清地址
        sdUrl: data?.sdUrl, // 标清地址
        rtmpUrl: data?.rtmpUrl, // RTMP地址
        expireTime: data?.expireTime,
      },
    });
  } catch (error) {
    console.error('[Ezviz] 获取直播地址失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : '获取直播地址失败',
    });
  }
});

/**
 * POST /api/v1/ezviz/live/address/limited
 * 获取有限期直播地址（分享用）
 * Body: { deviceSerial: string, channelNo?: number, expireTime?: number }
 * expireTime: 有效期时间戳，最大7天
 */
router.post('/live/address/limited', async (req: Request, res: Response) => {
  try {
    const { deviceSerial, channelNo = 1, expireTime } = req.body;

    if (!deviceSerial) {
      return res.status(400).json({
        success: false,
        error: '缺少设备序列号',
      });
    }

    // 默认24小时有效
    const expire = expireTime || Date.now() + 24 * 60 * 60 * 1000;

    const data = await ezvizRequest('/live/address/limited', {
      deviceSerial,
      channelNo: String(channelNo),
      expireTime: String(expire),
    });

    res.json({
      success: true,
      data: {
        url: data?.url,
        expireTime: expire,
      },
    });
  } catch (error) {
    console.error('[Ezviz] 获取有限期直播地址失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : '获取直播地址失败',
    });
  }
});

/**
 * POST /api/v1/ezviz/capture
 * 抓拍图片
 * Body: { deviceSerial: string, channelNo?: number }
 */
router.post('/capture', async (req: Request, res: Response) => {
  try {
    const { deviceSerial, channelNo = 1 } = req.body;

    if (!deviceSerial) {
      return res.status(400).json({
        success: false,
        error: '缺少设备序列号',
      });
    }

    const data = await ezvizRequest('/device/capture', {
      deviceSerial,
      channelNo: String(channelNo),
    });

    res.json({
      success: true,
      data: {
        imageUrl: data?.picUrl,
        createTime: Date.now(),
      },
    });
  } catch (error) {
    console.error('[Ezviz] 抓拍失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : '抓拍失败',
    });
  }
});

/**
 * POST /api/v1/ezviz/ptz/start
 * 云台控制-开始
 * Body: { deviceSerial: string, channelNo?: number, direction: number, speed?: number }
 * direction: 0-上, 1-下, 2-左, 3-右, 4-左上, 5-右上, 6-左下, 7-右下, 8-放大, 9-缩小
 * speed: 0-7，默认4
 */
router.post('/ptz/start', async (req: Request, res: Response) => {
  try {
    const { deviceSerial, channelNo = 1, direction, speed = 4 } = req.body;

    if (!deviceSerial || direction === undefined) {
      return res.status(400).json({
        success: false,
        error: '缺少设备序列号或方向',
      });
    }

    await ezvizRequest('/device/ptz/start', {
      deviceSerial,
      channelNo: String(channelNo),
      direction: String(direction),
      speed: String(speed),
    });

    res.json({ success: true, message: '云台控制指令已发送' });
  } catch (error) {
    console.error('[Ezviz] 云台控制失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : '云台控制失败',
    });
  }
});

/**
 * POST /api/v1/ezviz/ptz/stop
 * 云台控制-停止
 */
router.post('/ptz/stop', async (req: Request, res: Response) => {
  try {
    const { deviceSerial, channelNo = 1, direction } = req.body;

    if (!deviceSerial) {
      return res.status(400).json({
        success: false,
        error: '缺少设备序列号',
      });
    }

    await ezvizRequest('/device/ptz/stop', {
      deviceSerial,
      channelNo: String(channelNo),
      direction: String(direction || 0),
    });

    res.json({ success: true, message: '云台已停止' });
  } catch (error) {
    console.error('[Ezviz] 云台停止失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : '云台停止失败',
    });
  }
});

/**
 * ============================================================================
 * 跌倒检测相关接口
 * 
 * 萤石开放平台跌倒检测的实现方式：
 * 1. 【推荐】使用萤石告警消息推送 - 萤石设备检测到异常自动推送
 * 2. 【备选】抓拍图片 + 第三方AI分析 - 调用本接口获取图片后自行分析
 * 
 * 萤石AI智能分析说明：
 * - 萤石部分设备支持本地AI分析（需设备固件支持）
 * - 云端AI分析需要开通萤石云存储服务
 * - 跌倒检测功能可能需要额外的AI服务订阅
 * 
 * 文档参考：https://open.ys7.com/doc/zh/book/zh-book-ai.html
 * ============================================================================
 */

/**
 * POST /api/v1/ezviz/ai/fall-detection/analyze
 * 抓拍图片供第三方AI分析（跌倒检测）
 * 
 * 此接口用于获取摄像头实时截图，返回图片URL供前端调用第三方AI进行跌倒分析
 * 适合与DeepSeek Vision或其他视觉AI服务配合使用
 * 
 * Body: {
 *   deviceSerial: string,  // 设备序列号
 *   channelNo?: number,   // 通道号，默认1
 * }
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     deviceSerial: string,
 *     captureUrl: string,      // 抓拍图片URL
 *     analyzedAt: string,     // 抓拍时间
 *     instructions: string    // AI分析提示词
 *   }
 * }
 */
router.post('/ai/fall-detection/analyze', async (req: Request, res: Response) => {
  try {
    const { deviceSerial, channelNo = 1 } = req.body;

    if (!deviceSerial) {
      return res.status(400).json({
        success: false,
        error: '缺少设备序列号',
      });
    }

    console.log(`[Ezviz FallDetection] 抓拍设备: ${deviceSerial}`);

    // 抓拍一张图片
    let captureData: any;
    try {
      captureData = await ezvizRequest('/device/capture', {
        deviceSerial,
        channelNo: String(channelNo),
      });
    } catch (captureError) {
      console.error('[Ezviz FallDetection] 抓拍失败:', captureError);
      return res.json({
        success: false,
        error: `抓拍失败: ${captureError instanceof Error ? captureError.message : '设备可能离线或不支持抓拍'}`,
      });
    }

    const captureUrl = captureData?.picUrl;
    
    if (!captureUrl) {
      return res.json({
        success: false,
        error: '抓拍失败，未获取到图片URL',
      });
    }

    console.log(`[Ezviz FallDetection] 抓拍成功: ${captureUrl}`);

    // 返回抓拍结果和AI分析提示词
    res.json({
      success: true,
      data: {
        deviceSerial,
        channelNo,
        captureUrl,
        capturedAt: new Date().toISOString(),
        // 第三方AI分析提示词
        analysisPrompt: `分析这张图片中的人物姿态：
1. 是否有老人倒地或姿势异常？
2. 是否有人体轮廓异常（如水平躺卧、蜷缩等）？
3. 是否需要紧急关注？

请返回JSON格式：{"isFall": true/false, "confidence": 0.0-1.0, "analysis": "分析说明"}`,
        // 后续可以用DeepSeek Vision API分析此图片
        analysisEndpoint: '/api/v1/ai/analyze-image',
      },
    });
  } catch (error) {
    console.error('[Ezviz FallDetection] 抓拍分析失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '抓拍失败',
    });
  }
});

/**
 * POST /api/v1/ezviz/ai/fall-detection/video/analyze
 * 对云存储录像进行AI分析（需要萤石云存储服务）
 * 
 * Body: {
 *   deviceSerial: string,
 *   channelNo?: number,
 *   startTime: number,    // 开始时间戳(毫秒)
 *   endTime: number,      // 结束时间戳(毫秒)
 * }
 */
router.post('/ai/fall-detection/video/analyze', async (req: Request, res: Response) => {
  try {
    const { deviceSerial, channelNo = 1, startTime, endTime } = req.body;

    if (!deviceSerial || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：deviceSerial, startTime, endTime',
      });
    }

    // 获取云存储录像片段列表
    const data = await ezvizRequest('/cloud/storage/video/list', {
      deviceSerial,
      channelNo: String(channelNo),
      startTime: String(startTime),
      endTime: String(endTime),
    });

    console.log(`[Ezviz FallDetection] 获取云存储录像: ${(data?.videoList || []).length}个片段`);

    res.json({
      success: true,
      data: {
        deviceSerial,
        startTime,
        endTime,
        videoList: data?.videoList || [],
        analyzedAt: new Date().toISOString(),
        note: '获取录像片段后，可使用第三方AI逐帧分析',
      },
    });
  } catch (error) {
    console.error('[Ezviz FallDetection] 获取云存储录像失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取云存储录像失败',
    });
  }
});

/**
 * GET /api/v1/ezviz/ai/fall-detection/devices
 * 获取支持抓拍功能的设备列表
 */
router.get('/ai/fall-detection/devices', async (req: Request, res: Response) => {
  try {
    // 获取设备列表
    const devicesData = await ezvizRequest('/device/list', {
      pageStart: '0',
      pageSize: '100',
    });

    // 标记设备状态
    const devices = (devicesData || []).map((device: any) => ({
      deviceSerial: device.deviceSerial,
      deviceName: device.deviceName,
      status: device.status, // 0-离线, 1-在线
      isOnline: device.status === 1,
      isBelong: device.isBelong,
      alarmStatus: device.alarmStatus,
      // 基本能力说明
      capabilities: {
        capture: true,  // 抓拍是基础功能
        cloudStorage: device.supportCloud || false, // 云存储需要订阅
        aiDetection: device.supportAi || false, // AI检测需要设备支持
      },
    }));

    const onlineDevices = devices.filter(d => d.isOnline);

    res.json({
      success: true,
      data: {
        totalDevices: devices.length,
        onlineDevices: onlineDevices.length,
        devices,
        onlineDevicesList: onlineDevices,
      },
    });
  } catch (error) {
    console.error('[Ezviz FallDetection] 获取设备列表失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取设备列表失败',
    });
  }
});

/**
 * GET /api/v1/ezviz/ai/fall-detection/status/:deviceSerial
 * 查询设备抓拍和AI分析能力
 */
router.get('/ai/fall-detection/status/:deviceSerial', async (req: Request, res: Response) => {
  try {
    const deviceSerial = req.params.deviceSerial;

    if (!deviceSerial) {
      return res.status(400).json({
        success: false,
        error: '缺少设备序列号',
      });
    }

    // 查询设备信息
    const deviceInfo = await ezvizRequest('/device/info', {
      deviceSerial,
    });

    res.json({
      success: true,
      data: {
        deviceSerial,
        deviceName: deviceInfo?.deviceName,
        status: deviceInfo?.status,
        isOnline: deviceInfo?.status === 1,
        deviceType: deviceInfo?.deviceType,
        capabilities: {
          capture: true, // 基础抓拍能力
          cloudStorage: deviceInfo?.supportCloud || false,
          aiDetection: deviceInfo?.supportAi || false,
        },
        statusText: deviceInfo?.status === 1 ? '在线' : '离线',
        note: '在线设备可使用抓拍功能获取实时图片进行AI分析',
      },
    });
  } catch (error) {
    console.error('[Ezviz FallDetection] 查询状态失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '查询设备状态失败',
    });
  }
});

/**
 * POST /api/v1/ezviz/ai/fall-detection/webhook
 * 接收萤石设备推送的跌倒检测事件
 * 
 * 萤石设备检测到跌倒后会通过消息推送发送到此接口
 * 
 * Body: {
 *   eventType: string,      // 事件类型，如 'fall' | 'alarm'
 *   deviceSerial: string,    // 设备序列号
 *   channelNo?: number,      // 通道号
 *   alarmTime: number,       // 告警时间
 *   alarmPicUrl?: string,    // 告警图片
 *   alarmVideoUrl?: string,  // 告警录像
 *   ...其他萤石推送字段
 * }
 */
router.post('/ai/fall-detection/webhook', async (req: Request, res: Response) => {
  try {
    const {
      method,
      eventType,
      deviceSerial,
      channelNo = 1,
      alarmTime,
      alarmPicUrl,
      alarmVideoUrl,
      // 萤石告警推送的字段
      name,
      picUrl,
      videoUrl,
      ...extra
    } = req.body;

    // 统一字段名
    const eventDeviceSerial = deviceSerial || extra?.deviceSerial;
    const eventPicUrl = alarmPicUrl || picUrl;
    const eventVideoUrl = alarmVideoUrl || videoUrl;
    const eventTime = alarmTime || extra?.alarmTime || Date.now();

    console.log(`[Ezviz FallDetection] 收到跌倒事件推送:`, {
      eventType,
      deviceSerial: eventDeviceSerial,
      alarmTime: eventTime,
      hasPic: !!eventPicUrl,
      hasVideo: !!eventVideoUrl,
    });

    // 检查是否为跌倒相关事件
    const isFallEvent = 
      eventType === 'fall' ||
      eventType === 'FALL' ||
      eventType === 'alarm' ||
      method === 'aiDetection' ||
      method === 'alarm';

    if (!isFallEvent) {
      console.log(`[Ezviz FallDetection] 非跌倒事件，跳过: ${eventType || method}`);
      return res.json({
        success: true,
        message: '非跌倒事件，已记录',
        processed: false,
      });
    }

    // 构建跌倒事件数据
    const fallEvent = {
      eventId: `ezviz_${eventDeviceSerial}_${eventTime}`,
      deviceSerial: eventDeviceSerial,
      channelNo,
      eventType: eventType || method || 'aiDetection',
      eventTime: typeof eventTime === 'number' 
        ? new Date(eventTime).toISOString() 
        : eventTime,
      captureUrl: eventPicUrl,
      videoUrl: eventVideoUrl,
      source: 'ezviz_webhook',
      rawData: req.body,
    };

    console.log(`[Ezviz FallDetection] 处理跌倒事件:`, fallEvent);

    // TODO: 可以在这里调用跌倒告警服务，通知监护人
    // await fallDetectionService.processEzvizFallEvent(fallEvent);

    res.json({
      success: true,
      message: '跌倒事件已接收',
      processed: true,
      eventId: fallEvent.eventId,
    });
  } catch (error) {
    console.error('[Ezviz FallDetection] 处理Webhook失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '处理失败',
    });
  }
});

/**
 * ============================================================================
 * 前端集成说明
 * ============================================================================
 * 
 * 前端使用萤石跌倒检测的两种模式：
 * 
 * 1. 【实时检测模式】- 适合持续监控
 *    - 前端定时调用 /ai/fall-detection/analyze 接口
 *    - 每次抓拍并分析，间隔建议 5-10 秒
 *    - 适用于短时间监控场景
 * 
 * 2. 【事件订阅模式】- 适合长期监控
 *    - 配置萤石设备的消息推送
 *    - 设备检测到跌倒自动推送事件到 /ai/fall-detection/webhook
 *    - 需要设备支持AI分析功能
 * 
 * 前端代码示例：
 * 
 * // 实时检测模式
 * async function startFallDetection(deviceSerial) {
 *   const interval = setInterval(async () => {
 *     const result = await fetch('/api/v1/ezviz/ai/fall-detection/analyze', {
 *       method: 'POST',
 *       body: JSON.stringify({ deviceSerial })
 *     });
 *     // 处理结果...
 *   }, 5000); // 5秒检测一次
 *   
 *   return () => clearInterval(interval); // 返回停止函数
 * }
 * 
 * ============================================================================
 */

export default router;
