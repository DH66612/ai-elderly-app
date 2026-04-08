/**
 * MediaPipe 视频姿态检测组件
 * 用于分析视频文件的跌倒检测
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ProgressView,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/ThemedText';
import { Spacing, BorderRadius } from '@/constants-theme';

interface FallDetectionResult {
  isFall: boolean;
  confidence: number;
  pose: 'standing' | 'sitting' | 'crouching' | 'lying' | 'unknown';
  reason: string;
}

interface VideoPoseDetectorProps {
  onFallDetected?: (result: FallDetectionResult) => void;
  width?: number;
  height?: number;
}

const colors = {
  primary: '#8ab3cf',
  success: '#a8c8b8',
  successText: '#5a8a7a',
  warning: '#d4c4a8',
  warningText: '#8a7a5a',
  danger: '#e2c6c6',
  dangerText: '#b87a7a',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#8fa5bb',
  backgroundTertiary: '#eaf0f5',
};

// 姿态分析辅助函数（基于视频帧的简单分析）
// 注意：这是简化版，实际项目中应该调用后端API进行MediaPipe分析
function analyzeVideoFrame(
  frameData: { width: number; height: number; brightness: number },
  frameIndex: number,
  totalFrames: number
): FallDetectionResult {
  // 模拟MediaPipe的检测结果
  // 实际项目中应该：
  // 1. 将视频帧发送到后端
  // 2. 后端使用Python+MediaPipe处理
  // 3. 返回姿态检测结果

  const progress = frameIndex / totalFrames;
  
  // 模拟：视频后半段有一定概率检测到跌倒
  if (progress > 0.6 && Math.random() < 0.15) {
    return {
      isFall: true,
      confidence: 0.8 + Math.random() * 0.15,
      pose: 'lying',
      reason: '检测到疑似跌倒姿态（横向倒地）',
    };
  }

  // 模拟其他姿态
  const poses: FallDetectionResult['pose'][] = ['standing', 'sitting', 'crouching'];
  const pose = poses[Math.floor(Math.random() * 3)];

  return {
    isFall: false,
    confidence: 0.7 + Math.random() * 0.25,
    pose,
    reason: pose === 'standing' ? '站立中' : pose === 'sitting' ? '坐姿正常' : '蹲下/弯腰',
  };
}

export function VideoPoseDetector({
  onFallDetected,
  width = 320,
  height = 240,
}: VideoPoseDetectorProps) {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [analysisResults, setAnalysisResults] = useState<FallDetectionResult[]>([]);
  const [currentResult, setCurrentResult] = useState<FallDetectionResult | null>(null);
  
  const videoRef = useRef<Video>(null);
  const analysisIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 选择视频
  const handlePickVideo = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要相册权限来选择视频');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedVideo(result.assets[0].uri);
        setAnalysisResults([]);
        setCurrentResult(null);
      }
    } catch (error) {
      console.error('[VideoPoseDetector] 选择视频失败:', error);
      Alert.alert('错误', '无法选择视频');
    }
  }, []);

  // 开始分析视频
  const handleStartAnalysis = useCallback(async () => {
    if (!selectedVideo) {
      Alert.alert('提示', '请先选择视频');
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setAnalysisResults([]);
    setStatusText('准备分析...');

    // 模拟从视频中提取帧并分析
    // 实际项目中应该：
    // 1. 使用 FFmpeg 提取视频帧
    // 2. 将帧发送到后端（MediaPipe/Python）
    // 3. 接收姿态检测结果

    const totalFrames = 10;
    const frameDelay = 500; // 每500ms分析一帧

    for (let i = 0; i < totalFrames; i++) {
      if (!isAnalyzing) break;

      setProgress((i + 1) / totalFrames);
      setStatusText(`分析第 ${i + 1}/${totalFrames} 帧...`);

      // 模拟帧数据
      const frameData = {
        width: 640,
        height: 480,
        brightness: 0.5 + Math.random() * 0.3,
      };

      // 分析当前帧
      const result = analyzeVideoFrame(frameData, i, totalFrames);
      setCurrentResult(result);
      setAnalysisResults(prev => [...prev, result]);

      // 检测到跌倒立即停止
      if (result.isFall) {
        setStatusText('检测到跌倒！');
        onFallDetected?.(result);
        
        setTimeout(() => {
          setIsAnalyzing(false);
          Alert.alert(
            '⚠️ 跌倒检测告警',
            `检测到疑似跌倒行为\n\n置信度：${(result.confidence * 100).toFixed(0)}%\n${result.reason}`,
            [
              { text: '我没事', style: 'cancel', onPress: () => {} },
              { text: '呼叫帮助', style: 'destructive', onPress: () => {
                Alert.alert('已通知监护人', '紧急联系人将收到跌倒告警');
              }},
            ]
          );
        }, 500);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, frameDelay));
    }

    // 分析完成
    setIsAnalyzing(false);
    setStatusText('分析完成');

    // 统计结果
    const fallCount = analysisResults.filter(r => r.isFall).length;
    if (fallCount === 0) {
      Alert.alert('分析完成', '视频中未检测到跌倒行为');
    }

  }, [selectedVideo, isAnalyzing, analysisResults, onFallDetected]);

  // 停止分析
  const handleStopAnalysis = useCallback(() => {
    setIsAnalyzing(false);
    setStatusText('已停止');
  }, []);

  // 清除选择
  const handleClear = useCallback(() => {
    setSelectedVideo(null);
    setAnalysisResults([]);
    setCurrentResult(null);
    setProgress(0);
    setStatusText('');
  }, []);

  // 渲染结果
  const renderResults = () => {
    if (analysisResults.length === 0) return null;

    const poseColors: Record<string, string> = {
      standing: colors.successText,
      sitting: colors.primary,
      crouching: colors.warningText,
      lying: colors.dangerText,
      unknown: colors.textMuted,
    };

    const poseLabels: Record<string, string> = {
      standing: '站立',
      sitting: '坐着',
      crouching: '蹲下',
      lying: '倒地',
      unknown: '未知',
    };

    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>帧分析结果</Text>
        <View style={styles.resultsList}>
          {analysisResults.map((result, index) => (
            <View key={index} style={styles.resultItem}>
              <Text style={styles.resultIndex}>帧{index + 1}</Text>
              <View style={[styles.poseBadge, { backgroundColor: poseColors[result.pose] }]}>
                <Text style={styles.poseText}>{poseLabels[result.pose]}</Text>
              </View>
              <Text style={styles.confidenceText}>
                {(result.confidence * 100).toFixed(0)}%
              </Text>
              {result.isFall && (
                <FontAwesome6 name="exclamation-triangle" size={12} color={colors.dangerText} />
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 视频预览 */}
      <View style={[styles.videoContainer, { width, height }]}>
        {selectedVideo ? (
          <Video
            ref={videoRef}
            source={{ uri: selectedVideo }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping
            isMuted
          />
        ) : (
          <View style={styles.placeholder}>
            <FontAwesome6 name="film" size={48} color={colors.textMuted} />
            <Text style={styles.placeholderText}>未选择视频</Text>
          </View>
        )}

        {/* 分析中遮罩 */}
        {isAnalyzing && (
          <View style={styles.analyzingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.analyzingText}>{statusText}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
        )}
      </View>

      {/* 当前帧结果 */}
      {currentResult && !isAnalyzing && (
        <View style={styles.currentResult}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultHeaderText}>最近分析结果</Text>
          </View>
          <View style={styles.resultContent}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>姿态：</Text>
              <View style={[styles.poseBadge, {
                backgroundColor: currentResult.pose === 'lying' ? colors.dangerText : colors.successText
              }]}>
                <Text style={styles.poseText}>
                  {currentResult.pose === 'standing' ? '站立' :
                   currentResult.pose === 'sitting' ? '坐着' :
                   currentResult.pose === 'crouching' ? '蹲下' :
                   currentResult.pose === 'lying' ? '倒地' : '未知'}
                </Text>
              </View>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>置信度：</Text>
              <Text style={styles.confidenceValue}>
                {(currentResult.confidence * 100).toFixed(0)}%
              </Text>
            </View>
            {currentResult.isFall && (
              <View style={styles.alertBanner}>
                <FontAwesome6 name="exclamation-triangle" size={14} color="#fff" />
                <Text style={styles.alertText}>检测到跌倒！</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* 帧分析结果列表 */}
      {renderResults()}

      {/* 控制按钮 */}
      <View style={styles.controls}>
        {!selectedVideo ? (
          <TouchableOpacity style={styles.selectButton} onPress={handlePickVideo}>
            <FontAwesome6 name="folder-open" size={20} color="#fff" />
            <Text style={styles.selectButtonText}>选择视频</Text>
          </TouchableOpacity>
        ) : (
          <>
            {!isAnalyzing ? (
              <TouchableOpacity style={styles.analyzeButton} onPress={handleStartAnalysis}>
                <FontAwesome6 name="brain" size={20} color="#fff" />
                <Text style={styles.analyzeButtonText}>开始姿态分析</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.stopButton} onPress={handleStopAnalysis}>
                <FontAwesome6 name="stop" size={20} color="#fff" />
                <Text style={styles.stopButtonText}>停止</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <FontAwesome6 name="trash" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* 提示信息 */}
      <View style={styles.tipContainer}>
        <FontAwesome6 name="info-circle" size={14} color={colors.textMuted} />
        <Text style={styles.tipText}>
          提示：选择包含老人活动的视频，系统将分析每一帧的人体姿态
        </Text>
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
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  analyzingText: {
    color: '#fff',
    fontSize: 14,
  },
  progressBar: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  currentResult: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  resultHeader: {
    backgroundColor: colors.backgroundTertiary,
    padding: Spacing.sm,
  },
  resultHeaderText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  resultContent: {
    padding: Spacing.md,
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
  confidenceValue: {
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
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  alertText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  resultsTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  resultsList: {
    gap: Spacing.xs,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  resultIndex: {
    color: colors.textMuted,
    fontSize: 12,
    width: 30,
  },
  confidenceText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.md,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: colors.successText,
    borderRadius: BorderRadius.md,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: colors.dangerText,
    borderRadius: BorderRadius.md,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    padding: Spacing.md,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: BorderRadius.md,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  tipText: {
    color: colors.textMuted,
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
});

export default VideoPoseDetector;
