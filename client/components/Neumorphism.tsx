/**
 * 新拟态组件（Neumorphism）
 * 适用于监护人端的精美现代风格
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { BorderRadius, Spacing } from '@/constants/theme';

interface SoftCardProps {
  children: React.ReactNode;
  style?: any;
  variant?: 'raised' | 'inset';
}

/**
 * 新拟态卡片 - 双层阴影实现凸起/凹陷效果
 */
export function SoftCard({ children, style, variant = 'raised' }: SoftCardProps) {
  const { theme } = useTheme();

  if (variant === 'inset') {
    // 凹陷效果（输入框、内嵌区域）
    return (
      <View
        style={[
          styles.insetCard,
          {
            backgroundColor: theme.backgroundTertiary,
            borderColor: 'rgba(255,255,255,0.6)',
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // 凸起效果（卡片、按钮）- 双层阴影嵌套
  const shadowDark = (theme as any).shadowDark || '#D1D9E6';
  const shadowLight = (theme as any).shadowLight || '#FFFFFF';

  return (
    <View
      style={[
        styles.shadowDark,
        {
          shadowColor: shadowDark,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.shadowLight,
          {
            backgroundColor: theme.backgroundDefault,
            shadowColor: shadowLight,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

interface SoftButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  disabled?: boolean;
  style?: any;
}

/**
 * 渐变按钮 - 薰衣草紫渐变
 */
export function SoftButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: SoftButtonProps) {
  const colors: Record<string, [string, string]> = {
    primary: ['#6C63FF', '#896BFF'],
    secondary: ['#F0F0F3', '#E8E8EB'],
    success: ['#00B894', '#00D9A5'],
    danger: ['#FF6B6B', '#FF8E8E'],
  };

  const textColors = {
    primary: '#FFFFFF',
    secondary: '#2D3436',
    success: '#FFFFFF',
    danger: '#FFFFFF',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[disabled && styles.disabled, style]}
    >
      <LinearGradient
        colors={colors[variant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientButton}
      >
        <ThemedText
          variant="bodyMedium"
          style={{ color: textColors[variant] }}
        >
          {title}
        </ThemedText>
      </LinearGradient>
    </TouchableOpacity>
  );
}

interface IconContainerProps {
  name: string;
  color?: string;
  backgroundColor?: string;
  size?: number;
}

/**
 * 图标容器 - 带背景的图标
 */
export function IconContainer({
  name,
  color = '#6C63FF',
  backgroundColor = 'rgba(108, 99, 255, 0.12)',
  size = 22,
}: IconContainerProps) {
  return (
    <View
      style={[
        styles.iconContainer,
        { backgroundColor },
      ]}
    >
      {/* 注意：这里需要配合 FontAwesome6 使用，传入 name */}
      <View style={{ width: size, height: size }} />
    </View>
  );
}

interface TagProps {
  label: string;
  variant?: 'primary' | 'accent' | 'success';
}

/**
 * 标签胶囊
 */
export function Tag({ label, variant = 'primary' }: TagProps) {
  const colors = {
    primary: { bg: 'rgba(108, 99, 255, 0.10)', text: '#6C63FF' },
    accent: { bg: 'rgba(255, 101, 132, 0.10)', text: '#FF6584' },
    success: { bg: 'rgba(0, 184, 148, 0.10)', text: '#00B894' },
  };

  return (
    <View style={[styles.tag, { backgroundColor: colors[variant].bg }]}>
      <ThemedText
        variant="smallMedium"
        style={{ color: colors[variant].text }}
      >
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  // 凸起卡片外层 - 暗部阴影
  shadowDark: {
    borderRadius: BorderRadius['2xl'],
    marginBottom: Spacing.md,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    ...Platform.select({
      android: {
        elevation: 6,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.5)',
      },
    }),
  },
  // 凸起卡片内层 - 高光阴影
  shadowLight: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    shadowOffset: { width: -6, height: -6 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  // 凹陷卡片
  insetCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
  // 渐变按钮
  gradientButton: {
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
  },
  // 图标容器
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 标签
  tag: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  disabled: {
    opacity: 0.5,
  },
});
