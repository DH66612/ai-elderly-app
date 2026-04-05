/**
 * 蓝牙健康手环管理页面
 * 清雅风格：蓝牙扫描、连接、数据读取
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';
import { bluetoothService } from '@/services/bluetooth/BluetoothService';
import { BleDevice, BluetoothState, BraceletHealthData } from '@/services/bluetooth/types';

// 清雅色调（与全局统一）
const colors = {
  backgroundRoot: '#f0f5fa',
  backgroundCard: '#ffffff',
  backgroundTertiary: '#eaf0f5',
  primary: '#8ab3cf',
  primaryLight: '#e3f0f7',
  primaryDark: '#7fa5c0',
  success: '#a6c1d9',
  successText: '#5e7e9f',
  warning: '#fdf0d8',
  warningText: '#5e7e9f',
  danger: '#e2c6c6',
  dangerText: '#b87a7a',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#9aa9b7',
  border: '#d6e4f0',
};

export default function BluetoothBraceletScreen() {
  const { theme, isDark } = useTheme();
  const router = useSafeRouter();
  const { user } = useAuth();

  const [btState, setBtState] = useState<BluetoothState>(bluetoothService.getState());
  const [healthData, setHealthData] = useState<BraceletHealthData | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const isBluetoothSupported = bluetoothService.isSupported();

  useEffect(() => {
    const unsubscribe = bluetoothService.subscribe(setBtState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const devices = btState.connectedDevices;
    if (devices.length === 0) return;
    const cleanups: (() => void)[] = [];
    devices.forEach(device => {
      const cleanup = bluetoothService.registerDataCallbacks(device.id, {
        onBraceletData: (_, data) => {
          setHealthData(data);
          uploadHealthData(device, data);
        },
        onDisconnected: () => Alert.alert('设备断开', `${device.name || '手环'} 已断开连接`),
      });
      cleanups.push(cleanup);
    });
    return () => cleanups.forEach(c => c());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [btState.connectedDevices.length]);

  const refreshBluetoothState = useCallback(async () => {
    await bluetoothService.refreshState();
  }, []);

  const handleScanBracelet = useCallback(async () => {
    if (btState.isScanning) { bluetoothService.stopScan(); return; }
    const isReady = await bluetoothService.checkBluetoothState();
    if (!isReady) {
      Alert.alert('蓝牙未开启', '请先在系统设置中开启蓝牙', [
        { text: '取消', style: 'cancel' },
        { text: '已开启', onPress: () => refreshBluetoothState() },
      ]);
      return;
    }
    bluetoothService.startScan(15000);
  }, [btState.isScanning, refreshBluetoothState]);

  const handleConnectBracelet = useCallback(async (device: BleDevice) => {
    const result = await bluetoothService.connectDevice(device.id);
    if (result) Alert.alert('连接成功', `${device.name || '手环'} 已连接\n厂商: ${result.manufacturerName || '未知'}`);
    else Alert.alert('连接失败', '无法连接该设备，请重试');
  }, []);

  const handleDisconnectBracelet = useCallback(async (deviceId: string) => {
    await bluetoothService.disconnectDevice(deviceId);
    setHealthData(null);
  }, []);

  const uploadHealthData = useCallback(async (device: BleDevice, data: BraceletHealthData) => {
    if (!user?.id || !user?.boundUserId) return;
    setIsUploading(true);
    try {
      await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/device-data/bracelet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, device_id: device.id, device_name: device.name, manufacturer: device.manufacturerName, data }),
      });
    } catch (error) { console.error('上传健康数据失败:', error); }
    finally { setIsUploading(false); }
  }, [user]);

  const handleSyncData = useCallback(async () => {
    const device = btState.connectedDevices[0];
    if (!device) return;
    const data = await bluetoothService.readHealthData(device.id);
    if (data) {
      setHealthData(data);
      await uploadHealthData(device, data);
      const heartRateText = data.heartRate !== null ? `${data.heartRate} bpm` : '读取失败';
      Alert.alert('同步成功', `心率: ${heartRateText}\n\n注：步数、卡路里等数据需要品牌特定协议支持`);
    }
  }, [btState.connectedDevices, uploadHealthData]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <GuardianBackground />
      <View style={styles.container}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h2" color={colors.textPrimary}>蓝牙健康手环</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* 蓝牙不支持提示 */}
          {!isBluetoothSupported && (
            <ThemedView level="default" style={styles.statusCard}>
              <FontAwesome6 name="bluetooth" size={24} color={colors.textMuted} />
              <ThemedText variant="body" color={colors.textSecondary}>
                {Platform.OS === 'web' ? 'Web端不支持蓝牙功能' : '蓝牙功能需要在手机上使用'}
              </ThemedText>
            </ThemedView>
          )}

          {/* 蓝牙状态 */}
          {isBluetoothSupported && (
            <TouchableOpacity 
              style={[styles.statusCard, btState.isPoweredOn ? styles.statusOnline : styles.statusOffline]}
              onPress={refreshBluetoothState}
            >
              <FontAwesome6 name="bluetooth" size={20} color={btState.isPoweredOn ? colors.successText : colors.warningText} />
              <ThemedText variant="body" color={colors.textPrimary}>
                {btState.isPoweredOn ? '蓝牙已开启' : '蓝牙未开启，点击刷新'}
              </ThemedText>
            </TouchableOpacity>
          )}

          {/* 当前健康数据 */}
          {healthData && (
            <View style={styles.section}>
              <ThemedText variant="caption" color={colors.textMuted} style={styles.sectionLabel}>当前健康数据</ThemedText>
              <ThemedView level="default" style={styles.healthCard}>
                <View style={styles.healthGrid}>
                  {/* 心率 - 标准BLE服务支持 */}
                  <View style={styles.healthItem}>
                    <View style={[styles.healthIconBg, { backgroundColor: '#faf0f0' }]}>
                      <FontAwesome6 name="heart-pulse" size={18} color={colors.dangerText} />
                    </View>
                    <ThemedText variant="h2" color={colors.textPrimary}>
                      {healthData.heartRate !== null ? healthData.heartRate : '--'}
                    </ThemedText>
                    <ThemedText variant="small" color={colors.textSecondary}>心率 bpm</ThemedText>
                    {healthData.dataSource.heartRate === 'standard' && (
                      <View style={styles.supportedBadge}>
                        <ThemedText variant="small" color={colors.successText}>✓ 支持</ThemedText>
                      </View>
                    )}
                  </View>
                  {/* 步数 - 需要品牌协议 */}
                  <View style={styles.healthItem}>
                    <View style={[styles.healthIconBg, { backgroundColor: colors.primaryLight }]}>
                      <FontAwesome6 name="shoe-prints" size={18} color={colors.primary} />
                    </View>
                    <ThemedText variant="h2" color={colors.textMuted}>
                      {healthData.steps !== null ? healthData.steps : '--'}
                    </ThemedText>
                    <ThemedText variant="small" color={colors.textMuted}>步数</ThemedText>
                  </View>
                  {/* 卡路里 - 需要品牌协议 */}
                  <View style={styles.healthItem}>
                    <View style={[styles.healthIconBg, { backgroundColor: '#f5f0e8' }]}>
                      <FontAwesome6 name="fire" size={18} color={colors.warningText} />
                    </View>
                    <ThemedText variant="h2" color={colors.textMuted}>
                      {healthData.calories !== null ? healthData.calories : '--'}
                    </ThemedText>
                    <ThemedText variant="small" color={colors.textMuted}>卡路里</ThemedText>
                  </View>
                </View>
                <TouchableOpacity style={styles.syncButton} onPress={handleSyncData} disabled={isUploading}>
                  {isUploading ? <ActivityIndicator size="small" color="#fff" /> : <FontAwesome6 name="arrows-rotate" size={14} color="#fff" />}
                  <ThemedText variant="smallMedium" color="#fff">同步数据到监护人</ThemedText>
                </TouchableOpacity>
              </ThemedView>
              
              {/* 数据说明 */}
              <View style={styles.dataNote}>
                <FontAwesome6 name="circle-info" size={14} color={colors.textMuted} />
                <ThemedText variant="small" color={colors.textMuted}>
                  {' '}心率通过标准BLE服务读取，步数/卡路里需要品牌特定协议
                </ThemedText>
              </View>
            </View>
          )}

          {/* 已连接的手环 */}
          {btState.connectedDevices.length > 0 && (
            <View style={styles.section}>
              <ThemedText variant="caption" color={colors.textMuted} style={styles.sectionLabel}>已连接手环</ThemedText>
              {btState.connectedDevices.map(device => (
                <ThemedView key={device.id} level="default" style={styles.deviceCard}>
                  <View style={styles.deviceHeader}>
                    <View style={[styles.deviceIcon, { backgroundColor: '#faf0f0' }]}>
                      <FontAwesome6 name="heart-pulse" size={18} color={colors.dangerText} />
                    </View>
                    <View style={styles.deviceInfo}>
                      <ThemedText variant="bodyMedium" color={colors.textPrimary}>{device.name || '健康手环'}</ThemedText>
                      <ThemedText variant="small" color={colors.textSecondary}>
                        厂商: {device.manufacturerName || '未知'}
                      </ThemedText>
                      {device.modelNumber && (
                        <ThemedText variant="small" color={colors.textSecondary}>型号: {device.modelNumber}</ThemedText>
                      )}
                    </View>
                    <View style={styles.connectedBadge}>
                      <View style={styles.connectedDot} />
                      <ThemedText variant="small" color={colors.successText}>已连接</ThemedText>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.disconnectBtn} onPress={() => handleDisconnectBracelet(device.id)}>
                    <FontAwesome6 name="link-slash" size={14} color={colors.dangerText} />
                    <ThemedText variant="small" color={colors.dangerText}>断开连接</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              ))}
            </View>
          )}

          {/* 扫描按钮 */}
          {isBluetoothSupported && btState.isPoweredOn && (
            <TouchableOpacity
              style={[styles.scanButton, btState.isScanning && styles.scanningButton]}
              onPress={handleScanBracelet}
            >
              {btState.isScanning ? (
                <>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <ThemedText variant="bodyMedium" color={colors.primary}>扫描中...</ThemedText>
                </>
              ) : (
                <>
                  <FontAwesome6 name="magnifying-glass" size={16} color="#fff" />
                  <ThemedText variant="bodyMedium" color="#fff">扫描附近手环</ThemedText>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* 发现的设备 */}
          {btState.discoveredDevices.filter(d => !btState.connectedDevices.some(c => c.id === d.id)).length > 0 && (
            <View style={styles.section}>
              <ThemedText variant="caption" color={colors.textMuted} style={styles.sectionLabel}>发现的手环</ThemedText>
              {btState.discoveredDevices
                .filter(d => !btState.connectedDevices.some(c => c.id === d.id))
                .map(device => (
                  <TouchableOpacity key={device.id} style={styles.deviceCard} onPress={() => handleConnectBracelet(device)}>
                    <View style={styles.deviceHeader}>
                      <View style={[styles.deviceIcon, { backgroundColor: colors.primaryLight }]}>
                        <FontAwesome6 name="heart-pulse" size={18} color={colors.primary} />
                      </View>
                      <View style={styles.deviceInfo}>
                        <ThemedText variant="bodyMedium" color={colors.textPrimary}>{device.name || '健康手环'}</ThemedText>
                        <ThemedText variant="small" color={colors.textSecondary}>
                          厂商: {device.manufacturerName || '未知'}
                        </ThemedText>
                        <ThemedText variant="small" color={colors.textSecondary}>信号: {device.rssi} dBm</ThemedText>
                      </View>
                      <FontAwesome6 name="chevron-right" size={14} color={colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          )}

          {/* 使用说明 */}
          <View style={styles.helpSection}>
            <ThemedText variant="smallMedium" color={colors.textPrimary}>使用说明</ThemedText>
            <ThemedText variant="small" color={colors.textSecondary}>
              {'\n'}1. 确保手机蓝牙已开启{'\n'}
              2. 点击&ldquo;扫描附近手环&rdquo;搜索设备{'\n'}
              3. 点击发现的设备进行连接{'\n'}
              4. 连接成功后自动监测健康数据{'\n'}
              5. 数据会自动同步给监护人
            </ThemedText>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

const createStyles = (_theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 0, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 0, paddingBottom: Spacing['5xl'] },

  // 状态卡片
  statusCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, gap: Spacing.sm },
  statusOnline: { backgroundColor: '#eaf3fa' },
  statusOffline: { backgroundColor: '#faf3e0' },

  // 区块
  section: { marginBottom: Spacing.xl },
  sectionLabel: { marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },

  // 健康数据
  healthCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, shadowColor: '#a3b8cc', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  healthGrid: { flexDirection: 'row', gap: Spacing.md },
  healthItem: { flex: 1, alignItems: 'center', padding: Spacing.md, backgroundColor: colors.backgroundTertiary, borderRadius: BorderRadius.md, gap: Spacing.xs },
  healthIconBg: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  supportedBadge: { marginTop: Spacing.xs },
  syncButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.md, gap: Spacing.xs },
  dataNote: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, paddingHorizontal: 0 },

  // 设备卡片
  deviceCard: { backgroundColor: colors.backgroundCard, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, shadowColor: '#a3b8cc', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  deviceHeader: { flexDirection: 'row', alignItems: 'center' },
  deviceIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  deviceInfo: { flex: 1, marginLeft: Spacing.sm },
  connectedBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  connectedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.successText },
  disconnectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm, padding: Spacing.sm, backgroundColor: '#faf0f0', borderRadius: BorderRadius.md, gap: Spacing.xs },

  // 扫描按钮
  scanButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, padding: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.lg, gap: Spacing.sm },
  scanningButton: { backgroundColor: colors.primaryLight },

  // 帮助
  helpSection: { backgroundColor: colors.backgroundTertiary, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.md },
});