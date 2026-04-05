import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRootNavigationState } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/theme';
import { UserRole } from '@/constants/roles';

export default function NotFoundScreen() {
  const { theme } = useTheme();
  const router = useSafeRouter();
  const { isAuthenticated, user } = useAuth();
  const rootState = useRootNavigationState();

  // 等待导航就绪
  if (!rootState?.key) {
    return null;
  }

  const handleGoHome = () => {
    if (!isAuthenticated) {
      // 未登录：返回登录页
      router.replace('/login');
    } else {
      // 已登录：根据角色返回对应主页
      if (user?.role === UserRole.ELDERLY) {
        router.replace('/(elderly)/home');
      } else {
        router.replace('/(guardian)/home');
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <Text style={[styles.message, { color: theme.textPrimary }]}>
        页面不存在
      </Text>
      <TouchableOpacity onPress={handleGoHome} style={styles.gohome}>
        <Text style={[styles.gohomeText, { color: theme.primary }]}>
          返回首页
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 18,
    marginBottom: Spacing['2xl'],
  },
  gohome: {
    marginTop: Spacing['2xl'],
  },
  gohomeText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
