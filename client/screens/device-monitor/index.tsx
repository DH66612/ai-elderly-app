/**
 * 监护人端 - 设备监控页面
 * 实时显示老人端传来的手环数据和摄像头画面
 * 包含设备自检提醒功能
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, Text, StyleSheet, RefreshControl, Image, TouchableOpacity, Alert } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';
import { PageHeader } from '@/components/PageHeader';
import { useSSE } from '@/hooks/useSSE';

// 清雅色系
const colors = {
  backgroundRoot: '#f0f5fa',
  backgroundCard: '#ffffff',
  backgroundTertiary: '#eaf0f5',
  primary: '#8ab3cf',
  primaryDark: '#7fa5c0',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#9aa9b7',
  border: '#d6e4f0',
  success: '#5cb85c',
  danger: '#d9534f',
  warning: '#f0ad4e',
  info: '#5bc0de',
  bracelet: '#4CAF50',
  camera: '#2196F3',
};

interface DeviceAlert {
  type: 'offline' | 'low_battery' | 'disconnected' | 'weak_signal' | 'no_device';
  deviceType: 'band' | 'camera';
  deviceName: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  lastActive?: string;
  batteryLevel?: number;
  signalStrength?: number;
}

interface BraceletData {
  id: number;
  deviceId: string;
  deviceName: string;
  manufacturer?: string;
  data: {
    heartRate: number;
    steps: number;
    calories: number;
    distance: number;
    bloodPressure?: { systolic: number; diastolic: number };
    bloodOxygen?: number;
  };
  timestamp: string;
}

interface CameraData {
  id: number;
  deviceId: string;
  deviceName: string;
  manufacturer?: string;
  data: {
    isRecording: boolean;
    motionDetected: boolean;
    batteryLevel?: number;
    signalStrength: number;
  };
  frameBase64?: string;
  timestamp: string;
}

export default function DeviceMonitorScreen() {
  const { theme } = useTheme();
  const router = useSafeRouter();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [braceletData, setBraceletData] = useState<BraceletData | null>(null);
  const [cameraData, setCameraData] = useState<CameraData | null>(null);
  const [cameraFrame, setCameraFrame] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [deviceAlerts, setDeviceAlerts] = useState<DeviceAlert[]>([]);
  const [alertsExpanded, setAlertsExpanded] = useState(true);

  const elderId = user?.boundUserId;
  const elderName = user?.boundUserName || '老人';

  // SSE 实时数据订阅
  const { isConnected: sseConnected } = useSSE({
    elderId,
    enabled: !!elderId,
    onBraceletData: (message: any) => {
      console.log('[设备监控] 收到手环数据:', message);
      setBraceletData(message);
    },
    onCameraData: (message: any) => {
      console.log('[设备监控] 收到摄像头数据:', message);
      setCameraData(message);
      if (message.frameBase64) {
        setCameraFrame(`data:image/jpeg;base64,${message.frameBase64}`);
      }
    },
  } as any);

  // 获取历史数据
  const fetchHistoryData = useCallback(async () => {
    if (!elderId) return;

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/devices/history/${elderId}?limit=10`
      );
      const result = await response.json();

      if (result.success) {
        setHistoryData(result.data);
        
        // 设置最新数据
        if (result.data.bracelet?.length > 0) {
          setBraceletData(result.data.bracelet[0]);
        }
        if (result.data.camera?.length > 0) {
          setCameraData(result.data.camera[0]);
        }
      }
    } catch (error) {
      console.error('[设备监控] 获取历史数据失败:', error);
    }
  }, [elderId]);

  // 获取设备自检提醒
  const fetchDeviceAlerts = useCallback(async () => {
    if (!elderId) return;

    try {
      /**
       * 服务端文件：server/src/routes/devices.ts
       * 接口：GET /api/v1/devices/check/:userId
       */
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/devices/check/${elderId}`
      );
      const result = await response.json();

      if (result.success) {
        setDeviceAlerts(result.alerts || []);
      }
    } catch (error) {
      console.error('[设备监控] 获取设备告警失败:', error);
    }
  }, [elderId]);

  // 页面加载时获取数据
  useFocusEffect(
    useCallback(() => {
      fetchHistoryData();
      fetchDeviceAlerts();
    }, [fetchHistoryData, fetchDeviceAlerts])
  );

  // 下拉刷新
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchHistoryData(), fetchDeviceAlerts()]);
    setRefreshing(false);
  }, [fetchHistoryData, fetchDeviceAlerts]);

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 格式化离线时长
  const formatOfflineDuration = (lastActive?: string) => {
    if (!lastActive) return '未知';
    const last = new Date(lastActive);
    const now = new Date();
    const hours = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60));
    if (hours < 1) return '不到1小时';
    if (hours < 24) return `${hours}小时`;
    return `${Math.floor(hours / 24)}天${hours % 24}小时`;
  };

  // 获取告警图标和颜色
  const getAlertStyle = (alert: DeviceAlert) => {
    switch (alert.severity) {
      case 'error':
        return { 
          icon: 'circle-xmark', 
          color: colors.danger, 
          bgColor: 'rgba(217, 83, 79, 0.1)' 
        };
      case 'warning':
        return { 
          icon: 'triangle-exclamation', 
          color: colors.warning, 
          bgColor: 'rgba(240, 173, 78, 0.1)' 
        };
      default:
        return { 
          icon: 'circle-info', 
          color: colors.info, 
          bgColor: 'rgba(91, 192, 222, 0.1)' 
        };
    }
  };

  // 获取设备类型图标
  const getDeviceIcon = (deviceType: string) => {
    return deviceType === 'band' ? 'watch' : 'video';
  };

  const styles = useMemo(() => createStyles(), []);

  if (!elderId) {
    return (
      <Screen backgroundColor="transparent" statusBarStyle="dark">
        <GuardianBackground />
        <View style={styles.container}>
          <View style={styles.emptyState}>
            <FontAwesome6 name="link-slash" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>请先绑定老人账号</Text>
          </View>
        </View>
      </Screen>
    );
  }

  // 计算告警数量
  const criticalAlerts = deviceAlerts.filter(a => a.severity === 'error');
  const warningAlerts = deviceAlerts.filter(a => a.severity === 'warning');
  const infoAlerts = deviceAlerts.filter(a => a.severity === 'info');

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <GuardianBackground />
      <View style={styles.container}>
        {/* 头部 */}
        <PageHeader
          title="设备监控"
          titleColor={colors.textPrimary}
          buttonBgColor="rgba(255,255,255,0.9)"
          iconColor={colors.textPrimary}
          rightContent={
            <View style={styles.connectionStatus}>
              <View style={[styles.statusDot, sseConnected ? styles.statusConnected : styles.statusDisconnected]} />
              <Text style={styles.statusText}>{sseConnected ? '实时连接' : '未连接'}</Text>
            </View>
          }
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* 老人信息 */}
          <View style={styles.elderInfo}>
            <FontAwesome6 name="user" size={20} color={colors.primary} />
            <Text style={styles.elderName}>{elderName}</Text>
            <Text style={styles.elderLabel}>的设备数据</Text>
          </View>

          {/* 设备自检提醒 */}
          {deviceAlerts.length > 0 && (
            <View style={styles.alertsSection}>
              <TouchableOpacity 
                style={styles.alertsHeader}
                onPress={() => setAlertsExpanded(!alertsExpanded)}
              >
                <View style={styles.alertsHeaderLeft}>
                  <FontAwesome6 
                    name="bell" 
                    size={18} 
                    color={criticalAlerts.length > 0 ? colors.danger : warningAlerts.length > 0 ? colors.warning : colors.info} 
                  />
                  <Text style={styles.alertsTitle}>设备自检提醒</Text>
                  <View style={styles.alertBadge}>
                    <Text style={styles.alertBadgeText}>{deviceAlerts.length}</Text>
                  </View>
                </View>
                <FontAwesome6 
                  name={alertsExpanded ? 'chevron-up' : 'chevron-down'} 
                  size={14} 
                  color={colors.textMuted} 
                />
              </TouchableOpacity>

              {alertsExpanded && (
                <View style={styles.alertsList}>
                  {deviceAlerts.map((alert, index) => {
                    const alertStyle = getAlertStyle(alert);
                    return (
                      <View key={index} style={[styles.alertItem, { backgroundColor: alertStyle.bgColor }]}>
                        <View style={styles.alertIconRow}>
                          <View style={[styles.alertIconBg, { backgroundColor: alertStyle.bgColor }]}>
                            <FontAwesome6 name={getDeviceIcon(alert.deviceType)} size={14} color={alertStyle.color} />
                          </View>
                          <View style={styles.alertContent}>
                            <View style={styles.alertTitleRow}>
                              <Text style={[styles.alertDeviceName, { color: alertStyle.color }]}>
                                {alert.deviceName}
                              </Text>
                              <FontAwesome6 name={alertStyle.icon as any} size={14} color={alertStyle.color} />
                            </View>
                            <Text style={styles.alertMessage}>{alert.message}</Text>
                            {alert.lastActive && alert.type !== 'no_device' && (
                              <Text style={styles.alertTime}>
                                离线时长: {formatOfflineDuration(alert.lastActive)}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* 手环数据卡片 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.bracelet + '20' }]}>
                <FontAwesome6 name="heart-pulse" size={18} color={colors.bracelet} />
              </View>
              <Text style={styles.sectionTitle}>健康手环</Text>
              {braceletData && (
                <Text style={styles.updateTime}>{formatTime(braceletData.timestamp)}</Text>
              )}
            </View>

            {braceletData ? (
              <View style={styles.dataCard}>
                <View style={styles.deviceInfoRow}>
                  <Text style={styles.deviceName}>{braceletData.deviceName}</Text>
                  {braceletData.manufacturer && (
                    <Text style={styles.manufacturerText}>{braceletData.manufacturer}</Text>
                  )}
                </View>

                <View style={styles.dataGrid}>
                  {/* 心率 */}
                  <View style={styles.dataItem}>
                    <FontAwesome6 name="heart-pulse" size={20} color={colors.danger} />
                    <Text style={styles.dataValue}>{braceletData.data.heartRate}</Text>
                    <Text style={styles.dataUnit}>bpm</Text>
                    <Text style={styles.dataLabel}>心率</Text>
                  </View>

                  {/* 步数 */}
                  <View style={styles.dataItem}>
                    <FontAwesome6 name="shoe-prints" size={20} color={colors.primary} />
                    <Text style={styles.dataValue}>{braceletData.data.steps.toLocaleString()}</Text>
                    <Text style={styles.dataUnit}>步</Text>
                    <Text style={styles.dataLabel}>步数</Text>
                  </View>

                  {/* 卡路里 */}
                  <View style={styles.dataItem}>
                    <FontAwesome6 name="fire" size={20} color={colors.warning} />
                    <Text style={styles.dataValue}>{braceletData.data.calories}</Text>
                    <Text style={styles.dataUnit}>kcal</Text>
                    <Text style={styles.dataLabel}>消耗</Text>
                  </View>

                  {/* 距离 */}
                  <View style={styles.dataItem}>
                    <FontAwesome6 name="route" size={20} color={colors.success} />
                    <Text style={styles.dataValue}>{(braceletData.data.distance / 1000).toFixed(1)}</Text>
                    <Text style={styles.dataUnit}>km</Text>
                    <Text style={styles.dataLabel}>距离</Text>
                  </View>
                </View>

                {/* 血压和血氧 */}
                {(braceletData.data.bloodPressure || braceletData.data.bloodOxygen) && (
                  <View style={styles.extraDataRow}>
                    {braceletData.data.bloodPressure && (
                      <View style={styles.extraDataItem}>
                        <FontAwesome6 name="droplet" size={16} color={colors.danger} />
                        <Text style={styles.extraDataText}>
                          血压: {braceletData.data.bloodPressure.systolic}/{braceletData.data.bloodPressure.diastolic} mmHg
                        </Text>
                      </View>
                    )}
                    {braceletData.data.bloodOxygen && (
                      <View style={styles.extraDataItem}>
                        <FontAwesome6 name="lungs" size={16} color={colors.camera} />
                        <Text style={styles.extraDataText}>血氧: {braceletData.data.bloodOxygen}%</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.noDataCard}>
                <FontAwesome6 name="heart-pulse" size={32} color={colors.textMuted} />
                <Text style={styles.noDataText}>暂无手环数据</Text>
                <Text style={styles.noDataHint}>等待老人端连接设备后同步</Text>
              </View>
            )}
          </View>

          {/* 摄像头数据卡片 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.camera + '20' }]}>
                <FontAwesome6 name="video" size={18} color={colors.camera} />
              </View>
              <Text style={styles.sectionTitle}>智能摄像头</Text>
              {cameraData && (
                <Text style={styles.updateTime}>{formatTime(cameraData.timestamp)}</Text>
              )}
            </View>

            {cameraData ? (
              <View style={styles.dataCard}>
                <View style={styles.deviceInfoRow}>
                  <Text style={styles.deviceName}>{cameraData.deviceName}</Text>
                  {cameraData.manufacturer && (
                    <Text style={styles.manufacturerText}>{cameraData.manufacturer}</Text>
                  )}
                </View>

                {/* 摄像头画面 */}
                {cameraFrame ? (
                  <View style={styles.cameraPreview}>
                    <Image source={{ uri: cameraFrame }} style={styles.cameraImage} resizeMode="cover" />
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noPreview}>
                    <FontAwesome6 name="video-slash" size={32} color={colors.textMuted} />
                    <Text style={styles.noPreviewText}>暂无画面</Text>
                  </View>
                )}

                {/* 状态信息 */}
                <View style={styles.cameraStatusRow}>
                  <View style={styles.cameraStatusItem}>
                    <FontAwesome6
                      name={cameraData.data.isRecording ? 'circle' : 'circle'}
                      size={14}
                      color={cameraData.data.isRecording ? colors.danger : colors.textMuted}
                    />
                    <Text style={styles.cameraStatusText}>
                      {cameraData.data.isRecording ? '录制中' : '待机'}
                    </Text>
                  </View>

                  <View style={styles.cameraStatusItem}>
                    <FontAwesome6
                      name={cameraData.data.motionDetected ? 'person-walking' : 'person'}
                      size={14}
                      color={cameraData.data.motionDetected ? colors.warning : colors.textMuted}
                    />
                    <Text style={styles.cameraStatusText}>
                      {cameraData.data.motionDetected ? '检测到移动' : '无移动'}
                    </Text>
                  </View>

                  {cameraData.data.batteryLevel !== undefined && (
                    <View style={styles.cameraStatusItem}>
                      <FontAwesome6 name="battery-three-quarters" size={14} color={colors.success} />
                      <Text style={styles.cameraStatusText}>{cameraData.data.batteryLevel}%</Text>
                    </View>
                  )}

                  <View style={styles.cameraStatusItem}>
                    <FontAwesome6 name="signal" size={14} color={colors.success} />
                    <Text style={styles.cameraStatusText}>{cameraData.data.signalStrength}%</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noDataCard}>
                <FontAwesome6 name="video" size={32} color={colors.textMuted} />
                <Text style={styles.noDataText}>暂无摄像头数据</Text>
                <Text style={styles.noDataHint}>等待老人端连接设备后同步</Text>
              </View>
            )}
          </View>

          {/* 数据同步说明 */}
          <View style={styles.infoSection}>
            <FontAwesome6 name="circle-info" size={16} color={colors.textMuted} />
            <Text style={styles.infoText}>
              数据由老人端蓝牙设备实时采集，通过网络同步到您的设备。请确保老人端已连接手环或摄像头。
            </Text>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

const createStyles = () =>
  StyleSheet.create({
    container: { flex: 1 },
    connectionStatus: { flexDirection: 'row', alignItems: 'center' },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusConnected: { backgroundColor: colors.success },
    statusDisconnected: { backgroundColor: colors.textMuted },
    statusText: { fontSize: 13, color: colors.textSecondary },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing['4xl'] },
    elderInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.lg,
      paddingVertical: Spacing.sm,
    },
    elderName: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginLeft: Spacing.sm },
    elderLabel: { fontSize: 14, color: colors.textSecondary, marginLeft: 4 },
    
    // 设备自检提醒
    alertsSection: {
      backgroundColor: colors.backgroundCard,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    alertsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.md,
      backgroundColor: colors.backgroundTertiary,
    },
    alertsHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    alertsTitle: { 
      fontSize: 16, 
      fontWeight: '600', 
      color: colors.textPrimary, 
      marginLeft: Spacing.sm 
    },
    alertBadge: {
      backgroundColor: colors.danger,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      marginLeft: Spacing.sm,
    },
    alertBadgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    alertsList: {
      padding: Spacing.sm,
    },
    alertItem: {
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
    },
    alertIconRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    alertIconBg: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    alertContent: {
      flex: 1,
      marginLeft: Spacing.sm,
    },
    alertTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    alertDeviceName: {
      fontSize: 14,
      fontWeight: '600',
    },
    alertMessage: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 18,
    },
    alertTime: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
    },

    section: { marginBottom: Spacing.xl },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    sectionIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginLeft: Spacing.sm, flex: 1 },
    updateTime: { fontSize: 12, color: colors.textMuted },
    dataCard: {
      backgroundColor: colors.backgroundCard,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    deviceInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    deviceName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    manufacturerText: { fontSize: 12, color: colors.textMuted, marginLeft: Spacing.sm },
    dataGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -Spacing.sm },
    dataItem: {
      width: '50%',
      paddingHorizontal: 0,
      paddingVertical: Spacing.md,
      alignItems: 'center',
    },
    dataValue: { fontSize: 28, fontWeight: '700', color: colors.textPrimary, marginTop: Spacing.xs },
    dataUnit: { fontSize: 12, color: colors.textMuted, marginLeft: 4 },
    dataLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    extraDataRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm, gap: Spacing.md },
    extraDataItem: { flexDirection: 'row', alignItems: 'center' },
    extraDataText: { fontSize: 14, color: colors.textSecondary, marginLeft: 6 },
    noDataCard: {
      backgroundColor: colors.backgroundCard,
      borderRadius: BorderRadius.lg,
      padding: Spacing['2xl'],
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    noDataText: { fontSize: 16, color: colors.textSecondary, marginTop: Spacing.md },
    noDataHint: { fontSize: 13, color: colors.textMuted, marginTop: Spacing.xs },
    cameraPreview: {
      height: 200,
      borderRadius: BorderRadius.md,
      overflow: 'hidden',
      marginBottom: Spacing.md,
      backgroundColor: '#1a2a3a',
    },
    cameraImage: { width: '100%', height: '100%' },
    liveBadge: {
      position: 'absolute',
      top: 10,
      left: 10,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(220, 53, 69, 0.9)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', marginRight: 4 },
    liveText: { fontSize: 11, color: '#fff', fontWeight: '700' },
    noPreview: {
      height: 150,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    noPreviewText: { fontSize: 14, color: colors.textMuted, marginTop: Spacing.sm },
    cameraStatusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
    cameraStatusItem: { flexDirection: 'row', alignItems: 'center' },
    cameraStatusText: { fontSize: 13, color: colors.textSecondary, marginLeft: 6 },
    infoSection: {
      flexDirection: 'row',
      backgroundColor: colors.backgroundTertiary,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      marginTop: Spacing.md,
    },
    infoText: { fontSize: 12, color: colors.textMuted, marginLeft: Spacing.sm, flex: 1, lineHeight: 18 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: Spacing.md },
  });
