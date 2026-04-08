/**
 * MediaPipe 姿态检测服务
 * 调用 Python 后端进行人体姿态分析
 */

import axios from 'axios';

const MEDIAPIPE_BASE_URL = process.env.MEDIAPIPE_BASE_URL || 'http://127.0.0.1:5001';

export interface Landmark {
  x: number;
  y: number;
  z: number;
  presence: number;
}

export interface PoseDetectionResult {
  success: boolean;
  found: boolean;
  pose: 'standing' | 'sitting' | 'crouching' | 'lying' | 'unknown';
  is_fall: boolean;
  confidence: number;
  reason: string;
  frame_id?: string;
  landmarks?: Landmark[];
  error?: string;
}

export interface BatchDetectionResult {
  success: boolean;
  results: PoseDetectionResult[];
  fall_detected: boolean;
  fall_confidence: number;
  error?: string;
}

/**
 * 检测单张图片中的人体姿态
 */
export async function detectPose(imageBase64: string, frameId?: string): Promise<PoseDetectionResult> {
  try {
    const response = await axios.post<PoseDetectionResult>(
      `${MEDIAPIPE_BASE_URL}/pose/detect`,
      {
        image: imageBase64,
        frame_id: frameId
      },
      { timeout: 30000 }
    );
    return response.data;
  } catch (error: any) {
    console.error('MediaPipe 检测失败:', error.message);
    return {
      success: false,
      found: false,
      pose: 'unknown',
      is_fall: false,
      confidence: 0,
      reason: '检测服务不可用',
      error: error.message
    };
  }
}

/**
 * 批量检测多帧图片
 */
export async function detectPoseBatch(
  frames: Array<{ image: string; frame_id: string }>
): Promise<BatchDetectionResult> {
  try {
    const response = await axios.post<BatchDetectionResult>(
      `${MEDIAPIPE_BASE_URL}/pose/detect_batch`,
      { frames },
      { timeout: 120000 } // 批量检测可能需要更长时间
    );
    return response.data;
  } catch (error: any) {
    console.error('MediaPipe 批量检测失败:', error.message);
    return {
      success: false,
      results: [],
      fall_detected: false,
      fall_confidence: 0,
      error: error.message
    };
  }
}

/**
 * 健康检查
 */
export async function healthCheck(): Promise<{ status: string; mediapipe_available: boolean; pose_detector_ready: boolean }> {
  try {
    const response = await axios.get(`${MEDIAPIPE_BASE_URL}/health`, { timeout: 5000 });
    return response.data;
  } catch (error: any) {
    return {
      status: 'error',
      mediapipe_available: false,
      pose_detector_ready: false
    };
  }
}

/**
 * 分析姿态并判断是否为跌倒
 * 连续多帧检测到跌倒姿态才触发告警
 */
export async function analyzeVideoForFall(
  frames: Array<{ image: string; frame_id: string }>,
  fallThreshold: number = 2 // 连续多少帧跌倒才触发告警
): Promise<{
  has_fall: boolean;
  fall_frames: number;
  total_frames: number;
  confidence: number;
  analysis: PoseDetectionResult[];
}> {
  const batchResult = await detectPoseBatch(frames);
  
  if (!batchResult.success) {
    return {
      has_fall: false,
      fall_frames: 0,
      total_frames: frames.length,
      confidence: 0,
      analysis: []
    };
  }
  
  const fallFrames = batchResult.results.filter(r => r.is_fall);
  const fallCount = fallFrames.length;
  
  // 连续多帧跌倒才触发告警
  const hasFall = fallCount >= fallThreshold;
  
  return {
    has_fall: hasFall,
    fall_frames: fallCount,
    total_frames: frames.length,
    confidence: batchResult.fall_confidence,
    analysis: batchResult.results
  };
}
