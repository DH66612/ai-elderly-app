/**
 * MediaPipe 姿态检测 Hook
 * 使用 MediaPipe Pose 进行实时人体姿态分析
 * 支持跌倒检测
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Pose, PoseResult, FilesetResolver } from '@mediapipe/tasks-vision';

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PoseLandmarks {
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
}

export type PoseStatus = 'loading' | 'ready' | 'detecting' | 'error';

export interface FallDetectionResult {
  isFall: boolean;
  confidence: number;
  pose: 'standing' | 'sitting' | 'crouching' | 'lying' | 'unknown';
  reason: string;
  landmarks: Landmark[];
}

// 跌倒检测配置
const FALL_DETECTION_CONFIG = {
  // 跌倒角度阈值（肩膀与臀部的角度差）
  FALL_ANGLE_THRESHOLD: 45, // 度和垂直方向的夹角超过45度认为是倒地
  // 可见度阈值
  VISIBILITY_THRESHOLD: 0.5,
  // 连续跌倒帧数
  REQUIRED_FALL_FRAMES: 3,
  // 帧过期时间（毫秒）
  FRAME_EXPIRY: 3000,
};

// 关键点索引
const LANDMARK_INDICES = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

export function useMediaPipePose() {
  const [status, setStatus] = useState<PoseStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [currentPose, setCurrentPose] = useState<FallDetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const poseRef = useRef<Pose | null>(null);
  const lastResultsRef = useRef<PoseResult | null>(null);
  const fallHistoryRef = useRef<Array<{ timestamp: number; isFall: boolean }>>([]);

  // 初始化 MediaPipe Pose
  useEffect(() => {
    let mounted = true;

    async function initPose() {
      try {
        console.log('[MediaPipePose] 开始初始化...');
        setStatus('loading');

        // 加载 Pose 模型
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        // 创建 Pose 检测器
        const pose = await Pose.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose/pose_landmark_lite/float16/1/pose_landmark_lite_float16.tflite',
            delegate: 'GPU', // 使用GPU加速
          },
          runningMode: 'VIDEO', // 视频模式
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (!mounted) {
          pose.close();
          return;
        }

        poseRef.current = pose;
        setStatus('ready');
        console.log('[MediaPipePose] 初始化完成');

      } catch (err: any) {
        console.error('[MediaPipePose] 初始化失败:', err);
        setError(err.message || '初始化失败');
        setStatus('error');
      }
    }

    initPose();

    return () => {
      mounted = false;
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
    };
  }, []);

  /**
   * 检测单帧图像的姿态
   */
  const detectPose = useCallback((videoElement: HTMLVideoElement | HTMLCanvasElement | ImageData, timestamp: number): FallDetectionResult | null => {
    if (!poseRef.current) {
      console.warn('[MediaPipePose] Pose 未初始化');
      return null;
    }

    try {
      const results = poseRef.current.detectForVideo(videoElement, timestamp);
      lastResultsRef.current = results;

      if (!results.poseLandmarks || results.poseLandmarks.length === 0) {
        return {
          isFall: false,
          confidence: 0,
          pose: 'unknown',
          reason: '未检测到人体',
          landmarks: [],
        };
      }

      const landmarks = results.poseLandmarks;
      const fallResult = analyzePose(landmarks);

      // 记录跌倒历史
      const now = Date.now();
      fallHistoryRef.current.push({
        timestamp: now,
        isFall: fallResult.isFall,
      });

      // 清理过期记录
      fallHistoryRef.current = fallHistoryRef.current.filter(
        f => now - f.timestamp < FALL_DETECTION_CONFIG.FRAME_EXPIRY
      );

      // 连续多帧跌倒才确认
      const recentFalls = fallHistoryRef.current.slice(-FALL_DETECTION_CONFIG.REQUIRED_FALL_FRAMES);
      if (recentFalls.length >= FALL_DETECTION_CONFIG.REQUIRED_FALL_FRAMES) {
        const fallCount = recentFalls.filter(f => f.isFall).length;
        if (fallCount >= FALL_DETECTION_CONFIG.REQUIRED_FALL_FRAMES) {
          fallResult.isFall = true;
          fallResult.reason = `连续${fallCount}帧检测到跌倒姿态`;
        }
      }

      return fallResult;

    } catch (err: any) {
      console.error('[MediaPipePose] 检测失败:', err);
      return null;
    }
  }, []);

  /**
   * 分析姿态并判断是否跌倒
   */
  function analyzePose(landmarks: Landmark[]): FallDetectionResult {
    // 提取关键点
    const getLandmark = (index: number): Landmark | null => {
      const landmark = landmarks[index];
      if (!landmark || landmark.visibility < FALL_DETECTION_CONFIG.VISIBILITY_THRESHOLD) {
        return null;
      }
      return landmark;
    };

    const leftShoulder = getLandmark(LANDMARK_INDICES.LEFT_SHOULDER);
    const rightShoulder = getLandmark(LANDMARK_INDICES.RIGHT_SHOULDER);
    const leftHip = getLandmark(LANDMARK_INDICES.LEFT_HIP);
    const rightHip = getLandmark(LANDMARK_INDICES.RIGHT_HIP);
    const leftKnee = getLandmark(LANDMARK_INDICES.LEFT_KNEE);
    const rightKnee = getLandmark(LANDMARK_INDICES.RIGHT_KNEE);
    const leftAnkle = getLandmark(LANDMARK_INDICES.LEFT_ANKLE);
    const rightAnkle = getLandmark(LANDMARK_INDICES.RIGHT_ANKLE);

    // 计算身体中心点
    const shoulderCenter = leftShoulder && rightShoulder ? {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    } : null;

    const hipCenter = leftHip && rightHip ? {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    } : null;

    // 计算膝盖和脚踝中心
    const kneeCenter = leftKnee && rightKnee ? {
      y: (leftKnee.y + rightKnee.y) / 2,
    } : null;

    const ankleCenter = leftAnkle && rightAnkle ? {
      y: (leftAnkle.y + rightAnkle.y) / 2,
    } : null;

    console.log('[PoseAnalysis]', {
      shoulderY: shoulderCenter?.y.toFixed(2),
      hipY: hipCenter?.y.toFixed(2),
      kneeY: kneeCenter?.y.toFixed(2),
      ankleY: ankleCenter?.y.toFixed(2),
    });

    // ========== 姿态判断逻辑 ==========

    // 站立：脚踝在最下(y值最大)，膝盖在中间，肩膀和臀部在上方
    if (ankleCenter && kneeCenter && shoulderCenter && hipCenter) {
      const ankleY = ankleCenter.y;
      const kneeY = kneeCenter.y;
      const hipY = hipCenter.y;
      const shoulderY = shoulderCenter.y;

      // 计算身体倾斜角度
      const bodyTiltAngle = Math.abs(Math.atan2(hipCenter.x - shoulderCenter.x, hipCenter.y - shoulderCenter.y) * (180 / Math.PI));

      console.log('[PoseAnalysis] 身体倾斜角度:', bodyTiltAngle.toFixed(1) + '°');

      // 1. 判断站立：膝盖在脚踝上方，臀部在膝盖上方
      if (kneeY < ankleY - 0.1 && hipY < kneeY - 0.05 && bodyTiltAngle < 30) {
        return {
          isFall: false,
          confidence: 0.95,
          pose: 'standing',
          reason: '检测到站立姿态',
          landmarks,
        };
      }

      // 2. 判断坐着：膝盖在脚踝附近（差值小于一定阈值）
      if (Math.abs(kneeY - ankleY) < 0.15 && hipY < kneeY && bodyTiltAngle < 45) {
        return {
          isFall: false,
          confidence: 0.9,
          pose: 'sitting',
          reason: '检测到坐姿',
          landmarks,
        };
      }

      // 3. 判断蹲下：膝盖弯曲很多，臀部很低
      if (kneeY > ankleY - 0.05 && hipY > kneeY - 0.05 && bodyTiltAngle < 60) {
        return {
          isFall: false,
          confidence: 0.85,
          pose: 'crouching',
          reason: '检测到蹲下/弯腰姿态',
          landmarks,
        };
      }

      // 4. 判断倒地：身体接近水平
      // 条件：臀部、膝盖、脚踝的Y值接近（在同一个水平面上）
      if (ankleCenter && kneeCenter && hipCenter) {
        const legLevelDiff = Math.max(
          Math.abs(ankleCenter.y - kneeCenter.y),
          Math.abs(kneeCenter.y - hipCenter.y)
        );

        console.log('[PoseAnalysis] 腿部水平度差:', legLevelDiff.toFixed(3));

        // 腿部接近水平（差值小于0.15）+ 身体倾斜角度大
        if (legLevelDiff < 0.15 && bodyTiltAngle > 45) {
          // 进一步确认：膝盖和脚踝在同一水平线上
          if (Math.abs(ankleCenter.y - kneeCenter.y) < 0.2) {
            return {
              isFall: true,
              confidence: 0.9,
              pose: 'lying',
              reason: `检测到倒地姿态（身体倾斜${bodyTiltAngle.toFixed(0)}°）`,
              landmarks,
            };
          }
        }
      }
    }

    // 无法确定
    return {
      isFall: false,
      confidence: 0.3,
      pose: 'unknown',
      reason: '姿态不明确',
      landmarks,
    };
  }

  /**
   * 开始实时检测
   */
  const startDetection = useCallback((videoElement: HTMLVideoElement, onResult: (result: FallDetectionResult) => void) => {
    if (!poseRef.current) {
      console.error('[MediaPipePose] Pose 未初始化');
      return;
    }

    setIsDetecting(true);
    let lastTimestamp = -1;

    function detectFrame() {
      if (!isDetecting || !poseRef.current) return;

      const timestamp = performance.now();
      if (timestamp !== lastTimestamp) {
        lastTimestamp = timestamp;
        
        const result = detectPose(videoElement, timestamp);
        if (result) {
          setCurrentPose(result);
          onResult(result);
        }
      }

      requestAnimationFrame(detectFrame);
    }

    detectFrame();
  }, [detectPose, isDetecting]);

  /**
   * 停止检测
   */
  const stopDetection = useCallback(() => {
    setIsDetecting(false);
  }, []);

  /**
   * 重置跌倒历史
   */
  const resetHistory = useCallback(() => {
    fallHistoryRef.current = [];
  }, []);

  return {
    status,
    error,
    currentPose,
    isDetecting,
    detectPose,
    startDetection,
    stopDetection,
    resetHistory,
  };
}
