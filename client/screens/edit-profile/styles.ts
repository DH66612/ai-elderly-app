import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius } from '@/constants/theme';

// 清雅风格（淡青色主题）- 与其他页面保持一致
const colors = {
  backgroundRoot: '#f0f5fa',       // 淡青色背景
  backgroundDefault: '#ffffff',     // 卡片/区域背景（白色）
  backgroundTertiary: '#eaf0f5',    // 浅青色背景
  border: '#d6e4f0',                // 边框色
  borderLight: '#e8f0f5',           // 浅边框
  primary: '#8ab3cf',               // 主色/按钮色（淡青色）
  primaryLight: '#eaf0f5',          // 浅青色背景
  primaryDark: '#7fa5c0',           // 深青色
  textPrimary: '#2d4c6e',           // 主要文字
  textSecondary: '#5e7e9f',         // 次要文字
  textMuted: '#9aa9b7',             // 辅助文字
  white: '#ffffff',
  danger: '#e2c6c6',                // 柔和的红色
  dangerText: '#b87a7a',            // 危险文字
  success: '#4CAF50',
};

export const createStyles = (theme: any) => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingBottom: Spacing['2xl'],
    },
    // 顶部导航栏
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      paddingTop: Spacing['2xl'],
      backgroundColor: colors.backgroundRoot,
    },
    backButton: {
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
    headerRight: {
      width: 40,
    },
    // 头像区域
    avatarSection: {
      alignItems: 'center',
      paddingVertical: Spacing['2xl'],
      backgroundColor: colors.backgroundRoot,
    },
    avatarContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    changeAvatarButton: {
      marginTop: Spacing.md,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.md,
    },
    changeAvatarText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '500',
    },
    // 分区
    section: {
      paddingHorizontal: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: Spacing.md,
      marginLeft: Spacing.xs,
    },
    // 表单卡片
    formCard: {
      backgroundColor: colors.backgroundDefault,
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    // 表单项
    formItem: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    formLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: Spacing.sm,
    },
    formInput: {
      fontSize: 16,
      color: colors.textPrimary,
      paddingVertical: Spacing.sm,
      backgroundColor: colors.backgroundTertiary,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    // 分隔线
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderLight,
      marginHorizontal: Spacing.lg,
    },
    // 区块分隔（更明显）
    sectionDivider: {
      height: 8,
      backgroundColor: colors.backgroundTertiary,
      marginHorizontal: 0,
    },
    // 单选组
    radioGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    radioItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.lg,
      backgroundColor: colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    radioItemActive: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    radioCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: colors.border,
      marginRight: Spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioCircleActive: {
      borderColor: colors.primary,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    radioLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    radioLabelActive: {
      color: colors.textPrimary,
      fontWeight: '500',
    },
    // 多选标签组
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    tagItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.lg,
      backgroundColor: colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    tagItemActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tagLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    tagLabelActive: {
      color: colors.white,
      fontWeight: '500',
    },
    tagCheck: {
      marginLeft: Spacing.xs,
    },
    // 底部按钮
    bottomButtons: {
      flexDirection: 'row',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      paddingBottom: Spacing['3xl'],
      backgroundColor: colors.backgroundRoot,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      gap: Spacing.md,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      backgroundColor: colors.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    saveButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: 16,
      color: colors.white,
      fontWeight: '600',
    },
  });
};

export { colors };
