/**
 * 健康数据折线图组件
 * 使用 SVG 实现，兼容三端（Android/iOS/Web）
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';

// 安全获取屏幕宽度
const getScreenWidth = () => {
  try {
    const { width } = Dimensions.get('window');
    return width > 0 ? width : 375;
  } catch {
    return 375;
  }
};

// 颜色主题
const COLORS = {
  primary: '#8ab3cf',
  primaryDark: '#7fa5c0',
  primaryLight: 'rgba(138, 179, 207, 0.15)',
  success: '#6bb38a',
  warning: '#e2a87a',
  danger: '#d98b8b',
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
    color: '#e88a8a',
    gradientColor: 'rgba(232, 138, 138, 0.15)',
    normalRange: { min: 60, max: 100 },
  },
  bloodPressure: {
    title: '血压(收缩压)',
    icon: 'droplet',
    unit: 'mmHg',
    color: '#7eb5d4',
    gradientColor: 'rgba(126, 181, 212, 0.15)',
    normalRange: { min: 90, max: 140 },
  },
  bloodOxygen: {
    title: '血氧',
    icon: 'lungs',
    unit: '%',
    color: '#6bb38a',
    gradientColor: 'rgba(107, 179, 138, 0.15)',
    normalRange: { min: 95, max: 100 },
  },
  steps: {
    title: '步数',
    icon: 'shoe-prints',
    unit: '步',
    color: '#b8a0d4',
    gradientColor: 'rgba(184, 160, 212, 0.15)',
    normalRange: { min: 6000, max: 10000 },
  },
  temperature: {
    title: '体温',
    icon: 'temperature-half',
    unit: '°C',
    color: '#e8a87c',
    gradientColor: 'rgba(232, 168, 124, 0.15)',
    normalRange: { min: 36.0, max: 37.3 },
  },
  bloodSugar: {
    title: '血糖',
    icon: 'candy-cane',
    unit: 'mmol/L',
    color: '#a87bc7',
    gradientColor: 'rgba(168, 123, 199, 0.15)',
    normalRange: { min: 3.9, max: 6.1 },
  },
  bodyFat: {
    title: '体脂率',
    icon: 'weight-scale',
    unit: '%',
    color: '#7bb5a8',
    gradientColor: 'rgba(123, 181, 168, 0.15)',
    normalRange: { min: 15, max: 25 },
  },
};

interface HealthLineChartProps {
  type: 'heartRate' | 'bloodPressure' | 'bloodOxygen' | 'steps' | 'temperature' | 'bloodSugar' | 'bodyFat';
  data: number[];
  timeLabels?: string[];
  showTrend?: boolean;
}

// SVG 折线图组件
const SimpleLineChart: React.FC<{
  data: number[];
  color: string;
  width: number;
  height: number;
}> = ({ data, color, width, height }) => {
  if (!data || data.length < 2) return null;

  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding;

  // 计算数据范围
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  // 计算点坐标
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - minVal) / range) * chartHeight;
    return { x, y, value };
  });

  // 生成平滑曲线路径
  const generatePath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';
    
    let path = `M ${pts[0].x} ${pts[0].y}`;
    
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpX = (prev.x + curr.x) / 2;
      path += ` Q ${prev.x + (cpX - prev.x) * 0.5} ${prev.y} ${cpX} ${(prev.y + curr.y) / 2}`;
      path += ` Q ${cpX + (curr.x - cpX) * 0.5} ${curr.y} ${curr.x} ${curr.y}`;
    }
    
    return path;
  };

  // 生成填充区域路径
  const generateAreaPath = (pts: { x: number; y: number }[]) => {
    const linePath = generatePath(pts);
    return `${linePath} L ${pts[pts.length - 1].x} ${height - 5} L ${pts[0].x} ${height - 5} Z`;
  };

  const linePath = generatePath(points);
  const areaPath = generateAreaPath(points);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.3" />
          <Stop offset="1" stopColor={color} stopOpacity="0.05" />
        </LinearGradient>
      </Defs>
      
      {/* 网格线 */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
        <Rect
          key={i}
          x={padding}
          y={padding + chartHeight * ratio - 0.5}
          width={chartWidth}
          height={1}
          fill="rgba(214, 228, 240, 0.3)"
        />
      ))}
      
      {/* 填充区域 */}
      <Path d={areaPath} fill={`url(#gradient-${color})`} />
      
      {/* 折线 */}
      <Path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      
      {/* 数据点 */}
      {points.map((point, index) => (
        <Circle key={index} cx={point.x} cy={point.y} r={4} fill={color} stroke="#fff" strokeWidth={2} />
      ))}
    </Svg>
  );
};

export const HealthLineChart: React.FC<HealthLineChartProps> = ({
  type,
  data,
  timeLabels,
  showTrend = true,
}) => {
  const config = CHART_CONFIGS[type];
  const screenWidth = getScreenWidth();
  const chartWidth = screenWidth - 64;

  // 计算统计数据
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

    let trend = 0;
    if (validData.length >= 2) {
      const prev = validData[validData.length - 2];
      trend = prev > 0 ? ((current - prev) / prev * 100) : 0;
    }

    return { current, avg, max, min, trend };
  }, [data]);

  // 时间标签
  const labels = timeLabels || ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];

  // 空数据状态
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

        <View style={styles.emptyChartContainer}>
          <View style={styles.emptyChartOverlay}>
            <FontAwesome6 name="chart-line" size={24} color={COLORS.textMuted} style={{ opacity: 0.5 }} />
            <Text style={styles.emptyChartText}>等待数据同步...</Text>
          </View>
        </View>

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

  // 数据点不足
  if (data.length < 2) {
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

        <View style={styles.valueSection}>
          <View style={styles.valueRow}>
            <Text style={styles.currentValue}>{stats.current}</Text>
            <Text style={styles.unit}>{config.unit}</Text>
          </View>
        </View>

        <View style={[styles.emptyChartContainer, { height: 140 }]}>
          <Text style={styles.emptyChartText}>数据点不足，需要至少2个数据点</Text>
        </View>

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

      {/* SVG 折线图 */}
      <View style={styles.chartContainer}>
        <SimpleLineChart
          data={data}
          color={config.color}
          width={chartWidth}
          height={140}
        />
      </View>

      {/* 时间轴 */}
      <View style={styles.timeLabels}>
        {labels.slice(0, data.length).map((label, index) => (
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
    paddingHorizontal: Spacing.sm,
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
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
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
});

export default HealthLineChart;
