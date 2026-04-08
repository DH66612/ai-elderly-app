import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius } from '@/constants/theme';

// 清雅色系固定值
const colors = {
  backgroundRoot: '#f0f5fa',
  backgroundTertiary: '#eaf0f5',
  primary: '#8ab3cf',
  primaryDark: '#7fa5c0',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#8fa5bb',
  buttonPrimaryText: '#ffffff',
  border: '#d6e4f0',
  borderLight: '#d6e4f0',
  white: '#ffffff',
  success: '#6bb88a',
  required: '#c97a7a',
};

export const createStyles = (theme?: any) => {
  // 忽略传入的theme，使用固定柔和色系
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundRoot,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 0,
      paddingTop: Spacing['4xl'],
      paddingBottom: Spacing['3xl'],
    },
    header: {
      marginBottom: Spacing['2xl'],
      alignItems: 'center',
    },
    title: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '500',
      marginBottom: Spacing.xs,
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    form: {
      gap: Spacing.md,
    },
    label: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
      marginBottom: Spacing.xs,
      color: colors.textPrimary,
    },
    labelRequired: {
      color: colors.required,
    },
    labelOptional: {
      color: colors.textMuted,
      fontWeight: '400',
    },
    input: {
      backgroundColor: colors.backgroundTertiary,
      borderRadius: BorderRadius.md,
      paddingHorizontal: 0,
      paddingVertical: Spacing.sm,
      fontSize: 16,
      lineHeight: 22,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    roleSelector: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    roleButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      gap: Spacing.xs,
    },
    roleButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    roleButtonInactive: {
      backgroundColor: colors.backgroundTertiary,
      borderColor: colors.borderLight,
    },
    roleButtonText: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    // 标签选择器样式
    tagSection: {
      marginTop: Spacing.sm,
    },
    tagSectionTitle: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
      marginBottom: Spacing.sm,
      color: colors.textPrimary,
    },
    tagContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    tag: {
      paddingHorizontal: 0,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundTertiary,
    },
    tagSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tagText: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    tagTextSelected: {
      color: colors.white,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      marginTop: Spacing.lg,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    buttonText: {
      color: colors.buttonPrimaryText,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '500',
    },
    footer: {
      marginTop: Spacing.xl,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    link: {
      color: colors.primary,
      fontWeight: '500',
    },
    // 角色专属表单区域
    roleSection: {
      marginTop: Spacing.lg,
      paddingTop: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    sectionTitle: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600',
      marginBottom: Spacing.md,
      color: colors.textPrimary,
    },
    // 子分区
    subSection: {
      marginTop: Spacing.md,
      marginBottom: Spacing.md,
    },
    subSectionTitle: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
      marginBottom: Spacing.md,
      color: colors.textSecondary,
    },
    // 老人端扩展区域（兼容旧代码）
    elderlySection: {
      marginTop: Spacing.lg,
      paddingTop: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
  });
};
