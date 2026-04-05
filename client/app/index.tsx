// 根路由 - 由 AuthGuard 处理重定向逻辑
// 如果未登录，跳转到登录页
// 如果已登录，根据角色跳转到对应首页
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useRootNavigationState } from 'expo-router';
import { UserRole } from '@/constants/roles';

export default function IndexPage() {
  const rootState = useRootNavigationState();
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useSafeRouter();

  useEffect(() => {
    // 等待导航就绪
    if (!rootState?.key) return;

    // 等待认证状态加载完成
    if (isLoading) return;

    if (isAuthenticated && user) {
      // 已登录，根据角色跳转
      if (user.role === UserRole.ELDERLY) {
        router.replace('/(elderly)/home');
      } else {
        router.replace('/(guardian)/home');
      }
    } else {
      // 未登录，跳转到登录页
      router.replace('/login');
    }
  }, [rootState?.key, isAuthenticated, isLoading, user, router]);

  // 显示加载状态
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#8ab3cf" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f5fa',
  },
});
