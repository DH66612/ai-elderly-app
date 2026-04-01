/**
 * 环形进度仪表盘组件
 * 用于展示数据完成率，如步数目标、睡眠时长等
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Spacing, BorderRadius } from '@/constants/theme';

interface ProgressRingProps {
  percentage: number;         // 完成百分比 (0-100)
  size?: number;              // 环形大小
  strokeWidth?: number;       // 环形宽度
  title: string;              // 指标名称
  value?: string | number;    // 当前值
  unit?: string;              // 单位
  target?: string | number;   // 目标值
  colors?: string[];          // 渐变色
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  size = 120,
  strokeWidth = 10,
  title,
  value,
  unit,
  target,
  colors = ['#8ab3cf', '#5e9cb8'], // 默认淡青色渐变
}) => {
  // 限制百分比在0-100之间
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  
  // 计算环形参数
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;
  
  // 中心点
  const center = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* 渐变定义 */}
        <Defs>
          <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors[0]} />
            <Stop offset="100%" stopColor={colors[1] || colors[0]} />
          </LinearGradient>
        </Defs>
        
        {/* 背景环 */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(138, 179, 207, 0.15)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* 进度环 */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90, ${center}, ${center})`}
        />
      </Svg>
      
      {/* 中心文字 */}
      <View style={styles.centerContent}>
        <Text style={styles.percentageText}>{Math.round(clampedPercentage)}%</Text>
        {value !== undefined && (
          <Text style={styles.valueText}>
            {value}{unit && <Text style={styles.unitText}> {unit}</Text>}
          </Text>
        )}
      </View>
    </View>
  );
};

// 带标题和目标信息的完整卡片
interface ProgressRingCardProps extends ProgressRingProps {
  showTarget?: boolean;
}

export const ProgressRingCard: React.FC<ProgressRingCardProps> = ({
  title,
  value,
  unit,
  target,
  showTarget = true,
  ...ringProps
}) => {
  return (
    <View style={styles.card}>
      <ProgressRing
        {...ringProps}
        title={title}
        value={value}
        unit={unit}
        target={target}
      />
      <Text style={styles.title}>{title}</Text>
      {showTarget && target !== undefined && (
        <Text style={styles.targetText}>目标: {target}{unit}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2d4c6e',
  },
  valueText: {
    fontSize: 12,
    color: '#5e7e9f',
    marginTop: 2,
  },
  unitText: {
    fontSize: 10,
    color: '#9aa9b7',
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: '#a3b8cc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d4c6e',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  targetText: {
    fontSize: 12,
    color: '#9aa9b7',
    marginTop: Spacing.xs,
  },
});

export default ProgressRing;
