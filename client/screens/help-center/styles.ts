import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius } from '@/constants/theme';

// 清雅色调固定颜色值（与监护人端一致）
export const colors = {
  backgroundRoot: '#f0f5fa',
  backgroundDefault: '#ffffff',
  backgroundTertiary: '#eaf0f5',
  borderLight: '#d6e4f0',
  primary: '#8ab3cf',
  primaryLight: '#d6e8f0',
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
  border: '#d6e4f0',
  cardBg: '#FFFFFF',
  // 渐变色（清雅风格）
  gradientStart: '#b8e0e8',
  gradientEnd: '#f0f5fa',
};

export const createStyles = () => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 0,
      paddingTop: Spacing.md,
      paddingBottom: Spacing['5xl'],
    },
    // 联系客服按钮
    contactButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 2,
    },
    contactButtonIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    contactButtonContent: {
      flex: 1,
    },
    contactButtonTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    contactButtonSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    // 分类卡片
    categoryCard: {
      backgroundColor: colors.cardBg,
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 2,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.md,
      paddingBottom: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    categoryIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.sm,
    },
    categoryTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    // FAQ项
    faqItem: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingVertical: Spacing.md,
    },
    faqHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    faqQuestion: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
      marginRight: Spacing.sm,
    },
    faqAnswer: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
      marginTop: Spacing.sm,
      paddingLeft: Spacing.xs,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
      marginBottom: Spacing.md,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    // 联系方式卡片
    contactCard: {
      backgroundColor: colors.cardBg,
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 2,
    },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
    },
    contactLabel: {
      fontSize: 15,
      color: colors.textSecondary,
      marginLeft: Spacing.md,
      width: 70,
    },
    contactValue: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      textAlign: 'right',
    },
    contactDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: Spacing.xs,
    },
    // 温馨提示卡片
    tipCard: {
      backgroundColor: '#faf6f0',
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: '#e8dfcf',
    },
    tipHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    tipTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.warningText,
      marginLeft: Spacing.sm,
    },
    tipText: {
      fontSize: 14,
      lineHeight: 24,
      color: colors.textSecondary,
    },
  });
};
