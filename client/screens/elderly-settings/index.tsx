/**
 * 设置页面 - 适老化设计
 * 大字体、大按钮、高对比度
 */
import React, { useState, useCallback } from 'react';
import { View, ScrollView, Text, TouchableOpacity, Switch, Alert, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { HealthConnectPermission } from '@/components/HealthConnectPermission';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { PageHeader } from '@/components/PageHeader';

// 适老化配色：高对比度
const colors = {
  backgroundRoot: '#f0f7ff',
  primary: '#1E6BFF',
  textPrimary: '#1a1a1a',
  textSecondary: '#4a4a4a',
  textMuted: '#6a6a6a',
  border: '#e0e8f0',
  danger: '#D32F2F',
  gradientStart: '#e0ecff',
  gradientEnd: '#f0f7ff',
  deviceBg: '#f8faff',
  braceletBg: '#e8f5e9',
  cameraBg: '#e3f2fd',
};

// 通知设置接口
interface NotificationSettings {
  healthReminder: boolean;
  emergencyAlert: boolean;
  systemNotice: boolean;
  dailyReport: boolean;
  medicationReminder: boolean;
  weatherNotice: boolean;
}

export default function ElderlySettingsScreen() {
  const router = useSafeRouter();
  const { user, logout } = useAuth();

  const [notifications, setNotifications] = useState<NotificationSettings>({
    healthReminder: true,
    emergencyAlert: true,
    systemNotice: false,
    dailyReport: true,
    medicationReminder: true,
    weatherNotice: true,
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // 获取通知设置
  const fetchNotificationSettings = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setSettingsLoading(true);
      /**
       * 服务端文件：server/src/routes/users.ts
       * 接口：GET /api/v1/users/:id/notification-settings
       */
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/users/${user.id}/notification-settings`
      );
      const data = await response.json();
      
      if (data.success && data.settings) {
        setNotifications(data.settings);
      }
    } catch (error) {
      console.error('获取通知设置失败:', error);
    } finally {
      setSettingsLoading(false);
    }
  }, [user?.id]);

  // 更新通知设置
  const updateNotificationSetting = useCallback(async (key: keyof NotificationSettings, value: boolean) => {
    if (!user?.id) return;

    // 乐观更新UI
    setNotifications(prev => ({ ...prev, [key]: value }));
    setSavingKey(key);

    try {
      /**
       * 服务端文件：server/src/routes/users.ts
       * 接口：PUT /api/v1/users/:id/notification-settings
       * Body 参数：healthReminder, emergencyAlert, systemNotice, dailyReport, medicationReminder, weatherNotice
       */
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/users/${user.id}/notification-settings`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [key]: value }),
        }
      );
      const data = await response.json();
      
      if (!data.success) {
        // 如果失败，恢复原值
        setNotifications(prev => ({ ...prev, [key]: !value }));
        Alert.alert('提示', '设置保存失败，请重试');
      } else {
        // 成功提示（适老化：明显反馈）
        Alert.alert('设置已保存', value ? '已开启通知' : '已关闭通知');
      }
    } catch (error) {
      console.error('更新通知设置失败:', error);
      // 如果失败，恢复原值
      setNotifications(prev => ({ ...prev, [key]: !value }));
      Alert.alert('提示', '网络错误，请重试');
    } finally {
      setSavingKey(null);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchNotificationSettings();
    }, [fetchNotificationSettings])
  );

  const handleLogout = () => {
    Alert.alert('退出登录', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        locations={[0, 0.4]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 统一页面头部 */}
        <PageHeader title="设置" />

        {/* 整体卡片 */}
        <View style={styles.mainCard}>
          {/* 设备管理区块 - 两个并排入口 */}
          <View style={styles.block}>
            <Text style={styles.blockTitle}>设备管理</Text>
            <View style={styles.deviceGrid}>
              {/* 健康手环（合并通用手环和华为健康） */}
              <TouchableOpacity 
                style={[styles.deviceEntry, { backgroundColor: colors.braceletBg }]} 
                onPress={() => router.push('/bluetooth-bracelet')}
              >
                <View style={styles.deviceIcon}>
                  <FontAwesome6 name="heart-pulse" size={24} color="#4CAF50" />
                </View>
                <Text style={styles.deviceLabel}>健康手环</Text>
                <Text style={styles.deviceHint}>蓝牙/华为健康</Text>
              </TouchableOpacity>
              
              {/* WiFi摄像头 - 保持不变 */}
              <TouchableOpacity 
                style={[styles.deviceEntry, { backgroundColor: colors.cameraBg }]} 
                onPress={() => router.push('/wifi-camera')}
              >
                <View style={styles.deviceIcon}>
                  <FontAwesome6 name="video" size={24} color="#2196F3" />
                </View>
                <Text style={styles.deviceLabel}>摄像头</Text>
                <Text style={styles.deviceHint}>WiFi连接</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 分隔线 */}
          <View style={styles.separator} />

          {/* 健康数据授权区块 */}
          {Platform.OS === 'android' && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>健康数据授权</Text>
              <HealthConnectPermission />
            </View>
          )}

          {/* 分隔线 */}
          <View style={styles.separator} />

          {/* 通知设置区块 */}
          <View style={styles.block}>
            <View style={styles.blockTitleRow}>
              <Text style={styles.blockTitle}>通知设置</Text>
              {settingsLoading && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
            
            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <FontAwesome6 name="heart-pulse" size={18} color={colors.primary} />
                <Text style={styles.switchLabel}>健康提醒</Text>
                {savingKey === 'healthReminder' && (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
                )}
              </View>
              <Switch
                value={notifications.healthReminder}
                onValueChange={(v) => updateNotificationSetting('healthReminder', v)}
                trackColor={{ false: '#E5E7EB', true: colors.primary }}
                thumbColor="#FFFFFF"
                disabled={settingsLoading || savingKey !== null}
              />
            </View>
            
            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <FontAwesome6 name="bell" size={18} color="#E08B8B" />
                <Text style={styles.switchLabel}>紧急通知</Text>
                {savingKey === 'emergencyAlert' && (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
                )}
              </View>
              <Switch
                value={notifications.emergencyAlert}
                onValueChange={(v) => updateNotificationSetting('emergencyAlert', v)}
                trackColor={{ false: '#E5E7EB', true: colors.primary }}
                thumbColor="#FFFFFF"
                disabled={settingsLoading || savingKey !== null}
              />
            </View>
            
            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <FontAwesome6 name="pills" size={18} color="#6B8E4E" />
                <Text style={styles.switchLabel}>用药提醒</Text>
                {savingKey === 'medicationReminder' && (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
                )}
              </View>
              <Switch
                value={notifications.medicationReminder}
                onValueChange={(v) => updateNotificationSetting('medicationReminder', v)}
                trackColor={{ false: '#E5E7EB', true: colors.primary }}
                thumbColor="#FFFFFF"
                disabled={settingsLoading || savingKey !== null}
              />
            </View>
            
            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <FontAwesome6 name="cloud-sun" size={18} color="#E8B860" />
                <Text style={styles.switchLabel}>天气提醒</Text>
                {savingKey === 'weatherNotice' && (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
                )}
              </View>
              <Switch
                value={notifications.weatherNotice}
                onValueChange={(v) => updateNotificationSetting('weatherNotice', v)}
                trackColor={{ false: '#E5E7EB', true: colors.primary }}
                thumbColor="#FFFFFF"
                disabled={settingsLoading || savingKey !== null}
              />
            </View>
            
            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <FontAwesome6 name="file-medical" size={18} color="#5A8A7A" />
                <Text style={styles.switchLabel}>每日报告</Text>
                {savingKey === 'dailyReport' && (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
                )}
              </View>
              <Switch
                value={notifications.dailyReport}
                onValueChange={(v) => updateNotificationSetting('dailyReport', v)}
                trackColor={{ false: '#E5E7EB', true: colors.primary }}
                thumbColor="#FFFFFF"
                disabled={settingsLoading || savingKey !== null}
              />
            </View>
            
            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <FontAwesome6 name="bell" size={18} color={colors.textMuted} />
                <Text style={styles.switchLabel}>系统通知</Text>
                {savingKey === 'systemNotice' && (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
                )}
              </View>
              <Switch
                value={notifications.systemNotice}
                onValueChange={(v) => updateNotificationSetting('systemNotice', v)}
                trackColor={{ false: '#E5E7EB', true: colors.primary }}
                thumbColor="#FFFFFF"
                disabled={settingsLoading || savingKey !== null}
              />
            </View>
          </View>

          {/* 分隔线 */}
          <View style={styles.separator} />

          {/* 法律信息区块 */}
          <View style={styles.block}>
            <Text style={styles.blockTitle}>法律信息</Text>
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/user-agreement')}>
              <View style={styles.menuLeft}>
                <FontAwesome6 name="file-contract" size={18} color={colors.primary} />
                <Text style={styles.menuLabel}>用户协议</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/privacy-policy')}>
              <View style={styles.menuLeft}>
                <FontAwesome6 name="shield-halved" size={18} color={colors.primary} />
                <Text style={styles.menuLabel}>隐私政策</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* 分隔线 */}
          <View style={styles.separator} />

          {/* 退出登录 - 醒目按钮 */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <FontAwesome6 name="right-from-bracket" size={22} color="#FFFFFF" />
            <Text style={styles.logoutButtonText}>退出登录</Text>
          </TouchableOpacity>
        </View>

        {/* 版本信息 */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>AI助老 v1.0.0</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = {
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 0,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['4xl'],
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: Spacing.lg,
  },
  backIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700' as const,
    color: colors.textPrimary,
  },
  mainCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden' as const,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  block: {
    paddingHorizontal: 0,
    paddingVertical: Spacing.md,
  },
  blockTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: Spacing.sm,
  },
  blockTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F4F8',
    marginHorizontal: Spacing.lg,
  },
  // 设备管理并排入口
  deviceGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: Spacing.md,
  },
  deviceEntry: {
    width: '47%' as const,
    alignItems: 'center' as const,
    paddingVertical: Spacing.lg,
    paddingHorizontal: 0,
    borderRadius: BorderRadius.lg,
  },
  deviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: Spacing.sm,
  },
  deviceLabel: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  deviceHint: {
    fontSize: 14,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: Spacing.md,
  },
  switchLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  switchLabel: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '500' as const,
    color: colors.textPrimary,
    marginLeft: Spacing.md,
  },
  menuRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: Spacing.md,
  },
  menuLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  menuLabel: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '500' as const,
    color: colors.textPrimary,
    marginLeft: Spacing.md,
  },
  logoutButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.danger,
    paddingVertical: Spacing.lg,
    paddingHorizontal: 0,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
  },
  logoutButtonText: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginLeft: Spacing.sm,
  },
  footer: {
    alignItems: 'center' as const,
    marginTop: Spacing.xl,
  },
  versionText: {
    fontSize: 14,
    lineHeight: 18,
    color: colors.textMuted,
  },
};
