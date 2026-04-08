/**
 * 用户协议页面
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

export default function UserAgreementScreen() {
  const router = useSafeRouter();
  const styles = useMemo(() => createStyles(), []);

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <GuardianBackground />

      {/* 统一页面头部 */}
      <PageHeader
        title="用户协议"
        titleColor={colors.textPrimary}
        buttonBgColor="rgba(255,255,255,0.9)"
        iconColor={colors.textPrimary}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 内容 */}
        <View style={styles.card}>
          <Text style={styles.title}>AI助老用户服务协议</Text>
          <Text style={styles.updateTime}>更新日期：2024年1月1日</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>一、服务说明</Text>
            <Text style={styles.paragraph}>
              AI助老是一款专为老年人和监护人设计的智能健康管理应用。本应用提供健康数据监测、紧急呼叫、视频通话、语音助手等功能，旨在帮助老年人更好地生活，同时让监护人能够实时了解老人的健康状况。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>二、用户注册</Text>
            <Text style={styles.paragraph}>
              1. 用户在使用本应用前需要完成注册，填写真实、准确的个人信息。{'\n'}
              2. 老人端用户需填写家庭地址、社区电话、家人联系电话等紧急联系信息。{'\n'}
              3. 监护人端用户需与老人端用户完成绑定后，方可查看老人健康数据。{'\n'}
              4. 用户应妥善保管账号信息，因账号保管不当造成的损失由用户自行承担。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>三、用户行为规范</Text>
            <Text style={styles.paragraph}>
              1. 用户不得利用本应用从事违法违规活动。{'\n'}
              2. 用户不得干扰本应用的正常运行。{'\n'}
              3. 用户不得恶意呼叫紧急救援功能，以免占用公共资源。{'\n'}
              4. 用户应遵守相关法律法规，尊重他人合法权益。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>四、服务内容</Text>
            <Text style={styles.paragraph}>
              1. 健康数据监测：通过蓝牙设备采集心率、步数等健康数据。{'\n'}
              2. 紧急呼叫：一键呼叫监护人或紧急服务。{'\n'}
              3. 视频通话：老人与监护人之间的视频通话服务。{'\n'}
              4. 语音助手：AI语音交互，协助老人完成日常操作。{'\n'}
              5. 位置定位：实时获取老人位置信息（需授权）。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>五、免责声明</Text>
            <Text style={styles.paragraph}>
              1. 本应用提供的健康数据仅供参考，不构成医疗诊断建议。{'\n'}
              2. 因网络、设备等不可抗力因素导致的服务中断，本应用不承担责任。{'\n'}
              3. 用户因使用本应用产生的纠纷，应通过友好协商解决。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>六、协议修改</Text>
            <Text style={styles.paragraph}>
              本应用有权根据需要修改本协议内容，修改后的协议将在应用内公布。继续使用本应用即视为用户同意修改后的协议。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>七、联系我们</Text>
            <Text style={styles.paragraph}>
              如有任何问题或建议，请通过应用内的反馈功能联系我们。
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
  };
}
