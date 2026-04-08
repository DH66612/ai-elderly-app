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
  paperWhite: '#FFFFFF',
  paperLine: '#C8D8E8',
};

// 分类颜色
export const categoryColors = {
  general: '#8ab3cf',
  health: '#7fb5a0',
  important: '#c9a0a0',
  todo: '#d4b896',
};

export const createStyles = () => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingTop: Spacing.md,
      paddingBottom: Spacing['5xl'],
    },

    // ========== 分类标签页 ==========
    categoryTabs: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255,255,255,0.6)',
      borderRadius: BorderRadius.lg,
      padding: 4,
      marginBottom: Spacing.lg,
      marginHorizontal: Spacing.xs,
    },
    categoryTab: {
      flex: 1,
      paddingVertical: Spacing.xs,
      alignItems: 'center',
      borderRadius: BorderRadius.md,
    },
    categoryTabActive: {
      backgroundColor: colors.primary,
    },
    categoryTabText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    categoryTabTextActive: {
      color: '#FFFFFF',
      fontWeight: '600',
    },

    // ========== 纸张容器 ==========
    paperContainer: {
      flex: 1,
      minHeight: 520,
      paddingLeft: Spacing.xl, // 左边留空
      paddingRight: 0, // 右边填满
    },
    paperWrapper: {
      position: 'relative',
      flex: 1,
    },
    // 垫纸（底层）- 蓝色横条纹纸被遮住剩余的部分
    underlayPaper: {
      position: 'absolute',
      top: -8, // 向上露出
      left: -12, // 向左露出
      right: 0, // 右边填满
      bottom: 0, // 延伸到底部
      backgroundColor: '#FFFFFF',
      shadowColor: '#000000',
      shadowOffset: { width: -4, height: 0 }, // 左边阴影
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
      zIndex: 0,
      overflow: 'hidden',
    },
    // 蓝色横条纹容器
    underlayStripesContainer: {
      flex: 1,
      flexDirection: 'column',
    },
    // 蓝色横条纹
    underlayStripe: {
      height: 20,
      backgroundColor: '#8ab3cf',
    },
    // 条纹之间的空白间距
    underlayGap: {
      height: 20,
    },
    // 主纸张（上层）
    paper: {
      backgroundColor: colors.paperWhite,
      // 纸张阴影效果
      shadowColor: '#000000',
      shadowOffset: { width: -6, height: 8 }, // 左边阴影加强
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 12,
      overflow: 'visible',
      position: 'relative',
      flex: 1,
      zIndex: 1,
    },
    // 锯齿边缘装饰 - 顶部
    paperEdgeTop: {
      position: 'absolute',
      top: -8,
      left: 0,
      right: 0,
      height: 12,
      flexDirection: 'row',
    },
    paperEdgeTooth: {
      width: 16,
      height: 12,
      backgroundColor: colors.paperWhite,
      borderBottomLeftRadius: 4,
      borderBottomRightRadius: 4,
      marginRight: 2,
    },
    // 锯齿边缘装饰 - 底部
    paperEdgeBottom: {
      position: 'absolute',
      bottom: -8,
      left: 0,
      right: 0,
      height: 12,
      flexDirection: 'row',
    },
    paperEdgeToothBottom: {
      width: 16,
      height: 12,
      backgroundColor: colors.paperWhite,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
      marginRight: 2,
    },
    
    // ========== 横线区域 ==========
    linedArea: {
      backgroundColor: colors.paperWhite,
      minHeight: 400,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      flex: 1,
    },
    
    // ========== 横线行（固定高度44px，一行一条横线）==========
    line: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 44, // 固定高度
      paddingHorizontal: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.paperLine,
    },
    lineDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: Spacing.md,
    },
    lineContent: {
      flex: 1,
    },
    lineTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
      lineHeight: 20,
    },
    lineTitleCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    lineText: {
      fontSize: 15,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    lineTextCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    // 右侧区域：时间 + 操作按钮
    lineRight: {
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    lineTime: {
      fontSize: 10,
      color: colors.textMuted,
      marginBottom: 2,
    },
    // 时间行的缩进占位（与后续内容行一致）
    lineIndent: {
      width: 20, // 8 (圆点宽) + 12 (Spacing.md)
    },
    lineActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    lineActionBtn: {
      width: 26,
      height: 26,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor: 'rgba(255,255,255,0.8)',
    },
    pinnedIcon: {
      marginLeft: Spacing.xs,
    },
    
    // 标题行样式
    paperSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    
    // ========== 空行（只有横线）==========
    emptyLine: {
      height: 44,
      paddingHorizontal: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.paperLine,
    },

    // ========== 空状态 ==========
    emptyContainer: {
      paddingVertical: Spacing['3xl'],
      paddingHorizontal: Spacing.lg,
    },
    emptyText: {
      marginTop: Spacing.md,
      color: colors.textMuted,
      textAlign: 'center',
      fontSize: 14,
      lineHeight: 22,
    },

    // ========== 浮动添加按钮（FAB）==========
    fabButton: {
      position: 'absolute',
      right: Spacing.xl,
      bottom: Spacing['2xl'],
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },

    // ========== 编辑弹窗（底部弹出面板）==========
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: BorderRadius['2xl'],
      borderTopRightRadius: BorderRadius['2xl'],
      padding: Spacing.lg,
      paddingBottom: Spacing['2xl'],
      maxHeight: '80%',
    },
    modalHandle: {
      width: 40,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: Spacing.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.lg,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    modalClose: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      backgroundColor: colors.backgroundTertiary,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      fontSize: 15,
      color: colors.textPrimary,
      marginBottom: Spacing.md,
      borderWidth: 0,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
      lineHeight: 22,
    },
    categorySelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    categoryOption: {
      flex: 1,
      minWidth: '40%',
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    categoryOptionSelected: {
      borderColor: colors.primary,
    },
    categoryOptionText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    categoryOptionTextSelected: {
      color: colors.textPrimary,
    },
    categoryLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: Spacing.sm,
      fontWeight: '500',
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      alignItems: 'center',
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },

    // ========== 统计栏 ==========
    statsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      marginTop: Spacing.lg,
      backgroundColor: 'rgba(255,255,255,0.6)',
      borderRadius: BorderRadius.xl,
    },
    statsItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: Spacing.md,
    },
    statsNumber: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.primary,
    },
    statsLabel: {
      fontSize: 13,
      color: colors.textMuted,
      marginLeft: 4,
    },
    statsDivider: {
      width: 1,
      height: 18,
      backgroundColor: colors.border,
    },
  });
};
