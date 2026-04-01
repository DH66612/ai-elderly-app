/**
 * 消息详情页面 - 柔和卡片风格（新拟态）
 * 新拟态双层阴影 + 渐变色标签 + 多彩图标
 */
import React, { useMemo } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';

// 柔和卡片风格配色
const colors = {
  backgroundRoot: '#F0F0F3',
  backgroundDefault: '#F0F0F3',
  backgroundTertiary: '#E8E8EB',
  primary: '#6C63FF',
  primaryGradient: '#896BFF',
  secondary: '#FF6584',
  textPrimary: '#2D3436',
  textSecondary: '#636E72',
  textMuted: '#B2BEC3',
  shadowLight: '#FFFFFF',
  shadowDark: '#D1D9E6',
  white: '#FFFFFF',
  // 消息类型颜色
  festival: '#FF9F43',
  festivalGradient: '#FDCB6E',
  weather: '#54A0FF',
  weatherGradient: '#74B9FF',
  emergency: '#FF6B6B',
  emergencyGradient: '#FF8787',
  reminder: '#00B894',
  reminderGradient: '#55EFC4',
  system: '#A29BFE',
  systemGradient: '#C8B6FF',
};

export default function NotificationDetailScreen() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{
    id: string;
    type: string;
    title: string;
    content: string;
    time: string;
  }>();

  const { type = 'reminder', title = '消息详情', content = '', time = '' } = params;

  const styles = useMemo(() => createStyles(), []);

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
      case 'festival': return '节日提醒';
      case 'weather': return '天气提醒';
      case 'emergency': return '紧急通知';
      case 'reminder': return '系统提醒';
      case 'system': return '系统通知';
      default: return '消息通知';
    }
  };

  const notificationColors = getNotificationColors(type);

  return (
    <Screen backgroundColor={colors.backgroundRoot} statusBarStyle="dark">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 头部导航 */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButtonOuter}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <View style={styles.backButtonInner}>
              <FontAwesome6 name="arrow-left" size={18} color={colors.textPrimary} />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>消息详情</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* 消息卡片 - 新拟态双层阴影 */}
        <View style={styles.messageCardOuter}>
          <View style={styles.messageCardInner}>
            <View style={styles.messageCard}>
              {/* 顶部图标与类型 */}
              <View style={styles.typeSection}>
                <LinearGradient
                  colors={[notificationColors.primary, notificationColors.gradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.typeIcon}
                >
                  <FontAwesome6 
                    name={getNotificationIcon(type)} 
                    size={28} 
                    color={colors.white} 
                  />
                </LinearGradient>
                <LinearGradient
                  colors={[notificationColors.primary, notificationColors.gradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.typeTag}
                >
                  <Text style={styles.typeTagText}>{getTypeLabel(type)}</Text>
                </LinearGradient>
              </View>

              {/* 标题 */}
              <Text style={styles.messageTitle}>{title}</Text>

              {/* 时间 */}
              <View style={styles.timeSection}>
                <FontAwesome6 name="clock" size={12} color={colors.textMuted} />
                <Text style={styles.timeText}>{time}</Text>
              </View>

              {/* 分隔线 */}
              <View style={styles.divider} />

              {/* 内容 */}
              <Text style={styles.messageContent}>{content}</Text>

              {/* 操作按钮 */}
              {type === 'emergency' && (
                <TouchableOpacity activeOpacity={0.8} style={styles.actionButtonOuter}>
                  <LinearGradient
                    colors={[colors.emergency, colors.emergencyGradient]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButton}
                  >
                    <FontAwesome6 name="phone" size={18} color={colors.white} />
                    <Text style={styles.actionButtonText}>立即联系</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {type === 'reminder' && title.includes('用药') && (
                <TouchableOpacity activeOpacity={0.8} style={styles.actionButtonOuter}>
                  <LinearGradient
                    colors={[colors.reminder, colors.reminderGradient]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButton}
                  >
                    <FontAwesome6 name="check" size={18} color={colors.white} />
                    <Text style={styles.actionButtonText}>标记已提醒</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* 提示信息 */}
        <View style={styles.tipCardOuter}>
          <View style={styles.tipCardInner}>
            <View style={styles.tipCard}>
              <LinearGradient
                colors={['rgba(108,99,255,0.12)', 'rgba(137,107,255,0.12)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.tipIcon}
              >
                <FontAwesome6 name="circle-info" size={16} color={colors.primary} />
              </LinearGradient>
              <Text style={styles.tipText}>此消息来自AI助老系统，如有疑问请联系客服</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function createStyles() {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 60,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 28,
    },
    backButtonOuter: {
      borderRadius: 16,
      shadowColor: colors.shadowDark,
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: Platform.OS === 'android' ? 0 : 0.6,
      shadowRadius: 6,
    },
    backButtonInner: {
      width: 48,
      height: 48,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.backgroundDefault,
      shadowColor: colors.shadowLight,
      shadowOffset: { width: -4, height: -4 },
      shadowOpacity: Platform.OS === 'android' ? 0 : 0.8,
      shadowRadius: 6,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    // 新拟态双层阴影卡片
    messageCardOuter: {
      borderRadius: 28,
      shadowColor: colors.shadowDark,
      shadowOffset: { width: 8, height: 8 },
      shadowOpacity: Platform.OS === 'android' ? 0 : 0.7,
      shadowRadius: 12,
      marginBottom: 20,
    },
    messageCardInner: {
      borderRadius: 28,
      shadowColor: colors.shadowLight,
      shadowOffset: { width: -8, height: -8 },
      shadowOpacity: Platform.OS === 'android' ? 0 : 0.9,
      shadowRadius: 12,
      backgroundColor: colors.backgroundDefault,
    },
    messageCard: {
      backgroundColor: colors.backgroundDefault,
      borderRadius: 28,
      padding: 28,
      borderWidth: Platform.OS === 'android' ? 0.5 : 0,
      borderColor: 'rgba(255,255,255,0.5)',
    },
    typeSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    typeIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 6,
    },
    typeTag: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 14,
    },
    typeTagText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.white,
    },
    messageTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      lineHeight: 30,
      marginBottom: 12,
    },
    timeSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 20,
    },
    timeText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    divider: {
      height: 2,
      backgroundColor: colors.backgroundTertiary,
      borderRadius: 1,
      marginBottom: 20,
    },
    messageContent: {
      fontSize: 16,
      lineHeight: 26,
      color: colors.textSecondary,
    },
    actionButtonOuter: {
      marginTop: 24,
      borderRadius: 20,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 6,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
      paddingVertical: 16,
      gap: 10,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.white,
    },
    // 提示卡片
    tipCardOuter: {
      borderRadius: 20,
      shadowColor: colors.shadowDark,
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: Platform.OS === 'android' ? 0 : 0.5,
      shadowRadius: 8,
    },
    tipCardInner: {
      borderRadius: 20,
      shadowColor: colors.shadowLight,
      shadowOffset: { width: -4, height: -4 },
      shadowOpacity: Platform.OS === 'android' ? 0 : 0.8,
      shadowRadius: 8,
      backgroundColor: colors.backgroundDefault,
    },
    tipCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundDefault,
      borderRadius: 20,
      padding: 16,
      borderWidth: Platform.OS === 'android' ? 0.5 : 0,
      borderColor: 'rgba(255,255,255,0.5)',
    },
    tipIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    tipText: {
      flex: 1,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
  });
}
