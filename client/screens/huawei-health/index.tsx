/**
 * 华为健康设备绑定页面
 * 
 * 功能：
 * 1. 显示华为健康绑定状态
 * 2. 引导用户授权华为健康
 * 3. 同步健康数据
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
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';

// 颜色配置
const colors = {
  primary: '#4F46E5',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  background: '#F9FAFB',
  card: '#FFFFFF',
  border: '#E5E7EB',
  huaweiRed: '#CF0A2C',
};

interface HuaweiHealthStatus {
  authorized: boolean;
  expiresAt?: string;
  createdAt?: string;
  configured: boolean;
}

export default function HuaweiHealthScreen() {
  const { user } = useAuth();
  const router = useSafeRouter();
  
  const [status, setStatus] = useState<HuaweiHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [healthData, setHealthData] = useState<Record<string, any>>({});

  // 检查授权状态
  const checkStatus = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      /**
       * 服务端文件：server/src/routes/huawei-health.ts
       * 接口：GET /api/v1/huawei-health/status
       * Query 参数：userId: number
       */
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/huawei-health/status?userId=${user.id}`
      );
      const data = await response.json();
      
      if (data.success) {
        setStatus(data);
      }
    } catch (error) {
      console.error('检查状态失败:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // 开始授权
  const handleAuthorize = async () => {
    if (!user?.id) return;
    
    try {
      /**
       * 服务端文件：server/src/routes/huawei-health.ts
       * 接口：GET /api/v1/huawei-health/auth-url
       * Query 参数：userId: number
       */
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/huawei-health/auth-url?userId=${user.id}`
      );
      const data = await response.json();
      
      if (data.success) {
        // 打开授权页面
        await Linking.openURL(data.authUrl);
      } else {
        Alert.alert('授权失败', data.error || '获取授权地址失败');
      }
    } catch (error) {
      console.error('授权失败:', error);
      Alert.alert('授权失败', '网络错误，请重试');
    }
  };

  // 同步数据
  const handleSync = async () => {
    if (!user?.id) return;
    
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
          body: JSON.stringify({ userId: user.id }),
        }
      );
      const data = await response.json();
      
      if (data.success) {
        setHealthData(data.data || {});
        Alert.alert('同步成功', '健康数据已更新');
      } else {
        if (data.needAuth) {
          Alert.alert('授权已过期', '请重新授权华为健康', [
            { text: '取消', style: 'cancel' },
            { text: '重新授权', onPress: handleAuthorize },
          ]);
        } else {
          Alert.alert('同步失败', data.error);
        }
      }
    } catch (error) {
      console.error('同步失败:', error);
      Alert.alert('同步失败', '网络错误，请重试');
    } finally {
      setSyncing(false);
    }
  };

  // 取消授权
  const handleRevoke = async () => {
    if (!user?.id) return;
    
    Alert.alert('取消授权', '确定要取消华为健康授权吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: async () => {
          try {
            /**
             * 服务端文件：server/src/routes/huawei-health.ts
             * 接口：DELETE /api/v1/huawei-health/revoke
             * Body 参数：userId: number
             */
            const response = await fetch(
              `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/huawei-health/revoke`,
              {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
              }
            );
            const data = await response.json();
            
            if (data.success) {
              setStatus({ authorized: false, configured: status?.configured || false });
              setHealthData({});
              Alert.alert('已取消授权');
            }
          } catch (error) {
            console.error('取消授权失败:', error);
            Alert.alert('操作失败', '请重试');
          }
        },
      },
    ]);
  };

  // 渲染健康数据项
  const renderDataItem = (icon: string, label: string, value: string, unit: string) => (
    <View style={styles.dataItem}>
      <View style={styles.dataIcon}>
        <FontAwesome6 name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.dataInfo}>
        <Text style={styles.dataLabel}>{label}</Text>
        <Text style={styles.dataValue}>
          {value} <Text style={styles.dataUnit}>{unit}</Text>
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* 标题栏 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>华为健康</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* 华为品牌卡片 */}
        <View style={styles.brandCard}>
          <View style={styles.brandLogo}>
            <FontAwesome6 name="heart-pulse" size={40} color={colors.huaweiRed} />
          </View>
          <Text style={styles.brandTitle}>华为运动健康</Text>
          <Text style={styles.brandDesc}>
            连接华为/荣耀智能手表、手环，实时同步心率、血氧、睡眠等健康数据
          </Text>
        </View>

        {/* 未配置提示 */}
        {status && !status.configured && (
          <View style={styles.warningCard}>
            <FontAwesome6 name="triangle-exclamation" size={24} color={colors.warning} />
            <Text style={styles.warningText}>
              华为健康API未配置，请联系管理员完成配置
            </Text>
          </View>
        )}

        {/* 授权状态 */}
        {status?.configured && (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <FontAwesome6 
                name={status.authorized ? "circle-check" : "circle-xmark"} 
                size={24} 
                color={status.authorized ? colors.success : colors.danger} 
              />
              <Text style={styles.statusTitle}>
                {status.authorized ? '已授权' : '未授权'}
              </Text>
            </View>
            
            {status.authorized && status.expiresAt && (
              <Text style={styles.statusInfo}>
                授权有效期至：{new Date(status.expiresAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        {/* 健康数据展示 */}
        {status?.authorized && Object.keys(healthData).length > 0 && (
          <View style={styles.dataCard}>
            <Text style={styles.cardTitle}>今日健康数据</Text>
            <View style={styles.dataGrid}>
              {healthData.heart_rate && renderDataItem('heart-pulse', '心率', healthData.heart_rate.value || '--', 'bpm')}
              {healthData.step && renderDataItem('person-walking', '步数', healthData.step.value || '--', '步')}
              {healthData.sleep && renderDataItem('moon', '睡眠', healthData.sleep.value || '--', '小时')}
              {healthData.blood_pressure && renderDataItem('droplet', '血压', healthData.blood_pressure.value || '--', 'mmHg')}
              {healthData.blood_oxygen && renderDataItem('wind', '血氧', healthData.blood_oxygen.value || '--', '%')}
            </View>
          </View>
        )}

        {/* 操作按钮 */}
        <View style={styles.actions}>
          {!status?.authorized ? (
            <TouchableOpacity style={styles.authorizeButton} onPress={handleAuthorize}>
              <FontAwesome6 name="link" size={20} color="#FFFFFF" />
              <Text style={styles.authorizeButtonText}>授权华为健康</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.syncButton} 
                onPress={handleSync}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <FontAwesome6 name="rotate" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.syncButtonText}>
                  {syncing ? '同步中...' : '同步数据'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.revokeButton} onPress={handleRevoke}>
                <FontAwesome6 name="link-slash" size={18} color={colors.danger} />
                <Text style={styles.revokeButtonText}>取消授权</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* 支持的设备 */}
        <View style={styles.devicesCard}>
          <Text style={styles.cardTitle}>支持的设备</Text>
          <View style={styles.deviceList}>
            {['华为 Watch GT 系列', '华为手环系列', '荣耀手表系列', '荣耀手环系列'].map((device, index) => (
              <View key={index} style={styles.deviceItem}>
                <FontAwesome6 name="watch" size={16} color={colors.textSecondary} />
                <Text style={styles.deviceText}>{device}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 数据说明 */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>数据说明</Text>
          <Text style={styles.infoText}>
            • 心率：实时心率数据，每分钟更新{'\n'}
            • 步数：当日累计步数{'\n'}
            • 睡眠：昨晚睡眠时长{'\n'}
            • 血压：最近一次测量值{'\n'}
            • 血氧：最近一次测量值
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as const,
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['4xl'],
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: Spacing.xl,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  title: {
    fontSize: 20,
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
  brandCard: {
    backgroundColor: colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center' as const,
    marginBottom: Spacing.lg,
  },
  brandLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: Spacing.md,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  brandDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  warningCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: Spacing.lg,
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
    marginLeft: Spacing.md,
    flex: 1,
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginLeft: Spacing.md,
  },
  statusInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: Spacing.sm,
  },
  dataCard: {
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  dataGrid: {
    gap: Spacing.md,
  },
  dataItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  dataIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  dataInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  dataLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  dataValue: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  dataUnit: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  actions: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  authorizeButton: {
    backgroundColor: colors.huaweiRed,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  authorizeButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginLeft: Spacing.sm,
  },
  syncButton: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  syncButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginLeft: Spacing.sm,
  },
  revokeButton: {
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  revokeButtonText: {
    fontSize: 16,
    color: colors.danger,
    marginLeft: Spacing.sm,
  },
  devicesCard: {
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  deviceList: {
    gap: Spacing.sm,
  },
  deviceItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: Spacing.sm,
  },
  deviceText: {
    fontSize: 15,
    color: colors.textPrimary,
    marginLeft: Spacing.md,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
};
