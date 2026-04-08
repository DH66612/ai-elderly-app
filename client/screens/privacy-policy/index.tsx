/**
 * 隐私政策页面
 */
import React, { useMemo } from 'react';
import { View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';
import { PageHeader } from '@/components/PageHeader';

const colors = {
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#8fa5bb',
  primary: '#8ab3cf',
  gradientStart: '#b8e0e8',
  gradientEnd: '#f0f5fa',
};

export default function PrivacyPolicyScreen() {
  const router = useSafeRouter();
  const styles = useMemo(() => createStyles(), []);

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <GuardianBackground />

      {/* 统一页面头部 */}
      <PageHeader
        title="隐私政策"
        titleColor={colors.textPrimary}
        buttonBgColor="rgba(255,255,255,0.9)"
        iconColor={colors.textPrimary}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 内容 */}
        <View style={styles.card}>
          <Text style={styles.title}>AI助老隐私政策</Text>
          <Text style={styles.updateTime}>更新日期：2024年1月1日</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>一、引言</Text>
            <Text style={styles.paragraph}>
              AI助老（以下简称「我们」）高度重视用户隐私保护。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息。请您在使用本应用前仔细阅读本政策。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>二、信息收集</Text>
            <Text style={styles.paragraph}>
              我们收集以下类型的信息：{'\n\n'}
              <Text style={styles.bold}>1. 注册信息</Text>{'\n'}
              - 姓名、手机号{'\n'}
              - 角色（老人端/监护人端）{'\n'}
              - 家庭地址、社区电话、家人电话（老人端）{'\n\n'}
              <Text style={styles.bold}>2. 健康数据</Text>{'\n'}
              - 心率、步数等健康指标{'\n'}
              - 通过蓝牙设备自动采集{'\n\n'}
              <Text style={styles.bold}>3. 位置信息</Text>{'\n'}
              - 用于天气定位和紧急救援{'\n'}
              - 需您授权后才会获取{'\n\n'}
              <Text style={styles.bold}>4. 设备信息</Text>{'\n'}
              - 设备型号、操作系统版本{'\n'}
              - 应用使用日志
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>三、信息使用</Text>
            <Text style={styles.paragraph}>
              我们使用收集的信息用于：{'\n'}
              1. 提供、维护和改进我们的服务{'\n'}
              2. 向监护人推送老人健康数据{'\n'}
              3. 紧急情况下协助救援{'\n'}
              4. 发送服务通知和健康提醒{'\n'}
              5. 改进用户体验和开发新功能
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>四、信息共享</Text>
            <Text style={styles.paragraph}>
              1. 我们不会向第三方出售您的个人信息。{'\n'}
              2. 监护人可以查看其绑定老人的健康数据和位置信息。{'\n'}
              3. 我们仅在必要时与授权的服务提供商共享数据（如云存储服务商）。{'\n'}
              4. 法律法规要求时，我们会依法配合。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>五、信息存储与安全</Text>
            <Text style={styles.paragraph}>
              1. 我们采用业界标准的安全措施保护您的数据。{'\n'}
              2. 数据传输采用加密技术。{'\n'}
              3. 数据存储在安全的服务器上，限制访问权限。{'\n'}
              4. 我们会定期审查和更新安全措施。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>六、您的权利</Text>
            <Text style={styles.paragraph}>
              1. 您有权访问和更正您的个人信息。{'\n'}
              2. 您有权删除您的账号和相关数据。{'\n'}
              3. 您有权撤销位置等敏感信息的授权。{'\n'}
              4. 您有权解除与他人的绑定关系。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>七、未成年人保护</Text>
            <Text style={styles.paragraph}>
              本应用主要面向老年人及其监护人。如果您是未成年人，请在监护人的陪同下使用本应用，我们不会主动收集未成年人的个人信息。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>八、政策更新</Text>
            <Text style={styles.paragraph}>
              我们可能会不时更新本隐私政策。更新后的政策将在应用内公布，请您定期查阅。继续使用本应用即表示您同意更新后的政策。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>九、联系我们</Text>
            <Text style={styles.paragraph}>
              如您对隐私政策有任何疑问，请通过应用内的反馈功能联系我们。我们将在15个工作日内回复您的请求。
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function createStyles() {
  return {
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
      paddingBottom: Spacing['5xl'],
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: BorderRadius.lg,
      padding: Spacing.xl,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    title: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: colors.textPrimary,
      textAlign: 'center' as const,
      marginBottom: Spacing.sm,
    },
    updateTime: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center' as const,
      marginBottom: Spacing.xl,
    },
    section: {
      marginBottom: Spacing.xl,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.textPrimary,
      marginBottom: Spacing.md,
    },
    paragraph: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.textSecondary,
    },
    bold: {
      fontWeight: '600' as const,
      color: colors.textPrimary,
    },
  };
}
