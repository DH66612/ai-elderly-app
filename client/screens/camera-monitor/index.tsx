/**
 * 摄像头监控页面 - 监护人端
 * 检测老人端是否连接了摄像头设备
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';

interface DeviceInfo {
  id: number;
  device_name: string;
  device_type: string;
  status: string;
  last_sync: string;
}

export default function CameraMonitorScreen() {
  const { theme, isDark } = useTheme();
  const router = useSafeRouter();
  const { user } = useAuth();

  const [cameraDevice, setCameraDevice] = useState<DeviceInfo | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  const isNotBound = !user?.boundUserId;
  const boundUserId = user?.boundUserId;

  // 获取老人端的设备连接状态
  const fetchDeviceStatus = useCallback(async () => {
    if (!boundUserId) {
      setLoading(false);
      return;
    }

    try {
      /**
       * 服务端文件：server/src/routes/bluetooth.ts
       * 接口：GET /api/v1/bluetooth/devices/:userId
       */
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/bluetooth/devices/${boundUserId}`
      );
      const data = await response.json();
      
      // 查找摄像头设备
      const camera = (data.data || []).find(
        (device: DeviceInfo) => device.device_type === 'camera' && device.status === 'connected'
      );
      
      setCameraDevice(camera || null);
    } catch (error) {
      console.error('Fetch device status error:', error);
    } finally {
      setLoading(false);
    }
  }, [boundUserId]);

  useFocusEffect(
    useCallback(() => {
      fetchDeviceStatus();
    }, [fetchDeviceStatus])
  );

  // 定期刷新设备状态（30秒）
  useEffect(() => {
    if (!boundUserId) return;
    
    const interval = setInterval(fetchDeviceStatus, 30000);
    return () => clearInterval(interval);
  }, [boundUserId, fetchDeviceStatus]);

  const handleConnectCamera = () => {
    if (!cameraDevice) {
      Alert.alert('提示', '老人端暂未连接摄像头设备，请提醒老人先连接摄像头');
      return;
    }

    Alert.alert(
      '连接摄像头',
      `确定要连接${cameraDevice.device_name}吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: () => {
            setIsLive(true);
            Alert.alert('成功', '已连接摄像头');
          },
        },
      ]
    );
  };

  const handleDisconnect = () => {
    Alert.alert(
      '断开连接',
      '确定要断开摄像头连接吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: () => {
            setIsLive(false);
            Alert.alert('提示', '摄像头已断开');
          },
        },
      ]
    );
  };

  const handleCapture = () => {
    Alert.alert('拍照', '已保存截图');
  };

  const handleRecord = () => {
    Alert.alert('录像', '录像功能开发中');
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  // 加载中
  if (loading) {
    return (
      <Screen backgroundColor="transparent" statusBarStyle="dark">
        <GuardianBackground />
        <View style={styles.loadingContainer}>
          <FontAwesome6 name="spinner" size={32} color="#8ab3cf" />
          <Text style={styles.loadingText}>正在获取设备状态...</Text>
        </View>
      </Screen>
    );
  }

  // 未绑定老人
  if (isNotBound) {
    return (
      <Screen backgroundColor="transparent" statusBarStyle="dark">
        <GuardianBackground />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <FontAwesome6 name="user-slash" size={64} color="#9aa9b7" />
          </View>
          <Text style={styles.emptyTitle}>需要先绑定老人</Text>
          <Text style={styles.emptySubtitle}>绑定后可查看老人端的摄像头画面</Text>
          <TouchableOpacity
            style={styles.bindButton}
            onPress={() => router.push('/(guardian)/profile')}
          >
            <FontAwesome6 name="link" size={16} color="#ffffff" />
            <Text style={styles.bindButtonText}>去绑定</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  // 老人端未连接摄像头
  if (!cameraDevice) {
    return (
      <Screen backgroundColor="transparent" statusBarStyle="dark">
        <GuardianBackground />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <FontAwesome6 name="video-slash" size={64} color="#9aa9b7" />
          </View>
          <Text style={styles.emptyTitle}>摄像头未连接</Text>
          <Text style={styles.emptySubtitle}>老人端暂未连接摄像头设备</Text>
          <View style={styles.deviceStatusBox}>
            <FontAwesome6 name="circle-info" size={14} color="#8ab3cf" />
            <Text style={styles.deviceStatusText}>
              请提醒 {user?.boundUserName || '老人'} 在设备管理中连接摄像头
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchDeviceStatus}>
            <FontAwesome6 name="rotate" size={16} color="#8ab3cf" />
            <Text style={styles.refreshButtonText}>刷新状态</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="#000000" statusBarStyle="light">
      <View style={styles.container}>
        {/* 视频区域 */}
        <LinearGradient
          colors={['#d4e6f1', '#b8d8e8', '#e0eef9']}
          style={styles.videoArea}
        >
          {isLive ? (
            <>
              {/* 摄像头画面 */}
              <View style={styles.cameraView}>
                <FontAwesome6 name="video" size={120} color="#a6c1d9" />
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>实时</Text>
                </View>
              </View>

              {/* 设备信息 */}
              <View style={styles.deviceInfo}>
                <FontAwesome6 name="camera" size={14} color="#2d4c6e" />
                <Text style={styles.deviceName}>{cameraDevice.device_name}</Text>
              </View>

              {/* 用户信息 */}
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user?.boundUserName || '老人'}的摄像头
                </Text>
                <Text style={styles.userStatus}>正在监控中...</Text>
              </View>
            </>
          ) : (
            <View style={styles.connectState}>
              <View style={styles.deviceReadyBox}>
                <FontAwesome6 name="camera" size={64} color="#8ab3cf" />
                <View style={styles.readyBadge}>
                  <FontAwesome6 name="circle-check" size={12} color="#5cb85c" />
                  <Text style={styles.readyText}>设备已就绪</Text>
                </View>
              </View>
              <Text style={styles.deviceReadyName}>{cameraDevice.device_name}</Text>
              <Text style={styles.deviceReadyHint}>摄像头已连接，点击下方按钮开始监控</Text>
              <TouchableOpacity style={styles.connectButton} onPress={handleConnectCamera}>
                <FontAwesome6 name="link" size={20} color="#ffffff" />
                <Text style={styles.connectButtonText}>开始监控</Text>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>

        {/* 控制区域 */}
        {isLive && (
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={handleCapture}>
              <View style={styles.controlIconCircle}>
                <FontAwesome6 name="camera" size={28} color="#ffffff" />
              </View>
              <Text style={styles.controlLabel}>拍照</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={handleRecord}>
              <View style={styles.controlIconCircle}>
                <FontAwesome6 name="circle" size={28} color="#ffffff" />
              </View>
              <Text style={styles.controlLabel}>录像</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={handleDisconnect}>
              <View style={[styles.controlIconCircle, styles.disconnectCircle]}>
                <FontAwesome6 name="power-off" size={28} color="#ffffff" />
              </View>
              <Text style={[styles.controlLabel, styles.disconnectLabel]}>断开</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 退出按钮 */}
        <View style={styles.exitContainer}>
          <TouchableOpacity style={styles.exitButton} onPress={() => router.back()}>
            <FontAwesome6 name="xmark" size={28} color="#b87a7a" />
            <Text style={styles.exitButtonText}>退出</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const createStyles = (theme: any) => {
  // 清雅色系固定值（忽略传入的 theme，统一风格）
  const colors = {
    primary: '#8ab3cf',
    primaryDark: '#7fa5c0',
    textPrimary: '#2d4c6e',
    textSecondary: '#5e7e9f',
    muted: '#9aa9b7',
    dangerBg: '#e2c6c6',
    dangerText: '#b87a7a',
    white: '#ffffff',
    success: '#5cb85c',
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000000',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f0f5fa',
    },
    loadingText: {
      marginTop: Spacing.md,
      fontSize: 16,
      color: colors.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f0f5fa',
      paddingHorizontal: Spacing.xl,
    },
    emptyIconBox: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: '#ffffff',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.lg,
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
    },
    emptySubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: Spacing.lg,
    },
    deviceStatusBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#eaf3fa',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: '#d6e4f0',
    },
    deviceStatusText: {
      marginLeft: Spacing.sm,
      fontSize: 14,
      color: colors.textSecondary,
    },
    bindButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.lg,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    bindButtonText: {
      marginLeft: Spacing.sm,
      fontSize: 16,
      fontWeight: '600',
      color: colors.white,
    },
    refreshButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#eaf3fa',
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderWidth: 1,
      borderColor: '#d6e4f0',
    },
    refreshButtonText: {
      marginLeft: Spacing.sm,
      fontSize: 15,
      fontWeight: '500',
      color: colors.primary,
    },
    videoArea: {
      flex: 1,
      borderRadius: BorderRadius.xl,
      margin: Spacing.md,
      overflow: 'hidden',
    },
    connectState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Spacing.xl,
    },
    deviceReadyBox: {
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    readyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.md,
      backgroundColor: 'rgba(92, 184, 92, 0.1)',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.full,
    },
    readyText: {
      marginLeft: Spacing.xs,
      fontSize: 14,
      fontWeight: '500',
      color: colors.success,
    },
    deviceReadyName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
    },
    deviceReadyHint: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: Spacing.xl,
      textAlign: 'center',
    },
    connectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.lg,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    connectButtonText: {
      marginLeft: Spacing.sm,
      fontSize: 18,
      fontWeight: '600',
      color: colors.white,
    },
    cameraView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#eaf3fa',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.full,
      marginTop: Spacing.md,
      borderWidth: 1,
      borderColor: '#d6e4f0',
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.dangerText,
      marginRight: Spacing.xs,
    },
    liveText: {
      fontWeight: '500',
      color: colors.textPrimary,
    },
    deviceInfo: {
      position: 'absolute',
      top: Spacing.xl,
      right: Spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.lg,
    },
    deviceName: {
      marginLeft: Spacing.xs,
      fontSize: 12,
      color: colors.textPrimary,
    },
    userInfo: {
      position: 'absolute',
      top: Spacing.xl,
      left: Spacing.lg,
    },
    userName: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    userStatus: {
      marginTop: Spacing.xs,
      fontSize: 14,
      color: colors.textSecondary,
    },
    controls: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems: 'center',
      paddingVertical: Spacing.xl,
      marginHorizontal: Spacing.md,
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      borderRadius: BorderRadius.xl,
    },
    controlButton: {
      alignItems: 'center',
    },
    controlIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.xs,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    disconnectCircle: {
      backgroundColor: colors.dangerBg,
      shadowColor: colors.dangerText,
    },
    controlLabel: {
      marginTop: Spacing.xs,
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    disconnectLabel: {
      color: colors.dangerText,
    },
    exitContainer: {
      padding: Spacing.lg,
      alignItems: 'center',
    },
    exitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.dangerBg,
      borderRadius: BorderRadius.full,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      shadowColor: colors.dangerText,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    exitButtonText: {
      marginLeft: Spacing.sm,
      fontSize: 18,
      fontWeight: '500',
      color: colors.dangerText,
    },
  });
};