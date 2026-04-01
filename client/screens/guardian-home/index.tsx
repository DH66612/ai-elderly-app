/**
 * 监护人端首页 - 清雅风格
 * 支持SSE实时推送接收
 * 视频通话流程：点击发起请求 → 显示呼叫中弹窗 → 对方接听 → 进入通话页面
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, TouchableOpacity, ScrollView, RefreshControl, Alert, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles, colors } from './styles';
import WeatherCard from '@/components/WeatherCard';
import { GuardianGreeting } from '@/components/GuardianGreeting';
import { HeartMeteors } from '@/components/HeartMeteors';
import { IncomingCallModal } from '@/components/IncomingCallModal';
import { CallingModal } from '@/components/CallingModal';
import { FallAlertModal } from '@/components/FallAlertModal';
import { useSSE } from '@/hooks/useSSE';
import { 
  requestNotificationPermissions, 
  showVideoCallNotification,
  addNotificationResponseReceivedListener 
} from '@/services/notification';
import {
  initNotificationChannels,
  triggerFallAlertFeedback,
  triggerMedicationReminderFeedback,
  triggerDeviceAlertFeedback,
  triggerAlertFeedback,
} from '@/utils/notifications';

// 功能图标组件 - 柔和卡片风
function ActionIcon({ icon, color, bgColor, size }: { icon: string; color: string; bgColor: string; size?: number }) {
  const containerSize = size ? size + 24 : 52;  // 更大的容器
  const iconSize = size || 22;  // 更大的图标
  return (
    <View style={{ 
      width: containerSize, 
      height: containerSize, 
      borderRadius: 14,  // 圆角而非圆形
      alignItems: 'center' as const, 
      justifyContent: 'center' as const,
      backgroundColor: bgColor,
    }}>
      <FontAwesome6 name={icon} size={iconSize} color={color} />
    </View>
  );
}

interface IncomingCall {
  id: number;
  callerId: number;
  calleeId: number;
  callerName: string;
  status: string;
  createdAt: string;
}

export default function GuardianHomeScreen() {
  const { theme } = useTheme();
  const router = useSafeRouter();
  const { user, updateUser } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [latestData, setLatestData] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [fallAlert, setFallAlert] = useState<{
    alertId: string;
    deviceName: string;
    deviceId?: string;
    title: string;
    message: string;
    isEmergency: boolean;
    timestamp: string;
  } | null>(null);
  const [showFallAlert, setShowFallAlert] = useState(false);
  
  // 呼叫中状态
  const [isCalling, setIsCalling] = useState(false);
  const [callingSessionId, setCallingSessionId] = useState<number | null>(null);
  const callStatusRef = useRef<string>('idle');
  const callPollingRef = useRef<NodeJS.Timeout | null>(null);
  const incomingPollingRef = useRef<NodeJS.Timeout | null>(null);

  const isNotBound = !user?.boundUserId;
  const boundUserId = user?.boundUserId;
  const userId = user?.id;
  const boundUserName = user?.boundUserName || '老人';

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
      console.log('[监护人] 通知被点击:', data);
      
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

  // SSE实时推送连接
  const { isConnected: sseConnected } = useSSE({
    elderId: boundUserId ?? null, // 订阅老人的数据推送
    onNotification: (message) => {
      console.log('[监护人] 收到通知:', message);
      // 收到新通知时增加未读计数
      setUnreadCount(prev => prev + 1);
    },
    onEmergency: (message) => {
      console.log('[监护人] 收到紧急告警:', message);
      // 跌倒告警已在 onFallAlert 中处理，这里处理其他紧急告警
      if (!message.alertId) {
        // 触发紧急告警反馈
        triggerAlertFeedback('emergency', '紧急告警', message.message || message.content || '检测到异常情况，请及时关注！');
        Alert.alert(
          '紧急告警',
          message.message || message.content || '检测到异常情况，请及时关注！',
          [{ text: '知道了' }]
        );
      }
    },
    onFallAlert: (message) => {
      console.log('[监护人] 收到跌倒告警:', message);
      setFallAlert({
        alertId: message.alertId || '',
        deviceName: message.deviceName || '摄像头',
        deviceId: message.deviceId,
        title: message.title || '跌倒告警',
        message: message.message || '检测到可能发生跌倒',
        isEmergency: message.isEmergency ?? true,
        timestamp: message.timestamp || new Date().toISOString(),
      });
      // 触发跌倒告警反馈（铃声 + 震动）
      triggerFallAlertFeedback(
        message.title || '跌倒告警',
        message.message || '检测到可能发生跌倒',
        { alertId: message.alertId, deviceId: message.deviceId }
      );
      // 自动弹出告警详情
      setShowFallAlert(true);
    },
    onMedicationReminder: (message) => {
      console.log('[监护人] 收到用药提醒:', message);
      // 触发用药提醒反馈
      triggerMedicationReminderFeedback(
        message.medicineName || message.data?.medicineName || '药品',
        message.dosage || message.data?.dosage,
        message.time || message.data?.time
      );
    },
    onVideoCallRequest: async (message) => {
      console.log('[监护人] 收到视频通话请求:', message);
      
      const callData = {
        id: message.id ?? 0,
        callerId: message.callerId ?? 0,
        calleeId: message.calleeId ?? 0,
        callerName: message.callerName || '老人',
        status: message.status || 'pending',
        createdAt: message.timestamp || new Date().toISOString(),
      };
      
      setIncomingCall(callData);
      
      // 触发视频通话反馈
      triggerAlertFeedback('video_call', '视频通话', `${callData.callerName} 正在呼叫您`);
      
      // 发送系统通知
      await showVideoCallNotification({
        type: 'video_call',
        sessionId: callData.id,
        callerId: callData.callerId,
        callerName: callData.callerName,
        calleeId: callData.calleeId,
      });
    },
    onHealthData: (message) => {
      console.log('[监护人] 收到健康数据:', message);
      setLatestData({
        device_type: message.data?.deviceType || 'wristband',
        timestamp: message.timestamp,
        data: message.data,
      });
    },
    onDeviceStatus: (message) => {
      console.log('[监护人] 收到设备状态:', message);
      if (message.status === 'disconnected') {
        // 触发设备告警反馈
        triggerDeviceAlertFeedback(message.deviceName || '设备', '已断开连接');
        Alert.alert('设备离线', `设备已断开连接`);
      }
    },
    enabled: !isNotBound,
  });

  // 轮询呼叫状态
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
    if (isNotBound) {
      Alert.alert('提示', '请先绑定老人才能进行视频通话', [
        { text: '稍后', style: 'cancel' },
        { text: '去绑定', onPress: () => router.push('/(guardian)/profile') },
      ]);
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
            callerId: userId,
            calleeId: boundUserId,
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
  }, [isNotBound, userId, boundUserId, router, startCallPolling]);

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

  // 轮询检查视频通话请求（作为被叫方，备用方案）
  useEffect(() => {
    if (!userId || isNotBound) return;

    const checkIncomingCall = async () => {
      try {
        /**
         * 服务端文件：server/src/routes/video-calls.ts
         * 接口：GET /api/v1/video-calls/pending/:userId
         */
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/video-calls/pending/${userId}`
        );
        const data = await response.json();

        if (data.success && data.data && !incomingCall) {
          console.log('[监护人] 轮询检测到来电:', data.data);
          setIncomingCall(data.data);
        }
      } catch (error) {
        console.error('Check incoming call error:', error);
      }
    };

    // 立即检查一次
    checkIncomingCall();

    // 每3秒检查一次
    incomingPollingRef.current = setInterval(checkIncomingCall, 3000);

    return () => {
      if (incomingPollingRef.current) {
        clearInterval(incomingPollingRef.current);
        incomingPollingRef.current = null;
      }
    };
  }, [userId, isNotBound, incomingCall]);

  useFocusEffect(
    useCallback(() => {
      // 刷新用户信息
      const refreshUserInfo = async () => {
        if (!userId) return;
        try {
          const response = await fetch(
            `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/users/${userId}`
          );
          const data = await response.json();
          if (data.user) updateUser(data.user);
        } catch (error) {
          console.error('Fetch user info error:', error);
        }
      };

      // 加载健康数据
      const loadData = async () => {
        if (!boundUserId) return;
        try {
          const bluetoothRes = await fetch(
            `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/bluetooth/latest/${boundUserId}`
          );
          const bluetoothData = await bluetoothRes.json();
          setLatestData(bluetoothData.data);
        } catch (error) {
          console.error('Load data error:', error);
        }
      };

      // 加载未读消息数量
      const loadUnreadCount = async () => {
        if (!userId) return;
        try {
          const response = await fetch(
            `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/notifications/unread-count?user_id=${userId}`
          );
          const data = await response.json();
          setUnreadCount(data.count || 0);
        } catch (error) {
          console.error('Load unread count error:', error);
        }
      };

      refreshUserInfo();
      loadData();
      loadUnreadCount();
    }, [userId, boundUserId, updateUser])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (userId) {
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/users/${userId}`
        );
        const data = await response.json();
        if (data.user) updateUser(data.user);
      } catch (error) {
        console.error('Refresh user info error:', error);
      }
    }
    if (boundUserId) {
      try {
        const bluetoothRes = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/bluetooth/latest/${boundUserId}`
        );
        const bluetoothData = await bluetoothRes.json();
        setLatestData(bluetoothData.data);
      } catch (error) {
        console.error('Load data error:', error);
      }
    }
    setRefreshing(false);
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        locations={[0, 0.4]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      {/* 爱心流星背景 */}
      <HeartMeteors count={8} />
      
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 顶部消息入口 */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => router.push('/(guardian)/notifications')}
          >
            <FontAwesome6 name="bell" size={20} color={colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 天气卡片（整合问候语） */}
        <WeatherCard 
          userName={user?.name}
          subText={isNotBound ? '请绑定老人开始守护' : `正在守护 ${boundUserName}`}
          style={{ marginBottom: Spacing.lg }} 
        />

        {/* 艺术字问候语 - 逐字浮现 */}
        <GuardianGreeting />

        {/* SSE连接状态指示器 */}
        {!isNotBound && (
          <View style={styles.connectionStatus}>
            <View style={[styles.statusDot, sseConnected ? styles.statusOnline : styles.statusOffline]} />
            <Text style={styles.statusText}>
              {sseConnected ? '实时连接中' : '连接断开'}
            </Text>
          </View>
        )}

        {/* 跌倒告警横幅 */}
        {fallAlert && (
          <TouchableOpacity 
            style={styles.fallAlertBanner}
            onPress={() => setShowFallAlert(true)}
            activeOpacity={0.8}
          >
            <View style={styles.fallAlertIconWrapper}>
              <FontAwesome6 name="person-falling" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.fallAlertContent}>
              <ThemedText variant="bodyMedium" color="#FFFFFF">
                {fallAlert.title}
              </ThemedText>
              <ThemedText variant="small" color="rgba(255,255,255,0.9)">
                {fallAlert.message}
              </ThemedText>
              <ThemedText variant="caption" color="rgba(255,255,255,0.7)">
                点击查看详情
              </ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        )}

        {/* 未绑定提示 */}
        {isNotBound && (
          <ThemedView level="default" style={styles.alertCard}>
            <ActionIcon icon="user-plus" color={colors.primary} bgColor={colors.backgroundTertiary} />
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <ThemedText variant="bodyMedium" color={colors.textPrimary}>
                绑定老人后可查看健康数据、进行视频通话
              </ThemedText>
            </View>
            <TouchableOpacity style={styles.alertButton} onPress={() => router.push('/(guardian)/profile')}>
              <ThemedText variant="smallMedium" color={colors.white}>去绑定</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}

        {/* 快捷功能 */}
        <View style={styles.section}>
          <ThemedText variant="small" color={colors.textSecondary} style={styles.sectionHeader}>
            快捷功能
          </ThemedText>
          <ThemedView level="default" style={styles.actionCard}>
            <View style={styles.actionGrid}>
              <TouchableOpacity 
                style={styles.actionItem} 
                onPress={handleVideoCall} 
                disabled={isNotBound || isCalling}
              >
                <ActionIcon icon="video" color={colors.primary} bgColor={colors.backgroundTertiary} />
                <ThemedText variant="caption" color={colors.textPrimary} style={styles.actionText}>视频通话</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionItem} 
                onPress={() => isNotBound ? Alert.alert('提示', '请先绑定老人') : router.push('/camera-monitor')} 
                disabled={isNotBound}
              >
                <ActionIcon icon="camera" color="#e08b8b" bgColor="rgba(224,139,139,0.1)" />
                <ThemedText variant="caption" color={colors.textPrimary} style={styles.actionText}>摄像头</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionItem} 
                onPress={() => isNotBound ? Alert.alert('提示', '请先绑定老人') : router.push('/health-data')} 
                disabled={isNotBound}
              >
                <ActionIcon icon="heart-pulse" color={colors.successText} bgColor="rgba(90,138,122,0.1)" />
                <ThemedText variant="caption" color={colors.textPrimary} style={styles.actionText}>健康数据</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionItem} 
                onPress={() => isNotBound ? Alert.alert('提示', '请先绑定老人') : router.push('/ai-analysis')} 
                disabled={isNotBound}
              >
                <ActionIcon icon="brain" color={colors.primary} bgColor={colors.backgroundTertiary} />
                <ThemedText variant="caption" color={colors.textPrimary} style={styles.actionText}>AI分析</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>

        {/* 用药提醒入口 */}
        {!isNotBound && (
          <TouchableOpacity 
            style={styles.medicationEntry}
            onPress={() => router.push('/medication-reminder')}
          >
            <FontAwesome6 name="pills" size={14} color={colors.textMuted} />
            <ThemedText variant="small" color={colors.textMuted}>
              点击此处制定老人
            </ThemedText>
            <ThemedText variant="smallMedium" color={colors.primary}>
              用药提醒
            </ThemedText>
            <FontAwesome6 name="chevron-right" size={12} color={colors.primary} />
          </TouchableOpacity>
        )}

{/* 快捷入口：记事本 + 附近设施 */}
        <View style={styles.section}>
          <View style={styles.quickEntryCard}>
            {/* 左侧大卡片：记事本 */}
            <TouchableOpacity 
              style={styles.quickEntryLarge}
              onPress={() => router.push('/guardian-notes')}
            >
              <ActionIcon icon="note-sticky" color="#b8a0d4" bgColor="rgba(184,160,212,0.15)" size={28} />
              <ThemedText variant="h4" color={colors.textPrimary} style={styles.quickEntryTitle}>记事本</ThemedText>
              <ThemedText variant="small" color={colors.textMuted}>与老人共享记事</ThemedText>
            </TouchableOpacity>
            
            {/* 垂直分割线 */}
            <View style={styles.verticalDivider} />
            
            {/* 右侧：附近设施 */}
            <TouchableOpacity 
              style={styles.quickEntryLarge}
              onPress={() => isNotBound ? Alert.alert('提示', '请先绑定老人') : router.push('/nearby-facilities')}
              disabled={isNotBound}
            >
              <ActionIcon icon="map-location-dot" color="#d4a574" bgColor="rgba(212,165,116,0.15)" size={28} />
              <ThemedText variant="h4" color={colors.textPrimary} style={styles.quickEntryTitle}>附近设施</ThemedText>
              <ThemedText variant="small" color={colors.textMuted}>医院、药店等</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 呼叫中弹窗 */}
      <CallingModal
        visible={isCalling}
        calleeName={boundUserName}
        onCancel={handleCancelCall}
      />

      {/* 来电视频通话弹窗（作为被叫方） */}
      <IncomingCallModal
        visible={!!incomingCall}
        callerName={incomingCall?.callerName || '老人'}
        sessionId={incomingCall?.id || null}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />

      {/* 跌倒告警弹窗 */}
      <FallAlertModal
        visible={showFallAlert}
        alert={fallAlert}
        onClose={() => {
          setShowFallAlert(false);
          setFallAlert(null);
        }}
        onViewCamera={(deviceId, deviceName) => {
          // 跳转到摄像头监控页面
          setShowFallAlert(false);
          router.push('/camera-monitor', { deviceId, deviceName });
        }}
      />
    </Screen>
  );
}
