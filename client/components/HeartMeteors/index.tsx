/**
 * 爱心流星背景动画组件 - 优化版
 * 白色爱心形状的流星，带明显的渐变拖尾痕迹
 * 优化：组件卸载时清理动画，避免内存泄漏
 */
import React, { useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

// 爱心形状 - 使用SVG绘制
const HeartShape = React.memo(({ size, opacity }: { size: number; opacity: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill={`rgba(255, 255, 255, ${opacity})`}
    />
  </Svg>
));

HeartShape.displayName = 'HeartShape';

// 渐变拖尾 - 指向左上方（流星来的方向），有明显渐变痕迹
const MeteorTail = React.memo(({ length }: { length: number }) => {
  // 创建多个小段来模拟渐变效果
  const segments = 12; // 减少分段数优化性能
  const segmentWidth = length / segments;
  
  // 使用 useMemo 缓存分段渲染
  const tailSegments = useMemo(() => {
    return Array.from({ length: segments }).map((_, i) => {
      const progress = i / segments;
      const opacity = progress * progress * 0.6;
      const width = segmentWidth * (0.5 + progress * 0.5);
      const height = 1 + progress * 3;
      
      return { width, height, opacity, key: i };
    });
  }, [length, segmentWidth, segments]);

  return (
    <View
      style={{
        position: 'absolute',
        left: -length - 5,
        top: -length * 0.55,
        width: length,
        height: 6,
        flexDirection: 'row',
        alignItems: 'center',
        transform: [{ rotate: '45deg' }],
      }}
    >
      {tailSegments.map((seg) => (
        <View
          key={seg.key}
          style={{
            width: seg.width,
            height: seg.height,
            backgroundColor: `rgba(255, 255, 255, ${seg.opacity})`,
            marginRight: 1,
            borderRadius: 1,
          }}
        />
      ))}
    </View>
  );
});

MeteorTail.displayName = 'MeteorTail';

interface MeteorProps {
  delay: number;
  startX: number;
  startY: number;
  size: number;
  duration: number;
  opacity: number;
  tailLength: number;
  animationId: string;
}

const Meteor = React.memo(({ 
  delay, 
  startX, 
  startY, 
  size, 
  duration, 
  opacity, 
  tailLength,
  animationId,
}: MeteorProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, {
          duration,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );

    // 清理函数：组件卸载时取消动画
    return () => {
      cancelAnimation(progress);
    };
  }, [delay, duration, progress, animationId]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [0, 1], [startY, 1000]);
    const translateX = interpolate(progress.value, [0, 1], [startX, startX + 400]);
    const fadeOpacity = interpolate(
      progress.value,
      [0, 0.03, 0.75, 1],
      [0, 1, 1, 0]
    );

    return {
      transform: [{ translateY }, { translateX }],
      opacity: fadeOpacity,
    };
  });

  return (
    <Animated.View style={[styles.meteor, animatedStyle]}>
      <MeteorTail length={tailLength} />
      <HeartShape size={size} opacity={opacity} />
    </Animated.View>
  );
});

Meteor.displayName = 'Meteor';

// 预定义的流星配置（减少数量优化性能）
const METEOR_CONFIGS = [
  { id: 'm1', delay: 0, startX: 20, startY: -80, size: 14, duration: 4000, opacity: 0.7, tailLength: 80 },
  { id: 'm2', delay: 1200, startX: 150, startY: -60, size: 18, duration: 5000, opacity: 0.8, tailLength: 100 },
  { id: 'm3', delay: 800, startX: -50, startY: -100, size: 12, duration: 4500, opacity: 0.6, tailLength: 60 },
  { id: 'm4', delay: 2500, startX: 200, startY: -40, size: 16, duration: 5500, opacity: 0.75, tailLength: 90 },
  { id: 'm5', delay: 3500, startX: 80, startY: -90, size: 10, duration: 3800, opacity: 0.55, tailLength: 50 },
  { id: 'm6', delay: 1500, startX: -80, startY: -70, size: 13, duration: 4800, opacity: 0.65, tailLength: 70 },
  { id: 'm7', delay: 4000, startX: 280, startY: -50, size: 20, duration: 6000, opacity: 0.85, tailLength: 120 },
  { id: 'm8', delay: 500, startX: 120, startY: -120, size: 11, duration: 4200, opacity: 0.58, tailLength: 55 },
];

interface HeartMeteorsProps {
  count?: number;
}

export const HeartMeteors = React.memo(({ count = 6 }: HeartMeteorsProps) => {
  // 使用 useMemo 缓存流星配置
  const meteors = useMemo(() => {
    return METEOR_CONFIGS.slice(0, Math.min(count, 8));
  }, [count]);

  return (
    <View style={styles.container} pointerEvents="none">
      {meteors.map((meteor) => (
        <Meteor
          key={meteor.id}
          animationId={meteor.id}
          delay={meteor.delay}
          startX={meteor.startX}
          startY={meteor.startY}
          size={meteor.size}
          duration={meteor.duration}
          opacity={meteor.opacity}
          tailLength={meteor.tailLength}
        />
      ))}
    </View>
  );
});

HeartMeteors.displayName = 'HeartMeteors';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  meteor: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

export default HeartMeteors;
