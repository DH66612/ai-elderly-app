import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius } from '@/constants/theme';

// 清雅色调固定颜色值
const colors = {
  backgroundRoot: '#f0f5fa',
  backgroundDefault: '#ffffff',
  backgroundTertiary: '#eaf0f5',
  borderLight: '#d6e4f0',
  primary: '#8ab3cf',
  primaryDark: '#7fa5c0',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#8fa5bb',
  white: '#ffffff',
  success: '#a8c8b8',
  successText: '#5a8a7a',
  warning: '#d4c4a8',
  warningText: '#8a7a5a',
  danger: '#e2c6c6',
  dangerText: '#b87a7a',
  // 渐变色
  gradientStart: '#b8e0e8', // 青色
  gradientEnd: '#f0f5fa',   // 原背景色
};

export const createStyles = (theme: any) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 0,
      paddingTop: Spacing['2xl'],
      paddingBottom: 120,
    },
    header: {
      marginBottom: Spacing.xl,
    },
    pageTitle: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: Spacing.xs,
      color: colors.textPrimary,
    },
    // 提示卡片
    alertCard: {
      backgroundColor: colors.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    alertContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    alertButton: {
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.md,
      paddingHorizontal: 0,
      paddingVertical: Spacing.sm,
    },
    // 区块
    section: {
      marginTop: Spacing.xl,
    },
    sectionHeader: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: Spacing.md,
      color: colors.textSecondary,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    // 同步按钮
    syncButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.md,
      paddingHorizontal: 0,
      paddingVertical: Spacing.xs,
    },
    syncButtonText: {
      marginLeft: Spacing.xs,
      color: colors.white,
    },
    // 加载状态
    loadingCard: {
      backgroundColor: colors.backgroundDefault,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing['3xl'],
      alignItems: 'center',
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    loadingText: {
      marginTop: Spacing.sm,
      color: colors.textMuted,
    },
    // 设备卡片
    deviceCard: {
      backgroundColor: colors.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    deviceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    deviceInfo: {
      flex: 1,
      marginLeft: Spacing.md,
    },
    deviceStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.xs,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.success,
      marginRight: Spacing.xs,
    },
    deviceDetails: {
      marginTop: Spacing.md,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    // 空状态
    emptyCard: {
      backgroundColor: colors.backgroundDefault,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing['3xl'],
      alignItems: 'center',
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    emptyText: {
      marginTop: Spacing.md,
      color: colors.textMuted,
    },
    // 数据卡片
    dataCard: {
      backgroundColor: colors.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    dataGrid: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dataItem: {
      flex: 1,
      alignItems: 'center',
    },
    dataDivider: {
      width: 1,
      height: 80,
      backgroundColor: colors.borderLight,
    },
    dataTimestamp: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: Spacing.md,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    // 信息卡片
    infoCard: {
      backgroundColor: colors.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    stepNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
      backgroundColor: colors.backgroundTertiary,
    },
    // 图标容器
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
};

export { colors };
