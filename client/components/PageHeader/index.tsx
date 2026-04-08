/**
 * 统一页面头部组件
 * 
 * 使用规范：
 * 1. 所有二级页面（进入详情后的页面）都使用此组件
 * 2. 布局固定：返回按钮 | 标题 | 占位符（对称）
 * 3. 统一尺寸和字体
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Spacing } from '@/constants/theme';

interface PageHeaderProps {
  /** 页面标题 */
  title: string;
  /** 标题颜色 */
  titleColor?: string;
  /** 按钮背景色 */
  buttonBgColor?: string;
  /** 图标颜色 */
  iconColor?: string;
  /** 是否显示返回按钮（默认显示） */
  showBack?: boolean;
  /** 右侧自定义内容 */
  rightContent?: React.ReactNode;
  /** 自定义样式 */
  style?: any;
}

export function PageHeader({
  title,
  titleColor = '#2d4c6e',
  buttonBgColor = 'rgba(255, 255, 255, 0.9)',
  iconColor = '#2d4c6e',
  showBack = true,
  rightContent,
  style,
}: PageHeaderProps) {
  const router = useSafeRouter();

  return (
    <View style={[styles.container, style]}>
      {/* 返回按钮 */}
      {showBack ? (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="chevron-left" size={22} color={iconColor} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}

      {/* 标题 */}
      <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
        {title}
      </Text>

      {/* 右侧内容 */}
      {rightContent ? rightContent : <View style={styles.placeholder} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  placeholder: {
    width: 44,
    height: 44,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
});
