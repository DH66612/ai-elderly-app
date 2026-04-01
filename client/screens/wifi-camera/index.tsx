/**
 * WiFi摄像头管理页面
 * 支持主流品牌摄像头的添加、连接测试、预览和跌倒检测
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 支持的摄像头品牌
const CAMERA_BRANDS = [
  { id: 'hikvision', name: '海康威视', icon: 'video', rtspPort: 554 },
  { id: 'dahua', name: '大华', icon: 'video', rtspPort: 554 },
  { id: 'xiaomi', name: '小米', icon: 'mobile', rtspPort: 8554 },
  { id: 'tplink', name: 'TP-Link', icon: 'network-wired', rtspPort: 554 },
  { id: 'other', name: '其他品牌', icon: 'question', rtspPort: 554 },
];

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

interface CameraDevice {
  id: string;
  brand: string;
  brandName: string;
  name: string;
  ipAddress: string;
  port: number;
  username: string;
  password: string;
  isOnline?: boolean;
  lastChecked?: string;
  fallDetectionEnabled?: boolean;
  detectionStatus?: 'monitoring' | 'alerting' | 'inactive';
}

export default function WifiCameraScreen() {
  const { theme, isDark } = useTheme();
  const router = useSafeRouter();
  const { user } = useAuth();

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [testCameraId, setTestCameraId] = useState<string | null>(null);
  const [previewCamera, setPreviewCamera] = useState<CameraDevice | null>(null);
  const [simulatingCameraId, setSimulatingCameraId] = useState<string | null>(null);

  // 新摄像头表单
  const [newCamera, setNewCamera] = useState({
    brand: 'hikvision',
    name: '',
    ipAddress: '',
    port: 554,
    username: 'admin',
    password: '',
  });

  // 加载已保存的摄像头
  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      const saved = await AsyncStorage.getItem(`cameras_${user?.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // 为旧数据添加默认值
        const camerasWithDefaults: CameraDevice[] = parsed.map((c: CameraDevice) => ({
          ...c,
          fallDetectionEnabled: c.fallDetectionEnabled ?? false,
          detectionStatus: (c.detectionStatus ?? 'inactive') as 'monitoring' | 'alerting' | 'inactive',
        }));
        setCameras(camerasWithDefaults);
      }
    } catch (error) {
      console.error('加载摄像头失败:', error);
    }
  };

  const saveCameras = async (newCameras: CameraDevice[]) => {
    try {
      await AsyncStorage.setItem(`cameras_${user?.id}`, JSON.stringify(newCameras));
      setCameras(newCameras);
    } catch (error) {
      console.error('保存摄像头失败:', error);
    }
  };

  // 添加摄像头
  const handleAddCamera = async () => {
    if (!newCamera.name.trim()) {
      Alert.alert('提示', '请输入摄像头名称');
      return;
    }
    if (!newCamera.ipAddress.trim()) {
      Alert.alert('提示', '请输入IP地址');
      return;
    }
    if (!newCamera.password.trim()) {
      Alert.alert('提示', '请输入密码');
      return;
    }

    const brand = CAMERA_BRANDS.find((b) => b.id === newCamera.brand) || CAMERA_BRANDS[0];

    const camera: CameraDevice = {
      id: `cam_${Date.now()}`,
      brand: newCamera.brand,
      brandName: brand.name,
      name: newCamera.name,
      ipAddress: newCamera.ipAddress,
      port: newCamera.port || brand.rtspPort,
      username: newCamera.username,
      password: newCamera.password,
      fallDetectionEnabled: false,
      detectionStatus: 'inactive',
    };

    const newCameras = [...cameras, camera];
    await saveCameras(newCameras);

    // 重置表单
    setNewCamera({
      brand: 'hikvision',
      name: '',
      ipAddress: '',
      port: 554,
      username: 'admin',
      password: '',
    });
    setIsAdding(false);

    Alert.alert('成功', '摄像头添加成功，请点击"测试连接"检查状态');
  };

  // 测试连接
  const handleTestConnection = async (camera: CameraDevice) => {
    setTestCameraId(camera.id);

    try {
      /**
       * 服务端文件：server/src/routes/camera.ts
       * 接口：POST /api/v1/camera/test
       * Body 参数：ip_address: string, port: number, username: string, password: string, brand: string
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/camera/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip_address: camera.ipAddress,
          port: camera.port,
          username: camera.username,
          password: camera.password,
          brand: camera.brand,
        }),
      });

      const result = await response.json();

      // 更新摄像头状态
      const updatedCameras = cameras.map((c) =>
        c.id === camera.id
          ? {
              ...c,
              isOnline: result.success && result.isOnline,
              lastChecked: new Date().toISOString(),
            }
          : c
      );
      await saveCameras(updatedCameras);

      if (result.success && result.isOnline) {
        Alert.alert('连接成功', '摄像头在线，可以正常预览');
      } else {
        Alert.alert('连接失败', result.message || '无法连接到摄像头，请检查网络和参数');
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      Alert.alert('测试失败', '网络错误，请检查网络连接');
    } finally {
      setTestCameraId(null);
    }
  };

  // 切换跌倒检测
  const handleToggleFallDetection = async (camera: CameraDevice) => {
    const enabled = !camera.fallDetectionEnabled;

    const updatedCameras: CameraDevice[] = cameras.map((c) =>
      c.id === camera.id
        ? {
            ...c,
            fallDetectionEnabled: enabled,
            detectionStatus: (enabled ? 'monitoring' : 'inactive') as 'monitoring' | 'alerting' | 'inactive',
          }
        : c
    ) as CameraDevice[];
    await saveCameras(updatedCameras);

    if (enabled) {
      Alert.alert(
        '跌倒检测已开启',
        '系统将监控摄像头画面，检测到异常时会先询问老人是否无恙，30秒无响应才通知监护人。',
        [{ text: '我知道了' }]
      );
    }
  };

  // 模拟跌倒检测（用于演示）
  const handleSimulateFall = async (camera: CameraDevice) => {
    if (!camera.fallDetectionEnabled) {
      Alert.alert('提示', '请先开启跌倒检测');
      return;
    }

    setSimulatingCameraId(camera.id);

    try {
      // 模拟帧数据描述
      const frameData = '监控画面：检测到人员突然倒地，姿势异常，可能发生跌倒';

      /**
       * 服务端文件：server/src/routes/fall-detection.ts
       * 接口：POST /api/v1/fall-detection/frame
       * Body 参数：user_id: number, device_id: string, device_name: string, frame_data: string, enable_detection: boolean
       */
      // 连续发送3帧模拟检测
      for (let i = 0; i < 3; i++) {
        await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/fall-detection/frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user?.boundUserId || user?.id,
            device_id: camera.id,
            device_name: camera.name,
            frame_data: `${frameData} (帧${i + 1}/3)`,
            enable_detection: true,
          }),
        });

        // 等待1秒
        if (i < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      Alert.alert('模拟成功', '已发送模拟跌倒检测数据，请查看老人端是否收到确认请求');
    } catch (error) {
      console.error('模拟失败:', error);
      Alert.alert('模拟失败', '网络错误');
    } finally {
      setSimulatingCameraId(null);
    }
  };

  // 删除摄像头
  const handleDeleteCamera = async (camera: CameraDevice) => {
    Alert.alert('确认删除', `确定要删除"${camera.name}"吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const newCameras = cameras.filter((c) => c.id !== camera.id);
          await saveCameras(newCameras);
        },
      },
    ]);
  };

  // 打开预览
  const handlePreview = (camera: CameraDevice) => {
    if (!camera.isOnline) {
      Alert.alert('提示', '请先测试连接确保摄像头在线');
      return;
    }
    setPreviewCamera(camera);
  };

  // 生成RTSP URL
  const getRtspUrl = (camera: CameraDevice): string => {
    let path = '/stream1';
    switch (camera.brand) {
      case 'hikvision':
        path = '/Streaming/Channels/101';
        break;
      case 'dahua':
        path = '/cam/realmonitor?channel=1&subtype=0';
        break;
      case 'xiaomi':
        path = '/live/ch00_0';
        break;
    }
    return `rtsp://${camera.username}:${camera.password}@${camera.ipAddress}:${camera.port}${path}`;
  };

  // 生成HTTP预览URL
  const getHttpPreviewUrl = (camera: CameraDevice): string => {
    let path = '/snapshot.jpg';
    switch (camera.brand) {
      case 'hikvision':
        path = '/ISAPI/Streaming/Channels/101/picture';
        break;
      case 'dahua':
        path = '/cgi-bin/snapshot.cgi';
        break;
      case 'xiaomi':
        path = '/api/snapshot';
        break;
    }
    return `http://${camera.username}:${camera.password}@${camera.ipAddress}:${camera.port}${path}`;
  };

  const styles = useMemo(() => createStyles(), []);

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <GuardianBackground />
      <View style={styles.container}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h3" color={colors.textPrimary}>
            WiFi摄像头
          </ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* 说明卡片 */}
          <ThemedView level="default" style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <FontAwesome6 name="circle-info" size={20} color={colors.primary} />
              <ThemedText variant="bodyMedium" color={colors.textPrimary}>
                摄像头管理
              </ThemedText>
            </View>
            <ThemedText variant="small" color={colors.textSecondary}>
              支持海康威视、大华、小米、TP-Link等主流品牌。开启跌倒检测后，系统将智能监控画面，发现异常先询问老人，30秒无响应才通知监护人。
            </ThemedText>
          </ThemedView>

          {/* 萤石摄像头入口 */}
          <TouchableOpacity 
            style={styles.ezvizCard}
            onPress={() => router.push('/ezviz-camera')}
          >
            <View style={styles.ezvizIcon}>
              <FontAwesome6 name="video" size={24} color="#fff" />
            </View>
            <View style={styles.ezvizContent}>
              <ThemedText variant="bodyMedium" color={colors.textPrimary}>
                萤石摄像头（推荐）
              </ThemedText>
              <ThemedText variant="small" color={colors.textSecondary}>
                支持开放API，一键添加，无需配置IP
              </ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* 已添加的摄像头 */}
          {cameras.length > 0 && (
            <View style={styles.section}>
              <ThemedText variant="caption" color={colors.textMuted} style={styles.sectionLabel}>
                已添加的摄像头
              </ThemedText>

              {cameras.map((camera) => (
                <ThemedView key={camera.id} level="default" style={styles.cameraCard}>
                  <View style={styles.cameraHeader}>
                    <View style={[styles.cameraIcon, { backgroundColor: '#e8f4ec' }]}>
                      <FontAwesome6 name="video" size={18} color={colors.successText} />
                    </View>
                    <View style={styles.cameraInfo}>
                      <ThemedText variant="bodyMedium" color={colors.textPrimary}>
                        {camera.name}
                      </ThemedText>
                      <ThemedText variant="small" color={colors.textSecondary}>
                        {camera.brandName} · {camera.ipAddress}:{camera.port}
                      </ThemedText>
                    </View>
                    {camera.isOnline !== undefined && (
                      <View style={[styles.statusBadge, camera.isOnline ? styles.statusOnline : styles.statusOffline]}>
                        <View style={[styles.statusDot, camera.isOnline ? styles.dotOnline : styles.dotOffline]} />
                        <ThemedText variant="small" color={camera.isOnline ? colors.successText : colors.dangerText}>
                          {camera.isOnline ? '在线' : '离线'}
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  {/* 跌倒检测开关 */}
                  <View style={styles.detectionRow}>
                    <View style={styles.detectionLeft}>
                      <FontAwesome6 name="person-falling" size={16} color={colors.primary} />
                      <View>
                        <ThemedText variant="smallMedium" color={colors.textPrimary}>
                          跌倒检测
                        </ThemedText>
                        <ThemedText variant="small" color={colors.textMuted}>
                          {camera.fallDetectionEnabled ? '已开启 · 连续3帧触发告警' : '未开启'}
                        </ThemedText>
                      </View>
                    </View>
                    <Switch
                      value={camera.fallDetectionEnabled}
                      onValueChange={() => handleToggleFallDetection(camera)}
                      trackColor={{ false: '#E5E7EB', true: colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* 检测状态 */}
                  {camera.fallDetectionEnabled && camera.detectionStatus === 'monitoring' && (
                    <View style={styles.monitoringStatus}>
                      <View style={styles.monitoringDot} />
                      <ThemedText variant="small" color={colors.successText}>
                        正在监控中...
                      </ThemedText>
                    </View>
                  )}

                  <View style={styles.cameraActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleTestConnection(camera)}
                      disabled={testCameraId === camera.id}
                    >
                      {testCameraId === camera.id ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <FontAwesome6 name="plug" size={14} color={colors.primary} />
                      )}
                      <ThemedText variant="small" color={colors.primary}>
                        测试连接
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={() => handlePreview(camera)}>
                      <FontAwesome6 name="play" size={14} color={colors.successText} />
                      <ThemedText variant="small" color={colors.successText}>
                        预览
                      </ThemedText>
                    </TouchableOpacity>

                    {/* 模拟跌倒按钮（演示用） */}
                    {camera.fallDetectionEnabled && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleSimulateFall(camera)}
                        disabled={simulatingCameraId === camera.id}
                      >
                        {simulatingCameraId === camera.id ? (
                          <ActivityIndicator size="small" color={colors.warningText} />
                        ) : (
                          <FontAwesome6 name="triangle-exclamation" size={14} color={colors.warningText} />
                        )}
                        <ThemedText variant="small" color={colors.warningText}>
                          模拟跌倒
                        </ThemedText>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteCamera(camera)}>
                      <FontAwesome6 name="trash" size={14} color={colors.dangerText} />
                      <ThemedText variant="small" color={colors.dangerText}>
                        删除
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </ThemedView>
              ))}
            </View>
          )}

          {/* 添加摄像头按钮 */}
          <TouchableOpacity style={styles.addButton} onPress={() => setIsAdding(true)}>
            <FontAwesome6 name="plus" size={20} color="#fff" />
            <ThemedText variant="bodyMedium" color="#fff">
              添加摄像头
            </ThemedText>
          </TouchableOpacity>

          {/* 跌倒检测说明 */}
          <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
              <FontAwesome6 name="shield-heart" size={24} color={colors.primary} />
              <ThemedText variant="bodyMedium" color={colors.textPrimary}>
                跌倒检测功能
              </ThemedText>
            </View>
            <View style={styles.featureContent}>
              <View style={styles.featureItem}>
                <FontAwesome6 name="1" size={14} color={colors.primary} />
                <ThemedText variant="small" color={colors.textSecondary}>
                  连续3帧检测到异常才触发告警，降低误报
                </ThemedText>
              </View>
              <View style={styles.featureItem}>
                <FontAwesome6 name="2" size={14} color={colors.primary} />
                <ThemedText variant="small" color={colors.textSecondary}>
                  告警后先询问老人是否无恙
                </ThemedText>
              </View>
              <View style={styles.featureItem}>
                <FontAwesome6 name="3" size={14} color={colors.primary} />
                <ThemedText variant="small" color={colors.textSecondary}>
                  30秒无响应才通知监护人
                </ThemedText>
              </View>
              <View style={styles.featureItem}>
                <FontAwesome6 name="4" size={14} color={colors.primary} />
                <ThemedText variant="small" color={colors.textSecondary}>
                  老人确认安全后自动取消告警
                </ThemedText>
              </View>
            </View>
          </View>

          {/* 品牌支持列表 */}
          <View style={styles.section}>
            <ThemedText variant="caption" color={colors.textMuted} style={styles.sectionLabel}>
              支持的品牌
            </ThemedText>
            <View style={styles.brandGrid}>
              {CAMERA_BRANDS.map((brand) => (
                <View key={brand.id} style={styles.brandItem}>
                  <View style={styles.brandIcon}>
                    <FontAwesome6 name={brand.icon as any} size={20} color={colors.primary} />
                  </View>
                  <ThemedText variant="small" color={colors.textSecondary}>
                    {brand.name}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* 添加摄像头弹窗 */}
      <Modal visible={isAdding} transparent animationType="slide" onRequestClose={() => setIsAdding(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ThemedView level="default" style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText variant="h3" color={colors.textPrimary}>
                  添加摄像头
                </ThemedText>
                <TouchableOpacity onPress={() => setIsAdding(false)}>
                  <FontAwesome6 name="xmark" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* 品牌选择 */}
                <ThemedText variant="small" color={colors.textMuted}>
                  选择品牌
                </ThemedText>
                <View style={styles.brandSelector}>
                  {CAMERA_BRANDS.map((brand) => (
                    <TouchableOpacity
                      key={brand.id}
                      style={[styles.brandOption, newCamera.brand === brand.id && styles.brandOptionActive]}
                      onPress={() => setNewCamera({ ...newCamera, brand: brand.id, port: brand.rtspPort })}
                    >
                      <FontAwesome6
                        name={brand.icon as any}
                        size={16}
                        color={newCamera.brand === brand.id ? colors.primary : colors.textMuted}
                      />
                      <ThemedText
                        variant="small"
                        color={newCamera.brand === brand.id ? colors.primary : colors.textSecondary}
                      >
                        {brand.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 名称 */}
                <View style={styles.inputGroup}>
                  <ThemedText variant="small" color={colors.textMuted}>
                    摄像头名称
                  </ThemedText>
                  <TextInput
                    style={styles.input}
                    value={newCamera.name}
                    onChangeText={(text) => setNewCamera({ ...newCamera, name: text })}
                    placeholder="例如：客厅摄像头"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                {/* IP地址 */}
                <View style={styles.inputGroup}>
                  <ThemedText variant="small" color={colors.textMuted}>
                    IP地址
                  </ThemedText>
                  <TextInput
                    style={styles.input}
                    value={newCamera.ipAddress}
                    onChangeText={(text) => setNewCamera({ ...newCamera, ipAddress: text })}
                    placeholder="例如：192.168.1.100"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>

                {/* 端口 */}
                <View style={styles.inputGroup}>
                  <ThemedText variant="small" color={colors.textMuted}>
                    RTSP端口
                  </ThemedText>
                  <TextInput
                    style={styles.input}
                    value={newCamera.port.toString()}
                    onChangeText={(text) => setNewCamera({ ...newCamera, port: parseInt(text) || 554 })}
                    placeholder="默认554"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>

                {/* 用户名 */}
                <View style={styles.inputGroup}>
                  <ThemedText variant="small" color={colors.textMuted}>
                    用户名
                  </ThemedText>
                  <TextInput
                    style={styles.input}
                    value={newCamera.username}
                    onChangeText={(text) => setNewCamera({ ...newCamera, username: text })}
                    placeholder="管理员用户名"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                {/* 密码 */}
                <View style={styles.inputGroup}>
                  <ThemedText variant="small" color={colors.textMuted}>
                    密码
                  </ThemedText>
                  <TextInput
                    style={styles.input}
                    value={newCamera.password}
                    onChangeText={(text) => setNewCamera({ ...newCamera, password: text })}
                    placeholder="管理员密码"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsAdding(false)}>
                  <ThemedText variant="body" color={colors.textSecondary}>
                    取消
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmButton} onPress={handleAddCamera}>
                  <ThemedText variant="bodyMedium" color="#fff">
                    确认添加
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 预览弹窗 */}
      <Modal
        visible={!!previewCamera}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviewCamera(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.previewContainer}>
            <ThemedView level="default" style={styles.previewContent}>
              <View style={styles.previewHeader}>
                <ThemedText variant="bodyMedium" color={colors.textPrimary}>
                  {previewCamera?.name} - 实时预览
                </ThemedText>
                <TouchableOpacity onPress={() => setPreviewCamera(null)}>
                  <FontAwesome6 name="xmark" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.videoContainer}>
                {previewCamera && Platform.OS === 'web' ? (
                  <img
                    src={getHttpPreviewUrl(previewCamera)}
                    alt="摄像头预览"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                      console.error('摄像头预览加载失败');
                      e.currentTarget.src = '';
                    }}
                  />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <FontAwesome6 name="video" size={48} color={colors.textMuted} />
                    <ThemedText variant="body" color={colors.textSecondary}>
                      移动端预览
                    </ThemedText>
                    <ThemedText variant="small" color={colors.textMuted}>
                      RTSP: {previewCamera?.ipAddress}:{previewCamera?.port}
                    </ThemedText>
                    <ThemedText variant="small" color={colors.textMuted} style={{ marginTop: Spacing.md }}>
                      提示：移动端需要使用专用播放器或转码服务{'\n'}
                      建议使用摄像头厂商App查看
                    </ThemedText>
                  </View>
                )}
              </View>

              <View style={styles.previewInfo}>
                <ThemedText variant="small" color={colors.textMuted}>
                  RTSP: {previewCamera ? getRtspUrl(previewCamera).replace(previewCamera.password, '****') : ''}
                </ThemedText>
              </View>
            </ThemedView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

// 导入KeyboardAvoidingView
import { KeyboardAvoidingView } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.md,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['5xl'] },

    // 说明卡片
    infoCard: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      gap: Spacing.sm,
    },
    infoHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },

    // 萤石摄像头入口
    ezvizCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundCard,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    ezvizIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#4CAF50',
      justifyContent: 'center',
      alignItems: 'center',
    },
    ezvizContent: {
      flex: 1,
      marginLeft: Spacing.md,
    },

    // 区块
    section: { marginBottom: Spacing.xl },
    sectionLabel: { marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },

    // 摄像头卡片
    cameraCard: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
    },
    cameraHeader: { flexDirection: 'row', alignItems: 'center' },
    cameraIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    cameraInfo: { flex: 1, marginLeft: Spacing.sm },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
    statusOnline: { backgroundColor: '#e8f4ec' },
    statusOffline: { backgroundColor: '#faf0f0' },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    dotOnline: { backgroundColor: colors.successText },
    dotOffline: { backgroundColor: colors.dangerText },

    // 跌倒检测
    detectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: Spacing.md,
      paddingVertical: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    detectionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    monitoringStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.sm,
    },
    monitoringDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.successText,
    },

    cameraActions: { flexDirection: 'row', marginTop: Spacing.md, gap: Spacing.sm, flexWrap: 'wrap' },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.backgroundTertiary,
      gap: Spacing.xs,
    },

    // 添加按钮
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.lg,
      gap: Spacing.sm,
    },

    // 功能卡片
    featureCard: {
      backgroundColor: colors.primaryLight,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    featureHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    featureContent: { gap: Spacing.sm },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },

    // 品牌网格
    brandGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
    brandItem: { alignItems: 'center', width: 70 },
    brandIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },

    // 弹窗
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: { maxHeight: '90%' },
    modalContent: {
      borderTopLeftRadius: BorderRadius.xl,
      borderTopRightRadius: BorderRadius.xl,
      paddingBottom: Spacing['3xl'],
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalBody: { padding: Spacing.lg, maxHeight: 400 },
    modalFooter: {
      flexDirection: 'row',
      padding: Spacing.lg,
      gap: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    // 品牌选择器
    brandSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginVertical: Spacing.md },
    brandOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.backgroundTertiary,
      gap: Spacing.xs,
    },
    brandOptionActive: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary },

    // 输入框
    inputGroup: { marginBottom: Spacing.md },
    input: {
      backgroundColor: colors.backgroundTertiary,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginTop: Spacing.xs,
      color: colors.textPrimary,
      fontSize: 16,
    },

    // 按钮
    cancelButton: {
      flex: 1,
      alignItems: 'center',
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.backgroundTertiary,
    },
    confirmButton: {
      flex: 2,
      alignItems: 'center',
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.primary,
    },

    // 预览弹窗
    previewContainer: { flex: 1, justifyContent: 'center' },
    previewContent: {
      margin: Spacing.lg,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    videoContainer: {
      height: 300,
      backgroundColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
    },
    videoPlaceholder: { alignItems: 'center', gap: Spacing.sm },
    previewInfo: {
      padding: Spacing.md,
      backgroundColor: colors.backgroundTertiary,
    },
  });
