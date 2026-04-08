/**
 * 主题配置
 * 统一采用清雅风格 - 柔和蓝灰色系、白色卡片、细边框
 */

/**
 * 通用颜色定义
 */
export const Colors = {
  // 老人端主题（清雅适老化 - 柔和蓝灰色系）
  elderly: {
    textPrimary: "#1F2937", // 深灰，高对比度确保可读性
    textSecondary: "#4B5563",
    textMuted: "#9CA3AF",
    primary: "#5B8DEF", // 柔和的天蓝色，清雅温和
    primaryLight: "#EBF2FE",
    accent: "#7C9CBF", // 淡雅蓝灰，辅色
    success: "#6BAF8D", // 柔和绿色
    error: "#D97B7B", // 柔和红色
    warning: "#C4A35A", // 柔和金色
    backgroundRoot: "#F8FAFC", // 淡雅灰白背景
    backgroundDefault: "#F5F8FF", // 微微蓝卡片
    backgroundTertiary: "#F1F5F9", // 浅灰输入框背景
    buttonPrimaryText: "#FFFFFF",
    tabIconSelected: "#5B8DEF",
    border: "#E2E8F0", // 细边框
    borderLight: "#F1F5F9",
    cardShadow: "0px 2px 8px rgba(91, 141, 239, 0.06)",
  },

  // 监护人端主题（清雅现代 - 柔和蓝灰色系）
  guardian: {
    textPrimary: "#334155", // 深蓝灰文字
    textSecondary: "#64748B",
    textMuted: "#94A3B8",
    primary: "#5B8DEF", // 柔和天蓝
    primaryLight: "#EBF2FE",
    accent: "#7C9CBF", // 淡雅蓝灰
    success: "#6BAF8D",
    error: "#D97B7B",
    warning: "#C4A35A",
    backgroundRoot: "#F8FAFC", // 淡雅灰白背景
    backgroundDefault: "#F5F8FF", // 微微蓝卡片
    backgroundTertiary: "#F1F5F9", // 浅灰输入框背景
    buttonPrimaryText: "#FFFFFF",
    tabIconSelected: "#5B8DEF",
    border: "#E2E8F0", // 细边框
    borderLight: "#F1F5F9",
    cardShadow: "0px 2px 8px rgba(91, 141, 239, 0.06)",
  },
};

/**
 * 间距规范
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
  "8xl": 96,
  "10xl": 128,
};

/**
 * 圆角规范
 */
export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  "5xl": 40,
  full: 9999,
};

/**
 * 字体规范
 * 遵循 Material Design + 微信/支付宝主流应用规范
 * 核心规律：正文不小于14sp，辅助信息不小于11sp
 */
export const Typography = {
  // 老人端字体（向支付宝/微信看齐 - 清晰易读）
  elderly: {
    // Display Large - 34px Bold - 大标题、空状态主标题
    display: {
      fontSize: 34,
      lineHeight: 42,
      fontWeight: "700" as const,
    },
    // Display Medium - 28px Bold - 页面核心标题
    h1: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: "700" as const,
    },
    // Headline Large - 24px Bold - 列表分组标题
    h2: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "700" as const,
    },
    // Headline Medium - 20px Medium - 卡片标题
    h3: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "500" as const,
    },
    // Title Large - 18px Medium - 导航栏标题
    title: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "500" as const,
    },
    // Title Medium - 16px Medium - 次级标题
    bodyMedium: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "500" as const,
    },
    // Body Large - 16px Regular - 正文/聊天消息（和微信一致）
    body: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: "400" as const,
    },
    // Body Medium - 14px Regular - 列表描述文字
    small: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "400" as const,
    },
    // Label Large - 14px Medium - 按钮文字
    label: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "500" as const,
    },
    // Label Medium - 12px Regular - 辅助信息/时间戳
    caption: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "400" as const,
    },
    // 数据统计 - 24-36px Bold
    stat: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: "700" as const,
    },
  },

  // 监护人端字体（标准现代 - 遵循统一设计规范）
  guardian: {
    // Display Large - 34px Semibold - 大标题、空状态主标题
    display: {
      fontSize: 34,
      lineHeight: 42,
      fontWeight: "600" as const,
    },
    // Display Medium - 28px Bold - 页面核心标题
    h1: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: "700" as const,
    },
    // Headline Large - 24px Bold - 列表分组标题
    h2: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "700" as const,
    },
    // Headline Medium - 20px Medium - 卡片标题
    h3: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "500" as const,
    },
    // Title Large - 18px Medium - 导航栏标题
    title: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "500" as const,
    },
    // Title Medium - 16px Medium - 次级标题
    h4: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "500" as const,
    },
    // Body Large - 16px Regular - 正文/聊天消息
    body: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: "400" as const,
    },
    // Body Medium - 14px Regular - 列表描述文字
    bodyMedium: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "400" as const,
    },
    // Label Large - 14px Medium - 按钮文字
    small: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "400" as const,
    },
    // Label Large Medium - 14px Medium
    smallMedium: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "500" as const,
    },
    // Label Medium - 12px Regular - 辅助信息/时间戳
    caption: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "400" as const,
    },
    // Label Medium Semi - 12px Medium
    label: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "500" as const,
    },
    // 数据统计 - 24px Bold
    stat: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "700" as const,
    },
    // 导航标签 - 10px Medium
    navLabel: {
      fontSize: 10,
      lineHeight: 14,
      fontWeight: "500" as const,
    },
  },
};

/**
 * 主题类型定义
 */
export type RoleTheme = keyof typeof Colors;

/**
 * 获取主题颜色
 */
export const getThemeColors = (role: RoleTheme): typeof Colors.elderly => {
  return Colors[role];
};

/**
 * 获取字体配置
 */
export const getTypography = (role: RoleTheme) => {
  return Typography[role];
};

/**
 * 通用 Theme 类型（兼容旧代码）
 */
export type Theme = typeof Colors.elderly;
