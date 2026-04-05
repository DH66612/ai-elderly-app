/**
 * 萤石摄像头管理页面
 * 集成萤石开放平台API
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';
import { getApiBaseUrl } from '@/constants/api';

// 清雅色调
const colors = {
  backgroundRoot: '#f0f5fa',
  backgroundCard: '#ffffff',
  backgroundTertiary: '#eaf0f5',
  primary: '#8ab3cf',
  primaryLight: '#e3f0f7',
  success: '#a8c8b8',
  successText: '#5a8a7a',
  warning: '#d4c4a8',
  warningText: '#8a7a5a',
  danger: '#e2c6c6',
  dangerText: '#b87a7a',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#8fa5bb',
  border: '#d6e4f0',
};

interface EzvizDevice {
  deviceSerial: string;
  deviceName: string;
  deviceType: string;
  status: number; // 0-离线, 1-在线
  channelCount: number;
  isEncrypt: number;
}

interface EzvizConfig {
  configured: boolean;
  message?: string;
  setupGuide?: string[];
}

export default function EzvizCameraScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [config, setConfig] = useState<EzvizConfig | null>(null);
  const [devices, setDevices] = useState<EzvizDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingDevice, setAddingDevice] = useState(false);
  
  // 添加设备表单
  const [newDeviceSerial, setNewDeviceSerial] = useState('');
  const [newValidateCode, setNewValidateCode] = useState('');

  // 获取配置状态
  const fetchConfig = useCallback(async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/v1/ezviz/status`);
      const data = await response.json();
      setConfig(data.data);
      return data.data?.configured;
    } catch (error) {
      console.error('[Ezviz] 获取配置失败:', error);
      return false;
    }
  }, []);

  // 获取设备列表
  const fetchDevices = useCallback(async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/v1/ezviz/devices`);
      const data = await response.json();
      if (data.success) {
        setDevices(data.data || []);
      }
    } catch (error) {
      console.error('[Ezviz] 获取设备列表失败:', error);
    }
  }, []);

  // 初始化
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const configured = await fetchConfig();
      if (configured) {
        await fetchDevices();
      }
      setLoading(false);
    };
    init();
  }, [fetchConfig, fetchDevices]);

  // 添加设备
  const handleAddDevice = async () => {
    if (!newDeviceSerial.trim() || !newValidateCode.trim()) {
      Alert.alert('提示', '请填写设备序列号和验证码');
      return;
    }

    setAddingDevice(true);
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/v1/ezviz/device/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceSerial: newDeviceSerial.trim(),
          validateCode: newValidateCode.trim(),
        }),
      });
      const data = await response.json();

      if (data.success) {
        Alert.alert('成功', '设备添加成功');
        setShowAddModal(false);
        setNewDeviceSerial('');
        setNewValidateCode('');
        await fetchDevices();
      } else {
        Alert.alert('添加失败', data.error || '请检查序列号和验证码');
      }
    } catch (error) {
      Alert.alert('错误', '网络请求失败');
    } finally {
      setAddingDevice(false);
    }
  };

  // 删除设备
  const handleDeleteDevice = (device: EzvizDevice) => {
    Alert.alert(
      '确认删除',
      `确定要删除设备 "${device.deviceName}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const baseUrl = getApiBaseUrl();
              const response = await fetch(
                `${baseUrl}/api/v1/ezviz/device/${device.deviceSerial}`,
                { method: 'DELETE' }
              );
              const data = await response.json();
              if (data.success) {
                Alert.alert('成功', '设备已删除');
                await fetchDevices();
              }
            } catch (error) {
              Alert.alert('错误', '删除失败');
            }
          },
        },
      ]
    );
  };

  // 获取直播地址
  const handleGetLiveAddress = async (device: EzvizDevice) => {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/v1/ezviz/live/address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceSerial: device.deviceSerial,
          channelNo: 1,
          quality: 1, // 高清
        }),
      });
      const data = await response.json();

      if (data.success && data.data?.url) {
        // TODO: 跳转到视频预览页面
        Alert.alert('直播地址', `已获取直播地址，可在视频预览页面观看\n\n地址: ${data.data.url.substring(0, 50)}...`);
      } else {
        Alert.alert('获取失败', data.error || '无法获取直播地址');
      }
    } catch (error) {
      Alert.alert('错误', '获取直播地址失败');
    }
  };

  // 渲染配置指南
  const renderSetupGuide = () => (
    <View style={styles.guideContainer}>
      <View style={styles.guideHeader}>
        <FontAwesome6 name="gear" size={24} color={colors.primary} />
        <ThemedText variant="h4" color={colors.textPrimary} style={{ marginLeft: Spacing.sm }}>
          萤石开放平台配置
        </ThemedText>
      </View>

      <View style={styles.guideCard}>
        <ThemedText variant="body" color={colors.textSecondary}>
          {config?.message}
        </ThemedText>

        {config?.setupGuide && (
          <View style={styles.guideSteps}>
            {config.setupGuide.map((step, index) => (
              <View key={index} style={styles.guideStep}>
                <View style={styles.stepNumber}>
                  <ThemedText variant="small" color="#fff">{index + 1}</ThemedText>
                </View>
                <ThemedText variant="body" color={colors.textSecondary} style={{ flex: 1 }}>
                  {step.replace(/^\d+\.\s*/, '')}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        <View style={styles.guideTip}>
          <FontAwesome6 name="lightbulb" size={16} color={colors.warningText} />
          <ThemedText variant="small" color={colors.warningText} style={{ marginLeft: Spacing.xs, flex: 1 }}>
            提示：萤石摄像头支持标准RTSP和开放API，是智能监控的理想选择
          </ThemedText>
        </View>
      </View>

      {/* 环境变量设置说明 */}
      <View style={styles.envCard}>
        <ThemedText variant="bodyMedium" color={colors.textPrimary}>
          环境变量设置
        </ThemedText>
        <View style={styles.envCode}>
          <Text style={styles.envText}>
            EZVIZ_APP_KEY=你的AppKey{'\n'}
            EZVIZ_APP_SECRET=你的AppSecret
          </Text>
        </View>
      </View>
    </View>
  );

  // 渲染设备列表
  const renderDeviceList = () => (
    <View style={styles.deviceList}>
      <View style={styles.listHeader}>
        <ThemedText variant="h4" color={colors.textPrimary}>
          我的设备
        </ThemedText>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <FontAwesome6 name="plus" size={14} color="#fff" />
          <ThemedText variant="smallMedium" color="#fff" style={{ marginLeft: 4 }}>
            添加
          </ThemedText>
        </TouchableOpacity>
      </View>

      {devices.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome6 name="video" size={48} color={colors.textMuted} />
          <ThemedText variant="body" color={colors.textSecondary} style={{ marginTop: Spacing.md }}>
            暂无设备
          </ThemedText>
          <ThemedText variant="small" color={colors.textMuted} style={{ marginTop: Spacing.xs }}>
            点击右上角&ldquo;添加&rdquo;按钮添加摄像头
          </ThemedText>
        </View>
      ) : (
        devices.map((device) => (
          <View key={device.deviceSerial} style={styles.deviceCard}>
            <View style={styles.deviceHeader}>
              <View style={styles.deviceIcon}>
                <FontAwesome6 
                  name="video" 
                  size={20} 
                  color={device.status === 1 ? colors.success : colors.textMuted} 
                />
              </View>
              <View style={styles.deviceInfo}>
                <ThemedText variant="bodyMedium" color={colors.textPrimary}>
                  {device.deviceName}
                </ThemedText>
                <ThemedText variant="small" color={colors.textMuted}>
                  序列号: {device.deviceSerial}
                </ThemedText>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: device.status === 1 ? colors.success : colors.textMuted }
              ]}>
                <ThemedText variant="small" color="#fff">
                  {device.status === 1 ? '在线' : '离线'}
                </ThemedText>
              </View>
            </View>

            <View style={styles.deviceActions}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.primaryLight }]}
                onPress={() => handleGetLiveAddress(device)}
                disabled={device.status !== 1}
              >
                <FontAwesome6 name="play" size={14} color={colors.primary} />
                <ThemedText variant="smallMedium" color={colors.primary} style={{ marginLeft: 4 }}>
                  查看直播
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.danger }]}
                onPress={() => handleDeleteDevice(device)}
              >
                <FontAwesome6 name="trash" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  // 添加设备弹窗
  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText variant="h4" color={colors.textPrimary}>添加设备</ThemedText>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <FontAwesome6 name="xmark" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <ThemedText variant="small" color={colors.textSecondary}>设备序列号</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="在摄像头标签或App中查看"
                placeholderTextColor={colors.textMuted}
                value={newDeviceSerial}
                onChangeText={setNewDeviceSerial}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText variant="small" color={colors.textSecondary}>验证码</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="摄像头标签上的验证码"
                placeholderTextColor={colors.textMuted}
                value={newValidateCode}
                onChangeText={setNewValidateCode}
                secureTextEntry
              />
            </View>

            <View style={styles.tipBox}>
              <FontAwesome6 name="circle-info" size={14} color={colors.primary} />
              <ThemedText variant="small" color={colors.textSecondary} style={{ marginLeft: 6, flex: 1 }}>
                设备序列号和验证码可在摄像头底部的标签上找到，或在萤石App中查看
              </ThemedText>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowAddModal(false)}
            >
              <ThemedText variant="bodyMedium" color={colors.textSecondary}>取消</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleAddDevice}
              disabled={addingDevice}
            >
              {addingDevice ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText variant="bodyMedium" color="#fff">确认添加</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <Screen backgroundColor="transparent" statusBarStyle="dark">
        <GuardianBackground />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText variant="body" color={colors.textSecondary}>加载中...</ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <GuardianBackground />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* 标题 */}
        <View style={styles.header}>
          <ThemedText variant="h3" color={colors.textPrimary}>
            萤石摄像头
          </ThemedText>
          <ThemedText variant="body" color={colors.textSecondary}>
            萤石开放平台摄像头管理
          </ThemedText>
        </View>

        {/* 根据配置状态显示不同内容 */}
        {config?.configured ? renderDeviceList() : renderSetupGuide()}

        {renderAddModal()}
      </ScrollView>
    </Screen>
  );
}

const createStyles = (_theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 0,
      paddingTop: Spacing['2xl'],
      paddingBottom: Spacing['5xl'],
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      marginBottom: Spacing.xl,
    },
    // 配置指南
    guideContainer: {
      gap: Spacing.lg,
    },
    guideHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    guideCard: {
      backgroundColor: colors.backgroundCard,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    guideSteps: {
      marginTop: Spacing.lg,
      gap: Spacing.md,
    },
    guideStep: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.sm,
    },
    guideTip: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: Spacing.lg,
      padding: Spacing.md,
      backgroundColor: colors.warning + '20',
      borderRadius: BorderRadius.md,
    },
    envCard: {
      backgroundColor: colors.backgroundCard,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    envCode: {
      marginTop: Spacing.md,
      padding: Spacing.md,
      backgroundColor: '#1e1e1e',
      borderRadius: BorderRadius.md,
    },
    envText: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 12,
      color: '#a5d6ff',
      lineHeight: 20,
    },
    // 设备列表
    deviceList: {
      gap: Spacing.md,
    },
    listHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 0,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
    },
    emptyState: {
      backgroundColor: colors.backgroundCard,
      borderRadius: BorderRadius.lg,
      padding: Spacing['2xl'],
      alignItems: 'center',
    },
    deviceCard: {
      backgroundColor: colors.backgroundCard,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    deviceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    deviceIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    deviceInfo: {
      flex: 1,
      marginLeft: Spacing.md,
    },
    statusBadge: {
      paddingHorizontal: 0,
      paddingVertical: 2,
      borderRadius: BorderRadius.sm,
    },
    deviceActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: Spacing.md,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: Spacing.sm,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 0,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
    },
    // 弹窗
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '90%',
      maxWidth: 400,
      backgroundColor: colors.backgroundCard,
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalBody: {
      padding: Spacing.lg,
      gap: Spacing.lg,
    },
    inputGroup: {
      gap: Spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      paddingHorizontal: 0,
      paddingVertical: Spacing.sm + 2,
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.backgroundTertiary,
    },
    tipBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: Spacing.md,
      backgroundColor: colors.primaryLight,
      borderRadius: BorderRadius.md,
    },
    modalFooter: {
      flexDirection: 'row',
      padding: Spacing.lg,
      gap: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    submitButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      borderRadius: BorderRadius.md,
      backgroundColor: colors.primary,
    },
  });

export { EzvizCameraScreen };
