import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors, getTypography, RoleTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

enum COLOR_SCHEME_CHOICE {
  FOLLOW_SYSTEM = 'follow-system', // 跟随系统自动变化
  DARK = 'dark', // 固定为 dark 主题，不随系统变化
  LIGHT = 'light', // 固定为 light 主题，不随系统变化
};

const userPreferColorScheme: COLOR_SCHEME_CHOICE = COLOR_SCHEME_CHOICE.FOLLOW_SYSTEM;

function useTheme() {
  const systemColorScheme = useColorScheme();
  const { user } = useAuth();

  // 根据用户角色决定主题
  const getRoleTheme = (): RoleTheme => {
    if (!user) return 'guardian'; // 默认使用监护人端主题

    // 老人端使用适老化主题
    if (user.role === 'elderly') {
      return 'elderly';
    }

    // 监护人端使用精美主题
    return 'guardian';
  };

  const roleTheme = getRoleTheme();
  const theme = getThemeColors(roleTheme);
  const typography = getTypography(roleTheme);

  // 老人端始终使用亮色主题，监护人端可以跟随系统
  const isDark = roleTheme === 'elderly' ? false : systemColorScheme === 'dark';

  return {
    theme,
    typography: typography as any, // 兼容旧代码
    isDark,
    roleTheme,
  };
}

export { useTheme };
