/**
 * 监护人端艺术字问候语组件
 * 随机显示问候语，带逐字浮现动画
 */
import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

// 问候语列表（随机显示）
const GREETINGS = [
  '云问候，心相伴。',
  '远方的牵念，化作眼前的数据。',
  '数据无言，守护有声。',
];

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
 * 随机获取一条问候语
 */
function getRandomGreeting(): string {
  const randomIndex = Math.floor(Math.random() * GREETINGS.length);
  return GREETINGS[randomIndex];
}

export function GuardianGreeting() {
  // 使用初始化函数随机选择问候语
  const [greeting] = useState(() => getRandomGreeting());
  const [key] = useState(0); // 用于强制重新渲染动画

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
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  textWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start', // 靠左
    alignItems: 'center',
  },
  char: {
    fontSize: 14,
    fontWeight: '400',
    color: '#555555', // 灰黑色
    letterSpacing: 1.5, // 字间距
    includeFontPadding: false,
  },
  punctuation: {
    // 标点符号稍微小一点
    fontSize: 13,
  },
});

export default GuardianGreeting;
