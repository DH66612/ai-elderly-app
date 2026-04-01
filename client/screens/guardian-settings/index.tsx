/**
 * 设置页面 - 清雅风格
 * 通知设置、用户协议、隐私政策（整体卡片样式）
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';

// 清雅色调
const colors = {
  backgroundRoot: '#f0f5fa',
  primary: '#8ab3cf',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#8fa5bb',
  border: '#d6e4f0',
  danger: '#c97a7a',
  gradientStart: '#b8e0e8',
  gradientEnd: '#f0f5fa',
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

export default function GuardianSettingsScreen() {
  const router = useSafeRouter();
  const { user, logout, updateUser } = useAuth();

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

  const fetchUserInfo = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/users/${user.id}`
      );
      const data = await response.json();
      if (data.user) updateUser(data.user);
    } catch (error) {
      console.error('Fetch user info error:', error);
    }
  }, [user, updateUser]);

  useFocusEffect(
    useCallback(() => {
      fetchUserInfo();
      fetchNotificationSettings();
    }, [fetchUserInfo, fetchNotificationSettings])
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
      <GuardianBackground />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>设置</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* 整体卡片 */}
        <View style={styles.mainCard}>
          {/* 设备管理区块 */}
          <View style={styles.block}>
            <Text style={styles.blockTitle}>设备管理</Text>
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/device-monitor')}>
              <View style={styles.menuLeft}>
                <FontAwesome6 name="desktop" size={12} color={colors.primary} />
                <Text style={styles.menuLabel}>设备监控</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={12} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/guardian-huawei-health')}>
              <View style={styles.menuLeft}>
                <FontAwesome6 name="heart-circle-check" size={12} color="#CF0A2C" />
                <Text style={styles.menuLabel}>华为健康</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={12} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

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
                <FontAwesome6 name="heart-pulse" size={12} color={colors.primary} />
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
                <FontAwesome6 name="bell" size={12} color="#E08B8B" />
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
                <FontAwesome6 name="pills" size={12} color="#6B8E4E" />
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
                <FontAwesome6 name="cloud-sun" size={12} color="#E8B860" />
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
                <FontAwesome6 name="file-medical" size={12} color="#5A8A7A" />
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
                <FontAwesome6 name="bell" size={12} color={colors.textMuted} />
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
                <FontAwesome6 name="file-contract" size={12} color={colors.primary} />
                <Text style={styles.menuLabel}>用户协议</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={12} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/privacy-policy')}>
              <View style={styles.menuLeft}>
                <FontAwesome6 name="shield-halved" size={12} color={colors.primary} />
                <Text style={styles.menuLabel}>隐私政策</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={12} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* 分隔线 */}
          <View style={styles.separator} />

          {/* 退出登录 - 醒目按钮 */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <FontAwesome6 name="right-from-bracket" size={18} color="#FFFFFF" />
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
    paddingHorizontal: Spacing.lg,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '500' as const,
    color: colors.textPrimary,
  },
  mainCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden' as const,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  block: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  blockTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: Spacing.sm,
  },
  blockTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    color: colors.textMuted,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F4F8',
    marginHorizontal: Spacing.lg,
  },
  switchRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: Spacing.sm,
  },
  switchLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500' as const,
    color: colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  menuRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: Spacing.sm,
  },
  menuLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  menuLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500' as const,
    color: colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  logoutButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.danger,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
  },
  logoutButtonText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginLeft: Spacing.sm,
  },
  footer: {
    alignItems: 'center' as const,
    marginTop: Spacing.xl,
  },
  versionText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
};
