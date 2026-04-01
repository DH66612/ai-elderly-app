import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

// 消息图标带红点
function BellIcon({ color, size }: { color: string; size: number }) {
  const { user } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const fetchUnread = async () => {
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/notifications/unread-count?user_id=${user.id}`
        );
        const data = await response.json();
        setHasUnread((data.count || 0) > 0);
      } catch {
        // 忽略错误
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  return (
    <View style={styles.iconContainer}>
      <FontAwesome6 name="bell" size={size} color={color} />
      {hasUnread && <View style={styles.badge} />}
    </View>
  );
}

export default function GuardianLayout() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: theme.backgroundDefault,
        borderTopColor: theme.border,
        height: Platform.OS === 'web' ? 60 : 50 + insets.bottom,
        paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom,
      },
      tabBarActiveTintColor: theme.primary,
      tabBarInactiveTintColor: theme.textMuted,
      tabBarItemStyle: {
        height: Platform.OS === 'web' ? 60 : undefined,
      },
    }}>
      <Tabs.Screen
        name="home"
        options={{
          title: '主页',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="house" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="device-monitor"
        options={{
          title: '设备',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="display" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '消息',
          tabBarIcon: ({ color }) => (
            <BellIcon color={color} size={20} />
          ),
        }}
      />
      <Tabs.Screen
        name="notification-detail"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="guardian-huawei-health"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="user" size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
