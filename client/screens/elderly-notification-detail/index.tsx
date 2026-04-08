/**
 * 老人端消息详情页面 - 3D黏土风格
 * 柔和粉彩 + 黏土凸起阴影 + 白色内描边高光
 * 配色与老人端主页同步
 */
import React, { useMemo } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { HeartMeteors } from '@/components/HeartMeteors';

// 3D黏土风格配色（与老人端主页同步）
const colors = {
  // 背景色系 - 温暖奶油白
  backgroundRoot: '#faf5f0',
  backgroundDefault: '#ffffff',
  backgroundTertiary: '#f5ebe0',
  borderLight: '#e8ddd0',
  
  // 主色系 - 温暖黏土紫
  primary: '#a78bfa',
  primaryLight: '#c4b5fd',
  primaryDark: '#8b5cf6',
  primaryGradient: '#9B7DFF',
  
  // 辅助色系 - 黏土粉
  secondary: '#f9a8d4',
  secondaryGradient: '#FFB3C1',
  
  // 文字色 - 温暖色调
  textPrimary: '#4a3f52',
  textSecondary: '#6b5f72',
  textMuted: '#9a8f9f',
  
  // 功能色 - 柔和温暖
  success: '#86efac',
  successText: '#22c55e',
  warning: '#fcd34d',
  warningText: '#f59e0b',
  danger: '#fca5a5',
  dangerText: '#ef4444',
  
  white: '#ffffff',
  
  // 黏土阴影色
  shadowDark: '#d4c4b5',
  shadowLight: '#ffffff',
  shadowMedium: '#e8ddd0',
  
  // 消息类型颜色（粉彩系）
  festival: '#fcd34d',
  festivalGradient: '#FDCB6E',
  weather: '#54A0FF',
  weatherGradient: '#74B9FF',
  emergency: '#fca5a5',
  emergencyGradient: '#FF8787',
  reminder: '#86efac',
  reminderGradient: '#55EFC4',
  system: '#a78bfa',
  systemGradient: '#C8B6FF',
};

export default function ElderlyNotificationDetailScreen() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{
    id: string;
    type: string;
    title: string;
    content: string;
    time: string;
  }>();

  const { type = 'reminder', title = '消息详情', content = '', time = '' } = params;

  const styles = useMemo(() => createStyles(), []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'festival': return 'gift';
      case 'weather': return 'cloud-sun';
      case 'emergency': return 'triangle-exclamation';
      case 'reminder': return 'bell';
      case 'system': return 'gear';
      default: return 'message';
    }
  };

  const getNotificationColors = (type: string) => {
    switch (type) {
      case 'festival': return { primary: colors.festival, gradient: colors.festivalGradient };
      case 'weather': return { primary: colors.weather, gradient: colors.weatherGradient };
      case 'emergency': return { primary: colors.emergency, gradient: colors.emergencyGradient };
      case 'reminder': return { primary: colors.reminder, gradient: colors.reminderGradient };
      case 'system': return { primary: colors.system, gradient: colors.systemGradient };
      default: return { primary: colors.primary, gradient: colors.primaryGradient };
    }
  };

  const notificationColors = getNotificationColors(type);
  const icon = getNotificationIcon(type);

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      {/* 背景与首页一致 */}
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <HeartMeteors count={6} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* 顶部导航栏 */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="chevron-left" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* 类型标签 */}
        <View style={styles.typeBadge}>
          <View style={[styles.typeIconBox, { backgroundColor: notificationColors.primary }]}>
            <FontAwesome6 name={icon as any} size={20} color={colors.white} />
          </View>
          <Text style={styles.typeLabel}>
            {type === 'festival' ? '节日祝福' :
             type === 'weather' ? '天气提醒' :
             type === 'emergency' ? '紧急通知' :
             type === 'reminder' ? '提醒' :
             type === 'system' ? '系统消息' : '消息'}
          </Text>
        </View>

        {/* 消息卡片 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardTime}>{time}</Text>
          <View style={styles.divider} />
          <Text style={styles.cardContent}>{content}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const createStyles = () => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 0,
      paddingBottom: Spacing['5xl'],
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.lg,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      marginBottom: Spacing.xl,
    },
    typeIconBox: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    typeLabel: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.white,
    },
    card: {
      backgroundColor: colors.backgroundDefault,
      borderRadius: BorderRadius['2xl'],
      padding: Spacing['2xl'],
      marginHorizontal: Spacing.lg,
      // 黏土凸起阴影
      shadowColor: colors.shadowDark,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
      // 白色内描边高光
      borderWidth: 1,
      borderColor: colors.shadowLight,
    },
    cardTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
    },
    cardTime: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: Spacing.lg,
    },
    divider: {
      height: 1,
      backgroundColor: colors.borderLight,
      marginBottom: Spacing.lg,
    },
    cardContent: {
      fontSize: 16,
      lineHeight: 26,
      color: colors.textSecondary,
    },
  });
};
