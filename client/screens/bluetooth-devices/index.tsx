/**
 * 蓝牙健康手环管理页面
 * 支持扫描、连接手环设备
 * 实时读取设备数据并推送到监护人端
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';
import { bluetoothService } from '@/services/bluetooth/BluetoothService';
import { BleDevice, DeviceType, BluetoothState, DEVICE_TYPE_CONFIG, SavedDevice, BraceletHealthData } from '@/services/bluetooth/types';

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
  bracelet: '#4CAF50',
};

export default function BluetoothDevicesScreen() {
  const router = useSafeRouter();
  const { user } = useAuth();

  const [btState, setBtState] = useState<BluetoothState>(bluetoothService.getState());
  const [isChecking, setIsChecking] = useState(false);
  const [uploadingDeviceId, setUploadingDeviceId] = useState<string | null>(null);

  const isSupported = bluetoothService.isSupported();

  // 订阅蓝牙状态变化
  useEffect(() => {
    const unsubscribe = bluetoothService.subscribe(setBtState);
    return unsubscribe;
  }, []);

  // 页面加载时刷新蓝牙状态
  useEffect(() => {
    refreshBluetoothState();
  }, []);

  // 刷新蓝牙状态
  const refreshBluetoothState = useCallback(async () => {
    setIsChecking(true);
    try {
      await bluetoothService.refreshState();
    } finally {
      setIsChecking(false);
    }
  }, []);

  // 上传设备数据到服务器
  const uploadDeviceData = useCallback(async (
    deviceId: string,
    device: BleDevice,
    data: BraceletHealthData
  ) => {
    if (!user?.id || !user?.boundUserId) return;

    setUploadingDeviceId(deviceId);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/devices/bracelet/data`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            device_id: deviceId,
            device_name: device.name,
            manufacturer: device.manufacturerName,
            data: data,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        console.log(`[设备数据] 上传成功: ${device.name} 推送: ${result.pushed}`);
      }
    } catch (error) {
      console.error('[设备数据] 上传失败:', error);
    } finally {
      setUploadingDeviceId(null);
    }
  }, [user]);

  // 开始扫描
  const handleScan = useCallback(async () => {
    if (btState.isScanning) {
      bluetoothService.stopScan();
      return;
    }

    setIsChecking(true);
    const isReady = await bluetoothService.checkBluetoothState();
    setIsChecking(false);

    if (!isReady) {
      Alert.alert(
        '蓝牙未开启',
        '请先在系统设置中开启蓝牙',
        [
          { text: '取消', style: 'cancel' },
          { text: '已开启', onPress: () => refreshBluetoothState() },
        ]
      );
      return;
    }

    bluetoothService.startScan(15000);
  }, [btState.isScanning, refreshBluetoothState]);

  // 连接设备
  const handleConnect = useCallback(async (device: BleDevice) => {
    const deviceType = bluetoothService.getDeviceType(device);
    const typeLabel = DEVICE_TYPE_CONFIG[deviceType]?.label || '设备';

    Alert.alert(
      '连接设备',
      `确定要连接 ${device.name || typeLabel} 吗？\n连接后将自动读取设备数据并推送给监护人。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '连接',
          onPress: async () => {
            const result = await bluetoothService.connectDevice(device.id);

            if (result) {
              // 注册数据回调
              bluetoothService.registerDataCallbacks(device.id, {
                onBraceletData: (deviceId: string, data: BraceletHealthData) => {
                  console.log(`[手环数据] 心率: ${data.heartRate} 步数: ${data.steps}`);
                  const connectedDevice = btState.connectedDevices.find(d => d.id === deviceId);
                  if (connectedDevice) {
                    uploadDeviceData(deviceId, connectedDevice, data);
                  }
                },
                onDisconnected: (deviceId: string) => {
                  Alert.alert('设备断开', '设备连接已断开');
                },
                onError: (deviceId: string, error: Error) => {
                  Alert.alert('设备错误', error.message);
                },
              });

              Alert.alert(
                '连接成功',
                `${device.name || typeLabel} 已连接\n厂商: ${result.manufacturerName || '未知'}\n型号: ${result.modelNumber || '未知'}`
              );
            } else {
              Alert.alert('连接失败', '无法连接该设备，请重试');
            }
          },
        },
      ]
    );
  }, [btState.connectedDevices, uploadDeviceData]);

  // 断开设备
  const handleDisconnect = useCallback(async (deviceId: string) => {
    await bluetoothService.disconnectDevice(deviceId);
  }, []);

  // 移除设备
  const handleRemove = useCallback((device: SavedDevice) => {
    Alert.alert(
      '移除设备',
      `确定要移除 "${device.customName || device.name}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '移除',
          style: 'destructive',
          onPress: () => bluetoothService.removeSavedDevice(device.id),
        },
      ]
    );
  }, []);

  // 获取设备类型颜色
  const getTypeColor = (type: DeviceType) => {
    switch (type) {
      case DeviceType.BRACELET:
        return colors.bracelet;
      default:
        return colors.textMuted;
    }
  };

  // 渲染已保存设备卡片
  const renderSavedDeviceCard = (device: SavedDevice) => {
    const isConnected = btState.connectedDevices.some((d) => d.id === device.id);
    const typeColor = getTypeColor(device.type);
    const displayName = device.customName || device.name;
    const isUploading = uploadingDeviceId === device.id;

    return (
      <View key={device.id} style={styles.deviceCard}>
        <View style={styles.deviceHeader}>
          <View style={[styles.typeIcon, { backgroundColor: typeColor + '20' }]}>
            <FontAwesome6 name={DEVICE_TYPE_CONFIG[device.type]?.icon || 'question'} size={20} color={typeColor} solid />
          </View>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>{displayName}</Text>
            <View style={styles.typeBadge}>
              <View style={[styles.typeDot, { backgroundColor: typeColor }]} />
              <Text style={[styles.typeText, { color: typeColor }]}>
                {DEVICE_TYPE_CONFIG[device.type]?.label}
              </Text>
            </View>
            {device.manufacturerName && (
              <Text style={styles.manufacturerText}>厂商: {device.manufacturerName}</Text>
            )}
          </View>
          {isConnected && (
            <View style={styles.connectedBadge}>
              {isUploading ? (
                <ActivityIndicator size="small" color={colors.success} />
              ) : (
                <View style={styles.connectedDot} />
              )}
              <Text style={styles.connectedText}>{isUploading ? '同步中' : '已连接'}</Text>
            </View>
          )}
        </View>

        <View style={styles.deviceActions}>
          {isConnected ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.disconnectButton]}
              onPress={() => handleDisconnect(device.id)}
            >
              <FontAwesome6 name="link-slash" size={16} color={colors.danger} />
              <Text style={styles.disconnectText}>断开</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.connectButton]}
              onPress={() => {
                const discovered = btState.discoveredDevices.find((d) => d.id === device.id);
                if (discovered) {
                  handleConnect(discovered);
                } else {
                  Alert.alert('提示', '设备不在范围内，请先扫描附近设备');
                }
              }}
            >
              <FontAwesome6 name="link" size={16} color={colors.primary} />
              <Text style={styles.connectText}>连接</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={() => handleRemove(device)}
          >
            <FontAwesome6 name="trash" size={16} color={colors.textMuted} />
            <Text style={styles.removeText}>移除</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 渲染扫描到的设备卡片
  const renderDiscoveredDeviceCard = (device: BleDevice) => {
    const isConnected = device.isConnected;
    const deviceType = bluetoothService.getDeviceType(device);
    const typeLabel = bluetoothService.getDeviceTypeLabel(deviceType);
    const typeColor = getTypeColor(deviceType);

    return (
      <View key={device.id} style={styles.deviceCard}>
        <View style={styles.deviceHeader}>
          <View style={[styles.typeIcon, { backgroundColor: typeColor + '20' }]}>
            <FontAwesome6 name={DEVICE_TYPE_CONFIG[deviceType]?.icon || 'question'} size={20} color={typeColor} />
          </View>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>{device.name || '未知设备'}</Text>
            <View style={styles.typeBadge}>
              <View style={[styles.typeDot, { backgroundColor: typeColor }]} />
              <Text style={[styles.typeText, { color: typeColor }]}>{typeLabel}</Text>
            </View>
            {device.manufacturerName && (
              <Text style={styles.manufacturerText}>厂商: {device.manufacturerName}</Text>
            )}
          </View>
          {isConnected && (
            <View style={styles.connectedBadge}>
              <View style={styles.connectedDot} />
              <Text style={styles.connectedText}>已连接</Text>
            </View>
          )}
        </View>

        <Text style={styles.signalText}>信号强度: {device.rssi} dBm</Text>

        <View style={styles.deviceActions}>
          {isConnected ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.disconnectButton]}
              onPress={() => handleDisconnect(device.id)}
            >
              <FontAwesome6 name="link-slash" size={16} color={colors.danger} />
              <Text style={styles.disconnectText}>断开</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.connectButton]}
              onPress={() => handleConnect(device)}
            >
              <FontAwesome6 name="link" size={16} color={colors.primary} />
              <Text style={styles.connectText}>连接</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const styles = useMemo(() => createStyles(), []);

  // Web端提示
  if (!isSupported || Platform.OS === 'web') {
    return (
      <Screen backgroundColor="transparent" statusBarStyle="dark">
        <GuardianBackground />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <FontAwesome6 name="arrow-left" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>蓝牙设备</Text>
            <View style={{ width: 48 }} />
          </View>
          <View style={styles.unsupportedContainer}>
            <FontAwesome6 name="bluetooth" size={64} color={colors.textMuted} />
            <Text style={styles.unsupportedText}>蓝牙功能仅支持 Android 和 iOS 设备</Text>
            <Text style={styles.unsupportedHint}>请在手机上使用此功能连接真实的健康手环或智能摄像头</Text>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <GuardianBackground />
      <View style={styles.container}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>蓝牙设备</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* 蓝牙状态栏 */}
        <TouchableOpacity
          style={[styles.statusBar, btState.isPoweredOn ? styles.statusBarOn : styles.statusBarOff]}
          onPress={refreshBluetoothState}
          disabled={isChecking}
        >
          {isChecking ? (
            <ActivityIndicator size="small" color={btState.isPoweredOn ? colors.primary : colors.warning} />
          ) : (
            <FontAwesome6
              name="bluetooth"
              size={20}
              color={btState.isPoweredOn ? colors.success : colors.warning}
            />
          )}
          <Text style={[styles.statusText, !btState.isPoweredOn && styles.statusTextWarning]}>
            {isChecking ? '检测中...' : btState.isPoweredOn ? '蓝牙已开启' : '蓝牙未开启，点击刷新'}
          </Text>
        </TouchableOpacity>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* 已连接设备 */}
          {btState.connectedDevices.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>已连接 ({btState.connectedDevices.length})</Text>
              {btState.connectedDevices.map((device) => renderDiscoveredDeviceCard(device))}
            </View>
          )}

          {/* 已保存的设备 */}
          {btState.savedDevices.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>我的设备 ({btState.savedDevices.length})</Text>
              {btState.savedDevices.map((device) => renderSavedDeviceCard(device))}
            </View>
          )}

          {/* 扫描结果 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                附近设备 {btState.discoveredDevices.length > 0 && `(${btState.discoveredDevices.length})`}
              </Text>
              <TouchableOpacity
                style={[styles.scanButton, btState.isScanning && styles.scanningButton]}
                onPress={handleScan}
                disabled={!btState.isPoweredOn && !btState.isScanning}
              >
                {btState.isScanning ? (
                  <>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.scanningText}>扫描中...</Text>
                  </>
                ) : (
                  <>
                    <FontAwesome6 name="arrows-rotate" size={16} color={btState.isPoweredOn ? colors.primary : colors.textMuted} />
                    <Text style={[styles.scanText, !btState.isPoweredOn && styles.scanTextDisabled]}>扫描</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {!btState.isPoweredOn ? (
              <View style={styles.emptyState}>
                <FontAwesome6 name="bluetooth" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>请先开启手机蓝牙</Text>
                <TouchableOpacity style={styles.retryButton} onPress={refreshBluetoothState}>
                  <FontAwesome6 name="arrows-rotate" size={16} color={colors.primary} />
                  <Text style={styles.retryText}>刷新状态</Text>
                </TouchableOpacity>
              </View>
            ) : btState.discoveredDevices.length === 0 ? (
              <View style={styles.emptyState}>
                <FontAwesome6 name="bluetooth-b" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>
                  {btState.isScanning ? '正在搜索附近设备...' : '点击右上角扫描附近设备'}
                </Text>
              </View>
            ) : (
              btState.discoveredDevices
                .filter((d) => !btState.savedDevices.some((s) => s.id === d.id))
                .map((device) => renderDiscoveredDeviceCard(device))
            )}
          </View>

          {/* 设备类型说明 */}
          <View style={styles.legendSection}>
            <Text style={styles.legendTitle}>支持的设备类型</Text>
            <View style={styles.legendGrid}>
              <View style={styles.legendItem}>
                <View style={[styles.legendIcon, { backgroundColor: colors.bracelet + '20' }]}>
                  <FontAwesome6 name="heart-pulse" size={16} color={colors.bracelet} />
                </View>
                <View style={styles.legendText}>
                  <Text style={styles.legendLabel}>健康手环</Text>
                  <Text style={styles.legendDesc}>监测心率、步数、睡眠等</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

const createStyles = () =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.md,
    },
    backButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      marginHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.md,
    },
    statusBarOn: { backgroundColor: '#E8F5E9' },
    statusBarOff: { backgroundColor: '#FFF3E0' },
    statusText: { marginLeft: Spacing.sm, fontSize: 15, color: colors.success, fontWeight: '500' },
    statusTextWarning: { color: colors.warning },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['4xl'] },
    section: { marginBottom: Spacing.xl },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
    scanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: colors.backgroundTertiary,
      borderRadius: BorderRadius.md,
    },
    scanningButton: { backgroundColor: '#E3F2FD' },
    scanText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
    scanTextDisabled: { color: colors.textMuted },
    scanningText: { fontSize: 15, color: colors.primary, marginLeft: 6 },
    deviceCard: {
      backgroundColor: colors.backgroundCard,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    deviceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
    typeIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    deviceInfo: { flex: 1, marginLeft: Spacing.md },
    deviceName: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
    typeBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    typeDot: { width: 6, height: 6, borderRadius: 3 },
    typeText: { fontSize: 13, marginLeft: 6, fontWeight: '500' },
    manufacturerText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    connectedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#E8F5E9',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    connectedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
    connectedText: { fontSize: 12, color: colors.success, marginLeft: 4, fontWeight: '500' },
    signalText: { fontSize: 12, color: colors.textMuted, marginLeft: 58 },
    deviceActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
    },
    connectButton: { backgroundColor: colors.backgroundTertiary },
    connectText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
    disconnectButton: { backgroundColor: '#FFEBEE' },
    disconnectText: { fontSize: 14, color: colors.danger, fontWeight: '500' },
    removeButton: { backgroundColor: colors.backgroundTertiary },
    removeText: { fontSize: 14, color: colors.textMuted },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'] },
    emptyText: { fontSize: 15, color: colors.textMuted, marginTop: Spacing.md, textAlign: 'center' },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      backgroundColor: colors.backgroundTertiary,
      borderRadius: BorderRadius.md,
    },
    retryText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
    legendSection: { marginTop: Spacing.md },
    legendTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginBottom: Spacing.md },
    legendGrid: { gap: Spacing.sm },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundCard,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
    },
    legendIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    legendText: { marginLeft: Spacing.md, flex: 1 },
    legendLabel: { fontSize: 15, fontWeight: '500', color: colors.textPrimary },
    legendDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    unsupportedContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Spacing.xl,
    },
    unsupportedText: { fontSize: 18, color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.lg },
    unsupportedHint: { fontSize: 14, color: colors.textMuted, marginTop: Spacing.sm, textAlign: 'center' },
  });
