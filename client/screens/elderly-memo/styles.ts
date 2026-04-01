import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius } from '@/constants/theme';

// 清雅色调 - 与首页一致
export const colors = {
  backgroundRoot: '#f0f5fa',
  backgroundDefault: '#ffffff',
  backgroundTertiary: '#eaf0f5',
  border: '#d6e4f0',
  primary: '#8ab3cf',
  primaryDark: '#7fa5c0',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#8fa5bb',
  white: '#ffffff',
  success: '#5a8a7a',
  warning: '#d4a574',
  error: '#c27878',
  // 渐变色（清雅风格）
  gradientStart: '#b8e0e8',
  gradientEnd: '#f0f5fa',
  // 便利贴颜色
  stickyYellow: '#FFF9C4', // 经典黄色便利贴
  stickyYellowDark: '#FFE082',
  stickyPink: '#FCE4EC',
  stickyBlue: '#E3F2FD',
  stickyGreen: '#E8F5E9',
  stickyOrange: '#FFF3E0',
  stickyShadow: 'rgba(0,0,0,0.15)',
  // 折角色
  foldYellow: '#FFE082',
  foldPink: '#F8BBD9',
  foldBlue: '#BBDEFB',
  foldGreen: '#C8E6C9',
  foldOrange: '#FFE0B2',
};

// 分类颜色
export const categoryColors = {
  general: '#FFF9C4', // 黄色
  health: '#E8F5E9', // 绿色
  important: '#FCE4EC', // 粉色
  todo: '#E3F2FD', // 蓝色
};

export const foldColors = {
  general: '#FFE082',
  health: '#C8E6C9',
  important: '#F8BBD9',
  todo: '#BBDEFB',
};

export const createStyles = () => {
  return StyleSheet.create({
    // ========== 固定头部区域 ==========
    fixedHeader: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
      backgroundColor: 'transparent',
    },
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing['5xl'],
    },
    header: {
      marginBottom: Spacing.md,
    },
    headerTitle: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },

    // ========== 分类标签页 ==========
    categoryTabs: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255,255,255,0.6)',
      borderRadius: BorderRadius.lg,
      padding: 4,
      marginBottom: Spacing.lg,
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
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    categoryTabTextActive: {
      color: '#FFFFFF',
      fontWeight: '600',
    },

    // ========== 便利贴列表 ==========
    stickyList: {
      gap: Spacing['2xl'],
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.lg,
    },
    
    // ========== 单张便利贴（固定宽度）==========
    stickyNote: {
      width: '66%',
      minHeight: 144,
      backgroundColor: colors.stickyYellow,
      borderRadius: 2,
      padding: Spacing.lg,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.lg,
      shadowColor: colors.stickyShadow,
      shadowOffset: { width: 2, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 10,
      elevation: 5,
      position: 'relative',
      overflow: 'visible',
    },
    stickyNoteLeft: {
      alignSelf: 'flex-start',
    },
    stickyNoteRight: {
      alignSelf: 'flex-end',
    },
    // 胶条效果
    stickyTape: {
      position: 'absolute',
      top: -10,
      width: '35%',
      height: 20,
      backgroundColor: 'rgba(255,255,255,0.75)',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(200,200,200,0.3)',
    },
    stickyTapeLeft: {
      left: '10%',
      transform: [{ rotate: '-3deg' }],
    },
    stickyTapeRight: {
      right: '10%',
      transform: [{ rotate: '3deg' }],
    },
    // 图钉效果
    stickyPin: {
      position: 'absolute',
      top: -12,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#FF6B6B',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: 'rgba(0,0,0,0.4)',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 5,
      elevation: 4,
    },
    stickyPinLeft: {
      left: Spacing['2xl'],
    },
    stickyPinRight: {
      right: Spacing['2xl'],
    },
    stickyPinCenter: {
      left: '50%',
      marginLeft: -14,
    },
    // 内容
    stickyContent: {
      flex: 1,
      justifyContent: 'center',
    },
    stickyText: {
      fontSize: 19,
      color: colors.textPrimary,
      lineHeight: 28,
    },
    stickyTextCompleted: {
      textDecorationLine: 'line-through',
      opacity: 0.5,
    },
    // 底部
    stickyFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: Spacing.md,
    },
    stickyTime: {
      fontSize: 14,
      color: colors.textMuted,
      flex: 1,
    },
    stickyActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    stickyActionBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: 'rgba(255,255,255,0.95)',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000000',
      shadowOffset: { width: 2, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },

    // ========== 空状态 ==========
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing['4xl'],
    },
    emptyText: {
      marginTop: Spacing.lg,
      color: colors.textMuted,
      textAlign: 'center',
      fontSize: 18,
      lineHeight: 28,
    },

    // ========== 浮动添加按钮（FAB）==========
    fabButton: {
      position: 'absolute',
      right: Spacing['2xl'],
      bottom: Spacing['2xl'],
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
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
      paddingBottom: Spacing['3xl'],
      maxHeight: '85%',
    },
    // 拖动条
    modalHandle: {
      width: 48,
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
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    modalClose: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // 输入框容器（包含语音按钮）
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: Spacing.md,
    },
    input: {
      flex: 1,
      backgroundColor: colors.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      fontSize: 20,
      color: colors.textPrimary,
      borderWidth: 0,
      marginRight: Spacing.md,
    },
    textArea: {
      minHeight: 120,
      textAlignVertical: 'top',
      lineHeight: 30,
    },
    // 语音按钮
    voiceButton: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
      marginTop: Spacing.sm,
    },
    voiceButtonActive: {
      backgroundColor: '#FF6B6B',
    },
    recordingHint: {
      textAlign: 'center',
      color: '#FF6B6B',
      fontSize: 16,
      marginBottom: Spacing.md,
      fontWeight: '500',
    },
    categorySelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
      marginBottom: Spacing.lg,
    },
    categoryOption: {
      flex: 1,
      minWidth: '40%',
      paddingVertical: Spacing.lg,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      borderWidth: 3,
      borderColor: 'transparent',
    },
    categoryOptionSelected: {
      borderColor: colors.primary,
    },
    categoryOptionText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    categoryOptionTextSelected: {
      color: colors.textPrimary,
    },
    categoryLabel: {
      fontSize: 18,
      color: colors.textSecondary,
      marginBottom: Spacing.md,
      fontWeight: '500',
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      alignItems: 'center',
      marginTop: Spacing.md,
    },
    submitButtonText: {
      fontSize: 22,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // ========== 统计栏 ==========
    statsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: Spacing.xl,
      paddingVertical: Spacing.lg,
      backgroundColor: 'rgba(255,255,255,0.8)',
      borderRadius: BorderRadius.xl,
      shadowColor: colors.stickyShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 3,
    },
    statsItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: Spacing.lg,
    },
    statsNumber: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.primary,
    },
    statsLabel: {
      fontSize: 17,
      color: colors.textMuted,
      marginLeft: 6,
    },
    statsDivider: {
      width: 1,
      height: 28,
      backgroundColor: colors.border,
    },
  });
};
