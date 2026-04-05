/**
 * 艺术字问候语组件
 * 根据早中晚显示不同的问候语，带逐字浮现动画
 */
import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

// 问候语配置
const GREETINGS = {
  morning: {
    text: '晨光熹微，愿您今日清安。',
    timeRange: [5, 11], // 5:00 - 11:00
  },
  noon: {
    text: '日色温柔，您亦如是。',
    timeRange: [11, 18], // 11:00 - 18:00
  },
  evening: {
    text: '晚风拂面，该歇一歇了。',
    timeRange: [18, 5], // 18:00 - 次日5:00
  },
};

interface AnimatedCharProps {
  char: string;
  index: number;
}

// 单个字符动画组件
function AnimatedChar({ char, index }: AnimatedCharProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    // 每个字符延迟淡入，柔和的浮现效果
    const delayMs = index * 150; // 150ms 间隔
    
    opacity.value = withDelay(
      delayMs,
      withTiming(1, { duration: 400 }) // 400ms 淡入
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // 标点符号特殊处理
  const isPunctuation = ['，', '。', '、', '！', '？'].includes(char);

  return (
    <Animated.Text style={[
      styles.char,
      isPunctuation && styles.punctuation,
      animatedStyle
    ]}>
      {char}
    </Animated.Text>
  );
}

/**
 * 获取当前时间段对应的问候语
 */
function getCurrentGreeting(): string {
  const hour = new Date().getHours();
  
  // 早晨 5:00 - 11:00
  if (hour >= 5 && hour < 11) {
    return GREETINGS.morning.text;
  }
  // 中午/下午 11:00 - 18:00
  if (hour >= 11 && hour < 18) {
    return GREETINGS.noon.text;
  }
  // 晚上 18:00 - 次日5:00
  return GREETINGS.evening.text;
}

export function ArtisticGreeting() {
  const [greeting, setGreeting] = useState(getCurrentGreeting());
  const [key, setKey] = useState(0); // 用于强制重新渲染动画

  // 每分钟检查是否需要更新问候语
  useEffect(() => {
    const timer = setInterval(() => {
      const newGreeting = getCurrentGreeting();
      if (newGreeting !== greeting) {
        setGreeting(newGreeting);
        setKey(prev => prev + 1); // 触发重新动画
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [greeting]);

  // 将问候语拆分为字符数组
  const chars = useMemo(() => greeting.split(''), [greeting]);

  return (
    <View style={styles.container} key={key}>
      <View style={styles.textWrapper}>
        {chars.map((char, index) => (
          <AnimatedChar
            key={`${index}-${char}`}
            char={char}
            index={index}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'flex-start', // 靠左对齐
    paddingHorizontal: 16, // 减小边距，更靠左
    paddingVertical: 12,
  },
  textWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start', // 靠左
    alignItems: 'center',
  },
  char: {
    fontSize: 17, // 字体加大
    fontWeight: '400',
    color: '#555555', // 灰黑色
    letterSpacing: 2, // 字间距
    includeFontPadding: false,
  },
  punctuation: {
    // 标点符号稍微小一点
    fontSize: 16,
  },
});

export default ArtisticGreeting;
