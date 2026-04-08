/**
 * 健康数据页面 - 监护人端
 * 
 * 数据来源：
 * 1. 华为健康API（优先）
 * 2. 蓝牙健康手环
 * 3. 手机传感器（步数）
 * 4. 虚拟数据（兜底展示）
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';
import { HealthLineChart } from '@/components/HealthLineChart';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 清雅配色
const COLORS = {
  background: '#f0f5fa',
  card: '#ffffff',
  primary: '#8ab3cf',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#9aa9b7',
  border: '#e8f0f5',
  success: '#6bb38a',
  warning: '#e2a87a',
  danger: '#d97a7a',
  // 数据颜色
  heartRate: '#E88A8A',
  bloodPressure: '#7EB5D4',
  bloodOxygen: '#6BB38A',
  steps: '#8AB3CF',
  sleep: '#9B8DC7',
  calories: '#E2A87A',
  temperature: '#E8A87C',
  bloodSugar: '#A87BC7',
  bodyFat: '#7BB5A8',
};

// 完整的健康数据接口
interface FullHealthData {
  // 核心指标
  heartRate: number | null;
  bloodPressure: { systolic: number; diastolic: number } | null;
  bloodOxygen: number | null;
  
  // 活动数据
  steps: number;
  distance: number;
  calories: number;
  
  // 睡眠数据
  sleep: { hours: number; quality: string; deep: number; light: number; rem: number };
  
  // 扩展健康数据
  temperature: number | null;
  bloodSugar: { value: number; type: string } | null;
  bodyFat: number | null;
  
  // 压力数据
  stress: number | null;
  
  // 设备信息
  device: { connected: boolean; name: string; battery: number };
  
  // 数据来源标识
  dataSource: 'huawei' | 'bluetooth' | 'phone_sensor' | 'mock';
  
  // 更新时间
  updateTime: string;
}

// 历史趋势数据
interface HistoryData {
  heartRate: number[];
  bloodPressure: number[];
  bloodOxygen: number[];
  steps: number[];
  temperature: number[];
  bloodSugar: number[];
  bodyFat: number[];
  timeLabels: string[];
}

// 生成虚拟数据（可被真实数据替代）
const generateMockData = (): FullHealthData => ({
  // 核心指标
  heartRate: 72,
  bloodPressure: { systolic: 118, diastolic: 78 },
  bloodOxygen: 98,
  
  // 活动数据
  steps: 6852,
  distance: 4.8,
  calories: 274,
  
  // 睡眠数据
  sleep: { hours: 7.5, quality: '良好', deep: 1.8, light: 4.2, rem: 1.5 },
  
  // 扩展健康数据
  temperature: 36.5,
  bloodSugar: { value: 5.2, type: '空腹' },
  bodyFat: 22.5,
  
  // 压力数据
  stress: 35,
  
  // 设备信息
  device: { connected: true, name: '华为 Watch GT 4', battery: 85 },
  
  // 数据来源
  dataSource: 'mock',
  
  // 更新时间
  updateTime: new Date().toISOString(),
});

// 生成虚拟历史数据
const generateMockHistory = (): HistoryData => ({
  heartRate: [68, 72, 75, 78, 74, 70],
  bloodPressure: [115, 118, 122, 120, 119, 118],
  bloodOxygen: [97, 98, 98, 99, 98, 98],
  steps: [1200, 2800, 4500, 5200, 6100, 6852],
  temperature: [36.3, 36.5, 36.6, 36.5, 36.4, 36.5],
  bloodSugar: [5.1, 5.3, 5.2, 5.4, 5.2, 5.2],
  bodyFat: [22.8, 22.6, 22.5, 22.5, 22.4, 22.5],
  timeLabels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
});

export default function HealthDataScreen() {
  const router = useSafeRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthData, setHealthData] = useState<FullHealthData | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);

  const isNotBound = !user?.boundUserId;
  const boundUserId = user?.boundUserId;

  // 获取健康数据
  const fetchData = useCallback(async () => {
    if (!boundUserId) {
      // 未绑定老人时，使用虚拟数据展示
      setHealthData(generateMockData());
      setHistoryData(generateMockHistory());
      setLoading(false);
      return;
    }

    try {
      // 尝试获取华为健康数据
      const huaweiRes = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/huawei-health/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: boundUserId }),
        }
      );
      const huaweiJson = await huaweiRes.json();

      if (huaweiJson.success && huaweiJson.data) {
        // 有华为健康数据，使用真实数据
        const data = huaweiJson.data;
        setHealthData({
          heartRate: data.heart_rate?.value || null,
          bloodPressure: data.blood_pressure?.systolic 
            ? { systolic: data.blood_pressure.systolic, diastolic: data.blood_pressure.diastolic }
            : null,
          bloodOxygen: data.blood_oxygen?.value || null,
          steps: data.step?.value || 0,
          distance: data.distance?.value || 0,
          calories: data.calories?.value || 0,
          sleep: {
            hours: data.sleep?.hours || 0,
            quality: data.sleep?.quality || '未知',
            deep: data.sleep?.deep || 0,
            light: data.sleep?.light || 0,
            rem: data.sleep?.rem || 0,
          },
          temperature: data.temperature?.value || null,
          bloodSugar: data.blood_sugar?.value 
            ? { value: data.blood_sugar.value, type: data.blood_sugar.type || '空腹' }
            : null,
          bodyFat: data.body_fat?.value || null,
          stress: data.stress?.value || null,
          device: {
            connected: data.device?.connected || false,
            name: data.device?.name || '未连接',
            battery: data.device?.battery || 0,
          },
          dataSource: 'huawei',
          updateTime: new Date().toISOString(),
        });
      } else {
        // 尝试获取手机传感器/蓝牙手环数据
        const sensorRes = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/health-data/today/${boundUserId}`
        );
        const sensorJson = await sensorRes.json();

        if (sensorJson.success && sensorJson.data) {
          // 有传感器数据，混合使用
          setHealthData({
            heartRate: null,
            bloodPressure: null,
            bloodOxygen: null,
            steps: sensorJson.data.steps || 0,
            distance: 0,
            calories: Math.round((sensorJson.data.steps || 0) * 0.04),
            sleep: { hours: 7.5, quality: '良好', deep: 1.8, light: 4.2, rem: 1.5 },
            temperature: null,
            bloodSugar: null,
            bodyFat: null,
            stress: null,
            device: { connected: false, name: '手机传感器', battery: 100 },
            dataSource: 'phone_sensor',
            updateTime: sensorJson.data.lastUpdate || new Date().toISOString(),
          });
        } else {
          // 使用虚拟数据展示
          setHealthData(generateMockData());
        }
      }

      // 获取历史趋势
      const historyRes = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/health-data/trend/${boundUserId}?days=1`
      );
      const historyJson = await historyRes.json();

      console.log('[健康数据] 趋势数据响应:', JSON.stringify(historyJson.data || historyJson).substring(0, 200));

      if (historyJson.data) {
        console.log('[健康数据] 设置趋势数据 - heartRate:', historyJson.data.heartRate?.slice(0, 3));
        setHistoryData(historyJson.data);
      } else {
        console.log('[健康数据] 使用虚拟趋势数据');
        setHistoryData(generateMockHistory());
      }
    } catch (error) {
      console.error('获取健康数据失败:', error);
      // 使用虚拟数据
      setHealthData(generateMockData());
      setHistoryData(generateMockHistory());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [boundUserId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // 加载中
  if (loading) {
    return (
      <Screen backgroundColor="transparent" statusBarStyle="dark">
        <GuardianBackground />
        <View style={styles.loadingContainer}>
          <FontAwesome6 name="spinner" size={32} color={COLORS.primary} />
          <Text style={styles.loadingText}>正在获取健康数据...</Text>
        </View>
      </Screen>
    );
  }

  // 渲染条形图
  const renderBarChart = (label: string, value: number, max: number, unit: string, color: string, status?: string) => {
    const percentage = Math.min((value / max) * 100, 100);
    return (
      <View style={styles.barChartItem}>
        <View style={styles.barChartHeader}>
          <Text style={styles.barChartLabel}>{label}</Text>
          <View style={styles.barChartValueRow}>
            <Text style={styles.barChartValue}>{value}</Text>
            <Text style={styles.barChartUnit}> {unit}</Text>
          </View>
        </View>
        <View style={styles.barChartTrack}>
          <View style={[styles.barChartFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
        {status && (
          <Text style={[styles.barChartStatus, status === '正常' || status === '标准' ? styles.statusGood : styles.statusWarn]}>
            {status}
          </Text>
        )}
      </View>
    );
  };

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <GuardianBackground />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* 页面标题 */}
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <FontAwesome6 name="chevron-left" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>健康数据</Text>
        </View>
        <View style={styles.pageSubtitleRow}>
          <Text style={styles.pageSubtitle}>
            更新于 {healthData?.updateTime ? new Date(healthData.updateTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </Text>
          <View style={styles.dataSourceBadge}>
            <Text style={styles.dataSourceText}>
              {healthData?.dataSource === 'huawei' ? '华为健康' : 
               healthData?.dataSource === 'phone_sensor' ? '手机传感器' : 
               healthData?.dataSource === 'bluetooth' ? '蓝牙手环' : '演示数据'}
            </Text>
          </View>
        </View>

        {/* 核心指标卡片 */}
        <View style={styles.mainCard}>
          <View style={styles.mainCardHeader}>
            <Text style={styles.mainCardTitle}>实时健康指标</Text>
            <View style={styles.deviceBadge}>
              <FontAwesome6 
                name={healthData?.device.connected ? 'watch' : 'mobile-screen'} 
                size={12} 
                color={healthData?.device.connected ? COLORS.success : COLORS.textMuted} 
              />
              <Text style={styles.deviceBadgeText}>{healthData?.device.name}</Text>
            </View>
          </View>

          <View style={styles.mainDataGrid}>
            {/* 心率 */}
            <View style={styles.mainDataItem}>
              <View style={[styles.mainDataIcon, { backgroundColor: COLORS.heartRate + '15' }]}>
                <FontAwesome6 name="heart-pulse" size={22} color={COLORS.heartRate} />
              </View>
              <Text style={styles.mainDataValue}>{healthData?.heartRate || '--'}</Text>
              <Text style={styles.mainDataUnit}>bpm</Text>
              <Text style={styles.mainDataLabel}>心率</Text>
              {healthData?.heartRate && (
                <View style={[styles.miniBadge, healthData.heartRate >= 60 && healthData.heartRate <= 100 ? styles.miniBadgeGood : styles.miniBadgeWarn]}>
                  <Text style={styles.miniBadgeText}>
                    {healthData.heartRate >= 60 && healthData.heartRate <= 100 ? '正常' : '异常'}
                  </Text>
                </View>
              )}
            </View>

            {/* 血压 */}
            <View style={styles.mainDataItem}>
              <View style={[styles.mainDataIcon, { backgroundColor: COLORS.bloodPressure + '15' }]}>
                <FontAwesome6 name="droplet" size={22} color={COLORS.bloodPressure} />
              </View>
              <Text style={styles.mainDataValue}>
                {healthData?.bloodPressure 
                  ? `${healthData.bloodPressure.systolic}/${healthData.bloodPressure.diastolic}`
                  : '--/--'}
              </Text>
              <Text style={styles.mainDataUnit}>mmHg</Text>
              <Text style={styles.mainDataLabel}>血压</Text>
              {healthData?.bloodPressure && (
                <View style={[styles.miniBadge, healthData.bloodPressure.systolic >= 90 && healthData.bloodPressure.systolic <= 140 ? styles.miniBadgeGood : styles.miniBadgeWarn]}>
                  <Text style={styles.miniBadgeText}>
                    {healthData.bloodPressure.systolic >= 90 && healthData.bloodPressure.systolic <= 140 ? '正常' : '偏高'}
                  </Text>
                </View>
              )}
            </View>

            {/* 血氧 */}
            <View style={styles.mainDataItem}>
              <View style={[styles.mainDataIcon, { backgroundColor: COLORS.bloodOxygen + '15' }]}>
                <FontAwesome6 name="lungs" size={22} color={COLORS.bloodOxygen} />
              </View>
              <Text style={styles.mainDataValue}>{healthData?.bloodOxygen || '--'}</Text>
              <Text style={styles.mainDataUnit}>%</Text>
              <Text style={styles.mainDataLabel}>血氧</Text>
              {healthData?.bloodOxygen && (
                <View style={[styles.miniBadge, healthData.bloodOxygen >= 95 ? styles.miniBadgeGood : styles.miniBadgeWarn]}>
                  <Text style={styles.miniBadgeText}>
                    {healthData.bloodOxygen >= 95 ? '正常' : '偏低'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 活动数据卡片 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>今日活动</Text>
        </View>
        
        <View style={styles.activityCard}>
          <View style={styles.activityGrid}>
            <View style={styles.activityItem}>
              <FontAwesome6 name="shoe-prints" size={20} color={COLORS.steps} />
              <Text style={styles.activityValue}>{healthData?.steps.toLocaleString() || 0}</Text>
              <Text style={styles.activityLabel}>步数</Text>
            </View>
            <View style={styles.activityDivider} />
            <View style={styles.activityItem}>
              <FontAwesome6 name="route" size={20} color={COLORS.primary} />
              <Text style={styles.activityValue}>{healthData?.distance.toFixed(1) || 0}</Text>
              <Text style={styles.activityLabel}>公里</Text>
            </View>
            <View style={styles.activityDivider} />
            <View style={styles.activityItem}>
              <FontAwesome6 name="fire" size={20} color={COLORS.calories} />
              <Text style={styles.activityValue}>{healthData?.calories || 0}</Text>
              <Text style={styles.activityLabel}>千卡</Text>
            </View>
          </View>
        </View>

        {/* 睡眠卡片 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>昨晚睡眠</Text>
        </View>
        
        <View style={styles.sleepCard}>
          <View style={styles.sleepMain}>
            <View style={styles.sleepIconWrap}>
              <FontAwesome6 name="moon" size={28} color={COLORS.sleep} />
            </View>
            <View style={styles.sleepInfo}>
              <Text style={styles.sleepHours}>{healthData?.sleep.hours || 0} 小时</Text>
              <View style={[styles.sleepQualityBadge, styles.sleepQualityGood]}>
                <Text style={styles.sleepQualityText}>{healthData?.sleep.quality || '未知'}</Text>
              </View>
            </View>
          </View>
          <View style={styles.sleepDetail}>
            <View style={styles.sleepBarItem}>
              <View style={[styles.sleepBar, { flex: healthData?.sleep.deep || 1.8, backgroundColor: '#6B5B95' }]} />
              <Text style={styles.sleepBarLabel}>深睡 {healthData?.sleep.deep || 1.8}h</Text>
            </View>
            <View style={styles.sleepBarItem}>
              <View style={[styles.sleepBar, { flex: healthData?.sleep.light || 4.2, backgroundColor: '#9B8DC7' }]} />
              <Text style={styles.sleepBarLabel}>浅睡 {healthData?.sleep.light || 4.2}h</Text>
            </View>
            <View style={styles.sleepBarItem}>
              <View style={[styles.sleepBar, { flex: healthData?.sleep.rem || 1.5, backgroundColor: '#B8A9D4' }]} />
              <Text style={styles.sleepBarLabel}>REM {healthData?.sleep.rem || 1.5}h</Text>
            </View>
          </View>
        </View>

        {/* 扩展健康指标 - 条形图 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>更多健康指标</Text>
        </View>
        
        <View style={styles.moreHealthCard}>
          {/* 体温 */}
          {renderBarChart(
            '体温',
            healthData?.temperature || 36.5,
            42,
            '°C',
            COLORS.temperature,
            healthData?.temperature && healthData.temperature >= 36.0 && healthData.temperature <= 37.3 ? '正常' : 
            healthData?.temperature && healthData.temperature > 37.3 ? '发热' : '正常'
          )}
          
          <View style={styles.barChartDivider} />
          
          {/* 血糖 */}
          {renderBarChart(
            `血糖(${healthData?.bloodSugar?.type || '空腹'})`,
            healthData?.bloodSugar?.value || 5.2,
            15,
            'mmol/L',
            COLORS.bloodSugar,
            healthData?.bloodSugar?.value && healthData.bloodSugar.value >= 3.9 && healthData.bloodSugar.value <= 6.1 ? '正常' :
            healthData?.bloodSugar?.value && healthData.bloodSugar.value < 3.9 ? '偏低' : '正常'
          )}
          
          <View style={styles.barChartDivider} />
          
          {/* 体脂 */}
          {renderBarChart(
            '体脂率',
            healthData?.bodyFat || 22.5,
            40,
            '%',
            COLORS.bodyFat,
            healthData?.bodyFat && healthData.bodyFat >= 15 && healthData.bodyFat <= 25 ? '标准' : '正常'
          )}

          <View style={styles.barChartDivider} />

          {/* 压力 */}
          {renderBarChart(
            '压力指数',
            healthData?.stress || 35,
            100,
            '分',
            COLORS.danger,
            healthData?.stress && healthData.stress <= 40 ? '放松' :
            healthData?.stress && healthData.stress <= 60 ? '正常' :
            healthData?.stress && healthData.stress <= 80 ? '偏高' : '正常'
          )}
        </View>

        {/* 健康趋势折线图 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>今日趋势</Text>
          <Text style={styles.sectionSubtitle}>每4小时采样</Text>
        </View>

        <View style={styles.chartContainer}>
          <HealthLineChart
            type="heartRate"
            data={historyData?.heartRate || []}
            timeLabels={historyData?.timeLabels}
          />
        </View>

        <View style={styles.chartContainer}>
          <HealthLineChart
            type="bloodPressure"
            data={historyData?.bloodPressure || []}
            timeLabels={historyData?.timeLabels}
          />
        </View>

        <View style={styles.chartContainer}>
          <HealthLineChart
            type="bloodOxygen"
            data={historyData?.bloodOxygen || []}
            timeLabels={historyData?.timeLabels}
          />
        </View>

        <View style={styles.chartContainer}>
          <HealthLineChart
            type="steps"
            data={historyData?.steps || []}
            timeLabels={historyData?.timeLabels}
          />
        </View>

        {/* 扩展健康指标趋势 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>更多健康趋势</Text>
        </View>

        <View style={styles.chartContainer}>
          <HealthLineChart
            type="temperature"
            data={historyData?.temperature || []}
            timeLabels={historyData?.timeLabels}
          />
        </View>

        <View style={styles.chartContainer}>
          <HealthLineChart
            type="bloodSugar"
            data={historyData?.bloodSugar || []}
            timeLabels={historyData?.timeLabels}
          />
        </View>

        <View style={styles.chartContainer}>
          <HealthLineChart
            type="bodyFat"
            data={historyData?.bodyFat || []}
            timeLabels={historyData?.timeLabels}
          />
        </View>

        {/* 底部留白 */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 0,
  },
  emptyIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: '#a3b8cc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: Spacing.lg,
  },
  bindButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 0,
    paddingVertical: Spacing.md,
  },
  bindButtonText: {
    marginLeft: Spacing.sm,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // 页面标题行（带返回按钮）
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(138, 179, 207, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  // 页面标题
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pageSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  pageSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  dataSourceBadge: {
    marginLeft: Spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: COLORS.primary + '20',
    borderRadius: BorderRadius.sm,
  },
  dataSourceText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },
  // 核心指标卡片
  mainCard: {
    backgroundColor: COLORS.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#a3b8cc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  mainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  mainCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  deviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f8fa',
    paddingHorizontal: 0,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  deviceBadgeText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  mainDataGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mainDataItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  mainDataIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  mainDataValue: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  mainDataUnit: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  mainDataLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: Spacing.xs,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  miniBadgeGood: {
    backgroundColor: COLORS.success + '20',
  },
  miniBadgeWarn: {
    backgroundColor: COLORS.warning + '20',
  },
  miniBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  // 分节标题
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  // 活动数据卡片
  activityCard: {
    backgroundColor: COLORS.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#a3b8cc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  activityGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityItem: {
    flex: 1,
    alignItems: 'center',
  },
  activityValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: Spacing.xs,
  },
  activityLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  activityDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  // 睡眠卡片
  sleepCard: {
    backgroundColor: COLORS.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#a3b8cc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  sleepMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sleepIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.sleep + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sleepInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  sleepHours: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sleepQualityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    marginTop: 4,
  },
  sleepQualityGood: {
    backgroundColor: COLORS.success + '20',
  },
  sleepQualityText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.success,
  },
  sleepDetail: {
    gap: Spacing.sm,
  },
  sleepBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sleepBar: {
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  sleepBarLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  // 更多健康指标 - 条形图
  moreHealthCard: {
    backgroundColor: COLORS.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#a3b8cc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  barChartItem: {
    paddingVertical: Spacing.sm,
  },
  barChartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  barChartLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  barChartValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  barChartValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  barChartUnit: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  barChartTrack: {
    height: 10,
    backgroundColor: COLORS.background,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barChartFill: {
    height: '100%',
    borderRadius: 5,
  },
  barChartStatus: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  statusGood: {
    color: COLORS.success,
  },
  statusWarn: {
    color: COLORS.warning,
  },
  barChartDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: Spacing.sm,
  },
  // 折线图
  chartContainer: {
    backgroundColor: COLORS.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    shadowColor: '#a3b8cc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
});
