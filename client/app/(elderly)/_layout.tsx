import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

export default function ElderlyLayout() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{
    headerShown: false,
    tabBarStyle: {
          backgroundColor: theme.backgroundDefault,
          borderTopColor: theme.border,
          // 移动端：标准高度 50px + 底部安全区
          // Web端：固定60px，无需安全区
          height: Platform.OS === 'web' ? 60 : 50 + insets.bottom,
          // 移动端：内容区域底部 padding 防止内容被遮挡
          paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom,
      },
      tabBarActiveTintColor: theme.primary,
      tabBarInactiveTintColor: theme.textMuted,
      tabBarItemStyle: {
          // **Web 兼容性强制规范**：Web 端必须显式指定 item 高度，防止 Tab Bar 高度塌陷或图标显示异常
          height: Platform.OS === 'web' ? 60 : undefined,
      },
    }}>
      <Tabs.Screen
        name="home"
        options={{
          title: '主页',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="house" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="memo"
        options={{
          title: '备忘录',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="note-sticky" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="album"
        options={{
          title: '相册',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="images" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // 隐藏底部导航栏入口，但仍可通过路由访问
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="user" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
