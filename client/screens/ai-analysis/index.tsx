/**
 * AI健康分析页面
 * 读取健康手环数据和健康趋势，自动生成AI分析报告
 * 包含AI对话模块和每日报告模块
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';
import { PageHeader } from '@/components/PageHeader';

// 清雅色调
const colors = {
  backgroundRoot: '#fafafc',
  backgroundCard: '#ffffff',
  backgroundTertiary: '#f0f5fa',
  primary: '#9BB5CC',
  primaryLight: '#e8f0f7',
  success: '#a8c8b8',
  successText: '#5a8a7a',
  warning: '#d4c4a8',
  warningText: '#8a7a5a',
  danger: '#e2c6c6',
  dangerText: '#b87a7a',
  textPrimary: '#4A647A',
  textSecondary: '#6B8C9E',
  textMuted: '#8D9FB0',
  border: '#e0e8f0',
};

interface HealthData {
  heartRate: number | null;
  steps: number | null;
  calories: number | null;
  timestamp: string;
}

interface HealthTrend {
  heartRate: number[];
  bloodPressure: number[];
  bloodOxygen: number[];
  steps: number[];
  timeLabels: string[];
}

// 虚拟健康数据（手环连接后替换为真实数据）
const MOCK_HEALTH_DATA: HealthData = {
  heartRate: 72,
  steps: 6842,
  calories: 186,
  timestamp: new Date().toISOString(),
};

// 虚拟健康趋势数据（一天6个时间点：4小时一采样）
const MOCK_HEALTH_TREND: HealthTrend = {
  heartRate: [68, 72, 75, 78, 74, 70],
  bloodPressure: [125, 128, 130, 127, 126, 124],
  bloodOxygen: [98, 97, 98, 97, 98, 98],
  steps: [0, 1200, 3500, 5200, 6100, 6842],
  timeLabels: ['04:00', '08:00', '12:00', '16:00', '20:00', '现在'],
};

interface UserTags {
  name: string;
  healthConditions: string[];
  livingConditions: string[];
  homeAddress: string;
}

interface AIAnalysisResult {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  indicators: Array<{
    name: string;
    value: string;
    status: 'normal' | 'warning' | 'danger';
    trend: string;
    comment: string;
  }>;
  alerts: string[];
  suggestions: string[];
  followUp: string;
}

interface DeviceInfo {
  id: number;
  device_name: string;
  device_type: string;
  status: string;
}

// 异常趋势预警接口
interface HealthWarning {
  ruleId: string;
  name: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  detail: string;
  suggestion: string;
  metric: string;
  triggeredAt: string;
}

// 健康建议接口
interface HealthAdvice {
  category: string;
  condition: string;
  advice: string;
  priority: 'high' | 'medium' | 'low';
  source: string;
}

// 对话消息接口
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAnalysisScreen() {
  const { theme, isDark } = useTheme();
  const router = useSafeRouter();
  const { user, getAuthHeaders } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [healthTrend, setHealthTrend] = useState<HealthTrend | null>(null);
  const [bandDevice, setBandDevice] = useState<DeviceInfo | null>(null);
  const [userTags, setUserTags] = useState<UserTags | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);
  const [healthWarnings, setHealthWarnings] = useState<HealthWarning[]>([]);
  const [healthAdvice, setHealthAdvice] = useState<HealthAdvice[]>([]);
  const hasAutoAnalyzed = useRef(false);

  // AI对话状态
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // 每日报告状态
  const [dailyReport, setDailyReport] = useState<string | null>(null);
  const [dailyReportLoading, setDailyReportLoading] = useState(false);
  const [dailyReportTime, setDailyReportTime] = useState<string | null>(null);

  const isNotBound = !user?.boundUserId;

  // 加载数据
  const loadData = useCallback(async () => {
    if (isNotBound || !user.boundUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 并行获取数据
      const headers = getAuthHeaders();
      const [deviceRes, healthRes, trendRes, userRes, latestAnalysisRes, historyRes, warningsRes, adviceRes] = await Promise.all([
        // 获取设备连接状态
        fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/bluetooth/devices/${user.boundUserId}`, { headers }),
        // 获取最新健康数据
        fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/device-data/bracelet/latest/${user.boundUserId}`, { headers }),
        // 获取健康趋势数据
        fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/device-data/health-trend/${user.boundUserId}`, { headers }),
        // 获取用户标签
        fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/users/${user.boundUserId}`, { headers }),
        // 获取最新AI分析
        fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ai/latest/${user.boundUserId}?analysis_type=health`, { headers }),
        // 获取历史分析
        fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ai/history/${user.boundUserId}?limit=5`, { headers }),
        // 获取异常趋势预警
        fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/health-warning/trend/${user.boundUserId}`, { headers }),
        // 获取健康建议
        fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/health-warning/advice/${user.boundUserId}`, { headers }),
      ]);

      // 解析设备状态
      if (deviceRes.ok) {
        const deviceJson = await deviceRes.json();
        const band = (deviceJson.data || []).find(
          (device: DeviceInfo) => device.device_type === 'band' && device.status === 'connected'
        );
        setBandDevice(band || null);
      }

      // 解析健康数据（无真实数据时使用虚拟数据）
      if (healthRes.ok) {
        const healthJson = await healthRes.json();
        if (healthJson.success && healthJson.data) {
          setHealthData({
            heartRate: healthJson.data.data?.heartRate ?? null,
            steps: healthJson.data.data?.steps ?? null,
            calories: healthJson.data.data?.calories ?? null,
            timestamp: healthJson.data.created_at,
          });
        } else {
          // 无真实数据时使用虚拟数据
          setHealthData(MOCK_HEALTH_DATA);
        }
      } else {
        // 请求失败时使用虚拟数据
        setHealthData(MOCK_HEALTH_DATA);
      }

      // 解析健康趋势（无真实数据时使用虚拟数据）
      if (trendRes.ok) {
        const trendJson = await trendRes.json();
        if (trendJson.success && trendJson.data) {
          setHealthTrend(trendJson.data);
        } else {
          // 无真实数据时使用虚拟数据
          setHealthTrend(MOCK_HEALTH_TREND);
        }
      } else {
        // 请求失败时使用虚拟数据
        setHealthTrend(MOCK_HEALTH_TREND);
      }

      // 解析用户标签
      if (userRes.ok) {
        const userJson = await userRes.json();
        if (userJson.success && userJson.data) {
          setUserTags({
            name: userJson.data.name || '未知',
            healthConditions: userJson.data.healthConditions || [],
            livingConditions: userJson.data.livingConditions || [],
            homeAddress: userJson.data.homeAddress || '',
          });
        }
      }

      // 解析最新分析
      if (latestAnalysisRes.ok) {
        const analysisJson = await latestAnalysisRes.json();
        if (analysisJson.success && analysisJson.data) {
          const result = typeof analysisJson.data.result === 'string' 
            ? JSON.parse(analysisJson.data.result) 
            : analysisJson.data.result;
          setAnalysisResult(result);
        }
      }

      // 解析历史分析
      if (historyRes.ok) {
        const historyJson = await historyRes.json();
        if (historyJson.success) {
          setAnalysisHistory(historyJson.data || []);
        }
      }

      // 解析异常趋势预警
      if (warningsRes.ok) {
        const warningsJson = await warningsRes.json();
        if (warningsJson.success) {
          setHealthWarnings(warningsJson.warnings || []);
        }
      }

      // 解析健康建议
      if (adviceRes.ok) {
        const adviceJson = await adviceRes.json();
        if (adviceJson.success) {
          setHealthAdvice(adviceJson.advice || []);
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [isNotBound, user?.boundUserId]);

  // 自动分析（使用虚拟数据或真实数据）
  const autoAnalyze = useCallback(async () => {
    if (analyzing || hasAutoAnalyzed.current || !user?.boundUserId) return;
    
    hasAutoAnalyzed.current = true;
    setAnalyzing(true);

    try {
      // 使用虚拟数据或真实数据
      const trendToUse = healthTrend || MOCK_HEALTH_TREND;
      
      /**
       * 服务端文件：server/src/routes/ai.ts
       * 接口：POST /api/v1/ai/analyze/:userId
       * Body 参数：analysisType: string, healthTrend: object
       */
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ai/analyze/${user.boundUserId}`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            analysisType: 'health',
            healthTrend: trendToUse,
          }),
        }
      );

      const data = await response.json();

      if (data.success && data.analysis?.parsed_result) {
        setAnalysisResult(data.analysis.parsed_result);
        // 刷新历史记录
        const historyRes = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ai/history/${user.boundUserId}?limit=5`,
          { headers: getAuthHeaders() }
        );
        if (historyRes.ok) {
          const historyJson = await historyRes.json();
          if (historyJson.success) {
            setAnalysisHistory(historyJson.data || []);
          }
        }
      } else {
        // 分析失败时显示错误提示
        console.log('[AI分析] 自动分析失败:', data.error);
      }
    } catch (error) {
      console.error('自动分析失败:', error);
    } finally {
      setAnalyzing(false);
    }
  }, [healthTrend, analyzing, user?.boundUserId]);

  // 生成每日报告
  const generateDailyReport = useCallback(async () => {
    if (!user?.boundUserId) return;
    
    setDailyReportLoading(true);

    try {
      /**
       * 服务端文件：server/src/routes/ai.ts
       * 接口：POST /api/v1/ai/daily-report/:userId
       */
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ai/daily-report/${user.boundUserId}`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );

      // 检查响应类型
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        // 服务器返回非JSON响应（可能是部署问题）
        console.error('[每日报告] 服务器返回非JSON响应');
        setDailyReport('服务暂时不可用，请稍后再试生成报告。');
        setDailyReportTime(new Date().toISOString());
        return;
      }

      const data = await response.json();

      if (data.success && data.report) {
        setDailyReport(data.report);
        setDailyReportTime(data.generatedAt);
      } else {
        console.error('[每日报告] 生成失败:', data.error);
        setDailyReport(data.error || '生成报告失败，请稍后重试');
        setDailyReportTime(new Date().toISOString());
      }
    } catch (error: any) {
      console.error('生成每日报告失败:', error);
      setDailyReport('网络错误，请检查网络连接后重试。');
      setDailyReportTime(new Date().toISOString());
    } finally {
      setDailyReportLoading(false);
    }
  }, [user?.boundUserId]);

  // 发送聊天消息
  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || !user?.boundUserId || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    
    // 添加用户消息
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      // 构建历史消息
      const history = chatMessages.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      /**
       * 服务端文件：server/src/routes/ai.ts
       * 接口：POST /api/v1/ai/chat
       * Body 参数：user_id: number, message: string, history?: Array<{role: string, content: string}>
       */
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ai/chat`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            user_id: user.boundUserId,
            message: userMessage,
            history,
          }),
        }
      );

      const data = await response.json();

      if (data.success && data.reply) {
        // 添加AI回复
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, assistantMsg]);
      } else {
        // 添加错误提示
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '抱歉，我暂时无法回答您的问题，请稍后再试。',
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, errorMsg]);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '网络错误，请检查网络连接后重试。',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, user?.boundUserId, chatLoading, chatMessages]);

  useFocusEffect(
    useCallback(() => {
      hasAutoAnalyzed.current = false;
      loadData();
    }, [loadData])
  );

  // 当数据加载完成时，自动分析（不再强制要求手环和健康趋势）
  useEffect(() => {
    if (!loading && !analysisResult && !hasAutoAnalyzed.current && user?.boundUserId) {
      // 无论是否有手环数据，都尝试进行分析
      autoAnalyze();
    }
  }, [loading, analysisResult, autoAnalyze, user?.boundUserId]);

  // 页面加载时自动生成每日报告
  useEffect(() => {
    if (!loading && !dailyReport && !dailyReportLoading && user?.boundUserId) {
      generateDailyReport();
    }
  }, [loading, dailyReport, dailyReportLoading, user?.boundUserId, generateDailyReport]);

  // 下拉刷新
  const handleRefresh = useCallback(async () => {
    hasAutoAnalyzed.current = false;
    setDailyReport(null); // 重置每日报告以便重新生成
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // 手动重新分析
  const handleReanalyze = useCallback(async () => {
    if (isNotBound || !user.boundUserId) {
      Alert.alert('提示', '请先绑定老人');
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      // 使用虚拟数据或真实数据
      const trendToUse = healthTrend || MOCK_HEALTH_TREND;
      
      /**
       * 服务端文件：server/src/routes/ai.ts
       * 接口：POST /api/v1/ai/analyze/:userId
       * Body 参数：analysisType: string, healthTrend: object
       */
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ai/analyze/${user.boundUserId}`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            analysisType: 'health',
            healthTrend: trendToUse,
          }),
        }
      );

      const data = await response.json();

      if (data.success && data.analysis?.parsed_result) {
        setAnalysisResult(data.analysis.parsed_result);
        Alert.alert('分析完成', '健康分析报告已生成');
        // 刷新历史记录
        loadData();
      } else {
        Alert.alert('分析失败', data.error || '请稍后重试');
      }
    } catch (error) {
      console.error('生成分析失败:', error);
      Alert.alert('分析失败', '网络错误，请重试');
    } finally {
      setAnalyzing(false);
    }
  }, [isNotBound, user?.boundUserId, healthTrend, loadData]);

  // 获取风险等级样式
  const getRiskStyle = (level: string) => {
    switch (level) {
      case 'low':
        return { bgColor: '#e8f4ec', textColor: colors.successText, icon: 'circle-check', label: '低风险' };
      case 'medium':
        return { bgColor: '#fdf7e8', textColor: colors.warningText, icon: 'triangle-exclamation', label: '中等风险' };
      case 'high':
        return { bgColor: '#fef0f0', textColor: colors.dangerText, icon: 'circle-exclamation', label: '高风险' };
      default:
        return { bgColor: '#e8f4ec', textColor: colors.successText, icon: 'circle-check', label: '未知' };
    }
  };

  // 获取指标状态样式
  const getIndicatorStyle = (status: string) => {
    switch (status) {
      case 'normal':
        return { bgColor: '#e8f4ec', textColor: colors.successText };
      case 'warning':
        return { bgColor: '#fdf7e8', textColor: colors.warningText };
      case 'danger':
        return { bgColor: '#fef0f0', textColor: colors.dangerText };
      default:
        return { bgColor: colors.backgroundTertiary, textColor: colors.textSecondary };
    }
  };

  const styles = useMemo(() => createStyles(), []);

  // 未绑定状态
  if (isNotBound) {
    return (
      <Screen backgroundColor="transparent" statusBarStyle="dark">
        <GuardianBackground />
        <PageHeader
          title="AI 健康分析"
          titleColor={colors.textPrimary}
          buttonBgColor="rgba(255,255,255,0.9)"
          iconColor={colors.textMuted}
        />
        <View style={styles.emptyState}>
          <FontAwesome6 name="user-slash" size={64} color={colors.textMuted} />
          <ThemedText variant="h3" color={colors.textSecondary} style={{ marginTop: Spacing.lg }}>
            需要先绑定老人
          </ThemedText>
          <TouchableOpacity style={styles.bindButton} onPress={() => router.push('/(guardian)/profile')}>
            <ThemedText variant="bodyMedium" color="#fff">去绑定</ThemedText>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  // 加载中
  if (loading) {
    return (
      <Screen backgroundColor="transparent" statusBarStyle="dark">
        <GuardianBackground />
        <PageHeader
          title="AI 健康分析"
          titleColor={colors.textPrimary}
          buttonBgColor="rgba(255,255,255,0.9)"
          iconColor={colors.textMuted}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText variant="body" color={colors.textSecondary} style={{ marginTop: Spacing.md }}>
            正在加载数据...
          </ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <GuardianBackground />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 页面标题 */}
        <PageHeader
          title="AI 健康分析"
          titleColor={colors.textPrimary}
          buttonBgColor="rgba(255,255,255,0.9)"
          iconColor={colors.textMuted}
          rightContent={
            <TouchableOpacity onPress={handleReanalyze} disabled={analyzing} style={styles.generateHeaderButton}>
              <FontAwesome6 name="rotate" size={20} color={analyzing ? colors.textMuted : colors.primary} />
            </TouchableOpacity>
          }
        />

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* 设备连接状态 */}
          <View style={styles.deviceStatusCard}>
            <View style={styles.deviceIconRow}>
              <View style={[styles.deviceIconBg, bandDevice ? styles.deviceConnected : styles.deviceDisconnected]}>
                <FontAwesome6 name="clock" size={20} color={bandDevice ? colors.successText : colors.warningText} />
              </View>
              <View style={styles.deviceInfo}>
                <ThemedText variant="bodyMedium" color={colors.textPrimary}>
                  {bandDevice ? bandDevice.device_name || '健康手环' : '演示模式'}
                </ThemedText>
                <ThemedText variant="small" color={bandDevice ? colors.successText : colors.warningText}>
                  {bandDevice ? '已连接 · 数据同步中' : '使用虚拟数据展示 · 连接手环后自动切换'}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* 用户信息卡片 */}
          <ThemedView level="default" style={styles.userCard}>
            <View style={styles.userHeader}>
              <View style={styles.userAvatar}>
                <FontAwesome6 name="user" size={24} color={colors.primary} />
              </View>
              <View style={styles.userInfo}>
                <ThemedText variant="bodyMedium" color={colors.textPrimary}>
                  {userTags?.name || '加载中...'}
                </ThemedText>
                <ThemedText variant="small" color={colors.textSecondary}>
                  {userTags?.homeAddress || '地址未设置'}
                </ThemedText>
              </View>
            </View>

            {/* 健康状况标签 */}
            {userTags?.healthConditions && userTags.healthConditions.length > 0 && (
              <View style={styles.tagsSection}>
                <ThemedText variant="small" color={colors.textMuted}>健康状况</ThemedText>
                <View style={styles.tagsRow}>
                  {userTags.healthConditions.map((condition, index) => (
                    <View key={index} style={styles.tag}>
                      <FontAwesome6 name="notes-medical" size={10} color={colors.dangerText} />
                      <ThemedText variant="small" color={colors.dangerText}>{condition}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ThemedView>

          {/* 健康数据卡片 - 紧凑样式 */}
          <ThemedView level="default" style={styles.dataCard}>
            <View style={styles.cardHeader}>
              <FontAwesome6 name="heart-pulse" size={18} color={colors.dangerText} />
              <ThemedText variant="bodyMedium" color={colors.textPrimary}>实时数据</ThemedText>
              {healthData?.timestamp && (
                <ThemedText variant="small" color={colors.textMuted}>
                  {new Date(healthData.timestamp).toLocaleTimeString('zh-CN')}
                </ThemedText>
              )}
            </View>

            <View style={styles.dataRow}>
              {/* 心率 */}
              <View style={styles.dataItemCompact}>
                <View style={styles.dataValueRow}>
                  <ThemedText variant="h3" color={colors.textPrimary}>
                    {healthData?.heartRate ?? '--'}
                  </ThemedText>
                  <ThemedText variant="small" color={colors.textMuted}>bpm</ThemedText>
                </View>
                <ThemedText variant="small" color={colors.textSecondary}>心率</ThemedText>
              </View>

              <View style={styles.dataDivider} />

              {/* 步数 */}
              <View style={styles.dataItemCompact}>
                <View style={styles.dataValueRow}>
                  <ThemedText variant="h3" color={colors.textPrimary}>
                    {healthData?.steps ?? '--'}
                  </ThemedText>
                  <ThemedText variant="small" color={colors.textMuted}>步</ThemedText>
                </View>
                <ThemedText variant="small" color={colors.textSecondary}>步数</ThemedText>
              </View>

              <View style={styles.dataDivider} />

              {/* 卡路里 */}
              <View style={styles.dataItemCompact}>
                <View style={styles.dataValueRow}>
                  <ThemedText variant="h3" color={colors.textPrimary}>
                    {healthData?.calories ?? '--'}
                  </ThemedText>
                  <ThemedText variant="small" color={colors.textMuted}>kcal</ThemedText>
                </View>
                <ThemedText variant="small" color={colors.textSecondary}>卡路里</ThemedText>
              </View>
            </View>

            {!bandDevice && (
              <View style={styles.dataAlert}>
                <FontAwesome6 name="circle-info" size={14} color={colors.primary} />
                <ThemedText variant="small" color={colors.primary}>
                  当前显示虚拟数据，连接手环后自动切换真实数据
                </ThemedText>
              </View>
            )}
          </ThemedView>

          {/* AI对话模块 */}
          <ThemedView level="default" style={styles.chatCard}>
            <View style={styles.chatHeader}>
              <View style={styles.chatTitleRow}>
                <FontAwesome6 name="comment-medical" size={18} color={colors.primary} />
                <ThemedText variant="bodyMedium" color={colors.textPrimary}>AI 健康助手</ThemedText>
              </View>
              <ThemedText variant="small" color={colors.textMuted}>
                询问健康问题，获取专业建议
              </ThemedText>
            </View>

            {/* 对话消息列表 */}
            {chatMessages.length > 0 && (
              <View style={styles.chatMessages}>
                {chatMessages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.chatBubble,
                      msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                    ]}
                  >
                    {msg.role === 'assistant' && (
                      <View style={styles.aiAvatar}>
                        <FontAwesome6 name="robot" size={12} color="#fff" />
                      </View>
                    )}
                    <View style={[
                      styles.bubbleContent,
                      msg.role === 'user' ? styles.userBubbleContent : styles.assistantBubbleContent,
                    ]}>
                      <ThemedText
                        variant="body"
                        color={msg.role === 'user' ? '#fff' : colors.textPrimary}
                      >
                        {msg.content}
                      </ThemedText>
                    </View>
                  </View>
                ))}
                {chatLoading && (
                  <View style={[styles.chatBubble, styles.assistantBubble]}>
                    <View style={styles.aiAvatar}>
                      <FontAwesome6 name="robot" size={12} color="#fff" />
                    </View>
                    <View style={[styles.bubbleContent, styles.assistantBubbleContent]}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 输入区域 */}
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                placeholder="输入健康问题..."
                placeholderTextColor={colors.textMuted}
                value={chatInput}
                onChangeText={setChatInput}
                multiline
                maxLength={500}
                editable={!chatLoading}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!chatInput.trim() || chatLoading) && styles.sendButtonDisabled]}
                onPress={sendChatMessage}
                disabled={!chatInput.trim() || chatLoading}
              >
                <FontAwesome6 name="paper-plane" size={18} color={chatInput.trim() && !chatLoading ? '#fff' : colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* 快捷问题 */}
            <View style={styles.quickQuestions}>
              <TouchableOpacity
                style={styles.quickQuestionBtn}
                onPress={() => {
                  setChatInput('今天的心率数据怎么样？');
                }}
              >
                <ThemedText variant="small" color={colors.primary}>心率情况</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickQuestionBtn}
                onPress={() => {
                  setChatInput('有什么健康建议吗？');
                }}
              >
                <ThemedText variant="small" color={colors.primary}>健康建议</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickQuestionBtn}
                onPress={() => {
                  setChatInput('今天运动量够吗？');
                }}
              >
                <ThemedText variant="small" color={colors.primary}>运动建议</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>

          {/* 每日报告模块 */}
          <ThemedView level="default" style={styles.dailyReportCard}>
            <View style={styles.dailyReportHeader}>
              <View style={styles.dailyReportTitleRow}>
                <FontAwesome6 name="file-medical" size={18} color={colors.successText} />
                <ThemedText variant="bodyMedium" color={colors.textPrimary}>每日健康报告</ThemedText>
              </View>
              {dailyReportTime && (
                <ThemedText variant="small" color={colors.textMuted}>
                  {new Date(dailyReportTime).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </ThemedText>
              )}
            </View>

            {dailyReportLoading ? (
              <View style={styles.dailyReportLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <ThemedText variant="body" color={colors.textSecondary} style={{ marginTop: Spacing.md }}>
                  正在生成今日报告...
                </ThemedText>
              </View>
            ) : dailyReport ? (
              <View style={styles.dailyReportContent}>
                <ThemedText variant="body" color={colors.textPrimary} style={styles.dailyReportText}>
                  {dailyReport}
                </ThemedText>
                <TouchableOpacity
                  style={styles.regenerateReportBtn}
                  onPress={generateDailyReport}
                >
                  <FontAwesome6 name="rotate" size={14} color={colors.primary} />
                  <ThemedText variant="small" color={colors.primary}>重新生成</ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.dailyReportEmpty}>
                <FontAwesome6 name="file-circle-plus" size={40} color={colors.textMuted} />
                <ThemedText variant="body" color={colors.textSecondary} style={{ marginTop: Spacing.md }}>
                  暂无今日报告
                </ThemedText>
                <TouchableOpacity style={styles.generateReportBtn} onPress={generateDailyReport}>
                  <ThemedText variant="bodyMedium" color="#fff">生成报告</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </ThemedView>

          {/* 自动分析中提示 */}
          {analyzing && !analysisResult && (
            <View style={styles.analyzingCard}>
              <ActivityIndicator size="large" color={colors.primary} />
              <ThemedText variant="body" color={colors.textPrimary} style={{ marginTop: Spacing.md }}>
                正在生成AI健康分析报告...
              </ThemedText>
              <ThemedText variant="small" color={colors.textMuted} style={{ marginTop: Spacing.xs }}>
                {bandDevice ? '基于今日健康数据分析' : '基于虚拟数据演示分析'}
              </ThemedText>
            </View>
          )}

          {/* 重新分析按钮（已有报告时显示） */}
          {analysisResult && (
            <TouchableOpacity
              style={[styles.reanalyzeButton, analyzing && styles.analyzingButton]}
              onPress={handleReanalyze}
              disabled={analyzing}
            >
              {analyzing ? (
                <>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <ThemedText variant="body" color={colors.primary}>分析中...</ThemedText>
                </>
              ) : (
                <>
                  <FontAwesome6 name="rotate" size={18} color={colors.primary} />
                  <ThemedText variant="body" color={colors.primary}>重新分析</ThemedText>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* AI分析结果 */}
          {analysisResult && (
            <ThemedView level="default" style={styles.resultCard}>
              {/* 风险等级 */}
              <View style={styles.riskSection}>
                <ThemedText variant="body" color={colors.textMuted}>风险等级</ThemedText>
                <View style={[styles.riskBadge, { backgroundColor: getRiskStyle(analysisResult.riskLevel).bgColor }]}>
                  <FontAwesome6
                    name={getRiskStyle(analysisResult.riskLevel).icon as any}
                    size={18}
                    color={getRiskStyle(analysisResult.riskLevel).textColor}
                  />
                  <ThemedText
                    variant="bodyMedium"
                    color={getRiskStyle(analysisResult.riskLevel).textColor}
                  >
                    {getRiskStyle(analysisResult.riskLevel).label}
                  </ThemedText>
                </View>
              </View>

              {/* 总体概述 */}
              <View style={styles.summarySection}>
                <ThemedText variant="body" color={colors.textMuted}>总体概述</ThemedText>
                <ThemedText variant="body" color={colors.textPrimary} style={styles.summaryText}>
                  {analysisResult.summary}
                </ThemedText>
              </View>

              {/* 各项指标 */}
              {analysisResult.indicators && analysisResult.indicators.length > 0 && (
                <View style={styles.indicatorsSection}>
                  <ThemedText variant="body" color={colors.textMuted}>各项指标</ThemedText>
                  {analysisResult.indicators.map((indicator, index) => (
                    <View
                      key={index}
                      style={[styles.indicatorItem, { backgroundColor: getIndicatorStyle(indicator.status).bgColor }]}
                    >
                      <View style={styles.indicatorHeader}>
                        <ThemedText variant="bodyMedium" color={colors.textPrimary}>
                          {indicator.name}
                        </ThemedText>
                        <ThemedText variant="body" color={getIndicatorStyle(indicator.status).textColor}>
                          {indicator.value}
                        </ThemedText>
                      </View>
                      <View style={styles.indicatorDetails}>
                        <ThemedText variant="small" color={colors.textSecondary}>
                          趋势: {indicator.trend}
                        </ThemedText>
                        <ThemedText variant="small" color={colors.textSecondary}>
                          {indicator.comment}
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* 预警提示 */}
              {analysisResult.alerts && analysisResult.alerts.length > 0 && (
                <View style={styles.alertsSection}>
                  <ThemedText variant="body" color={colors.dangerText}>
                    <FontAwesome6 name="triangle-exclamation" size={14} /> 预警提示
                  </ThemedText>
                  {analysisResult.alerts.map((alert, index) => (
                    <View key={index} style={styles.alertItem}>
                      <FontAwesome6 name="circle-exclamation" size={12} color={colors.dangerText} />
                      <ThemedText variant="small" color={colors.dangerText}>{alert}</ThemedText>
                    </View>
                  ))}
                </View>
              )}

              {/* 健康建议 */}
              {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                <View style={styles.suggestionsSection}>
                  <ThemedText variant="body" color={colors.textMuted}>
                    <FontAwesome6 name="lightbulb" size={14} /> 健康建议
                  </ThemedText>
                  {analysisResult.suggestions.map((suggestion, index) => (
                    <View key={index} style={styles.suggestionItem}>
                      <FontAwesome6 name="circle-check" size={14} color={colors.successText} />
                      <ThemedText variant="small" color={colors.textPrimary}>{suggestion}</ThemedText>
                    </View>
                  ))}
                </View>
              )}

              {/* 后续跟进 */}
              {analysisResult.followUp && (
                <View style={styles.followUpSection}>
                  <ThemedText variant="body" color={colors.textMuted}>后续跟进</ThemedText>
                  <ThemedText variant="small" color={colors.textSecondary}>
                    {analysisResult.followUp}
                  </ThemedText>
                </View>
              )}
            </ThemedView>
          )}

          {/* 异常趋势预警板块 */}
          {healthWarnings.length > 0 && (
            <ThemedView level="default" style={styles.warningCard}>
              <View style={styles.warningHeader}>
                <View style={styles.warningTitleRow}>
                  <FontAwesome6 name="triangle-exclamation" size={18} color={colors.warningText} />
                  <ThemedText variant="bodyMedium" color={colors.textPrimary}>异常趋势预警</ThemedText>
                </View>
                <View style={styles.warningCount}>
                  <ThemedText variant="small" color={colors.warningText}>
                    {healthWarnings.length} 项预警
                  </ThemedText>
                </View>
              </View>

              {healthWarnings.map((warning, index) => (
                <View
                  key={index}
                  style={[
                    styles.warningItem,
                    warning.severity === 'high' && styles.warningItemHigh,
                    warning.severity === 'medium' && styles.warningItemMedium,
                    warning.severity === 'low' && styles.warningItemLow,
                  ]}
                >
                  <View style={styles.warningItemHeader}>
                    <View style={styles.warningIconRow}>
                      <FontAwesome6
                        name={warning.severity === 'high' ? 'circle-exclamation' : 'triangle-exclamation'}
                        size={16}
                        color={warning.severity === 'high' ? colors.dangerText : colors.warningText}
                      />
                      <ThemedText variant="body" color={colors.textPrimary}>
                        {warning.name}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.severityBadge,
                        warning.severity === 'high' && styles.severityHigh,
                        warning.severity === 'medium' && styles.severityMedium,
                        warning.severity === 'low' && styles.severityLow,
                      ]}
                    >
                      <ThemedText variant="small" color="#fff">
                        {warning.severity === 'high' ? '高风险' : warning.severity === 'medium' ? '中等' : '低风险'}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText variant="small" color={colors.textSecondary} style={styles.warningDetail}>
                    {warning.detail}
                  </ThemedText>
                  <View style={styles.warningSuggestion}>
                    <FontAwesome6 name="lightbulb" size={12} color={colors.successText} />
                    <ThemedText variant="small" color={colors.successText}>
                      {warning.suggestion}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </ThemedView>
          )}

          {/* 健康建议库板块 */}
          {healthAdvice.length > 0 && (
            <ThemedView level="default" style={styles.adviceCard}>
              <View style={styles.adviceHeader}>
                <View style={styles.adviceTitleRow}>
                  <FontAwesome6 name="clipboard-list" size={18} color={colors.primary} />
                  <ThemedText variant="bodyMedium" color={colors.textPrimary}>个性化健康建议</ThemedText>
                </View>
              </View>

              {healthAdvice.map((item, index) => (
                <View key={index} style={styles.adviceItem}>
                  <View style={styles.adviceItemHeader}>
                    <View style={[styles.adviceCategoryBadge, item.priority === 'high' && styles.adviceCategoryHigh]}>
                      <ThemedText variant="small" color="#fff">
                        {item.category}
                      </ThemedText>
                    </View>
                    <ThemedText variant="small" color={colors.textMuted}>
                      {item.source}
                    </ThemedText>
                  </View>
                  <ThemedText variant="body" color={colors.textPrimary} style={styles.adviceCondition}>
                    {item.condition}
                  </ThemedText>
                  <ThemedText variant="small" color={colors.textSecondary} style={styles.adviceContent}>
                    {item.advice}
                  </ThemedText>
                </View>
              ))}
            </ThemedView>
          )}

          {/* 历史分析记录 */}
          {analysisHistory.length > 0 && (
            <View style={styles.historySection}>
              <ThemedText variant="bodyMedium" color={colors.textMuted}>历史分析记录</ThemedText>
              {analysisHistory.slice(0, 3).map((item, index) => {
                const result = typeof item.result === 'string' ? JSON.parse(item.result) : item.result;
                return (
                  <TouchableOpacity
                    key={item.id || index}
                    style={styles.historyItem}
                    onPress={() => setAnalysisResult(result)}
                  >
                    <View style={styles.historyLeft}>
                      <FontAwesome6
                        name={getRiskStyle(result?.riskLevel || 'low').icon as any}
                        size={16}
                        color={getRiskStyle(result?.riskLevel || 'low').textColor}
                      />
                      <View>
                        <ThemedText variant="small" color={colors.textPrimary}>
                          {result?.summary?.substring(0, 30) || '健康分析'}...
                        </ThemedText>
                        <ThemedText variant="small" color={colors.textMuted}>
                          {new Date(item.created_at).toLocaleDateString('zh-CN')}
                        </ThemedText>
                      </View>
                    </View>
                    <FontAwesome6 name="chevron-right" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 底部提示 */}
          <View style={styles.footer}>
            <ThemedText variant="small" color={colors.textMuted}>
              AI分析结果仅供参考，如有异常请及时就医
            </ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = () =>
  StyleSheet.create({
    container: { flex: 1 },
    generateHeaderButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: { flex: 1 },
    scrollContent: {
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing['5xl'],
    },
    
    // 加载中
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
    },

    // 空状态
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
    },
    bindButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 0,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      marginTop: Spacing.lg,
    },

    // 设备状态卡片
    deviceStatusCard: {
      backgroundColor: '#fff',
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    deviceIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    deviceIconBg: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    deviceConnected: {
      backgroundColor: 'rgba(90, 138, 122, 0.1)',
    },
    deviceDisconnected: {
      backgroundColor: colors.backgroundTertiary,
    },
    deviceInfo: {
      marginLeft: Spacing.md,
      flex: 1,
    },

    // 用户卡片
    userCard: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    userHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    userAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    userInfo: {
      marginLeft: Spacing.md,
      flex: 1,
    },
    tagsSection: {
      marginTop: Spacing.sm,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginTop: Spacing.xs,
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 0,
      paddingVertical: 4,
      borderRadius: BorderRadius.sm,
      backgroundColor: '#fef0f0',
      gap: 4,
    },

    // 数据卡片 - 紧凑样式
    dataCard: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.md,
      gap: Spacing.sm,
    },
    dataRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dataItemCompact: {
      flex: 1,
      alignItems: 'center',
    },
    dataValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    dataDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.border,
    },
    dataAlert: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.md,
      padding: Spacing.sm,
      backgroundColor: '#fdf7e8',
      borderRadius: BorderRadius.sm,
      gap: Spacing.xs,
    },

    // AI对话卡片
    chatCard: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    chatHeader: {
      marginBottom: Spacing.md,
    },
    chatTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    chatMessages: {
      maxHeight: 300,
      marginBottom: Spacing.md,
    },
    chatBubble: {
      flexDirection: 'row',
      marginBottom: Spacing.sm,
      alignItems: 'flex-start',
    },
    userBubble: {
      justifyContent: 'flex-end',
    },
    assistantBubble: {
      justifyContent: 'flex-start',
    },
    aiAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.sm,
    },
    bubbleContent: {
      maxWidth: '80%',
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
    },
    userBubbleContent: {
      backgroundColor: colors.primary,
    },
    assistantBubbleContent: {
      backgroundColor: colors.backgroundTertiary,
    },
    chatInputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Spacing.sm,
    },
    chatInput: {
      flex: 1,
      backgroundColor: colors.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: 0,
      paddingVertical: Spacing.sm,
      fontSize: 16,
      color: colors.textPrimary,
      maxHeight: 100,
      minHeight: 44,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: colors.backgroundTertiary,
    },
    quickQuestions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    quickQuestionBtn: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 0,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.primary,
    },

    // 每日报告卡片
    dailyReportCard: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    dailyReportHeader: {
      marginBottom: Spacing.md,
    },
    dailyReportTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    dailyReportLoading: {
      alignItems: 'center',
      paddingVertical: Spacing.xl,
    },
    dailyReportContent: {
      backgroundColor: colors.backgroundTertiary,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
    },
    dailyReportText: {
      lineHeight: 24,
    },
    regenerateReportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: Spacing.md,
      gap: Spacing.xs,
      paddingVertical: Spacing.sm,
    },
    dailyReportEmpty: {
      alignItems: 'center',
      paddingVertical: Spacing.xl,
    },
    generateReportBtn: {
      backgroundColor: colors.successText,
      paddingHorizontal: 0,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      marginTop: Spacing.md,
    },

    // 分析中卡片
    analyzingCard: {
      backgroundColor: '#fff',
      borderRadius: BorderRadius.lg,
      padding: Spacing.xl,
      marginBottom: Spacing.lg,
      alignItems: 'center',
    },

    // 重新分析按钮
    reanalyzeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryLight,
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.lg,
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    analyzingButton: {
      backgroundColor: colors.backgroundTertiary,
      borderColor: colors.border,
    },

    // 结果卡片
    resultCard: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    riskSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
      paddingBottom: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    riskBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 0,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      gap: Spacing.xs,
    },
    summarySection: {
      marginBottom: Spacing.md,
    },
    summaryText: {
      marginTop: Spacing.xs,
      lineHeight: 24,
    },
    indicatorsSection: {
      marginBottom: Spacing.md,
    },
    indicatorItem: {
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      marginTop: Spacing.sm,
    },
    indicatorHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    indicatorDetails: {
      marginTop: Spacing.xs,
      gap: 2,
    },
    alertsSection: {
      marginBottom: Spacing.md,
      padding: Spacing.md,
      backgroundColor: '#fef0f0',
      borderRadius: BorderRadius.md,
    },
    alertItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: Spacing.xs,
      gap: Spacing.xs,
    },
    suggestionsSection: {
      marginBottom: Spacing.md,
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: Spacing.sm,
      gap: Spacing.sm,
    },
    followUpSection: {
      padding: Spacing.md,
      backgroundColor: colors.backgroundTertiary,
      borderRadius: BorderRadius.md,
    },

    // 异常趋势预警卡片
    warningCard: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    warningHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    warningTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    warningCount: {
      backgroundColor: '#fdf7e8',
      paddingHorizontal: 0,
      paddingVertical: 4,
      borderRadius: BorderRadius.sm,
    },
    warningItem: {
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.sm,
    },
    warningItemHigh: {
      backgroundColor: '#fef0f0',
      borderLeftWidth: 3,
      borderLeftColor: colors.dangerText,
    },
    warningItemMedium: {
      backgroundColor: '#fdf7e8',
      borderLeftWidth: 3,
      borderLeftColor: colors.warningText,
    },
    warningItemLow: {
      backgroundColor: '#f0f5fa',
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    warningItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.xs,
    },
    warningIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    severityBadge: {
      paddingHorizontal: 0,
      paddingVertical: 2,
      borderRadius: BorderRadius.sm,
    },
    severityHigh: {
      backgroundColor: colors.dangerText,
    },
    severityMedium: {
      backgroundColor: colors.warningText,
    },
    severityLow: {
      backgroundColor: colors.primary,
    },
    warningDetail: {
      marginBottom: Spacing.sm,
    },
    warningSuggestion: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.xs,
      paddingTop: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    // 健康建议卡片
    adviceCard: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    adviceHeader: {
      marginBottom: Spacing.md,
    },
    adviceTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    adviceItem: {
      padding: Spacing.md,
      backgroundColor: colors.backgroundTertiary,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.sm,
    },
    adviceItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.xs,
    },
    adviceCategoryBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 0,
      paddingVertical: 2,
      borderRadius: BorderRadius.sm,
    },
    adviceCategoryHigh: {
      backgroundColor: colors.warningText,
    },
    adviceCondition: {
      fontWeight: '600',
      marginBottom: Spacing.xs,
    },
    adviceContent: {
      lineHeight: 20,
    },

    // 历史记录
    historySection: {
      marginBottom: Spacing.lg,
    },
    historyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.md,
      backgroundColor: '#fff',
      borderRadius: BorderRadius.md,
      marginTop: Spacing.sm,
    },
    historyLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },

    // 底部
    footer: {
      alignItems: 'center',
      paddingVertical: Spacing.lg,
    },
  });
