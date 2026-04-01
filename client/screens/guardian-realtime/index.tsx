/**
 * 监护人端实时数据展示页面
 * 清雅风格：柔和蓝灰色系、白色卡片、细边框
 * 展示被监护人的健康数据和摄像头画面
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  View, ScrollView, TouchableOpacity, Text, StyleSheet, 
  RefreshControl, Alert, ActivityIndicator 
} from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';
import RNSSE from 'react-native-sse';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || '';

// 清雅色调
const colors = {
  backgroundRoot: '#f0f5fa',
  backgroundCard: '#ffffff',
  backgroundTertiary: '#eaf0f5',
  primary: '#8ab3cf',
  primaryLight: '#e3f0f7',
  success: '#a8c8b8',
  successText: '#5a8a7a',
  warning: '#d4c4a8',
  warningText: '#8a7a5a',
  danger: '#e2c6c6',
  dangerText: '#b87a7a',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#8fa5bb',
  border: '#d6e4f0',
  borderLight: '#e8f0f5',
};

interface HealthDataRecord {
  id: number;
  user_id: string;
  device_id: string;
  device_name: string;
  heart_rate: number;
  steps: number;
  calories: number;
  blood_oxygen: number | null;
  recorded_at: string;
}

interface CameraStatus {
  camera_id: string;
  camera_name: string;
  is_online: boolean;
}

export default function GuardianRealtimeScreen() {
  const { theme, isDark } = useTheme();
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ userId?: string }>();
  const { user } = useAuth();

  const [healthData, setHealthData] = useState<HealthDataRecord[]>([]);
  const [cameraStatuses, setCameraStatuses] = useState<CameraStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sseRef = useRef<RNSSE | null>(null);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const targetUserId = params.userId || user?.boundUserId;

  // 获取健康数据
  const fetchHealthData = useCallback(async () => {
    if (!targetUserId) return;
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/device-data/health/${targetUserId}?limit=10`);
      const result = await response.json();
      if (result.success) setHealthData(result.data || []);
    } catch (err) {
      console.error('获取健康数据失败:', err);
    }
  }, [targetUserId]);

  // 获取摄像头状态
  const fetchCameraStatus = useCallback(async () => {
    if (!targetUserId) return;
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/device-data/camera/${targetUserId}`);
      const result = await response.json();
      if (result.success) setCameraStatuses(result.data || []);
    } catch (err) {
      console.error('获取摄像头状态失败:', err);
    }
  }, [targetUserId]);

  // 加载数据
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchHealthData(), fetchCameraStatus()]);
    setIsLoading(false);
  }, [fetchHealthData, fetchCameraStatus]);

  useFocusEffect(useCallback(() => { loadAllData(); }, [loadAllData]));

  // 下拉刷新
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadAllData();
    setIsRefreshing(false);
  }, [loadAllData]);

  // SSE订阅
  useEffect(() => {
    if (!targetUserId || !user?.id) return;

    const sse = new RNSSE(
      `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/device-data/subscribe/${user.id}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUserId }) }
    );

    sse.addEventListener('message', (event) => {
      if (event.data === '[DONE]') return;
      try {
        const data = JSON.parse(event.data || '{}');
        if (data.type === 'health_data') {
          setHealthData(prev => [data.payload, ...prev].slice(0, 10));
        } else if (data.type === 'camera_status') {
          setCameraStatuses(prev => {
            const idx = prev.findIndex(c => c.camera_id === data.payload.camera_id);
            if (idx >= 0) { const u = [...prev]; u[idx] = data.payload; return u; }
            return [...prev, data.payload];
          });
        }
      } catch (err) { console.error('解析SSE数据失败:', err); }
    });

    sseRef.current = sse;
    return () => { sse.close(); sseRef.current = null; };
  }, [targetUserId, user?.id]);

  // 格式化时间
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  if (!targetUserId) {
    return (
      <Screen backgroundColor="transparent" statusBarStyle="dark">
        <GuardianBackground />
        <View style={styles.emptyContainer}>
          <FontAwesome6 name="user-slash" size={48} color={colors.textMuted} />
          <ThemedText variant="body" color={colors.textSecondary}>未绑定被监护人</ThemedText>
        </View>
      </Screen>
    );
  }

  const latestHealth = healthData[0];

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <GuardianBackground />
      <View style={styles.container}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h2" color={colors.textPrimary}>实时数据</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          >
            {/* 健康数据 */}
            {latestHealth && (
              <View style={styles.section}>
                <ThemedText variant="caption" color={colors.textMuted} style={styles.sectionLabel}>健康数据</ThemedText>
                <ThemedView level="default" style={styles.healthCard}>
                  <View style={styles.healthHeader}>
                    <FontAwesome6 name="heart-pulse" size={16} color={colors.dangerText} />
                    <ThemedText variant="small" color={colors.textSecondary} style={{ marginLeft: Spacing.sm }}>
                      {latestHealth.device_name || '健康手环'} · {formatTime(latestHealth.recorded_at)}
                    </ThemedText>
                  </View>
                  <View style={styles.healthGrid}>
                    <View style={styles.healthItem}>
                      <View style={[styles.healthIconBg, { backgroundColor: '#faf0f0' }]}>
                        <FontAwesome6 name="heart-pulse" size={16} color={colors.dangerText} />
                      </View>
                      <ThemedText variant="h2" color={colors.textPrimary}>{latestHealth.heart_rate}</ThemedText>
                      <ThemedText variant="small" color={colors.textSecondary}>心率 bpm</ThemedText>
                    </View>
                    <View style={styles.healthItem}>
                      <View style={[styles.healthIconBg, { backgroundColor: colors.primaryLight }]}>
                        <FontAwesome6 name="shoe-prints" size={16} color={colors.primary} />
                      </View>
                      <ThemedText variant="h2" color={colors.textPrimary}>{latestHealth.steps.toLocaleString()}</ThemedText>
                      <ThemedText variant="small" color={colors.textSecondary}>步数</ThemedText>
                    </View>
                    <View style={styles.healthItem}>
                      <View style={[styles.healthIconBg, { backgroundColor: '#f5f0e8' }]}>
                        <FontAwesome6 name="fire" size={16} color={colors.warningText} />
                      </View>
                      <ThemedText variant="h2" color={colors.textPrimary}>{latestHealth.calories}</ThemedText>
                      <ThemedText variant="small" color={colors.textSecondary}>卡路里</ThemedText>
                    </View>
                  </View>
                </ThemedView>
              </View>
            )}

            {/* 摄像头状态 */}
            {cameraStatuses.length > 0 && (
              <View style={styles.section}>
                <ThemedText variant="caption" color={colors.textMuted} style={styles.sectionLabel}>摄像头监控</ThemedText>
                {cameraStatuses.map(camera => (
                  <ThemedView key={camera.camera_id} level="default" style={styles.cameraCard}>
                    <View style={styles.cameraHeader}>
                      <View style={[styles.cameraIcon, { backgroundColor: camera.is_online ? '#e8f4ec' : '#faf0f0' }]}>
                        <FontAwesome6 name="video" size={16} color={camera.is_online ? colors.successText : colors.dangerText} />
                      </View>
                      <View style={styles.cameraInfo}>
                        <ThemedText variant="bodyMedium" color={colors.textPrimary}>{camera.camera_name}</ThemedText>
                        <ThemedText variant="small" color={colors.textSecondary}>{camera.is_online ? '在线' : '离线'}</ThemedText>
                      </View>
                      <TouchableOpacity
                        style={[styles.previewBtn, !camera.is_online && styles.previewBtnDisabled]}
                        onPress={() => router.push('/camera-preview', { cameraId: camera.camera_id })}
                        disabled={!camera.is_online}
                      >
                        <FontAwesome6 name="eye" size={12} color={camera.is_online ? '#fff' : colors.textMuted} />
                        <ThemedText variant="small" color={camera.is_online ? '#fff' : colors.textMuted}>预览</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </ThemedView>
                ))}
              </View>
            )}

            {/* 历史记录 */}
            {healthData.length > 1 && (
              <View style={styles.section}>
                <ThemedText variant="caption" color={colors.textMuted} style={styles.sectionLabel}>历史记录</ThemedText>
                {healthData.slice(1).map((record, idx) => (
                  <ThemedView key={record.id || idx} level="default" style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <FontAwesome6 name="heart-pulse" size={12} color={colors.textMuted} />
                      <ThemedText variant="small" color={colors.textMuted}> {formatTime(record.recorded_at)}</ThemedText>
                    </View>
                    <ThemedText variant="small" color={colors.textSecondary}>
                      心率 {record.heart_rate} bpm · 步数 {record.steps} · 卡路里 {record.calories}
                    </ThemedText>
                  </ThemedView>
                ))}
              </View>
            )}

            {/* 空状态 */}
            {healthData.length === 0 && cameraStatuses.length === 0 && (
              <View style={styles.emptyContainer}>
                <FontAwesome6 name="chart-line" size={48} color={colors.textMuted} />
                <ThemedText variant="body" color={colors.textSecondary}>暂无实时数据</ThemedText>
                <ThemedText variant="small" color={colors.textMuted}>被监护人设备连接后会自动显示</ThemedText>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

const createStyles = (_theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['5xl'] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: Spacing.xl },
  sectionLabel: { marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  healthCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, shadowColor: '#a3b8cc', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  healthHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  healthGrid: { flexDirection: 'row', gap: Spacing.md },
  healthItem: { flex: 1, alignItems: 'center', padding: Spacing.md, backgroundColor: colors.backgroundTertiary, borderRadius: BorderRadius.md },
  healthIconBg: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xs },
  cameraCard: { borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, shadowColor: '#a3b8cc', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  cameraHeader: { flexDirection: 'row', alignItems: 'center' },
  cameraIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  cameraInfo: { flex: 1, marginLeft: Spacing.sm },
  previewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.xs },
  previewBtnDisabled: { backgroundColor: colors.backgroundTertiary },
  historyCard: { borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  historyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm, padding: Spacing.xl },
});
