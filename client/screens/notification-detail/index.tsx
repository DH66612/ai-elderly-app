/**
 * 监护人端消息详情页面 - 3D黏土风格
 * 柔和粉彩 + 黏土凸起阴影 + 白色内描边高光
 * 配色与监护人主页同步
 */
import React, { useMemo } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';

// 3D黏土风格配色（与监护人主页同步）
const colors = {
  // 背景色系 - 暖白奶油色
  backgroundRoot: '#faf5f0',
  backgroundDefault: '#ffffff',
  backgroundTertiary: '#f5ebe0',
  borderLight: '#e8ddd0',
  
  // 主色系 - 黏土紫/薰衣草紫
  primary: '#a78bfa',
  primaryLight: '#c4b5fd',
  primaryDark: '#8b5cf6',
  primaryGradient: '#9B7DFF',
  
  // 辅助色系 - 黏土粉
  secondary: '#f9a8d4',
  secondaryGradient: '#FFB3C1',
  
  // 文字色 - 温暖色调
  textPrimary: '#4a3f52',
  textSecondary: '#6b5f72',
  textMuted: '#9a8f9f',
  
  // 功能色 - 柔和版本
  success: '#86efac',
  successText: '#22c55e',
  warning: '#fcd34d',
  warningText: '#f59e0b',
  danger: '#fca5a5',
  dangerText: '#ef4444',
  
  white: '#ffffff',
  
  // 黏土阴影色
  shadowDark: '#d4c4b5',
  shadowLight: '#ffffff',
  shadowMedium: '#e8ddd0',
  
  // 消息类型颜色（粉彩系）
  festival: '#fcd34d',
  festivalGradient: '#FDCB6E',
  weather: '#54A0FF',
  weatherGradient: '#74B9FF',
  emergency: '#fca5a5',
  emergencyGradient: '#FF8787',
  reminder: '#86efac',
  reminderGradient: '#55EFC4',
  system: '#a78bfa',
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
      {/* 监护人端统一背景 */}
      <GuardianBackground showMeteors={true} meteorCount={6} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 头部导航 */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <FontAwesome6 name="arrow-left" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>消息详情</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* 消息卡片 - 3D黏土风格 */}
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

        {/* 提示信息 */}
        <View style={styles.tipCard}>
          <LinearGradient
            colors={['rgba(167,139,250,0.12)', 'rgba(196,181,253,0.12)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.tipIcon}
          >
            <FontAwesome6 name="circle-info" size={16} color={colors.primary} />
          </LinearGradient>
          <Text style={styles.tipText}>此消息来自AI助老系统，如有疑问请联系客服</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function createStyles() {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 0,
      paddingTop: 60,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 28,
    },
    backButton: {
      width: 48,
      height: 48,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.backgroundDefault,
      // 黏土阴影
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: Platform.OS === 'android' ? 0.12 : 0.18,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.7)',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    // 3D黏土风格卡片
    messageCard: {
      backgroundColor: colors.backgroundDefault,
      borderRadius: 28,
      padding: 28,
      marginBottom: 20,
      // 黏土阴影
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: Platform.OS === 'android' ? 0.12 : 0.18,
      shadowRadius: 16,
      elevation: 8,
      // 内描边高光
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.7)',
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
    tipCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundDefault,
      borderRadius: 20,
      padding: 16,
      // 黏土阴影
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: Platform.OS === 'android' ? 0.08 : 0.12,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.7)',
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
