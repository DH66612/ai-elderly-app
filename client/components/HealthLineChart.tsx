/**
 * 健康数据折线图组件
 * 简约清新风格：柔和青绿色、曲线圆润、渐变填充
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 颜色主题
const COLORS = {
  primary: '#8ab3cf',       // 淡青色（主色）
  primaryDark: '#7fa5c0',   // 深青色
  primaryLight: 'rgba(138, 179, 207, 0.15)', // 浅青色背景
  success: '#6bb38a',       // 绿色（正常）
  warning: '#e2a87a',       // 橙色（偏高）
  danger: '#d98b8b',        // 红色（异常）
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#9aa9b7',
  white: '#ffffff',
  cardBg: '#ffffff',
};

// 图表类型配置
interface ChartConfig {
  title: string;
  icon: string;
  unit: string;
  color: string;
  gradientColor: string;
  normalRange?: { min: number; max: number };
}

const CHART_CONFIGS: Record<string, ChartConfig> = {
  heartRate: {
    title: '心率',
    icon: 'heart-pulse',
    unit: 'bpm',
    color: '#e88a8a',           // 珊瑚粉
    gradientColor: 'rgba(232, 138, 138, 0.15)',
    normalRange: { min: 60, max: 100 },
  },
  bloodPressure: {
    title: '血压(收缩压)',
    icon: 'droplet',
    unit: 'mmHg',
    color: '#7eb5d4',           // 淡蓝色
    gradientColor: 'rgba(126, 181, 212, 0.15)',
    normalRange: { min: 90, max: 140 },
  },
  bloodOxygen: {
    title: '血氧',
    icon: 'lungs',
    unit: '%',
    color: '#6bb38a',           // 薄荷绿
    gradientColor: 'rgba(107, 179, 138, 0.15)',
    normalRange: { min: 95, max: 100 },
  },
  steps: {
    title: '步数',
    icon: 'shoe-prints',
    unit: '步',
    color: '#b8a0d4',           // 淡紫色
    gradientColor: 'rgba(184, 160, 212, 0.15)',
    normalRange: { min: 6000, max: 10000 },
  },
  temperature: {
    title: '体温',
    icon: 'temperature-half',
    unit: '°C',
    color: '#e8a87c',           // 暖橙色
    gradientColor: 'rgba(232, 168, 124, 0.15)',
    normalRange: { min: 36.0, max: 37.3 },
  },
  bloodSugar: {
    title: '血糖',
    icon: 'candy-cane',
    unit: 'mmol/L',
    color: '#a87bc7',           // 紫罗兰
    gradientColor: 'rgba(168, 123, 199, 0.15)',
    normalRange: { min: 3.9, max: 6.1 },
  },
  bodyFat: {
    title: '体脂率',
    icon: 'weight-scale',
    unit: '%',
    color: '#7bb5a8',           // 青绿色
    gradientColor: 'rgba(123, 181, 168, 0.15)',
    normalRange: { min: 15, max: 25 },
  },
};

interface HealthLineChartProps {
  type: 'heartRate' | 'bloodPressure' | 'bloodOxygen' | 'steps' | 'temperature' | 'bloodSugar' | 'bodyFat';
  data: number[];           // 8个数据点（每3小时一个）
  timeLabels?: string[];    // 时间标签
  showTrend?: boolean;      // 是否显示涨跌幅
}

export const HealthLineChart: React.FC<HealthLineChartProps> = ({
  type,
  data,
  timeLabels,
  showTrend = true,
}) => {
  const config = CHART_CONFIGS[type];
  
  // 计算当前值、平均值、最大值、最小值
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return { current: 0, avg: 0, max: 0, min: 0, trend: 0 };
    }
    const validData = data.filter(v => v !== null && v !== undefined);
    if (validData.length === 0) {
      return { current: 0, avg: 0, max: 0, min: 0, trend: 0 };
    }
    
    const current = validData[validData.length - 1];
    const avg = Math.round(validData.reduce((a, b) => a + b, 0) / validData.length);
    const max = Math.max(...validData);
    const min = Math.min(...validData);
    
    // 计算涨跌幅（与上一个数据点比较）
    let trend = 0;
    if (validData.length >= 2) {
      const prev = validData[validData.length - 2];
      trend = prev > 0 ? ((current - prev) / prev * 100) : 0;
    }
    
    return { current, avg, max, min, trend };
  }, [data]);

  // 判断状态
  const status = useMemo(() => {
    if (!config.normalRange) return 'normal';
    const { current } = stats;
    if (current < config.normalRange.min || current > config.normalRange.max) {
      return 'warning';
    }
    return 'normal';
  }, [stats, config]);

  // 准备图表数据
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map((value, index) => ({
      value: value || 0,
      dataPointLabel: timeLabels?.[index] || '',
    }));
  }, [data, timeLabels]);

  // 计算Y轴范围
  const yAxisRange = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 100 };
    const validData = data.filter(v => v !== null && v !== undefined);
    if (validData.length === 0) return { min: 0, max: 100 };
    
    const minValue = Math.min(...validData);
    const maxValue = Math.max(...validData);
    const padding = (maxValue - minValue) * 0.2 || 10;
    
    return {
      min: Math.max(0, Math.floor(minValue - padding)),
      max: Math.ceil(maxValue + padding),
    };
  }, [data]);

  // 时间标签（默认每3小时）
  const defaultTimeLabels = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
  const labels = timeLabels || defaultTimeLabels;

  // 如果没有数据，显示空图表框架
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.iconBox, { backgroundColor: config.gradientColor }]}>
              <FontAwesome6 name={config.icon} size={16} color={config.color} />
            </View>
            <Text style={styles.title}>{config.title}</Text>
          </View>
        </View>
        
        {/* 空数值区域 */}
        <View style={styles.valueSection}>
          <View style={styles.valueRow}>
            <Text style={styles.currentValue}>--</Text>
            <Text style={styles.unit}>{config.unit}</Text>
          </View>
          <View style={[styles.trendBadge, styles.trendFlat]}>
            <FontAwesome6 name="minus" size={10} color={COLORS.textMuted} />
            <Text style={[styles.trendText, styles.trendTextFlat]}>--</Text>
          </View>
        </View>
        
        {/* 空图表区域 - 显示虚线网格 */}
        <View style={styles.emptyChartContainer}>
          <View style={styles.emptyChartGrid}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.emptyChartLine} />
            ))}
          </View>
          <View style={styles.emptyChartOverlay}>
            <FontAwesome6 name="chart-line" size={24} color={COLORS.textMuted} style={{ opacity: 0.5 }} />
            <Text style={styles.emptyChartText}>等待数据同步...</Text>
          </View>
        </View>
        
        {/* 时间轴 */}
        <View style={styles.timeLabels}>
          {labels.slice(0, 8).map((label, index) => (
            <Text key={index} style={styles.timeLabel}>{label}</Text>
          ))}
        </View>
        
        {/* 统计信息 - 空值 */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>最低</Text>
            <Text style={styles.statValue}>--</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>平均</Text>
            <Text style={styles.statValue}>--</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>最高</Text>
            <Text style={styles.statValue}>--</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 标题区域 */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBox, { backgroundColor: config.gradientColor }]}>
            <FontAwesome6 name={config.icon} size={16} color={config.color} />
          </View>
          <Text style={styles.title}>{config.title}</Text>
        </View>
      </View>

      {/* 数值区域 */}
      <View style={styles.valueSection}>
        <View style={styles.valueRow}>
          <Text style={styles.currentValue}>{stats.current}</Text>
          <Text style={styles.unit}>{config.unit}</Text>
        </View>
        
        {/* 涨跌幅 */}
        {showTrend && (
          <View style={[
            styles.trendBadge,
            stats.trend > 0 ? styles.trendUp : stats.trend < 0 ? styles.trendDown : styles.trendFlat
          ]}>
            <FontAwesome6 
              name={stats.trend > 0 ? 'arrow-up' : stats.trend < 0 ? 'arrow-down' : 'minus'} 
              size={10} 
              color={stats.trend > 0 ? COLORS.success : stats.trend < 0 ? COLORS.danger : COLORS.textMuted} 
            />
            <Text style={[
              styles.trendText,
              stats.trend > 0 ? styles.trendTextUp : stats.trend < 0 ? styles.trendTextDown : styles.trendTextFlat
            ]}>
              {Math.abs(stats.trend).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>

      {/* 折线图 */}
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={SCREEN_WIDTH - 80}
          height={120}
          maxValue={yAxisRange.max}
          noOfSections={4}
          spacing={(SCREEN_WIDTH - 80) / (chartData.length - 1 || 1)}
          initialSpacing={10}
          endSpacing={10}
          curved
          color={config.color}
          thickness={2.5}
          startFillColor={config.color}
          startOpacity={0.3}
          endOpacity={0.05}
          dataPointsHeight={6}
          dataPointsWidth={6}
          dataPointsColor={config.color}
          dataPointsRadius={3}
          hideRules
          hideYAxisText
          hideAxesAndRules
          yAxisOffset={yAxisRange.min}
          pointerConfig={{
            pointerStripHeight: 120,
            pointerStripColor: config.color,
            pointerStripWidth: 1,
            strokeDashArray: [4, 4],
            pointerColor: config.color,
            radius: 5,
            pointerLabelWidth: 60,
            pointerLabelHeight: 30,
            activatePointersOnLongPress: true,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items: any[]) => {
              const item = items[0];
              return (
                <View style={[styles.pointerLabel, { backgroundColor: config.color }]}>
                  <Text style={styles.pointerLabelText}>{item.value}</Text>
                </View>
              );
            },
          }}
        />
      </View>

      {/* 时间轴 */}
      <View style={styles.timeLabels}>
        {labels.slice(0, chartData.length).map((label, index) => (
          <Text key={index} style={styles.timeLabel}>{label}</Text>
        ))}
      </View>

      {/* 统计信息 */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>最低</Text>
          <Text style={styles.statValue}>{stats.min}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>平均</Text>
          <Text style={styles.statValue}>{stats.avg}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>最高</Text>
          <Text style={styles.statValue}>{stats.max}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#a3b8cc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginLeft: Spacing.sm,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  valueSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentValue: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  unit: {
    marginLeft: Spacing.xs,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  trendUp: {
    backgroundColor: 'rgba(107, 179, 138, 0.15)',
  },
  trendDown: {
    backgroundColor: 'rgba(217, 139, 139, 0.15)',
  },
  trendFlat: {
    backgroundColor: 'rgba(154, 169, 183, 0.15)',
  },
  trendText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  trendTextUp: {
    color: COLORS.success,
  },
  trendTextDown: {
    color: COLORS.danger,
  },
  trendTextFlat: {
    color: COLORS.textMuted,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.xs,
  },
  timeLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(214, 228, 240, 0.5)',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(214, 228, 240, 0.5)',
  },
  emptyChartContainer: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
    position: 'relative',
  },
  emptyChartGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  emptyChartLine: {
    height: 1,
    backgroundColor: 'rgba(214, 228, 240, 0.4)',
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: 'rgba(214, 228, 240, 0.6)',
  },
  emptyChartOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  emptyChartText: {
    marginTop: Spacing.xs,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  pointerLabel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pointerLabelText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default HealthLineChart;
