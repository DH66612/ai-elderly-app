/**
 * 消息通知页面 - 柔和卡片风格（新拟态）
 * 新拟态双层阴影 + 暖灰白统一底色 + 大圆角胶囊感 + 渐变按钮
 */
import React, { useState, useMemo, useCallback } from 'react';
import { View, SectionList, TouchableOpacity, RefreshControl, StyleSheet, Text, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Spacing, BorderRadius } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';

// 柔和卡片风格配色
const colors = {
  // 基础色
  backgroundRoot: '#F0F0F3',      // 暖灰白
  backgroundDefault: '#F0F0F3',   // 卡片与背景同色靠阴影区分
  backgroundTertiary: '#E8E8EB',  // 凹陷面
  // 主色系
  primary: '#6C63FF',             // 薰衣草紫
  primaryGradient: '#896BFF',     // 紫色渐变终点
  secondary: '#FF6584',           // 珊瑚粉
  // 文字色
  textPrimary: '#2D3436',
  textSecondary: '#636E72',
  textMuted: '#B2BEC3',
  // 功能色
  success: '#00B894',
  warning: '#FDCB6E',
  error: '#FF6B6B',
  // 阴影色
  shadowLight: '#FFFFFF',
  shadowDark: '#D1D9E6',
  white: '#FFFFFF',
  // 消息类型颜色（多彩渐变）
  festival: '#FF9F43',            // 金橙
  festivalGradient: '#FDCB6E',    // 浅金
  weather: '#54A0FF',             // 天蓝
  weatherGradient: '#74B9FF',     // 浅蓝
  emergency: '#FF6B6B',           // 珊瑚红
  emergencyGradient: '#FF8787',   // 浅红
  reminder: '#00B894',            // 翠绿
  reminderGradient: '#55EFC4',    // 浅绿
  system: '#A29BFE',              // 薰衣草
  systemGradient: '#C8B6FF',      // 浅紫
};

interface Notification {
  id: number;
  type: 'festival' | 'weather' | 'emergency' | 'reminder' | 'system';
  title: string;
  content: string;
  time: string;
  timestamp: Date;
  isRead: boolean;
}

interface NotificationSection {
  title: string;
  data: Notification[];
}

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useSafeRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const styles = useMemo(() => createStyles(), []);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/notifications?user_id=${user.id}`
      );
      const data = await response.json();
      // 如果API返回空数组，显示欢迎消息作为引导
      const notifications = data.notifications || [];
      if (notifications.length === 0) {
        setNotifications(getDemoNotifications());
      } else {
        setNotifications(notifications);
      }
    } catch (error) {
      console.error('Load notifications error:', error);
      setNotifications(getDemoNotifications());
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (id: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    try {
      await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/notifications/${id}/read`,
        { method: 'POST' }
      );
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/notifications/read-all`,
        { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id })
        }
      );
    } catch (error) {
      console.error('Mark all as read error:', error);
    }
  };

  const handleNotificationPress = (item: Notification) => {
    if (!item.isRead) {
      handleMarkAsRead(item.id);
    }
    router.push('/notification-detail', {
      id: item.id.toString(),
      type: item.type,
      title: item.title,
      content: item.content,
      time: item.time,
    });
  };

  const groupNotificationsByDate = (notifications: Notification[]): NotificationSection[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups: { [key: string]: Notification[] } = {
      '今天': [],
      '昨天': [],
      '本周': [],
      '更早': [],
    };

    notifications.forEach(notification => {
      const notifDate = new Date(notification.timestamp);
      if (notifDate >= today) {
        groups['今天'].push(notification);
      } else if (notifDate >= yesterday) {
        groups['昨天'].push(notification);
      } else if (notifDate >= weekAgo) {
        groups['本周'].push(notification);
      } else {
        groups['更早'].push(notification);
      }
    });

    const sections: NotificationSection[] = [];
    if (groups['今天'].length > 0) {
      sections.push({ title: '今天', data: groups['今天'] });
    }
    if (groups['昨天'].length > 0) {
      sections.push({ title: '昨天', data: groups['昨天'] });
    }
    if (groups['本周'].length > 0) {
      sections.push({ title: '本周', data: groups['本周'] });
    }
    if (groups['更早'].length > 0) {
      sections.push({ title: '更早', data: groups['更早'] });
    }

    return sections;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'festival': return 'gift';
      case 'weather': return 'cloud-sun';
      case 'emergency': return 'triangle-exclamation';
      case 'reminder': return 'bell';
      case 'system': return 'gear';
      default: return 'message';
    }
  };

  const getNotificationColors = (type: string) => {
    switch (type) {
      case 'festival': return { primary: colors.festival, gradient: colors.festivalGradient };
      case 'weather': return { primary: colors.weather, gradient: colors.weatherGradient };
      case 'emergency': return { primary: colors.emergency, gradient: colors.emergencyGradient };
      case 'reminder': return { primary: colors.reminder, gradient: colors.reminderGradient };
      case 'system': return { primary: colors.system, gradient: colors.systemGradient };
      default: return { primary: colors.primary, gradient: colors.primaryGradient };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'festival': return '节日';
      case 'weather': return '天气';
      case 'emergency': return '紧急';
      case 'reminder': return '提醒';
      case 'system': return '系统';
      default: return '通知';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderSectionHeader = ({ section }: { section: NotificationSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  const renderNotification = ({ item }: { item: Notification }) => {
    const notificationColors = getNotificationColors(item.type);
    
    return (
      <TouchableOpacity
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.8}
        style={styles.cardOuter}
      >
        <View style={styles.cardInner}>
          <View style={styles.notificationCard}>
            {/* 左侧彩色渐变图标 */}
            <LinearGradient
              colors={[notificationColors.primary, notificationColors.gradient]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <FontAwesome6 
                name={getNotificationIcon(item.type)} 
                size={18} 
                color={colors.white} 
              />
            </LinearGradient>
            
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                {!item.isRead && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.notificationText} numberOfLines={2}>
                {item.content}
              </Text>
              <View style={styles.footerRow}>
                <LinearGradient
                  colors={[notificationColors.primary, notificationColors.gradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.typeTag}
                >
                  <Text style={styles.typeTagText}>{getTypeLabel(item.type)}</Text>
                </LinearGradient>
                <Text style={styles.timeText}>{item.time}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>消息通知</Text>
        {unreadCount > 0 && (
          <LinearGradient
            colors={[colors.secondary, '#FF8787']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.badge}
          >
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </LinearGradient>
        )}
      </View>
      {unreadCount > 0 && (
        <TouchableOpacity onPress={handleMarkAllAsRead} activeOpacity={0.7}>
          <LinearGradient
            colors={[colors.primary, colors.primaryGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.markAllButton}
          >
            <FontAwesome6 name="check-double" size={12} color={colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.markAllText}>全部已读</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconOuter}>
        <View style={styles.emptyIconInner}>
          <FontAwesome6 name="bell-slash" size={36} color={colors.primary} />
        </View>
      </View>
      <Text style={styles.emptyText}>暂无消息通知</Text>
      <Text style={styles.emptySubText}>下拉刷新获取最新消息</Text>
    </View>
  );

  const sections = groupNotificationsByDate(notifications);

  return (
    <Screen backgroundColor={colors.backgroundRoot} statusBarStyle="dark">
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderNotification}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
            titleColor={colors.textMuted}
            title="下拉刷新"
          />
        }
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
    </Screen>
  );
}

function getDemoNotifications(): Notification[] {
  const now = new Date();
  return [
    {
      id: 1,
      type: 'system',
      title: '欢迎使用AI助老应用',
      content: '尊敬的监护人，欢迎使用AI助老应用！您可以通过本应用实时关注老人的健康状况、接收重要提醒，为老人提供更好的关爱与支持。',
      time: '刚刚',
      timestamp: now,
      isRead: false,
    },
    {
      id: 2,
      type: 'festival',
      title: '重阳节将至',
      content: '重阳节（农历九月初九）即将到来，记得陪伴家中老人，一起登高望远、赏菊品茗。',
      time: '今天 08:00',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0),
      isRead: false,
    },
    {
      id: 3,
      type: 'weather',
      title: '降温提醒',
      content: '明日气温将下降8-10°C，请提醒老人注意保暖，适当添加衣物。',
      time: '今天 07:30',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 30),
      isRead: false,
    },
    {
      id: 4,
      type: 'reminder',
      title: '用药提醒',
      content: '绑定的老人今日下午2点需服用降压药，请及时提醒。',
      time: '昨天 14:00',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 14, 0),
      isRead: true,
    },
    {
      id: 5,
      type: 'emergency',
      title: '心率异常预警',
      content: '检测到老人心率异常（心率>100次/分），请及时关注。',
      time: '昨天 10:15',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 10, 15),
      isRead: true,
    },
    {
      id: 6,
      type: 'system',
      title: '系统更新',
      content: 'AI助老应用已更新至最新版本，新增健康管理功能。',
      time: '前天 18:30',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 18, 30),
      isRead: true,
    },
    {
      id: 7,
      type: 'weather',
      title: '暴雨预警',
      content: '明日预计有暴雨，请提醒老人减少外出，注意安全。',
      time: '3天前',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3, 9, 0),
      isRead: true,
    },
  ];
}

function createStyles() {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 60,
      paddingBottom: 120,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    badge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 12,
    },
    badgeText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '700',
    },
    markAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
    },
    markAllText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.white,
    },
    sectionHeader: {
      marginTop: 20,
      marginBottom: 12,
    },
    sectionHeaderText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    // 新拟态双层阴影卡片
    cardOuter: {
      marginBottom: 16,
      borderRadius: 24,
      // 外层暗阴影
      shadowColor: colors.shadowDark,
      shadowOffset: { width: 6, height: 6 },
      shadowOpacity: Platform.OS === 'android' ? 0 : 0.7,
      shadowRadius: 8,
      elevation: 6,
    },
    cardInner: {
      borderRadius: 24,
      // 内层亮阴影
      shadowColor: colors.shadowLight,
      shadowOffset: { width: -6, height: -6 },
      shadowOpacity: Platform.OS === 'android' ? 0 : 0.9,
      shadowRadius: 8,
      backgroundColor: colors.backgroundDefault,
    },
    notificationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundDefault,
      borderRadius: 24,
      padding: 20,
      // Android 降级
      borderWidth: Platform.OS === 'android' ? 0.5 : 0,
      borderColor: 'rgba(255,255,255,0.5)',
    },
    iconGradient: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    notificationContent: {
      flex: 1,
    },
    notificationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    notificationTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
    },
    unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.secondary,
      marginLeft: 8,
    },
    notificationText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 10,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    typeTag: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    typeTagText: {
      color: colors.white,
      fontSize: 11,
      fontWeight: '600',
    },
    timeText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    // 空状态
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
    },
    emptyIconOuter: {
      borderRadius: 32,
      shadowColor: colors.shadowDark,
      shadowOffset: { width: 6, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      marginBottom: 20,
    },
    emptyIconInner: {
      width: 80,
      height: 80,
      borderRadius: 32,
      backgroundColor: colors.backgroundDefault,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadowLight,
      shadowOffset: { width: -6, height: -6 },
      shadowOpacity: 0.9,
      shadowRadius: 8,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    emptySubText: {
      fontSize: 13,
      color: colors.textMuted,
    },
  });
}
