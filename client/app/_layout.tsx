import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ColorSchemeProvider } from '@/hooks/useColorScheme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useSegments, useRootNavigationState } from 'expo-router';
import { UserRole } from '@/constants/roles';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
  // 添加其它想暂时忽略的错误或警告信息
]);

// 认证重定向组件
function AuthGuard() {
  const rootState = useRootNavigationState();
  const segments = useSegments();
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useSafeRouter();

  useEffect(() => {
    // 1. 待机检测：导航未挂载 或 鉴权正在加载中，直接返回
    if (!rootState?.key || isLoading) return;

    // 2. 路径检测：确认当前不在登录页或注册页
    const inAuthRoute = segments.some(segment => segment === 'login' || segment === 'register');

    // 3. 未登录保护：未登录且不在登录页 → 跳转登录页
    if (!isAuthenticated && !inAuthRoute) {
      router.replace('/login');
    }

    // 4. 已登录保护：已登录但在登录页 → 根据角色跳转
    if (isAuthenticated && inAuthRoute) {
      if (user?.role === UserRole.ELDERLY) {
        router.replace('/(elderly)/home');
      } else {
        router.replace('/(guardian)/home');
      }
    }
  }, [rootState?.key, isAuthenticated, isLoading, segments, user, router]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ColorSchemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="dark"></StatusBar>
          <Stack screenOptions={{
            // 设置所有页面的切换动画为从右侧滑入，适用于iOS 和 Android
            animation: 'slide_from_right',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            // 隐藏自带的头部
            headerShown: false
          }}>
            <Stack.Screen name="login" options={{ title: "登录" }} />
            <Stack.Screen name="register" options={{ title: "注册" }} />
            <Stack.Screen name="(elderly)" options={{ headerShown: false }} />
            <Stack.Screen name="(guardian)" options={{ headerShown: false }} />
            <Stack.Screen name="video-call" options={{ title: "视频通话" }} />
            <Stack.Screen name="voice-assistant" options={{ title: "语音助手" }} />
            <Stack.Screen name="bluetooth-devices" options={{ title: "蓝牙设备" }} />
            <Stack.Screen name="camera-monitor" options={{ title: "摄像头监控" }} />
            <Stack.Screen name="bluetooth-bracelet" options={{ title: "蓝牙健康手环" }} />
            <Stack.Screen name="wifi-camera" options={{ title: "WiFi摄像头" }} />
            <Stack.Screen name="ezviz-camera" options={{ title: "萤石摄像头" }} />
            <Stack.Screen name="camera-manage" options={{ title: "摄像头管理" }} />
            <Stack.Screen name="camera-preview" options={{ title: "摄像头预览" }} />
            <Stack.Screen name="guardian-realtime" options={{ title: "实时数据" }} />
            <Stack.Screen name="health-data" options={{ title: "健康数据" }} />
            <Stack.Screen name="ai-analysis" options={{ title: "AI分析" }} />
            <Stack.Screen name="binding-info" options={{ title: "绑定人信息" }} />
            <Stack.Screen name="nearby-facilities" options={{ title: "附近设施" }} />
            <Stack.Screen name="guardian-notes" options={{ title: "记事本" }} />
            <Stack.Screen name="medication-reminder" options={{ title: "用药提醒" }} />
            <Stack.Screen name="edit-profile" options={{ title: "编辑资料" }} />
            <Stack.Screen name="elderly-settings" options={{ title: "设置" }} />
            <Stack.Screen name="image-reader" options={{ title: "拍图识字" }} />
            <Stack.Screen name="user-agreement" options={{ title: "用户协议" }} />
            <Stack.Screen name="privacy-policy" options={{ title: "隐私政策" }} />
            <Stack.Screen name="help-center" options={{ title: "帮助中心" }} />
            <Stack.Screen name="huawei-health" options={{ title: "华为健康" }} />
            <Stack.Screen name="notifications" options={{ title: "消息通知" }} />
            <Stack.Screen name="notification-detail" options={{ title: "消息详情" }} />
            <Stack.Screen name="elderly-notifications" options={{ title: "消息通知" }} />
          </Stack>
          <AuthGuard />
          <Toast />
        </GestureHandlerRootView>
      </ColorSchemeProvider>
    </AuthProvider>
  );
}
