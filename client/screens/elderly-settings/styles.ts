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
  successBg: '#e8f4ef',
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
    // 主卡片
    mainCard: {
      backgroundColor: colors.cardBg,
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    section: {
      padding: Spacing.lg,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
      marginBottom: Spacing.md,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    subSectionTitle: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
      marginBottom: Spacing.sm,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: Spacing.lg,
    },
    // 信息行
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
    },
    infoLabel: {
      fontSize: 15,
      color: colors.textSecondary,
      marginLeft: Spacing.md,
      width: 60,
    },
    infoValue: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      textAlign: 'right',
    },
    // 开关行
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.sm,
    },
    switchLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    switchTitle: {
      fontSize: 15,
      color: colors.textPrimary,
      marginLeft: Spacing.md,
    },
    // 蓝牙区域
    bluetoothHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    webTip: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      backgroundColor: '#f5f0e8',
      borderRadius: BorderRadius.md,
      gap: Spacing.sm,
    },
    webTipText: {
      flex: 1,
      fontSize: 13,
      color: colors.warningText,
      lineHeight: 18,
    },
    connectedSection: {
      marginBottom: Spacing.md,
    },
    savedSection: {
      marginTop: Spacing.sm,
      marginBottom: Spacing.md,
    },
    deviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
    },
    deviceIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deviceInfo: {
      flex: 1,
      marginLeft: Spacing.sm,
    },
    deviceName: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    deviceType: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    deviceRssi: {
      fontSize: 12,
      color: colors.textMuted,
    },
    connectedBadge: {
      backgroundColor: colors.successBg,
      paddingHorizontal: 0,
      paddingVertical: 2,
      borderRadius: BorderRadius.xs,
    },
    connectedText: {
      fontSize: 12,
      color: colors.successText,
    },
    removeButton: {
      padding: Spacing.sm,
    },
    scanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      marginTop: Spacing.sm,
      backgroundColor: colors.primaryLight,
      borderRadius: BorderRadius.md,
    },
    scanButtonText: {
      fontSize: 15,
      color: colors.primary,
      marginLeft: Spacing.sm,
    },
    // 菜单行
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.lg,
    },
    menuLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    menuTitle: {
      fontSize: 15,
      color: colors.textPrimary,
      marginLeft: Spacing.md,
    },
    // 退出按钮
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.dangerText,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.md,
      marginTop: Spacing.xl,
      shadowColor: colors.dangerText,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 2,
    },
    logoutText: {
      fontSize: 15,
      fontWeight: '500',
      color: '#FFFFFF',
      marginLeft: Spacing.sm,
    },
    versionText: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: Spacing.xl,
    },
    // Modal 样式
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: BorderRadius.xl,
      borderTopRightRadius: BorderRadius.xl,
      maxHeight: '70%',
      paddingBottom: Spacing['3xl'],
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    modalCancelText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    scanningIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.lg,
      gap: Spacing.sm,
    },
    scanningText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    deviceList: {
      paddingHorizontal: 0,
    },
    discoveredDevice: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.textMuted,
      paddingVertical: Spacing['3xl'],
    },
    connectText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '500',
    },
  });
};
