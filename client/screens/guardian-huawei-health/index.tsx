/**
 * 监护人端 - 华为健康页面
 * 
 * 功能：
 * 1. 查看老人华为健康绑定状态
 * 2. 查看老人健康数据
 * 3. 绑定自己的华为健康（可选）
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';

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
  huaweiRed: '#CF0A2C',
};

interface HealthData {
  heart_rate?: { value: number; unit: string; time: string };
  step?: { value: number; unit: string; time: string };
  sleep?: { value: number; unit: string; time: string };
  blood_pressure?: { value: string; unit: string; time: string };
  blood_oxygen?: { value: number; unit: string; time: string };
}

export default function GuardianHuaweiHealthScreen() {
  const { user } = useAuth();
  const router = useSafeRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [healthData, setHealthData] = useState<HealthData>({});
  const [elderName, setElderName] = useState('');

  const elderId = user?.boundUserId;

  // 获取健康数据
  const fetchHealthData = useCallback(async () => {
    if (!elderId) {
      setLoading(false);
      return;
    }

    try {
      /**
       * 服务端文件：server/src/routes/huawei-health.ts
       * 接口：GET /api/v1/huawei-health/status
       * Query 参数：userId: number
       */
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/huawei-health/status?userId=${elderId}`
      );
      const data = await response.json();
      
      setAuthorized(data.authorized || false);
      
      if (data.authorized) {
        // 同步获取最新数据
        const syncResponse = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/huawei-health/sync`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: elderId }),
          }
        );
        const syncData = await syncResponse.json();
        
        if (syncData.success) {
          setHealthData(syncData.data || {});
        }
      }
    } catch (error) {
      console.error('获取健康数据失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [elderId]);

  // 获取老人名称
  useEffect(() => {
    if (user?.boundUserName) {
      setElderName(user.boundUserName);
    }
  }, [user?.boundUserName]);

  useFocusEffect(
    useCallback(() => {
      fetchHealthData();
    }, [fetchHealthData])
  );

  // 刷新数据
  const handleRefresh = () => {
    setRefreshing(true);
    fetchHealthData();
  };

  // 手动同步
  const handleSync = async () => {
    if (!elderId) return;
    
    setSyncing(true);
    try {
      /**
       * 服务端文件：server/src/routes/huawei-health.ts
       * 接口：POST /api/v1/huawei-health/sync
       * Body 参数：userId: number
       */
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/huawei-health/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: elderId }),
        }
      );
      const data = await response.json();
      
      if (data.success) {
        setHealthData(data.data || {});
        Alert.alert('同步成功', '健康数据已更新');
      } else {
        Alert.alert('同步失败', data.error || '请让老人重新授权');
      }
    } catch (error) {
      console.error('同步失败:', error);
      Alert.alert('同步失败', '网络错误，请重试');
    } finally {
      setSyncing(false);
    }
  };

  // 渲染健康数据卡片
  const renderDataCard = (
    icon: string,
    title: string,
    value: string | undefined,
    unit: string,
    time: string | undefined,
    color: string
  ) => (
    <View style={styles.dataCard}>
      <View style={[styles.dataIconBg, { backgroundColor: color + '20' }]}>
        <FontAwesome6 name={icon} size={20} color={color} />
      </View>
      <View style={styles.dataContent}>
        <Text style={styles.dataTitle}>{title}</Text>
        <Text style={styles.dataValue}>
          {value || '--'}
          <Text style={styles.dataUnit}> {unit}</Text>
        </Text>
        {time && <Text style={styles.dataTime}>更新于 {time}</Text>}
      </View>
    </View>
  );

  if (loading) {
    return (
      <Screen backgroundColor="transparent" statusBarStyle="dark">
        <GuardianBackground />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <GuardianBackground />
      
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* 标题栏 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>华为健康</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* 老人信息卡片 */}
        <View style={styles.elderCard}>
          <View style={styles.elderAvatar}>
            <FontAwesome6 name="user" size={24} color={colors.textMuted} />
          </View>
          <View style={styles.elderInfo}>
            <Text style={styles.elderName}>{elderName || '老人'}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: authorized ? colors.success : colors.warning }]} />
              <Text style={styles.statusText}>
                {authorized ? '已绑定华为健康' : '未绑定华为健康'}
              </Text>
            </View>
          </View>
        </View>

        {/* 未绑定提示 */}
        {!authorized && (
          <View style={styles.emptyCard}>
            <FontAwesome6 name="link-slash" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>老人未绑定华为健康</Text>
            <Text style={styles.emptyDesc}>
              请在老人端的 设置 {'>'} 设备管理 {'>'} 华为健康 中进行授权绑定
            </Text>
          </View>
        )}

        {/* 健康数据展示 */}
        {authorized && Object.keys(healthData).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>今日健康数据</Text>
              <TouchableOpacity
                style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
                onPress={handleSync}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <FontAwesome6 name="rotate" size={12} color="#FFFFFF" />
                )}
                <Text style={styles.syncButtonText}>{syncing ? '同步中' : '同步'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dataGrid}>
              {healthData.heart_rate && renderDataCard(
                'heart-pulse',
                '心率',
                healthData.heart_rate.value?.toString(),
                'bpm',
                healthData.heart_rate.time,
                '#EF4444'
              )}

              {healthData.step && renderDataCard(
                'person-walking',
                '步数',
                healthData.step.value?.toString(),
                '步',
                healthData.step.time,
                '#10B981'
              )}

              {healthData.sleep && renderDataCard(
                'moon',
                '睡眠',
                healthData.sleep.value?.toString(),
                '小时',
                healthData.sleep.time,
                '#6366F1'
              )}

              {healthData.blood_pressure && renderDataCard(
                'droplet',
                '血压',
                healthData.blood_pressure.value,
                'mmHg',
                healthData.blood_pressure.time,
                '#F59E0B'
              )}

              {healthData.blood_oxygen && renderDataCard(
                'wind',
                '血氧',
                healthData.blood_oxygen.value?.toString(),
                '%',
                healthData.blood_oxygen.time,
                '#0EA5E9'
              )}
            </View>
          </View>
        )}

        {/* 绑定指南 */}
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>绑定指南</Text>
          <Text style={styles.guideText}>
            1. 确保老人拥有华为/荣耀智能手表或手环{'\n'}
            2. 在老人端设置页面点击「华为健康」{'\n'}
            3. 登录华为账号并授权健康数据{'\n'}
            4. 授权成功后数据将自动同步
          </Text>
        </View>

        {/* 支持的设备 */}
        <View style={styles.devicesCard}>
          <Text style={styles.cardTitle}>支持的设备</Text>
          <View style={styles.deviceList}>
            {['华为 Watch GT 系列', '华为手环系列', '荣耀手表系列', '荣耀手环系列'].map((device, index) => (
              <View key={index} style={styles.deviceItem}>
                <FontAwesome6 name="watch" size={12} color={colors.textSecondary} />
                <Text style={styles.deviceText}>{device}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = {
  container: {
    flex: 1,
  } as const,
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['4xl'],
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: colors.textSecondary,
  },
  elderCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  elderAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  elderInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  elderName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  statusRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  emptyCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing['2xl'],
    alignItems: 'center' as const,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  syncButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.primary,
    paddingHorizontal: 0,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    marginLeft: Spacing.xs,
  },
  dataGrid: {
    gap: Spacing.sm,
  },
  dataCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  dataIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  dataContent: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  dataTitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  dataValue: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  dataUnit: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textMuted,
  },
  dataTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  guideCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  guideText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  devicesCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  deviceList: {
    gap: Spacing.xs,
  },
  deviceItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: Spacing.xs,
  },
  deviceText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: Spacing.sm,
  },
};
