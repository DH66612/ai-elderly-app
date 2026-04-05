import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius } from '@/constants/theme';

/**
 * 3D黏土风格配色
 * 柔和粉彩 + 黏土凸起阴影 + 白色内描边高光 + 大圆角胶囊感
 */
export const colors = {
  // 背景色系 - 暖白奶油色
  backgroundRoot: '#faf5f0',
  backgroundDefault: '#ffffff',
  backgroundTertiary: '#f5ebe0',
  backgroundElevated: '#fdfaf7',
  borderLight: '#e8ddd0',
  
  // 主色系 - 黏土紫/薰衣草紫
  primary: '#a78bfa',           // 黏土紫
  primaryLight: '#c4b5fd',      // 浅黏土紫
  primaryDark: '#8b5cf6',       // 深黏土紫
  primarySoft: 'rgba(167,139,250,0.15)',  // 柔和主色背景
  
  // 辅助色系 - 黏土粉
  clayPink: '#f9a8d4',
  clayPinkSoft: 'rgba(249,168,212,0.15)',
  
  // 文字色 - 温暖色调
  textPrimary: '#4a3f52',
  textSecondary: '#6b5f72',
  textMuted: '#9a8f9f',
  
  // 功能色 - 柔和版本
  success: '#86efac',
  successSoft: 'rgba(134,239,172,0.15)',
  successText: '#22c55e',
  warning: '#fcd34d',
  warningSoft: 'rgba(252,211,77,0.15)',
  warningText: '#f59e0b',
  danger: '#fca5a5',
  dangerSoft: 'rgba(252,165,165,0.15)',
  dangerText: '#ef4444',
  
  white: '#ffffff',
  
  // 黏土阴影色
  shadowDark: '#d4c4b5',
  shadowLight: '#ffffff',
  shadowMedium: '#e8ddd0',
  
  // 渐变色（保留原背景）
  gradientStart: '#b8e0e8',
  gradientEnd: '#f0f5fa',
};

/**
 * 黏土凸起效果样式生成器
 * 双层阴影 + 内描边高光
 */
const clayShadow = {
  // 凸起效果
  raised: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  // 轻微凸起
  softRaised: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  // 有色阴影（用于强调）
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  }),
  // 内描边高光
  innerHighlight: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
};

export const createStyles = (theme: any) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 0,
      paddingTop: Spacing.lg,
      paddingBottom: 80,
    },
    
    // ==================== 底部消息入口 ====================
    headerRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'flex-end' as const,
      marginBottom: 0,
    },
    notificationButton: {
      position: 'absolute' as const,
      right: Spacing.xs,
      bottom: 30,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.backgroundDefault,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      // 黏土凸起效果
      ...clayShadow.raised,
      ...clayShadow.innerHighlight,
      zIndex: 100,
    },
    unreadBadge: {
      position: 'absolute' as const,
      top: -4,
      right: -4,
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.dangerText,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 6,
      borderWidth: 2.5,
      borderColor: colors.white,
      // 微小阴影
      shadowColor: colors.dangerText,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    unreadBadgeText: {
      color: colors.white,
      fontSize: 11,
      fontWeight: '700' as const,
    },
    
    // ==================== SSE连接状态 ====================
    connectionStatus: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: Spacing.md,
      paddingVertical: Spacing.xs,
      backgroundColor: 'rgba(255,255,255,0.6)',
      paddingHorizontal: 0,
      borderRadius: 20,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: Spacing.xs,
    },
    statusOnline: {
      backgroundColor: colors.successText,
    },
    statusOffline: {
      backgroundColor: colors.dangerText,
    },
    statusText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    
    // ==================== 区块标题 ====================
    section: {
      marginTop: Spacing.md,
    },
    sectionHeader: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
      marginBottom: Spacing.sm,
      color: colors.textSecondary,
    },
    sectionHeaderRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: Spacing.md,
    },
    sectionTitle: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '700' as const,
      color: colors.textPrimary,
    },
    
    // ==================== 功能宫格卡片 ====================
    actionGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      justifyContent: 'space-between' as const,
    },
    actionCard: {
      backgroundColor: colors.backgroundDefault,
      borderRadius: 28,  // 更大圆角
      padding: Spacing.md,
      ...clayShadow.raised,
      ...clayShadow.innerHighlight,
    },
    actionItem: {
      width: '48%',
      alignItems: 'center' as const,
      paddingVertical: Spacing.sm,
    },
    actionIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: Spacing.sm,
      backgroundColor: colors.primarySoft,
    },
    actionText: {
      fontSize: 14,
      lineHeight: 20,
      marginTop: Spacing.xs,
      fontWeight: '600' as const,
      color: colors.textPrimary,
    },
    
    // ==================== 数据卡片 ====================
    dataCard: {
      backgroundColor: colors.backgroundDefault,
      borderRadius: 28,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      ...clayShadow.raised,
      ...clayShadow.innerHighlight,
    },
    dataCardHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: Spacing.sm,
    },
    dataCardTitle: {
      flex: 1,
      marginLeft: Spacing.md,
    },
    dataGrid: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: Spacing.md,
    },
    dataItem: {
      flex: 1,
      alignItems: 'center' as const,
    },
    dataDivider: {
      width: 1,
      height: 60,
      backgroundColor: colors.borderLight,
    },
    dataTimestamp: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginTop: Spacing.md,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    
    // ==================== 提示卡片 ====================
    alertCard: {
      backgroundColor: colors.backgroundDefault,
      borderRadius: 28,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      ...clayShadow.raised,
      ...clayShadow.innerHighlight,
    },
    alertContent: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    alertTitle: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600' as const,
      marginBottom: 2,
      color: colors.textPrimary,
    },
    alertButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingHorizontal: 0,
      paddingVertical: Spacing.sm,
      ...clayShadow.colored(colors.primary),
    },
    
    // ==================== 空状态 ====================
    emptyCard: {
      paddingVertical: Spacing['3xl'],
      alignItems: 'center' as const,
      backgroundColor: colors.backgroundDefault,
      borderRadius: 28,
      ...clayShadow.raised,
      ...clayShadow.innerHighlight,
    },
    emptyText: {
      marginTop: Spacing.md,
    },
    
    // ==================== 用药提醒入口 ====================
    medicationEntry: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: Spacing.sm,
      marginTop: Spacing.xs,
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.5)',
      paddingHorizontal: 0,
      borderRadius: 16,
    },
    
    // ==================== 宣传卡片 ====================
    bannerCard: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 0,
      paddingVertical: Spacing.xl,
      borderRadius: 28,
      backgroundColor: colors.primary,
      ...clayShadow.colored(colors.primary),
    },
    bannerContent: {
      flex: 1,
    },
    bannerTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      marginBottom: Spacing.xs,
      color: colors.white,
    },
    
    // ==================== 风险标签 ====================
    riskBadge: {
      paddingHorizontal: 0,
      paddingVertical: Spacing.xs,
      borderRadius: 14,
      alignSelf: 'flex-start' as const,
    },
    
    // ==================== 同步按钮 ====================
    syncButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingHorizontal: 0,
      paddingVertical: Spacing.xs,
      ...clayShadow.softRaised,
    },
    syncButtonText: {
      marginLeft: Spacing.xs,
      color: colors.white,
      fontWeight: '600' as const,
    },
    
    // ==================== 跌倒告警横幅 ====================
    fallAlertBanner: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.dangerText,
      borderRadius: 24,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      ...clayShadow.colored(colors.dangerText),
    },
    fallAlertIconWrapper: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginRight: Spacing.md,
    },
    fallAlertContent: {
      flex: 1,
    },
    
    // ==================== 图表卡片 ====================
    chartCard: {
      backgroundColor: colors.backgroundDefault,
      borderRadius: 28,
      padding: Spacing.lg,
      marginTop: Spacing.md,
      ...clayShadow.raised,
      ...clayShadow.innerHighlight,
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      marginBottom: Spacing.md,
      color: colors.textPrimary,
    },
    
    // ==================== 记事本入口卡片 ====================
    notesEntryCard: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.backgroundDefault,
      borderRadius: 28,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      ...clayShadow.raised,
      ...clayShadow.innerHighlight,
    },
    notesEntryIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.primarySoft,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginRight: Spacing.md,
    },
    notesEntryContent: {
      flex: 1,
    },
    notesEntryTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    notesEntrySubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    notesEntryBadge: {
      backgroundColor: colors.primarySoft,
      borderRadius: 12,
      paddingHorizontal: 0,
      paddingVertical: Spacing.xs,
    },
    notesEntryBadgeText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.primary,
    },
    
    // ==================== 快捷入口卡片 ====================
    quickEntryCard: {
      flexDirection: 'row' as const,
      backgroundColor: colors.backgroundDefault,
      borderRadius: 28,
      padding: Spacing.md,
      ...clayShadow.raised,
      ...clayShadow.innerHighlight,
    },
    quickEntryLarge: {
      flex: 1,
      alignItems: 'center' as const,
      paddingVertical: Spacing.lg,
    },
    quickEntryTitle: {
      marginTop: Spacing.sm,
      marginBottom: 2,
    },
    verticalDivider: {
      width: 1,
      backgroundColor: colors.borderLight,
      marginVertical: Spacing.md,
    },
  });
};
