/**
 * 语音助手页面 - 支持语音识别和AI对话
 * 适老化设计：大字体、大按钮、简洁操作
 */
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, ScrollView, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { HeartMeteors } from '@/components/HeartMeteors';
import { useVoiceRecorder, DIALECT_OPTIONS, Dialect } from '@/hooks/useVoiceRecorder';

// 对话消息类型
interface Message {
  id: number;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export default function VoiceAssistantScreen() {
  const { theme, isDark } = useTheme();
  const router = useSafeRouter();
  const { user } = useAuth();

  // 对话历史
  const [messages, setMessages] = useState<Message[]>([]);
  const [showDialectPicker, setShowDialectPicker] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // 脉冲动画
  const pulseAnim = useMemo(() => new Animated.Value(1), []);

  // 添加消息
  const addMessage = useCallback((type: 'user' | 'ai', content: string) => {
    const newMessage: Message = {
      id: Date.now(),
      type,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // 处理AI响应
  const handleAIResponse = useCallback(async (userText: string, userId?: number) => {
    // 添加思考提示
    const thinkingMsgId = Date.now() + 1;
    setMessages(prev => [...prev, {
      id: thinkingMsgId,
      type: 'ai',
      content: '正在思考...',
      timestamp: new Date(),
    }]);
    
    try {
      console.log('[语音助手] 发送请求:', userText);
      
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/voice-assistant/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userText,
            session_id: `elderly-${userId || 'main'}`,
            role: 'elderly',
            user_id: userId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`网络错误: ${response.status}`);
      }

      const data = await response.json();

      // 移除"正在思考"消息
      setMessages(prev => prev.filter(m => m.id !== thinkingMsgId));

      if (data.success && data.response) {
        console.log('[语音助手] 收到回复:', data.response.substring(0, 50));
        addMessage('ai', data.response);
      } else {
        addMessage('ai', '抱歉，我没有听清楚，请再说一次。');
      }
    } catch (error: any) {
      console.error('[语音助手] LLM调用失败:', error);
      setMessages(prev => prev.filter(m => m.id !== thinkingMsgId));
      addMessage('ai', '网络好像有点问题，请检查网络连接后重试。');
    }
  }, [addMessage]);

  // 使用语音录音Hook
  const {
    isRecording,
    isRecognizing,
    hasPermission,
    recognizedText,
    dialect,
    error,
    toggleRecording,
    setDialect,
    clearRecognizedText,
  } = useVoiceRecorder({
    dialect: 'mandarin',
    autoRecognize: true,
  });

  // 上一次识别的文本
  const lastRecognizedTextRef = useRef('');

  // 监听识别结果
  useEffect(() => {
    if (recognizedText && recognizedText !== lastRecognizedTextRef.current) {
      console.log('[语音助手] 识别成功:', recognizedText);
      lastRecognizedTextRef.current = recognizedText;
      
      // 使用 queueMicrotask 延迟执行，避免在 Effect 中同步调用 setState
      queueMicrotask(() => {
        addMessage('user', recognizedText);
      });
      
      const userId = user?.id;
      setTimeout(() => {
        handleAIResponse(recognizedText, userId);
      }, 300);
    }
  }, [recognizedText, addMessage, handleAIResponse, user?.id]);

  // 录音动画
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // 清除对话
  const handleClear = useCallback(async () => {
    setMessages([]);
    clearRecognizedText();
    
    try {
      await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/voice-assistant/clear-session`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: `elderly-${user?.id || 'main'}` }),
        }
      );
    } catch (error) {
      console.error('[语音助手] 清除会话失败:', error);
    }
  }, [clearRecognizedText, user]);

  const handleBack = useCallback(() => router.back(), [router]);

  const currentDialectName = DIALECT_OPTIONS.find(d => d.value === dialect)?.label || '普通话';

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Screen backgroundColor="transparent" statusBarStyle={isDark ? 'light' : 'dark'}>
      {/* 渐变背景 */}
      <LinearGradient
        colors={['#fafafc', '#f0f5fa', '#fafafc']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      />
      <HeartMeteors count={8} />
      
      <View style={styles.container}>
        {/* 标题栏 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={28} color="#5A7C9C" />
          </TouchableOpacity>
          <ThemedText variant="h2" color="#4A647A">语音助手</ThemedText>
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <FontAwesome6 name="trash" size={24} color="#B0C2D4" />
          </TouchableOpacity>
        </View>

        {/* 方言选择 */}
        <TouchableOpacity 
          style={styles.dialectSelector} 
          onPress={() => setShowDialectPicker(!showDialectPicker)}
        >
          <FontAwesome6 name="language" size={20} color="#9BB5CC" />
          <ThemedText variant="body" color="#5A7C9C" style={styles.dialectText}>
            当前: {currentDialectName}
          </ThemedText>
          <FontAwesome6 
            name={showDialectPicker ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color="#B0C2D4" 
          />
        </TouchableOpacity>

        {/* 方言列表 */}
        {showDialectPicker && (
          <ThemedView level="default" style={styles.dialectList}>
            <ScrollView nestedScrollEnabled style={styles.dialectScroll}>
              {DIALECT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.dialectOption, dialect === option.value && styles.dialectOptionActive]}
                  onPress={() => {
                    setDialect(option.value as Dialect);
                    setShowDialectPicker(false);
                  }}
                >
                  <ThemedText variant="bodyMedium" color={dialect === option.value ? '#9BB5CC' : '#5A7C9C'}>
                    {option.label}
                  </ThemedText>
                  <ThemedText variant="small" color="#B0C2D4">{option.description}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ThemedView>
        )}

        {/* 对话区域 */}
        <ScrollView ref={scrollViewRef} style={styles.chatArea} contentContainerStyle={styles.chatContent}>
          {messages.length === 0 ? (
            <View style={styles.placeholder}>
              <FontAwesome6 name="microphone-lines" size={72} color="#C0D0DE" />
              <ThemedText variant="h2" color="#8A9FB0" style={styles.placeholderText}>
                点击下方按钮说话
              </ThemedText>
              <ThemedText variant="body" color="#B0C2D4">
                可以问我天气、时间、健康问题
              </ThemedText>
            </View>
          ) : (
            messages.map((msg) => (
              <View
                key={msg.id}
                style={[styles.messageBubble, msg.type === 'user' ? styles.userBubble : styles.aiBubble]}
              >
                <ThemedText variant="body" color={msg.type === 'user' ? '#FFFFFF' : '#4A647A'}>
                  {msg.content}
                </ThemedText>
              </View>
            ))
          )}
          
          {isRecognizing && (
            <View style={[styles.messageBubble, styles.aiBubble]}>
              <ThemedText variant="body" color="#4A647A">正在识别...</ThemedText>
            </View>
          )}
        </ScrollView>

        {/* 底部控制 */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.exitButton} onPress={handleBack}>
            <FontAwesome6 name="xmark" size={32} color="#B88787" />
            <ThemedText variant="title" color="#B88787" style={styles.exitButtonText}>退出</ThemedText>
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.recordButton, isRecording && styles.recordButtonActive, isRecognizing && styles.recordButtonDisabled]}
              onPress={toggleRecording}
              disabled={isRecognizing}
              activeOpacity={0.8}
            >
              <FontAwesome6 name={isRecording ? 'stop' : 'microphone'} size={48} color="#ffffff" />
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.statusContainer}>
            {isRecording ? (
              <>
                <FontAwesome6 name="wave-square" size={20} color="#9BB5CC" />
                <ThemedText variant="bodyMedium" color="#5A7C9C"> 正在录音，点击停止...</ThemedText>
              </>
            ) : isRecognizing ? (
              <>
                <FontAwesome6 name="spinner" size={20} color="#9BB5CC" />
                <ThemedText variant="bodyMedium" color="#5A7C9C"> 正在识别语音...</ThemedText>
              </>
            ) : (
              <>
                <FontAwesome6 name="circle-info" size={20} color="#B0C2D4" />
                <ThemedText variant="body" color="#B0C2D4"> 点击按钮开始说话</ThemedText>
              </>
            )}
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <FontAwesome6 name="triangle-exclamation" size={16} color="#B88787" />
              <ThemedText variant="small" color="#B88787"> {error}</ThemedText>
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

const createStyles = (theme: any) => {
  // 清雅柔和色系
  const colors = {
    backgroundGradientStart: '#fafafc',
    backgroundGradientEnd: '#f0f5fa',
    primary: '#9BB5CC',
    primaryLight: '#EFF5F9',
    primaryDark: '#8AA9BF',
    textPrimary: '#4A647A',
    textSecondary: '#8A9FB0',
    muted: '#B0C2D4',
    border: '#EFF2F6',
    userBubble: '#9BB5CC',
    aiBubble: '#FFFFFF',
    dangerBg: '#FEF0F0',
    dangerText: '#B88787',
    white: '#FFFFFF',
  };

  return StyleSheet.create({
    gradientBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    container: { flex: 1, backgroundColor: 'transparent' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.md,
    },
    backButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
    clearButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
    dialectSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: colors.primaryLight,
    },
    dialectText: { flex: 1, marginLeft: Spacing.sm },
    dialectList: {
      position: 'absolute',
      top: 120,
      left: Spacing.lg,
      right: Spacing.lg,
      borderRadius: BorderRadius.lg,
      backgroundColor: colors.white,
      shadowColor: '#C0D0DE',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
      zIndex: 100,
      maxHeight: 300,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dialectScroll: { maxHeight: 280 },
    dialectOption: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dialectOptionActive: { backgroundColor: colors.primaryLight },
    chatArea: { flex: 1, padding: Spacing.lg },
    chatContent: { flexGrow: 1, paddingBottom: Spacing.lg },
    messageBubble: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      maxWidth: '85%',
      shadowColor: '#C0D0DE',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    userBubble: {
      backgroundColor: colors.userBubble,
      alignSelf: 'flex-end',
    },
    aiBubble: {
      backgroundColor: colors.aiBubble,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: colors.border,
    },
    placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
    placeholderText: { marginTop: Spacing.lg, textAlign: 'center' },
    controls: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'], gap: Spacing.lg },
    exitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.dangerBg,
      borderRadius: BorderRadius.xl,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      shadowColor: colors.dangerText,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    exitButtonText: { marginLeft: Spacing.sm, fontWeight: '700' },
    recordButton: {
      alignSelf: 'center',
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    recordButtonActive: { backgroundColor: colors.dangerBg, shadowColor: colors.dangerText },
    recordButtonDisabled: { backgroundColor: colors.muted, opacity: 0.6 },
    statusContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    errorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  });
};