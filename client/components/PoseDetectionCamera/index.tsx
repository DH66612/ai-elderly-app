/**
 * 摄像头姿态检测组件
 * 使用 MediaPipe Pose 进行实时跌倒检测
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Spacing, BorderRadius } from '@/constants-theme';
import { useMediaPipePose, FallDetectionResult } from '@/hooks/useMediaPipePose';

interface PoseDetectionCameraProps {
  onFallDetected?: (result: FallDetectionResult) => void;
  onPoseUpdate?: (result: FallDetectionResult) => void;
  autoStart?: boolean;
  width?: number;
  height?: number;
}

const colors = {
  primary: '#8ab3cf',
  success: '#a8c8b8',
  successText: '#5a8a7a',
  danger: '#e2c6c6',
  dangerText: '#b87a7a',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#8fa5bb',
  backgroundTertiary: '#eaf0f5',
};

export function PoseDetectionCamera({
  onFallDetected,
  onPoseUpdate,
  autoStart = false,
  width = 320,
  height = 240,
}: PoseDetectionCameraProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [currentResult, setCurrentResult] = useState<FallDetectionResult | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const {
    status,
    error,
    detectPose,
    startDetection,
    stopDetection,
    resetHistory,
  } = useMediaPipePose();

  // 请求摄像头权限
  const requestCameraPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      });
      
      streamRef.current = stream;
      setCameraStream(stream);
      setHasPermission(true);

      // 等待视频元素准备好
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);

    } catch (err: any) {
      console.error('[PoseCamera] 摄像头权限失败:', err);
      setHasPermission(false);
      Alert.alert('权限不足', '需要摄像头权限才能进行姿态检测');
    }
  }, []);

  // 停止摄像头
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraStream(null);
    setHasPermission(null);
    stopDetection();
    setIsDetecting(false);
  }, [stopDetection]);

  // 开始姿态检测
  const handleStartDetection = useCallback(() => {
    if (!videoRef.current || status !== 'ready') {
      Alert.alert('提示', '姿态检测器未就绪，请稍候');
      return;
    }

    resetHistory();
    setIsDetecting(true);

    // 使用 setInterval 进行帧检测
    const intervalId = setInterval(() => {
      if (!videoRef.current || !isDetecting) {
        clearInterval(intervalId);
        return;
      }

      const result = detectPose(videoRef.current, performance.now());
      if (result) {
        setCurrentResult(result);
        onPoseUpdate?.(result);

        if (result.isFall) {
          clearInterval(intervalId);
          onFallDetected?.(result);
        }
      }
    }, 200); // 每200ms检测一次

    // 保存 interval ID 用于清理
    (videoRef.current as any).__detectionInterval = intervalId;

  }, [status, isDetecting, detectPose, onPoseUpdate, onFallDetected, resetHistory]);

  // 停止姿态检测
  const handleStopDetection = useCallback(() => {
    if (videoRef.current && (videoRef.current as any).__detectionInterval) {
      clearInterval((videoRef.current as any).__detectionInterval);
      delete (videoRef.current as any).__detectionInterval;
    }
    setIsDetecting(false);
    stopDetection();
  }, [stopDetection]);

  // 自动开始检测
  useEffect(() => {
    if (autoStart && status === 'ready' && hasPermission) {
      handleStartDetection();
    }
  }, [autoStart, status, hasPermission, handleStartDetection]);

  // 清理
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // 渲染状态
  const renderStatus = () => {
    switch (status) {
      case 'loading':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.statusText}>加载姿态检测模型...</Text>
          </View>
        );
      case 'error':
        return (
          <View style={styles.statusContainer}>
            <FontAwesome6 name="exclamation-circle" size={24} color={colors.dangerText} />
            <Text style={styles.statusText}>加载失败: {error}</Text>
          </View>
        );
      case 'ready':
        return (
          <View style={styles.statusContainer}>
            <FontAwesome6 name="check-circle" size={24} color={colors.successText} />
            <Text style={styles.statusText}>姿态检测就绪</Text>
          </View>
        );
      default:
        return null;
    }
  };

  // 渲染姿态结果
  const renderPoseResult = () => {
    if (!currentResult) return null;

    const poseColors = {
      standing: colors.successText,
      sitting: colors.primary,
      crouching: colors.warningText,
      lying: colors.dangerText,
      unknown: colors.textMuted,
    };

    const poseLabels = {
      standing: '站立',
      sitting: '坐着',
      crouching: '蹲下',
      lying: '倒地',
      unknown: '未知',
    };

    return (
      <View style={styles.resultContainer}>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>姿态：</Text>
          <View style={[styles.poseBadge, { backgroundColor: poseColors[currentResult.pose] }]}>
            <Text style={styles.poseText}>{poseLabels[currentResult.pose]}</Text>
          </View>
        </View>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>置信度：</Text>
          <Text style={styles.confidenceText}>
            {(currentResult.confidence * 100).toFixed(0)}%
          </Text>
        </View>
        {currentResult.isFall && (
          <View style={styles.alertBanner}>
            <FontAwesome6 name="exclamation-triangle" size={16} color="#fff" />
            <Text style={styles.alertText}>检测到跌倒！</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 视频预览区域 */}
      <View style={[styles.videoContainer, { width, height }]}>
        {hasPermission ? (
          <video
            ref={videoRef}
            style={styles.video}
            playsInline
            muted
          />
        ) : (
          <View style={styles.placeholder}>
            <FontAwesome6 name="video-slash" size={48} color={colors.textMuted} />
            <Text style={styles.placeholderText}>摄像头未开启</Text>
          </View>
        )}
        
        {/* 检测状态指示 */}
        {isDetecting && (
          <View style={styles.detectingIndicator}>
            <View style={styles.detectingDot} />
            <Text style={styles.detectingText}>检测中</Text>
          </View>
        )}
      </View>

      {/* 状态显示 */}
      {renderStatus()}

      {/* 姿态结果 */}
      {renderPoseResult()}

      {/* 控制按钮 */}
      <View style={styles.controls}>
        {hasPermission ? (
          <>
            <TouchableOpacity
              style={[styles.button, isDetecting && styles.buttonActive]}
              onPress={isDetecting ? handleStopDetection : handleStartDetection}
              disabled={status !== 'ready'}
            >
              <FontAwesome6
                name={isDetecting ? 'stop' : 'play'}
                size={16}
                color={isDetecting ? colors.dangerText : colors.successText}
              />
              <Text style={[styles.buttonText, isDetecting && { color: colors.dangerText }]}>
                {isDetecting ? '停止检测' : '开始检测'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={stopCamera}>
              <FontAwesome6 name="power-off" size={16} color={colors.textMuted} />
              <Text style={styles.buttonText}>关闭摄像头</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.startButton} onPress={requestCameraPermission}>
            <FontAwesome6 name="video" size={20} color="#fff" />
            <Text style={styles.startButtonText}>开启摄像头</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  videoContainer: {
    backgroundColor: '#000',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  detectingIndicator: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  detectingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dangerText,
  },
  detectingText: {
    color: '#fff',
    fontSize: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: BorderRadius.md,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  resultContainer: {
    width: '100%',
    padding: Spacing.md,
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resultLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  poseBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  poseText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  confidenceText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.dangerText,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  alertText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: BorderRadius.md,
  },
  buttonActive: {
    backgroundColor: 'rgba(232, 194, 194, 0.5)',
  },
  buttonText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.md,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PoseDetectionCamera;
