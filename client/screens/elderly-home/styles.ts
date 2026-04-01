import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius } from '@/constants/theme';

/**
 * 老人端 3D黏土风格配色
 * 温暖粉彩 + 大圆角 + 黏土凸起阴影
 * 保留适老化设计：大字体、大按钮、高对比度
 */
export const colors = {
  // 背景色系 - 温暖奶油白
  backgroundRoot: '#faf5f0',
  backgroundDefault: '#ffffff',
  backgroundTertiary: '#f5ebe0',
  borderLight: '#e8ddd0',
  
  // 主色系 - 温暖黏土紫
  primary: '#a78bfa',
  primaryDark: '#8b5cf6',
  primaryLight: '#c4b5fd',
  
  // 文字色 - 温暖色调
  textPrimary: '#4a3f52',
  textSecondary: '#6b5f72',
  textMuted: '#9a8f9f',
  
  white: '#ffffff',
  
  // 功能色 - 柔和温暖
  success: '#86efac',
  successText: '#22c55e',
  warning: '#fcd34d',
  warningText: '#f59e0b',
  danger: '#fca5a5',
  dangerText: '#ef4444',
  
  // 渐变色（保留清雅风格）
  gradientStart: '#b8e0e8',
  gradientEnd: '#f0f5fa',
  
  // 功能按钮颜色 - 温暖粉彩系
  voiceOverlay: 'rgba(167,139,250,0.85)', // 黏土紫 - 语音助手
  videoOverlay: 'rgba(96,165,250,0.85)', // 天空蓝 - 视频通话
  emergencyOverlay: 'rgba(249,168,212,0.85)', // 黏土粉 - 紧急呼叫
  emergencyBorder: '#f9a8d4',
  
  // 黏土阴影色
  shadowDark: '#d4c4b5',
  shadowLight: '#ffffff',
};

/**
 * 黏土凸起效果样式生成器
 */
const clayShadow = {
  // 大按钮凸起效果
  raised: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  // 轻微凸起
  softRaised: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  // 有色阴影
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  }),
  // 内描边高光
  innerHighlight: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
};

export const createStyles = (theme: any) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: Spacing['4xl'],
      paddingHorizontal: Spacing.xl,
    },
    weatherCard: {
      marginBottom: Spacing.lg,
    },
    buttonContainer: {
      flex: 1,
      paddingTop: Spacing.md,
      paddingBottom: Spacing['3xl'],
      justifyContent: 'space-between',
    },
    largeButton: {
      width: '100%',
      height: 170, // 稍大的按钮
      borderRadius: 32, // 更大的圆角 - 黏土胶囊感
      overflow: 'hidden' as const,
      marginBottom: Spacing.lg,
      ...clayShadow.raised,
      ...clayShadow.innerHighlight,
    },
    emergencyButton: {
      borderWidth: 3,
      borderColor: colors.emergencyBorder,
    },
    buttonBackground: {
      flex: 1,
    },
    buttonBackgroundImage: {
      borderRadius: 32,
    },
    buttonOverlay: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.voiceOverlay,
    },
    videoOverlay: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.videoOverlay,
    },
    emergencyOverlay: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.emergencyOverlay,
    },
    buttonContent: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    buttonText: {
      fontSize: 30, // 更大的字体
      fontWeight: '800' as const,
      marginTop: Spacing.sm,
      color: colors.white,
      textShadowColor: 'rgba(0,0,0,0.1)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    buttonSubtext: {
      fontSize: 18,
      marginTop: Spacing.xs,
      textAlign: 'center' as const,
      color: 'rgba(255,255,255,0.95)',
    },
    // 辅助功能入口
    auxiliaryContainer: {
      paddingBottom: Spacing['2xl'],
    },
    auxiliaryButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.white,
      borderRadius: 28, // 更大圆角
      padding: Spacing.lg,
      ...clayShadow.softRaised,
      ...clayShadow.innerHighlight,
    },
    auxiliaryIcon: {
      width: 60,
      height: 60,
      borderRadius: 20,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    auxiliaryTextContainer: {
      flex: 1,
      marginLeft: Spacing.md,
    },
    // 顶部消息入口
    headerRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: Spacing.sm,
    },
    notificationButton: {
      width: 60,
      height: 60,
      borderRadius: 20,
      backgroundColor: colors.backgroundDefault,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      ...clayShadow.softRaised,
      ...clayShadow.innerHighlight,
      position: 'relative' as const,
    },
    unreadBadge: {
      position: 'absolute' as const,
      top: -4,
      right: -4,
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.dangerText,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 6,
      borderWidth: 2.5,
      borderColor: colors.white,
    },
    unreadBadgeText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: '700' as const,
    },
  });
};
