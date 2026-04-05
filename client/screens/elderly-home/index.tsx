/**
 * 老人端首页 - 适老化设计
 * 大字体、大按钮、高对比度、简洁操作
 * 视频通话流程：点击发起请求 → 显示呼叫中弹窗 → 对方接听 → 进入通话页面
 * 
 * 健康数据采集：
 * - 自动采集手机计步器数据
 * - 定期上传到服务器
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Platform, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import ElderlyWeatherCard from '@/components/ElderlyWeatherCard';
import { ArtisticGreeting } from '@/components/ArtisticGreeting';
import { HeartMeteors } from '@/components/HeartMeteors';
import { IncomingCallModal } from '@/components/IncomingCallModal';
import { CallingModal } from '@/components/CallingModal';
import { FallConfirmationModal, useFallConfirmation } from '@/components/FallConfirmationModal';
import { MedicationReminderModal } from '@/components/MedicationReminderModal';
import { useSSE } from '@/hooks/useSSE';
import { useHealthDataCollection } from '@/hooks/useHealthDataCollection';
import { createStyles, colors } from './styles';
import { 
  requestNotificationPermissions, 
  showVideoCallNotification,
  addNotificationResponseReceivedListener 
} from '@/services/notification';
import {
  initNotificationChannels,
  triggerMedicationReminderFeedback,
  triggerFallAlertFeedback,
  triggerAlertFeedback,
} from '@/utils/notifications';

// 按钮渐变色配置（替代图片背景，减少包体积）
const BUTTON_GRADIENTS = {
  voiceAssistant: ['#9B59B6', '#8E44AD', '#6C3483'], // 黏土紫渐变
  videoCall: ['#3498DB', '#2980B9', '#1A5276'],      // 蓝色渐变
  emergency: ['#E74C3C', '#C0392B', '#922B21'],      // 红色渐变
};

interface IncomingCall {
  id: number;
  callerId: number;
  calleeId: number;
  status: string;
  callerName: string;
  createdAt: string;
}

export default function ElderlyHomeScreen() {
  const { theme } = useTheme();
  const router = useSafeRouter();
  const { user } = useAuth();

  const [hasBinding, setHasBinding] = useState(!!user?.boundUserId);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // 健康数据采集（手机计步器）
  const { isAvailable: pedometerAvailable, currentSteps } = useHealthDataCollection({
    enabled: Platform.OS !== 'web',
    uploadInterval: 5 * 60 * 1000, // 5分钟上传一次
  });
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  
  // 跌倒确认弹窗
  const { 
    modalVisible: fallModalVisible, 
    confirmationData: fallConfirmationData, 
    handleConfirm: handleFallConfirm, 
    handleDismiss: handleFallDismiss 
  } = useFallConfirmation(user?.id);
  
  // 用药提醒弹窗
  const [medicationReminderVisible, setMedicationReminderVisible] = useState(false);
  const [medicationReminderData, setMedicationReminderData] = useState<{
    id: number;
    medicineName: string;
    dosage: string;
    time: string;
    notes?: string;
    message: string;
  } | null>(null);
  
  // SSE实时推送连接（监听用药提醒）
  useSSE({
    elderId: user?.id ?? null,
    enabled: !!user?.id,
    onMedicationReminder: (message) => {
      console.log('[老人端] 收到用药提醒:', message);
      // 触发用药提醒反馈（铃声 + 震动）
      triggerMedicationReminderFeedback(
        message.medicineName || message.data?.medicineName || '药品',
        message.dosage || message.data?.dosage,
        message.time || message.data?.time
      );
      setMedicationReminderData({
        id: message.id || 0,
        medicineName: message.medicineName || message.data?.medicineName || '药品',
        dosage: message.dosage || message.data?.dosage || '',
        time: message.time || message.data?.time || '',
        notes: message.notes || message.data?.notes,
        message: message.message || '该吃药了',
      });
      setMedicationReminderVisible(true);
    },
    onFallAlert: (message) => {
      console.log('[老人端] 收到跌倒告警:', message);
      // 触发跌倒确认反馈（铃声 + 震动）
      triggerFallAlertFeedback(
        '跌倒检测',
        '检测到可能发生跌倒，您是否安好？',
        { alertId: message.alertId }
      );
    },
  });
  
  // 呼叫中状态
  const [isCalling, setIsCalling] = useState(false);
  const [callingSessionId, setCallingSessionId] = useState<number | null>(null);
  const callStatusRef = useRef<string>('idle');
  const callPollingRef = useRef<NodeJS.Timeout | null>(null);
  const incomingPollingRef = useRef<NodeJS.Timeout | null>(null);

  const boundUserName = user?.boundUserName || '监护人';

  // 初始化通知权限和渠道
  useEffect(() => {
    const initNotifications = async () => {
      await requestNotificationPermissions();
      await initNotificationChannels();
    };
    initNotifications();
    
    // 监听通知点击事件
    const subscription = addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      console.log('[老人端] 通知被点击:', data);
      
      if (data?.type === 'video_call') {
        // 视频通话通知被点击，设置来电弹窗
        setIncomingCall({
          id: data.sessionId as number,
          callerId: data.callerId as number,
          calleeId: data.calleeId as number,
          callerName: data.callerName as string,
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setHasBinding(!!user?.boundUserId);
      
      // 加载未读消息数量
      const loadUnreadCount = async () => {
        if (!user?.id) return;
        try {
          const response = await fetch(
            `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/notifications/unread-count?user_id=${user.id}`
          );
          const data = await response.json();
          setUnreadCount(data.count || 0);
        } catch (error) {
          console.error('Load unread count error:', error);
        }
      };
      
      loadUnreadCount();
    }, [user?.boundUserId, user?.id])
  );

  // 轮询检查视频通话请求（作为被叫方）
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const doCheck = async () => {
      try {
        /**
         * 服务端文件：server/src/routes/video-calls.ts
         * 接口：GET /api/v1/video-calls/pending/:userId
         */
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/video-calls/pending/${userId}`
        );
        const data = await response.json();

        if (data.success && data.data) {
          // 只在新来电时发送通知
          if (!incomingCall || incomingCall.id !== data.data.id) {
            setIncomingCall(data.data);
            
            // 触发视频通话反馈（铃声 + 震动）
            triggerAlertFeedback('video_call', '视频通话', `${data.data.callerName} 正在呼叫您`);
            
            // 发送系统通知
            await showVideoCallNotification({
              type: 'video_call',
              sessionId: data.data.id,
              callerId: data.data.callerId,
              callerName: data.data.callerName,
              calleeId: data.data.calleeId,
            });
          }
        }
      } catch (error) {
        console.error('Check incoming call error:', error);
      }
    };

    // 立即检查一次
    doCheck();

    // 开始轮询（每3秒检查一次）
    incomingPollingRef.current = setInterval(doCheck, 3000);

    return () => {
      if (incomingPollingRef.current) {
        clearInterval(incomingPollingRef.current);
        incomingPollingRef.current = null;
      }
    };
  }, [user?.id]);

  // 轮询呼叫状态（作为主叫方）
  const startCallPolling = useCallback((sessionId: number) => {
    // 清理旧的轮询
    if (callPollingRef.current) {
      clearInterval(callPollingRef.current);
    }
    
    callStatusRef.current = 'calling';
    
    // 开始轮询
    callPollingRef.current = setInterval(async () => {
      try {
        /**
         * 服务端文件：server/src/routes/video-calls.ts
         * 接口：GET /api/v1/video-calls/status/:sessionId
         */
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/video-calls/status/${sessionId}`
        );
        const data = await response.json();

        if (data.success && data.data) {
          const status = data.data.status;
          
          if (status === 'accepted') {
            // 对方接听
            callStatusRef.current = 'connected';
            if (callPollingRef.current) {
              clearInterval(callPollingRef.current);
              callPollingRef.current = null;
            }
            setIsCalling(false);
            setCallingSessionId(null);
            // 跳转到视频通话页面
            router.push('/video-call', { sessionId, isCallee: false });
          } else if (status === 'rejected') {
            // 对方拒绝
            callStatusRef.current = 'rejected';
            if (callPollingRef.current) {
              clearInterval(callPollingRef.current);
              callPollingRef.current = null;
            }
            setIsCalling(false);
            setCallingSessionId(null);
            Alert.alert('提示', '对方拒绝了通话请求');
          }
        }
      } catch (error) {
        console.error('Poll call status error:', error);
      }
    }, 2000);

    // 60秒超时
    setTimeout(() => {
      if (callStatusRef.current === 'calling') {
        callStatusRef.current = 'timeout';
        if (callPollingRef.current) {
          clearInterval(callPollingRef.current);
          callPollingRef.current = null;
        }
        setIsCalling(false);
        setCallingSessionId(null);
        Alert.alert('提示', '对方未接听');
      }
    }, 60000);
  }, [router]);

  // 发起视频通话
  const handleVideoCall = useCallback(async () => {
    if (!hasBinding) {
      Alert.alert('提示', '请先绑定监护人');
      return;
    }

    try {
      /**
       * 服务端文件：server/src/routes/video-calls.ts
       * 接口：POST /api/v1/video-calls/request
       * Body: { callerId: number, calleeId: number }
       */
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/video-calls/request`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callerId: user?.id,
            calleeId: user?.boundUserId,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setCallingSessionId(data.data.id);
        setIsCalling(true);
        // 开始轮询状态
        startCallPolling(data.data.id);
      } else {
        Alert.alert('失败', data.message || '发送请求失败');
      }
    } catch (error) {
      console.error('Start call error:', error);
      Alert.alert('失败', '网络错误，请重试');
    }
  }, [hasBinding, user, startCallPolling]);

  // 取消呼叫
  const handleCancelCall = useCallback(async () => {
    if (callPollingRef.current) {
      clearInterval(callPollingRef.current);
      callPollingRef.current = null;
    }
    
    callStatusRef.current = 'idle';
    setIsCalling(false);
    
    // 通知后端取消通话
    if (callingSessionId) {
      try {
        await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/video-calls/cancel`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: callingSessionId }),
          }
        );
      } catch (error) {
        console.error('Cancel call error:', error);
      }
    }
    
    setCallingSessionId(null);
  }, [callingSessionId]);

  // 接受视频通话（作为被叫方）
  const handleAcceptCall = useCallback(async (sessionId: number) => {
    try {
      /**
       * 服务端文件：server/src/routes/video-calls.ts
       * 接口：POST /api/v1/video-calls/accept
       * Body: { sessionId: number }
       */
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/video-calls/accept`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setIncomingCall(null);
        // 跳转到视频通话页面
        router.push('/video-call', { sessionId, isCallee: true });
      } else {
        Alert.alert('错误', data.message || '接受通话失败');
      }
    } catch (error) {
      console.error('Accept call error:', error);
      Alert.alert('错误', '接受通话失败');
    }
  }, [router]);

  // 拒绝视频通话（作为被叫方）
  const handleRejectCall = useCallback(async (sessionId: number) => {
    try {
      /**
       * 服务端文件：server/src/routes/video-calls.ts
       * 接口：POST /api/v1/video-calls/reject
       * Body: { sessionId: number }
       */
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/video-calls/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setIncomingCall(null);
      } else {
        Alert.alert('错误', data.message || '拒绝通话失败');
      }
    } catch (error) {
      console.error('Reject call error:', error);
      Alert.alert('错误', '拒绝通话失败');
    }
  }, []);

  const handleVoiceAssistant = () => {
    router.push('/voice-assistant');
  };

  const handleEmergencyCall = () => {
    if (!hasBinding) {
      Alert.alert('提示', '请先绑定监护人');
      return;
    }
    Alert.alert('紧急呼叫', '正在拨打紧急电话...');
  };

  // 用药提醒 - 确认已服用
  const handleMedicationConfirm = useCallback(() => {
    setMedicationReminderVisible(false);
    setMedicationReminderData(null);
    // 可以添加记录到服务器的逻辑
  }, []);

  // 用药提醒 - 稍后提醒
  const handleMedicationSnooze = useCallback(() => {
    setMedicationReminderVisible(false);
    // 5分钟后再次提醒
    setTimeout(() => {
      if (medicationReminderData) {
        setMedicationReminderVisible(true);
      }
    }, 5 * 60 * 1000);
  }, [medicationReminderData]);

  // 清理轮询
  useEffect(() => {
    return () => {
      if (callPollingRef.current) {
        clearInterval(callPollingRef.current);
      }
      if (incomingPollingRef.current) {
        clearInterval(incomingPollingRef.current);
      }
    };
  }, []);

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      {/* 清雅风格渐变背景 */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        locations={[0, 0.4]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      {/* 爱心流星背景 */}
      <HeartMeteors count={8} />

      <View style={styles.container}>
        {/* 顶部天气卡片（整合问候语）- 放在最顶端 */}
        <ElderlyWeatherCard userName={user?.name} style={styles.weatherCard} />

        {/* 艺术字问候语 - 逐字浮现 */}
        <ArtisticGreeting />

        {/* 三个大按钮 */}
        <View style={styles.buttonContainer}>
          {/* 语音助手按钮 */}
          <TouchableOpacity style={styles.largeButton} onPress={handleVoiceAssistant} activeOpacity={0.8}>
            <LinearGradient
              colors={BUTTON_GRADIENTS.voiceAssistant}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonBackground}
            >
              <View style={styles.buttonOverlay}>
                <View style={styles.buttonContent}>
                  <FontAwesome6 name="microphone" size={40} color="#FFFFFF" />
                  <ThemedText variant="h2" color="#FFFFFF" style={styles.buttonText}>语音助手</ThemedText>
                  <ThemedText variant="body" color="rgba(255,255,255,0.9)" style={styles.buttonSubtext}>想说什么就说什么</ThemedText>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* 视频通话按钮 */}
          <TouchableOpacity 
            style={styles.largeButton} 
            onPress={handleVideoCall} 
            activeOpacity={0.8}
            disabled={isCalling}
          >
            <LinearGradient
              colors={BUTTON_GRADIENTS.videoCall}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonBackground}
            >
              <View style={styles.videoOverlay}>
                <View style={styles.buttonContent}>
                  <FontAwesome6 name="video" size={40} color="#FFFFFF" />
                  <ThemedText variant="h2" color="#FFFFFF" style={styles.buttonText}>视频通话</ThemedText>
                  <ThemedText variant="body" color="rgba(255,255,255,0.9)" style={styles.buttonSubtext}>和家人面对面</ThemedText>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* 紧急呼叫按钮 */}
          <TouchableOpacity style={[styles.largeButton, styles.emergencyButton]} onPress={handleEmergencyCall} activeOpacity={0.8}>
            <LinearGradient
              colors={BUTTON_GRADIENTS.emergency}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonBackground}
            >
              <View style={styles.emergencyOverlay}>
                <View style={styles.buttonContent}>
                  <FontAwesome6 name="phone-volume" size={40} color="#FFFFFF" />
                  <ThemedText variant="h2" color="#FFFFFF" style={styles.buttonText}>紧急呼叫</ThemedText>
                  <ThemedText variant="body" color="rgba(255,255,255,0.9)" style={styles.buttonSubtext}>遇到困难按这里</ThemedText>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* 辅助功能入口 */}
        <View style={styles.auxiliaryContainer}>
          <TouchableOpacity 
            style={styles.auxiliaryButton}
            onPress={() => router.push('/image-reader')}
            activeOpacity={0.8}
          >
            <View style={[styles.auxiliaryIcon, { backgroundColor: '#e3f2fd' }]}>
              <FontAwesome6 name="camera" size={28} color="#2196F3" />
            </View>
            <View style={styles.auxiliaryTextContainer}>
              <ThemedText variant="bodyMedium" color={colors.textPrimary}>拍图识字</ThemedText>
              <ThemedText variant="small" color={colors.textMuted}>拍照识别文字并朗读</ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 底部固定消息按钮 */}
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => router.push('/elderly-notifications')}
          activeOpacity={0.8}
        >
          <FontAwesome6 name="bell" size={30} color={colors.textPrimary} />
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 呼叫中弹窗 */}
      <CallingModal
        visible={isCalling}
        calleeName={boundUserName}
        onCancel={handleCancelCall}
      />

      {/* 来电视频通话弹窗 */}
      <IncomingCallModal
        visible={!!incomingCall}
        callerName={incomingCall?.callerName || '监护人'}
        sessionId={incomingCall?.id || null}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />

      {/* 跌倒确认弹窗 */}
      <FallConfirmationModal
        visible={fallModalVisible}
        data={fallConfirmationData}
        onConfirm={handleFallConfirm}
        onDismiss={handleFallDismiss}
      />

      {/* 用药提醒全屏弹窗 */}
      {medicationReminderData && (
        <MedicationReminderModal
          visible={medicationReminderVisible}
          medicineName={medicationReminderData.medicineName}
          dosage={medicationReminderData.dosage}
          time={medicationReminderData.time}
          notes={medicationReminderData.notes}
          message={medicationReminderData.message}
          onConfirm={handleMedicationConfirm}
          onSnooze={handleMedicationSnooze}
        />
      )}
    </Screen>
  );
}
