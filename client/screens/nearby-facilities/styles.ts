import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius } from '@/constants/theme';

// 清雅色调
export const colors = {
  backgroundRoot: '#f0f5fa',
  backgroundDefault: '#ffffff',
  backgroundTertiary: '#eaf0f5',
  primary: '#8ab3cf',
  primaryDark: '#7fa5c0',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#8fa5bb',
  border: '#d6e4f0',
  white: '#ffffff',
  gradientStart: '#b8e0e8',
  gradientEnd: '#f0f5fa',
  success: '#5a8a7a',
  warning: '#d4a574',
  error: '#c27878',
};

export const createStyles = () => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing['2xl'],
      paddingBottom: Spacing['5xl'],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    backIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.8)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontWeight: '500',
      color: colors.textPrimary,
      marginRight: 32,
    },
    // 地址卡片
    addressCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    addressHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    addressIcon: {
      width: 32,
      height: 32,
      borderRadius: BorderRadius.sm,
      backgroundColor: colors.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.sm,
    },
    addressLabel: {
      fontSize: 13,
      color: colors.textMuted,
    },
    addressValue: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.textPrimary,
      marginTop: 2,
    },
    // Tab切换
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      borderRadius: BorderRadius.lg,
      padding: Spacing.xs,
      marginBottom: Spacing.lg,
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    tab: {
      flex: 1,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
      borderRadius: BorderRadius.md,
    },
    tabActive: {
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: '#FFFFFF',
    },
    // POI卡片
    poiCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    poiHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    poiIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    poiIconHospital: {
      backgroundColor: 'rgba(202,120,120,0.15)',
    },
    poiIconPharmacy: {
      backgroundColor: 'rgba(90,138,122,0.15)',
    },
    poiIconCommunity: {
      backgroundColor: 'rgba(138,179,207,0.15)',
    },
    poiInfo: {
      flex: 1,
    },
    poiName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    poiAddress: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
    poiDistance: {
      fontSize: 12,
      color: colors.primary,
      marginTop: 4,
    },
    poiPhone: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },
    // 导航按钮
    navigateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      marginTop: Spacing.md,
      gap: 6,
    },
    navigateButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: '#FFFFFF',
    },
    // 空状态
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing['3xl'],
    },
    emptyText: {
      marginTop: Spacing.md,
      color: colors.textMuted,
      textAlign: 'center',
    },
    emptySubText: {
      marginTop: Spacing.xs,
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
    },
    // 加载状态
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing['3xl'],
    },
    loadingText: {
      marginTop: Spacing.md,
      color: colors.textMuted,
    },
    // 统计卡片
    statsContainer: {
      flexDirection: 'row',
      marginBottom: Spacing.lg,
      gap: Spacing.sm,
    },
    statCard: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      alignItems: 'center',
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    statNumber: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
  });
};
