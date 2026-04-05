/**
 * 绑定人详情页面 - 清雅风格
 * 显示注册时填写的全部信息 - 整体卡片样式
 */
import React, { useMemo } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';

// 清雅色调
const colors = {
  backgroundRoot: '#f0f5fa',
  backgroundDefault: '#ffffff',
  backgroundTertiary: '#eaf0f5',
  primary: '#8ab3cf',
  primaryDark: '#7fa5c0',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#8fa5bb',
  border: '#d6e4f0',
  white: '#ffffff',
  gradientStart: '#b8e0e8',
  gradientEnd: '#f0f5fa',
};

export default function BindingInfoScreen() {
  const { theme } = useTheme();
  const router = useSafeRouter();
  const { user } = useAuth();

  const boundUser = user?.boundUser;

  const styles = useMemo(() => createStyles(), []);

  if (!boundUser) {
    return (
      <Screen backgroundColor="transparent" statusBarStyle="dark">
        <GuardianBackground />
        <View style={styles.emptyContainer}>
          <FontAwesome6 name="user-slash" size={40} color={colors.textMuted} />
          <ThemedText variant="small" style={styles.emptyText}>暂无绑定人信息</ThemedText>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ThemedText variant="smallMedium" style={{ color: colors.white }}>返回</ThemedText>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const getRoleText = (role: string) => role === 'elderly' ? '老人' : '监护人';

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <GuardianBackground />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h3" style={styles.headerTitle}>绑定人信息</ThemedText>
          <View style={{ width: 32 }} />
        </View>

        {/* 整体卡片 */}
        <View style={styles.mainCard}>
          {/* 用户头像区 */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <FontAwesome6 name="user" size={24} color={colors.white} />
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.nameText} numberOfLines={1}>{boundUser.name}</Text>
              <View style={styles.roleTag}>
                <Text style={styles.roleText}>{getRoleText(boundUser.role)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* 基本信息 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <FontAwesome6 name="id-card" size={12} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>基本信息</Text>
            </View>
            
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <View style={styles.infoLeft}>
                  <FontAwesome6 name="user" size={12} color={colors.textMuted} />
                  <Text style={styles.infoLabel}>姓名</Text>
                </View>
                <Text style={styles.infoValue}>{boundUser.name}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <View style={styles.infoLeft}>
                  <FontAwesome6 name="phone" size={12} color={colors.textMuted} />
                  <Text style={styles.infoLabel}>手机号</Text>
                </View>
                <Text style={styles.infoValue}>{boundUser.phone}</Text>
              </View>
            </View>
          </View>

          {/* 联系信息（老人端特有） */}
          {boundUser.role === 'elderly' && (boundUser.homeAddress || boundUser.communityPhone || boundUser.contactPhone) && (
            <>
              <View style={styles.divider} />
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <FontAwesome6 name="address-book" size={12} color={colors.primary} />
                  </View>
                  <Text style={styles.sectionTitle}>联系信息</Text>
                </View>
                
                <View style={styles.infoList}>
                  {boundUser.homeAddress && (
                    <View style={styles.infoItem}>
                      <View style={styles.infoLeft}>
                        <FontAwesome6 name="location-dot" size={12} color={colors.textMuted} />
                        <Text style={styles.infoLabel}>家庭地址</Text>
                      </View>
                      <Text style={styles.infoValue} numberOfLines={2}>{boundUser.homeAddress}</Text>
                    </View>
                  )}
                  
                  {boundUser.communityPhone && (
                    <View style={styles.infoItem}>
                      <View style={styles.infoLeft}>
                        <FontAwesome6 name="building" size={12} color={colors.textMuted} />
                        <Text style={styles.infoLabel}>社区电话</Text>
                      </View>
                      <Text style={styles.infoValue}>{boundUser.communityPhone}</Text>
                    </View>
                  )}
                  
                  {boundUser.contactPhone && (
                    <View style={styles.infoItem}>
                      <View style={styles.infoLeft}>
                        <FontAwesome6 name="users" size={12} color={colors.textMuted} />
                        <Text style={styles.infoLabel}>家人电话</Text>
                      </View>
                      <Text style={styles.infoValue}>{boundUser.contactPhone}</Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          )}

          {/* 注册时间 */}
          {boundUser.createdAt && (
            <>
              <View style={styles.divider} />
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <FontAwesome6 name="clock" size={12} color={colors.primary} />
                  </View>
                  <Text style={styles.sectionTitle}>其他信息</Text>
                </View>
                
                <View style={styles.infoList}>
                  <View style={styles.infoItem}>
                    <View style={styles.infoLeft}>
                      <FontAwesome6 name="calendar" size={12} color={colors.textMuted} />
                      <Text style={styles.infoLabel}>注册时间</Text>
                    </View>
                    <Text style={styles.infoValue}>
                      {new Date(boundUser.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </Screen>
  );
}

function createStyles() {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 0,
      paddingTop: Spacing['2xl'],
      paddingBottom: Spacing['5xl'],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.lg,
    },
    backIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.8)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontWeight: '500',
      color: colors.textPrimary,
    },
    // 整体卡片
    mainCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
      shadowColor: '#a3b8cc',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    // 分隔线
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: Spacing.lg,
    },
    // 头像区
    avatarSection: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.lg,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInfo: {
      marginLeft: Spacing.md,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    nameText: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    roleTag: {
      backgroundColor: colors.primary,
      paddingHorizontal: 0,
      paddingVertical: 2,
      borderRadius: BorderRadius.sm,
    },
    roleText: {
      fontSize: 12,
      lineHeight: 16,
      color: '#FFFFFF',
      fontWeight: '500',
    },
    // 区块
    section: {
      padding: Spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    sectionIcon: {
      width: 24,
      height: 24,
      borderRadius: BorderRadius.sm,
      backgroundColor: colors.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.sm,
    },
    sectionTitle: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    infoList: {
      gap: Spacing.sm,
    },
    infoItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    infoLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      width: 80,
    },
    infoLabel: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
      marginLeft: Spacing.xs,
    },
    infoValue: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '500',
      color: colors.textPrimary,
      flex: 1,
      textAlign: 'right',
    },
    // 空状态
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 0,
    },
    emptyText: {
      marginTop: Spacing.md,
      color: colors.textMuted,
    },
    backButton: {
      marginTop: Spacing.lg,
      backgroundColor: colors.primary,
      paddingHorizontal: 0,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
    },
  });
}
