/**
 * 监护人端统一背景组件
 * 包含渐变背景和爱心流星动画
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HeartMeteors } from '@/components/HeartMeteors';

// 统一的渐变色
export const GUARDIAN_GRADIENT_COLORS = {
  start: '#b8e0e8', // 青色
  end: '#f0f5fa',   // 背景色
};

interface GuardianBackgroundProps {
  showMeteors?: boolean;  // 是否显示爱心流星
  meteorCount?: number;   // 流星数量
  children?: React.ReactNode;
}

export const GuardianBackground: React.FC<GuardianBackgroundProps> = ({
  showMeteors = true,
  meteorCount = 8,
  children,
}) => {
  return (
    <View style={styles.container}>
      {/* 渐变背景 */}
      <LinearGradient
        colors={[GUARDIAN_GRADIENT_COLORS.start, GUARDIAN_GRADIENT_COLORS.end]}
        locations={[0, 0.4]}
        style={styles.gradient}
      />
      
      {/* 爱心流星 */}
      {showMeteors && <HeartMeteors count={meteorCount} />}
      
      {/* 子内容 */}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default GuardianBackground;
