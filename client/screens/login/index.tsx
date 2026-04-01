/**
 * 登录页面 - 清雅风格 + 艺术字标题 + 手机号登录（无验证码）
 */
import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { UserRole } from '@/constants/roles';
import { Spacing, BorderRadius } from '@/constants/theme';
import { HeartMeteors } from '@/components/HeartMeteors';
import { getApiBaseUrl } from '@/constants/api';

// 清雅色调
const colors = {
  backgroundRoot: '#f0f5fa',
  backgroundDefault: '#ffffff',
  primary: '#8ab3cf',
  primaryDark: '#7fa5c0',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#8fa5bb',
  border: '#d6e4f0',
  white: '#ffffff',
  gradientStart: '#b8e0e8',
  gradientEnd: '#f0f5fa',
  accentPink: '#e8b4c8',
  accentPurple: '#b8a8d8',
};

// 艺术字标题组件 - 渐变效果
function ArtTitle() {
  return (
    <View style={artStyles.container}>
      {/* 装饰线条 - 左 */}
      <View style={artStyles.decorLine}>
        <View style={[artStyles.line, artStyles.lineLeft]} />
        <View style={artStyles.dot} />
      </View>
      
      {/* 主标题 */}
      <View style={artStyles.titleContainer}>
        <LinearGradient
          colors={['#8ab3cf', '#b8a8d8', '#e8b4c8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={artStyles.gradientBox}
        >
          <Text style={artStyles.titleText}>AI 助老</Text>
        </LinearGradient>
      </View>
      
      {/* 装饰线条 - 右 */}
      <View style={artStyles.decorLine}>
        <View style={artStyles.dot} />
        <View style={[artStyles.line, artStyles.lineRight]} />
      </View>
    </View>
  );
}

const artStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  decorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  line: {
    height: 1,
    flex: 1,
    backgroundColor: 'rgba(138, 179, 207, 0.4)',
  },
  lineLeft: {
    marginRight: Spacing.xs,
  },
  lineRight: {
    marginLeft: Spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  titleContainer: {
    marginHorizontal: Spacing.md,
  },
  gradientBox: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xl,
    shadowColor: '#8ab3cf',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  titleText: {
    fontSize: 34,
    lineHeight: 44,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 6,
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default function LoginScreen() {
  const { theme } = useTheme();
  const router = useSafeRouter();
  const { login, logout } = useAuth();

  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.ELDERLY);
  const [loading, setLoading] = useState(false);

  // 登录
  const handleLogin = async () => {
    if (!phone || phone.length !== 11) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }

    setLoading(true);
    try {
      await logout();

      /**
       * 服务端文件：server/src/routes/auth.ts
       * 接口：POST /api/v1/auth/login
       * Body 参数：phone: string, role: 'elderly' | 'guardian'
       */
      const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, role }),
      });

      const data = await response.json();

      if (response.ok) {
        await login(data.user, data.token);
        if (role === UserRole.ELDERLY) {
          router.replace('/(elderly)/home');
        } else {
          router.replace('/(guardian)/home');
        }
      } else {
        Alert.alert('登录失败', data.error || '请检查手机号和角色');
      }
    } catch (error) {
      Alert.alert('登录失败', '网络错误，请重试');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const styles = useMemo(() => createStyles(), []);

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        locations={[0, 0.5]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      {/* 爱心流星背景 */}
      <HeartMeteors count={8} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Logo 区域 */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <FontAwesome6 name="hand-holding-heart" size={40} color={colors.primary} />
          </View>
          
          {/* 艺术字标题 */}
          <ArtTitle />
          
          {/* 副标题 */}
          <View style={styles.subtitleBox}>
            <Text style={styles.subtitle}>用科技守护家人健康</Text>
            <View style={styles.subtitleUnderline} />
          </View>
        </View>

        {/* 登录表单卡片 */}
        <View style={styles.card}>
          {/* 角色选择 */}
          <View style={styles.section}>
            <Text style={styles.label}>选择角色</Text>
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[styles.roleButton, role === UserRole.ELDERLY && styles.roleButtonActive]}
                onPress={() => setRole(UserRole.ELDERLY)}
                activeOpacity={0.8}
              >
                <FontAwesome6
                  name="user"
                  size={16}
                  color={role === UserRole.ELDERLY ? colors.white : colors.textSecondary}
                />
                <Text style={[styles.roleText, role === UserRole.ELDERLY && styles.roleTextActive]}>
                  老人端
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleButton, role === UserRole.GUARDIAN && styles.roleButtonActive]}
                onPress={() => setRole(UserRole.GUARDIAN)}
                activeOpacity={0.8}
              >
                <FontAwesome6
                  name="user-shield"
                  size={16}
                  color={role === UserRole.GUARDIAN ? colors.white : colors.textSecondary}
                />
                <Text style={[styles.roleText, role === UserRole.GUARDIAN && styles.roleTextActive]}>
                  监护人端
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 手机号输入 */}
          <View style={styles.section}>
            <Text style={styles.label}>手机号</Text>
            <View style={styles.inputRow}>
              <FontAwesome6 name="phone" size={14} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="请输入手机号"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={11}
              />
            </View>
          </View>

          {/* 登录按钮 */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>
              {loading ? '登录中...' : '登录'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 底部 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>还没有账号？</Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.registerLink}>立即注册</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

function createStyles() {
  return {
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing['4xl'],
      paddingBottom: Spacing['2xl'],
    },
    header: {
      alignItems: 'center' as const,
      marginBottom: Spacing.xl,
    },
    logoBox: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255,255,255,0.95)',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
      marginBottom: Spacing.lg,
    },
    subtitleBox: {
      alignItems: 'center' as const,
      marginTop: Spacing.md,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      letterSpacing: 2,
    },
    subtitleUnderline: {
      width: 100,
      height: 2,
      borderRadius: 1,
      backgroundColor: 'rgba(138, 179, 207, 0.5)',
      marginTop: Spacing.xs,
    },
    card: {
      backgroundColor: colors.white,
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 4,
    },
    section: {
      marginBottom: Spacing.lg,
    },
    label: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500' as const,
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
    },
    roleSelector: {
      flexDirection: 'row' as const,
      gap: Spacing.md,
    },
    roleButton: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: '#F3F4F6',
      gap: Spacing.sm,
    },
    roleButtonActive: {
      backgroundColor: colors.primary,
    },
    roleText: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '500' as const,
      color: colors.textSecondary,
    },
    roleTextActive: {
      color: colors.white,
    },
    inputRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: '#F9FAFB',
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Spacing.md,
    },
    inputIcon: {
      marginRight: Spacing.sm,
    },
    input: {
      flex: 1,
      paddingVertical: Spacing.sm,
      fontSize: 16,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    loginButton: {
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      alignItems: 'center' as const,
      marginTop: Spacing.sm,
    },
    loginButtonDisabled: {
      opacity: 0.6,
    },
    loginButtonText: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '500' as const,
      color: colors.white,
    },
    footer: {
      flexDirection: 'row' as const,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginTop: Spacing.xl,
    },
    footerText: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    registerLink: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500' as const,
      color: colors.primary,
      marginLeft: Spacing.xs,
    },
  };
}
