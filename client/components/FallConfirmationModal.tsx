/**
 * 跌倒确认弹窗组件 - 语音交互模式
 * 自动播放语音询问，监听老人语音回答
 * 无需触碰手机，完全语音交互
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Vibration,
  TouchableOpacity,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { Audio } from 'expo-av';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

// 清雅色调
const colors = {
  backgroundRoot: '#f0f5fa',
  backgroundCard: '#ffffff',
  primary: '#8ab3cf',
  primaryLight: '#e3f0f7',
  success: '#a8c8b8',
  successText: '#5a8a7a',
  warning: '#d4c4a8',
  warningText: '#8a7a5a',
  danger: '#e2c6c6',
  dangerText: '#b87a7a',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#8fa5bb',
  listening: '#4A90D9',
};

// 安全关键词（表示老人无恙）
const SAFE_KEYWORDS = [
  '我很好', '没事', '好的', '安全', '不用', '正常', '放心', '可以',
  '没事儿', '挺好的', '不用管', '我没事', '好好的', '很安全',
  '没问题', '不需要', '不用了', '知道了', '收到了', '明白',
];

// 求助关键词（表示老人需要帮助）
const HELP_KEYWORDS = [
  '帮助', '救命', '疼', '不好', '摔倒', '起不来', '快来', '救我',
  '帮帮我', '来人', '痛', '难受', '不舒服', '动不了', '站不起来',
  '摔了', '跌倒了', '爬不起来', '很疼', '好疼', '救命啊',
];

interface FallConfirmationData {
  alertId: string;
  deviceName: string;
  message: string;
  timestamp: string;
}

interface FallConfirmationModalProps {
  visible: boolean;
  data: FallConfirmationData | null;
  onConfirm: (alertId: string, safe: boolean) => Promise<void>;
  onDismiss: () => void;
}

// 语音状态
type VoiceState = 'idle' | 'speaking' | 'listening' | 'recognizing' | 'matched';

export function FallConfirmationModal({
  visible,
  data,
  onConfirm,
  onDismiss,
}: FallConfirmationModalProps) {
  const [countdown, setCountdown] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [recognizedText, setRecognizedText] = useState('');
  const [matchResult, setMatchResult] = useState<'safe' | 'help' | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [waveAnim] = useState(new Animated.Value(0));
  
  const soundRef = useRef<Audio.Sound | null>(null);
  const hasMatchedRef = useRef(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // 语音录音hook
  const { 
    isRecording, 
    isRecognizing, 
    startRecording, 
    stopRecording,
    recognizedText: recorderText,
    clearRecognizedText,
  } = useVoiceRecorder({ dialect: 'mandarin', autoRecognize: true });

  // 播放提示语音（TTS）
  const playPromptVoice = useCallback(async () => {
    try {
      setVoiceState('speaking');
      
      // 调用后端TTS生成语音
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/voice-assistant/tts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: '您是否安好？请说我很好，或需要帮助。',
            dialect: 'mandarin',
          }),
        }
      );

      if (!response.ok) {
        // TTS失败，直接进入监听模式
        console.log('[FallConfirm] TTS失败，直接进入监听模式');
        setVoiceState('listening');
        await startRecording();
        return;
      }

      // 获取音频blob
      const blob = await response.blob();
      const uri = URL.createObjectURL(blob);

      // 播放音频
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;
      
      await sound.playAsync();
      
      // 监听播放完成
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log('[FallConfirm] 语音播放完成，开始监听');
          setVoiceState('listening');
          startRecording();
        }
      });
    } catch (error) {
      console.error('[FallConfirm] 播放语音失败:', error);
      // 失败时直接进入监听模式
      setVoiceState('listening');
      await startRecording();
    }
  }, [startRecording]);

  // 匹配关键词
  const matchKeywords = useCallback((text: string): 'safe' | 'help' | null => {
    if (!text) return null;
    
    const lowerText = text.toLowerCase();
    
    // 优先检查求助关键词（更紧急）
    for (const keyword of HELP_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        return 'help';
      }
    }
    
    // 检查安全关键词
    for (const keyword of SAFE_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        return 'safe';
      }
    }
    
    return null;
  }, []);

  // 停止监听并处理结果
  const stopListeningAndProcess = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    }
  }, [isRecording, stopRecording]);

  // 处理识别结果
  useEffect(() => {
    if (!recorderText || hasMatchedRef.current) return;
    
    setRecognizedText(recorderText);
    const match = matchKeywords(recorderText);
    
    if (match) {
      hasMatchedRef.current = true;
      setMatchResult(match);
      setVoiceState('matched');
      
      // 震动反馈
      Vibration.vibrate(match === 'safe' ? [100] : [100, 50, 100]);
      
      // 停止录音
      stopRecording();
      
      // 自动确认
      setTimeout(() => {
        if (data) {
          onConfirm(data.alertId, match === 'safe');
        }
      }, 500);
    } else if (!isRecognizing && voiceState === 'listening') {
      // 识别完成但无匹配，继续监听
      console.log('[FallConfirm] 未匹配到关键词，继续监听');
      clearRecognizedText();
      setTimeout(() => {
        if (!hasMatchedRef.current && voiceState === 'listening') {
          startRecording();
        }
      }, 300);
    }
  }, [recorderText, isRecognizing, matchKeywords, stopRecording, clearRecognizedText, startRecording, data, onConfirm, voiceState]);

  // 倒计时
  useEffect(() => {
    if (!visible || !data) return;

    // 重置状态
    setCountdown(30);
    setVoiceState('idle');
    setRecognizedText('');
    setMatchResult(null);
    hasMatchedRef.current = false;
    clearRecognizedText();

    // 开始播放语音提示
    playPromptVoice();

    // 开始倒计时
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          // 30秒无响应，自动通知监护人
          if (!hasMatchedRef.current && data) {
            console.log('[FallConfirm] 超时，自动通知监护人');
            onConfirm(data.alertId, false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      // 清理音频
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      // 停止录音
      if (isRecording) {
        stopRecording();
      }
    };
  }, [visible, data]);

  // 脉冲动画
  useEffect(() => {
    if (!visible) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [visible, pulseAnim]);

  // 声波动画
  useEffect(() => {
    if (voiceState !== 'listening') return;

    const wave = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    wave.start();

    return () => wave.stop();
  }, [voiceState, waveAnim]);

  // 手动确认（备用）
  const handleManualConfirm = useCallback(
    async (safe: boolean) => {
      if (!data || isSubmitting || hasMatchedRef.current) return;

      hasMatchedRef.current = true;
      setIsSubmitting(true);
      
      // 停止录音
      if (isRecording) {
        await stopRecording();
      }
      
      try {
        await onConfirm(data.alertId, safe);
      } finally {
        setIsSubmitting(false);
      }
    },
    [data, isSubmitting, isRecording, stopRecording, onConfirm]
  );

  if (!data) return null;

  // 获取状态显示文本
  const getStatusText = () => {
    switch (voiceState) {
      case 'speaking':
        return '正在播放提示...';
      case 'listening':
        return '正在聆听，请说话...';
      case 'recognizing':
        return '正在识别...';
      case 'matched':
        return matchResult === 'safe' ? '已确认安全' : '已请求帮助';
      default:
        return '准备中...';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.modalContainer, { transform: [{ scale: pulseAnim }] }]}>
          <ThemedView level="default" style={styles.modalContent}>
            {/* 状态图标 */}
            <View style={[
              styles.iconContainer,
              voiceState === 'listening' && styles.iconContainerListening,
              matchResult === 'safe' && styles.iconContainerSafe,
              matchResult === 'help' && styles.iconContainerHelp,
            ]}>
              {voiceState === 'listening' ? (
                <Animated.View style={{ transform: [{ scale: waveAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.2],
                })}] }}>
                  <FontAwesome6 name="microphone" size={48} color={colors.listening} />
                </Animated.View>
              ) : matchResult === 'safe' ? (
                <FontAwesome6 name="circle-check" size={48} color={colors.successText} />
              ) : matchResult === 'help' ? (
                <FontAwesome6 name="phone-volume" size={48} color={colors.dangerText} />
              ) : (
                <FontAwesome6 name="triangle-exclamation" size={48} color={colors.warningText} />
              )}
            </View>

            {/* 标题 */}
            <ThemedText variant="h2" color={colors.textPrimary} style={styles.title}>
              您是否安好？
            </ThemedText>

            {/* 语音提示 */}
            <View style={styles.promptContainer}>
              <ThemedText variant="bodyMedium" color={colors.textSecondary}>
                请说：
              </ThemedText>
              <View style={styles.promptOptions}>
                <View style={styles.promptOption}>
                  <FontAwesome6 name="circle-check" size={16} color={colors.successText} />
                  <ThemedText variant="bodyMedium" color={colors.successText}> &ldquo;我很好&rdquo;</ThemedText>
                </View>
                <ThemedText variant="body" color={colors.textMuted}> 或 </ThemedText>
                <View style={styles.promptOption}>
                  <FontAwesome6 name="hand-fist" size={16} color={colors.dangerText} />
                  <ThemedText variant="bodyMedium" color={colors.dangerText}> &ldquo;需要帮助&rdquo;</ThemedText>
                </View>
              </View>
            </View>

            {/* 识别状态 */}
            <View style={styles.statusContainer}>
              <ThemedText variant="body" color={colors.textSecondary}>
                {getStatusText()}
              </ThemedText>
            </View>

            {/* 识别到的文字 */}
            {recognizedText ? (
              <View style={styles.recognizedContainer}>
                <ThemedText variant="small" color={colors.textMuted}>识别结果：</ThemedText>
                <ThemedText variant="bodyMedium" color={matchResult === 'safe' ? colors.successText : matchResult === 'help' ? colors.dangerText : colors.textPrimary}>
                  &ldquo;{recognizedText}&rdquo;
                </ThemedText>
              </View>
            ) : null}

            {/* 倒计时 */}
            <View style={styles.countdownContainer}>
              <ThemedText variant="small" color={colors.textMuted}>
                {countdown}秒后未响应将通知监护人
              </ThemedText>
              <View style={styles.countdownBar}>
                <View style={[styles.countdownProgress, { width: `${(countdown / 30) * 100}%` }]} />
              </View>
            </View>

            {/* 备用手动按钮（小字体） */}
            {voiceState !== 'matched' && (
              <View style={styles.manualButtons}>
                <ThemedText variant="caption" color={colors.textMuted}>
                  无法语音？点击按钮：
                </ThemedText>
                <View style={styles.buttonRow}>
                  <View style={styles.smallButtonWrapper}>
                    <View 
                      style={[styles.smallButton, styles.smallButtonSafe]}
                      onTouchEnd={() => handleManualConfirm(true)}
                    >
                      <ThemedText variant="smallMedium" color="#fff">我很好</ThemedText>
                    </View>
                  </View>
                  <View style={styles.smallButtonWrapper}>
                    <View 
                      style={[styles.smallButton, styles.smallButtonHelp]}
                      onTouchEnd={() => handleManualConfirm(false)}
                    >
                      <ThemedText variant="smallMedium" color="#fff">需要帮助</ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* 检测来源 */}
            <ThemedText variant="small" color={colors.textMuted} style={styles.source}>
              检测来源：{data.deviceName}
            </ThemedText>
          </ThemedView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
  },
  modalContent: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#fdf7e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainerListening: {
    backgroundColor: '#e8f4fc',
  },
  iconContainerSafe: {
    backgroundColor: '#e8f5f0',
  },
  iconContainerHelp: {
    backgroundColor: '#fce8e8',
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  promptContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  promptOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  promptOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusContainer: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  recognizedContainer: {
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  countdownContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  countdownBar: {
    width: '100%',
    height: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 3,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  countdownProgress: {
    height: '100%',
    backgroundColor: colors.warningText,
    borderRadius: 3,
  },
  manualButtons: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  smallButtonWrapper: {
    // 包装器用于解决touch事件问题
  },
  smallButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  smallButtonSafe: {
    backgroundColor: colors.successText,
  },
  smallButtonHelp: {
    backgroundColor: colors.dangerText,
  },
  source: {
    marginTop: Spacing.sm,
  },
});

// Hook for SSE listening
export function useFallConfirmation(userId: number | undefined) {
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmationData, setConfirmationData] = useState<FallConfirmationData | null>(null);

  useEffect(() => {
    if (!userId || Platform.OS === 'web') {
      // Web端暂不支持SSE监听
      return;
    }

    // 这里可以集成SSE监听逻辑
    // 使用 react-native-sse 监听 fall_confirmation 事件
  }, [userId]);

  const handleConfirm = useCallback(
    async (alertId: string, safe: boolean) => {
      try {
        /**
         * 服务端文件：server/src/routes/fall-detection.ts
         * 接口：POST /api/v1/fall-detection/confirm
         * Body 参数：alert_id: string, safe: boolean
         */
        await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/fall-detection/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alert_id: alertId, safe }),
        });
      } catch (error) {
        console.error('确认失败:', error);
      } finally {
        setModalVisible(false);
        setConfirmationData(null);
      }
    },
    []
  );

  const handleDismiss = useCallback(() => {
    setModalVisible(false);
    setConfirmationData(null);
  }, []);

  return {
    modalVisible,
    confirmationData,
    handleConfirm,
    handleDismiss,
  };
}
