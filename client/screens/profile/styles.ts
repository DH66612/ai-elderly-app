import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius } from '@/constants/theme';

// 清雅色调固定颜色值
const colors = {
  backgroundRoot: '#f0f5fa',       // 整体背景
  backgroundDefault: '#ffffff',     // 卡片/区域背景
  backgroundTertiary: '#eaf0f5',    // 图标背景、标签背景
  borderLight: '#d6e4f0',           // 边框
  primary: '#8ab3cf',               // 主色/按钮色
  primaryDark: '#7fa5c0',           // 主色阴影
  textPrimary: '#2d4c6e',           // 主要文字
  textSecondary: '#5e7e9f',         // 次要文字
  textMuted: '#9aa9b7',             // 辅助文字
  white: '#ffffff',
  danger: '#e2c6c6',                 // 柔和的红色（解绑按钮背景）
  dangerText: '#b87a7a',             // 解绑按钮文字
  // 渐变色
  gradientStart: '#b8e0e8', // 青色
  gradientEnd: '#f0f5fa',   // 原背景色
};

export const createStyles = (theme: any) => {
  // 忽略传入的theme，使用固定柔和色系
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingTop: Spacing['2xl'],
      paddingBottom: 120,
    },
    // 顶部导航栏
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      paddingTop: Spacing['2xl'],
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.lg,
      backgroundColor: colors.backgroundDefault,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    // 账号资料卡片 - 顶部
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.backgroundDefault,
      marginHorizontal: Spacing.md,
      marginBottom: Spacing.md,
      padding: Spacing.lg,
      borderRadius: BorderRadius.xl,
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    profileContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    profileEditHint: {
      width: 32,
      height: 32,
      borderRadius: BorderRadius.sm,
      backgroundColor: colors.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    profilePhone: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    roleTag: {
      alignSelf: 'flex-start',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      backgroundColor: colors.backgroundTertiary,
      borderRadius: BorderRadius.sm,
    },
    roleTagText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    // 整体卡片
    mainCard: {
      backgroundColor: colors.backgroundDefault,
      marginHorizontal: Spacing.md,
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    // 分隔线
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderLight,
      marginHorizontal: Spacing.lg,
    },
    // 菜单项
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    menuIcon: {
      width: 28,
      height: 28,
      borderRadius: BorderRadius.sm,
      backgroundColor: colors.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    dangerIcon: {
      backgroundColor: colors.danger,
    },
    menuItemTitle: {
      color: colors.textPrimary,
    },
    menuItemSub: {
      color: colors.textSecondary,
      marginTop: 2,
    },
    logoutText: {
      color: colors.dangerText,
    },
    // 退出登录按钮 - 醒目样式
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.danger,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.lg,
      marginTop: Spacing.xl,
      marginBottom: Spacing.lg,
    },
    logoutButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
      marginLeft: Spacing.sm,
    },
    // 绑定区域
    boundSection: {
      padding: Spacing.lg,
    },
    boundUserHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    linkIcon: {
      width: 24,
      height: 24,
      borderRadius: BorderRadius.sm,
      backgroundColor: colors.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.sm,
    },
    boundLabel: {
      color: colors.textSecondary,
    },
    boundUserContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    boundUserName: {
      fontWeight: '600',
      color: colors.textPrimary,
    },
    boundUserActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    boundActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.sm,
      backgroundColor: colors.backgroundTertiary,
    },
    boundActionButtonText: {
      color: colors.textPrimary,
    },
    unbindButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.danger,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.sm,
    },
    unbindButtonText: {
      color: colors.dangerText,
    },
    // 绑定请求区域
    requestSection: {
      padding: Spacing.lg,
    },
    sectionHeader: {
      color: colors.textSecondary,
      marginBottom: Spacing.md,
    },
    requestItem: {
      paddingVertical: Spacing.sm,
    },
    requestItemBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
      marginBottom: Spacing.sm,
    },
    requestContent: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    requestIcon: {
      marginRight: Spacing.md,
    },
    requestInfo: {
      flex: 1,
    },
    requestName: {
      color: colors.textPrimary,
    },
    requestDesc: {
      color: colors.textSecondary,
      marginTop: 2,
    },
    requestActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Spacing.sm,
    },
    requestButton: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.sm,
      minWidth: 50,
      alignItems: 'center',
    },
    requestButtonReject: {
      backgroundColor: colors.backgroundTertiary,
    },
    requestButtonAccept: {
      backgroundColor: colors.primary,
    },
    rejectText: {
      color: colors.textPrimary,
    },
    acceptText: {
      color: colors.white,
    },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.backgroundDefault,
      borderTopLeftRadius: BorderRadius['2xl'],
      borderTopRightRadius: BorderRadius['2xl'],
      paddingTop: Spacing.lg,
      paddingBottom: Spacing['5xl'],
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    // 搜索区域
    searchSection: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      gap: Spacing.md,
    },
    searchInput: {
      flex: 1,
      height: 40,
      paddingHorizontal: Spacing.md,
      backgroundColor: colors.backgroundTertiary,
      borderRadius: BorderRadius.md,
      fontSize: 16,
      lineHeight: 22,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    searchButton: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    // 搜索结果
    searchResult: {
      marginHorizontal: Spacing.lg,
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      backgroundColor: colors.backgroundDefault,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    resultContent: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    resultIcon: {
      marginRight: Spacing.md,
    },
    resultInfo: {
      flex: 1,
    },
    resultButton: {
      backgroundColor: colors.primary,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    // 法律信息区域
    legalSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: Spacing.xl,
      marginHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      backgroundColor: colors.backgroundDefault,
      borderRadius: BorderRadius.lg,
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    legalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      gap: Spacing.sm,
    },
    legalDivider: {
      width: StyleSheet.hairlineWidth,
      height: 16,
      backgroundColor: colors.borderLight,
    },
    legalText: {
      color: colors.textSecondary,
    },
  });
};

export { colors };
