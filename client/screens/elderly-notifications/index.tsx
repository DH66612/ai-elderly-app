/**
 * 老人端消息通知页面 - 3D黏土风格
 * 3D黏土质感 + 柔和粉彩 + 圆润膨胀感 + 大字体大按钮
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, SectionList, TouchableOpacity, RefreshControl, StyleSheet, Text, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { HeartMeteors } from '@/components/HeartMeteors';

// 3D黏土风格配色
const colors = {
  // 基础色
  backgroundRoot: '#F0EDFA',      // 浅薰衣草灰
  backgroundCard: '#FFFFFF',      // 卡片白色
  // 主色系
  primary: '#7C5CFC',             // 黏土紫
  secondary: '#FF8FAB',           // 黏土粉
  accent: '#FFCB57',              // 黏土黄
  success: '#5ED6A0',             // 黏土绿
  // 文字色
  textPrimary: '#2D2B3D',         // 深紫灰
  textSecondary: '#8B87A0',       // 中灰紫
  textMuted: '#A8A4B8',
  white: '#FFFFFF',
  // 消息类型颜色（粉彩系）
  medication: '#5ED6A0',          // 黏土绿
  medicationBg: '#E0F8EC',
  weather: '#54A0FF',             // 天蓝
  weatherBg: '#E8F4FF',
  health: '#FF6B6B',              // 珊瑚红
  healthBg: '#FFE8E8',
  festival: '#FFCB57',            // 黏土黄
  festivalBg: '#FFF4DD',
  system: '#A29BFE',              // 薰衣草
  systemBg: '#F0ECFF',
};

interface Notification {
  id: number;
  type: 'medication' | 'weather' | 'health' | 'festival' | 'system';
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

export default function ElderlyNotificationsScreen() {
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
      
      const elderlyTypes = ['medication', 'weather', 'health', 'festival', 'system'];
      const filteredNotifications = (data.notifications || [])
        .filter((n: any) => elderlyTypes.includes(n.type) || n.type === 'reminder')
        .map((n: any) => ({
          id: n.id,
          type: mapNotificationType(n.type),
          title: n.title,
          content: n.content,
          time: formatTime(n.created_at || n.timestamp),
          timestamp: new Date(n.created_at || n.timestamp),
          isRead: n.isRead ?? n.is_read ?? false,
        }));
      
      // 如果API返回空数组，显示欢迎消息作为引导
      if (filteredNotifications.length === 0) {
        setNotifications(getDemoNotifications());
      } else {
        setNotifications(filteredNotifications);
      }
    } catch (error) {
      console.error('Load notifications error:', error);
      setNotifications(getDemoNotifications());
    }
  }, [user]);

  const mapNotificationType = (type: string): Notification['type'] => {
    switch (type) {
      case 'reminder': return 'medication';
      case 'festival': return 'festival';
      case 'weather': return 'weather';
      case 'emergency': return 'health';
      case 'system': return 'system';
      default: return 'system';
    }
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return '刚刚';
    else if (hours < 24) return `${hours}小时前`;
    else if (days === 1) return '昨天';
    else if (days < 7) return `${days}天前`;
    else return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  };

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
    Alert.alert(
      item.title,
      item.content + '\n\n' + item.time,
      [{ text: '我知道了', style: 'default' }]
    );
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
      if (notifDate >= today) groups['今天'].push(notification);
      else if (notifDate >= yesterday) groups['昨天'].push(notification);
      else if (notifDate >= weekAgo) groups['本周'].push(notification);
      else groups['更早'].push(notification);
    });

    const sections: NotificationSection[] = [];
    if (groups['今天'].length > 0) sections.push({ title: '今天', data: groups['今天'] });
    if (groups['昨天'].length > 0) sections.push({ title: '昨天', data: groups['昨天'] });
    if (groups['本周'].length > 0) sections.push({ title: '本周', data: groups['本周'] });
    if (groups['更早'].length > 0) sections.push({ title: '更早', data: groups['更早'] });

    return sections;
  };

  const getNotificationConfig = (type: string) => {
    switch (type) {
      case 'medication': 
        return { 
          icon: 'pills', 
          color: colors.medication, 
          bg: colors.medicationBg,
          label: '用药' 
        };
      case 'weather': 
        return { 
          icon: 'cloud-sun', 
          color: colors.weather, 
          bg: colors.weatherBg,
          label: '天气' 
        };
      case 'health': 
        return { 
          icon: 'heart-pulse', 
          color: colors.health, 
          bg: colors.healthBg,
          label: '健康' 
        };
      case 'festival': 
        return { 
          icon: 'gift', 
          color: colors.festival, 
          bg: colors.festivalBg,
          label: '节日' 
        };
      case 'system': 
        return { 
          icon: 'gear', 
          color: colors.system, 
          bg: colors.systemBg,
          label: '系统' 
        };
      default: 
        return { 
          icon: 'message', 
          color: colors.primary, 
          bg: '#EDE8FF',
          label: '通知' 
        };
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderSectionHeader = ({ section }: { section: NotificationSection }) => (
    <Animated.View 
      entering={FadeInDown.delay(100).springify()}
      style={styles.sectionHeader}
    >
      <View style={styles.sectionHeaderDot} />
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </Animated.View>
  );

  const renderNotification = ({ item, index }: { item: Notification; index: number }) => {
    const config = getNotificationConfig(item.type);
    
    return (
      <Animated.View
        entering={FadeInUp.delay(100 + index * 50).springify()}
      >
        <TouchableOpacity
          style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.85}
        >
          {/* 左侧彩色图标气泡 */}
          <View style={[styles.iconBubble, { backgroundColor: config.bg }]}>
            <FontAwesome6 
              name={config.icon} 
              size={32} 
              color={config.color} 
            />
          </View>
          
          <View style={styles.notificationContent}>
            <View style={styles.notificationHeader}>
              <View style={styles.notificationTitleRow}>
                {!item.isRead && <View style={styles.unreadDot} />}
                <Text style={styles.notificationTitle}>{item.title}</Text>
              </View>
              <View style={[styles.typeTag, { backgroundColor: config.color }]}>
                <Text style={styles.typeTagText}>{config.label}</Text>
              </View>
            </View>
            <Text style={styles.notificationText} numberOfLines={3}>
              {item.content}
            </Text>
            <Text style={styles.timeText}>{item.time}</Text>
          </View>
          
          <FontAwesome6 
            name="chevron-right" 
            size={28} 
            color={colors.textMuted} 
            style={styles.arrowIcon} 
          />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderHeader = () => (
    <Animated.View entering={FadeInUp.springify()} style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>消息通知</Text>
        {unreadCount > 0 && (
          <LinearGradient
            colors={[colors.secondary, '#FFB3C1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.badge}
          >
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </LinearGradient>
        )}
      </View>
      {unreadCount > 0 && (
        <TouchableOpacity 
          onPress={handleMarkAllAsRead} 
          activeOpacity={0.8}
          style={styles.markAllButtonOuter}
        >
          <LinearGradient
            colors={[colors.primary, '#9B7DFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.markAllButton}
          >
            <FontAwesome6 name="check-double" size={18} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.markAllText}>全部已读</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  const renderEmpty = () => (
    <Animated.View entering={FadeInUp.springify()} style={styles.emptyContainer}>
      <View style={styles.emptyIconOuter}>
        <View style={styles.emptyIconInner}>
          <FontAwesome6 name="bell-slash" size={56} color={colors.primary} />
        </View>
      </View>
      <Text style={styles.emptyText}>暂无消息</Text>
      <Text style={styles.emptySubText}>下拉刷新获取最新消息</Text>
    </Animated.View>
  );

  const sections = groupNotificationsByDate(notifications);

  return (
    <Screen backgroundColor={colors.backgroundRoot} statusBarStyle="dark">
      {/* 柔色渐变背景 */}
      <LinearGradient
        colors={['#F0EDFA', '#E8E3F8', '#F0EDFA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      {/* 爱心流星背景 */}
      <HeartMeteors count={6} />

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
      content: '亲爱的用户，欢迎使用AI助老应用！我们致力于为您提供便捷、贴心的服务。',
      time: '刚刚',
      timestamp: now,
      isRead: false,
    },
    {
      id: 2,
      type: 'weather',
      title: '今天天气不错',
      content: '今天天气晴朗，气温适宜，适合出门散步。记得带好水杯，注意防晒哦！',
      time: '今天 08:00',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0),
      isRead: false,
    },
    {
      id: 3,
      type: 'medication',
      title: '用药提醒',
      content: '下午2点需要服用降压药，请记得按时服药。定期服药对控制血压很重要。',
      time: '昨天 14:00',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 14, 0),
      isRead: true,
    },
    {
      id: 4,
      type: 'health',
      title: '健康小贴士',
      content: '春季气温变化大，请注意增减衣物。早晚温差较大，外出建议带件外套。',
      time: '昨天 09:00',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 9, 0),
      isRead: true,
    },
    {
      id: 5,
      type: 'festival',
      title: '重阳节快乐',
      content: '重阳节到了！祝您身体健康、阖家幸福。今天适合登高望远、赏菊品茗。',
      time: '3天前',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3, 8, 0),
      isRead: true,
    },
  ];
}

const createStyles = () =>
  StyleSheet.create({
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 100,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 28,
      paddingHorizontal: 4,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      fontSize: 34,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    badge: {
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 6,
      marginLeft: 14,
    },
    badgeText: {
      color: colors.white,
      fontSize: 18,
      fontWeight: '700',
    },
    markAllButtonOuter: {
      borderRadius: 20,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    markAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    markAllText: {
      color: colors.white,
      fontSize: 18,
      fontWeight: '700',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 4,
    },
    sectionHeaderDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.accent,
      marginRight: 10,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
    },
    sectionHeaderText: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    // 3D黏土卡片
    notificationCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.backgroundCard,
      borderRadius: 28,
      padding: 24,
      marginBottom: 18,
      // 黏土阴影
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: Platform.OS === 'android' ? 0.15 : 0.2,
      shadowRadius: 20,
      elevation: 8,
      // 内描边高光
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.7)',
    },
    unreadCard: {
      borderLeftWidth: 6,
      borderLeftColor: colors.secondary,
    },
    iconBubble: {
      width: 72,
      height: 72,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 18,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.7)',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    notificationContent: {
      flex: 1,
    },
    notificationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    notificationTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    unreadDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.secondary,
      marginRight: 12,
      shadowColor: colors.secondary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
    },
    notificationTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.textPrimary,
      flex: 1,
    },
    typeTag: {
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 6,
      marginLeft: 12,
    },
    typeTagText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '700',
    },
    notificationText: {
      fontSize: 18,
      color: colors.textSecondary,
      lineHeight: 26,
      marginBottom: 10,
    },
    timeText: {
      fontSize: 16,
      color: colors.textMuted,
      fontWeight: '500',
    },
    arrowIcon: {
      marginLeft: 10,
      marginTop: 6,
    },
    // 空状态
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
    },
    emptyIconOuter: {
      borderRadius: 36,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      marginBottom: 24,
    },
    emptyIconInner: {
      width: 120,
      height: 120,
      borderRadius: 36,
      backgroundColor: colors.backgroundCard,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.7)',
    },
    emptyText: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 10,
    },
    emptySubText: {
      fontSize: 16,
      color: colors.textMuted,
    },
  });
