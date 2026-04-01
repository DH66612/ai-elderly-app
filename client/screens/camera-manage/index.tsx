/**
 * WiFi摄像头管理页面
 * 清雅风格：柔和蓝灰色系、白色卡片、细边框
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, ScrollView, TouchableOpacity, Text, StyleSheet, 
  Alert, ActivityIndicator, TextInput 
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';
import { cameraService, CameraDevice, CAMERA_BRANDS } from '@/services/camera/CameraService';

// 清雅色系（与全局统一）
const colors = {
  backgroundRoot: '#f0f5fa',
  backgroundCard: '#ffffff',
  backgroundTertiary: '#eaf0f5',
  primary: '#8ab3cf',
  primaryLight: '#e3f0f7',
  primaryDark: '#7fa5c0',
  success: '#a6c1d9',      // 柔和蓝绿
  successText: '#5e7e9f',
  warning: '#fdf0d8',      // 柔米色
  warningText: '#5e7e9f',
  danger: '#e2c6c6',
  dangerText: '#b87a7a',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#9aa9b7',
  border: '#d6e4f0',
  borderLight: '#e8f0f5',
};

export default function CameraManageScreen() {
  const { theme, isDark } = useTheme();
  const router = useSafeRouter();

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);

  // 新摄像头表单
  const [formData, setFormData] = useState({
    name: '',
    brand: 'generic',
    ipAddress: '',
    username: 'admin',
    password: '',
  });

  // 订阅摄像头列表
  useEffect(() => {
    const unsubscribe = cameraService.subscribe(setCameras);
    return unsubscribe;
  }, []);

  // 选择品牌
  const handleSelectBrand = useCallback((brandId: string) => {
    const brand = CAMERA_BRANDS[brandId];
    setFormData(prev => ({
      ...prev,
      brand: brandId,
      username: brand?.defaultUser || 'admin',
      password: brand?.defaultPassword || '',
    }));
  }, []);

  // 测试连接
  const handleTestConnection = useCallback(async (camera: CameraDevice) => {
    setIsTesting(camera.id);
    try {
      const success = await cameraService.testConnection(camera.id);
      if (success) {
        Alert.alert('连接成功', `摄像头 "${camera.name}" 连接正常`);
      } else {
        Alert.alert('连接失败', '无法连接到摄像头，请检查网络和配置');
      }
    } catch (error) {
      Alert.alert('连接失败', '测试连接时发生错误');
    } finally {
      setIsTesting(null);
    }
  }, []);

  // 添加摄像头
  const handleAddCamera = useCallback(async () => {
    if (!formData.name.trim()) {
      Alert.alert('提示', '请输入摄像头名称');
      return;
    }
    if (!formData.ipAddress.trim()) {
      Alert.alert('提示', '请输入IP地址');
      return;
    }

    const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(formData.ipAddress)) {
      Alert.alert('提示', '请输入正确的IP地址格式');
      return;
    }

    try {
      await cameraService.addCamera(formData);
      Alert.alert('添加成功', `摄像头 "${formData.name}" 已添加`);
      setIsAdding(false);
      setFormData({ name: '', brand: 'generic', ipAddress: '', username: 'admin', password: '' });
    } catch (error) {
      Alert.alert('添加失败', '无法添加摄像头，请重试');
    }
  }, [formData]);

  // 删除摄像头
  const handleRemoveCamera = useCallback((camera: CameraDevice) => {
    Alert.alert(
      '删除摄像头',
      `确定要删除 "${camera.name}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        { text: '删除', style: 'destructive', onPress: () => cameraService.removeCamera(camera.id) },
      ]
    );
  }, []);

  // 打开预览
  const handleOpenPreview = useCallback((cameraId: string) => {
    router.push('/camera-preview', { cameraId });
  }, [router]);

  const styles = useMemo(() => createStyles(theme), [theme]);
  const brandList = Object.entries(CAMERA_BRANDS);

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <GuardianBackground />
      <View style={styles.container}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h2" color={colors.textPrimary}>WiFi摄像头</ThemedText>
          <TouchableOpacity style={styles.addButton} onPress={() => setIsAdding(true)}>
            <FontAwesome6 name="plus" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* 添加摄像头表单 */}
          {isAdding && (
            <ThemedView level="default" style={styles.addForm}>
              <ThemedText variant="h3" color={colors.textPrimary}>添加摄像头</ThemedText>
              
              <ThemedText variant="caption" color={colors.textSecondary}>摄像头名称</ThemedText>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="例：客厅摄像头"
                placeholderTextColor={colors.textMuted}
              />

              <ThemedText variant="caption" color={colors.textSecondary}>品牌</ThemedText>
              <View style={styles.brandGrid}>
                {brandList.map(([id, config]) => (
                  <TouchableOpacity
                    key={id}
                    style={[styles.brandItem, formData.brand === id && styles.brandItemActive]}
                    onPress={() => handleSelectBrand(id)}
                  >
                    <FontAwesome6 name="video" size={16} color={formData.brand === id ? colors.primary : colors.textSecondary} />
                    <ThemedText variant="small" color={formData.brand === id ? colors.primary : colors.textSecondary}>
                      {config.name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText variant="caption" color={colors.textSecondary}>IP地址</ThemedText>
              <TextInput
                style={styles.input}
                value={formData.ipAddress}
                onChangeText={(text) => setFormData({ ...formData, ipAddress: text })}
                placeholder="192.168.1.100"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />

              <ThemedText variant="caption" color={colors.textSecondary}>用户名</ThemedText>
              <TextInput
                style={styles.input}
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                placeholder="admin"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <ThemedText variant="caption" color={colors.textSecondary}>密码</ThemedText>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="请输入密码"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />

              <View style={styles.formButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsAdding(false)}>
                  <ThemedText variant="smallMedium" color={colors.textSecondary}>取消</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmButton} onPress={handleAddCamera}>
                  <FontAwesome6 name="check" size={14} color="#fff" />
                  <ThemedText variant="smallMedium" color="#fff">确认添加</ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          )}

          {/* 摄像头列表 */}
          {cameras.length > 0 ? (
            <View style={styles.section}>
              <ThemedText variant="caption" color={colors.textMuted} style={styles.sectionLabel}>我的摄像头</ThemedText>
              {cameras.map(camera => (
                <ThemedView key={camera.id} level="default" style={styles.cameraCard}>
                  <View style={styles.cameraHeader}>
                    <View style={[styles.cameraIcon, { backgroundColor: camera.isOnline ? '#e8f4ec' : '#faf0f0' }]}>
                      <FontAwesome6 name="video" size={20} color={camera.isOnline ? colors.successText : colors.dangerText} />
                    </View>
                    <View style={styles.cameraInfo}>
                      <ThemedText variant="bodyMedium" color={colors.textPrimary}>{camera.name}</ThemedText>
                      <ThemedText variant="small" color={colors.textSecondary}>
                        {CAMERA_BRANDS[camera.brand]?.name || '通用'} · {camera.ipAddress}
                      </ThemedText>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: camera.isOnline ? '#e8f4ec' : '#faf0f0' }]}>
                      <View style={[styles.statusDot, { backgroundColor: camera.isOnline ? colors.successText : colors.dangerText }]} />
                      <ThemedText variant="small" color={camera.isOnline ? colors.successText : colors.dangerText}>
                        {camera.isOnline ? '在线' : '离线'}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.cameraActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenPreview(camera.id)}>
                      <FontAwesome6 name="eye" size={14} color={colors.primary} />
                      <ThemedText variant="small" color={colors.primary}>预览</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleTestConnection(camera)} disabled={isTesting === camera.id}>
                      {isTesting === camera.id ? (
                        <ActivityIndicator size="small" color={colors.warningText} />
                      ) : (
                        <FontAwesome6 name="wifi" size={14} color={colors.warningText} />
                      )}
                      <ThemedText variant="small" color={colors.warningText}>测试</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleRemoveCamera(camera)}>
                      <FontAwesome6 name="trash" size={14} color={colors.dangerText} />
                      <ThemedText variant="small" color={colors.dangerText}>删除</ThemedText>
                    </TouchableOpacity>
                  </View>
                </ThemedView>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="video" size={48} color={colors.textMuted} />
              <ThemedText variant="body" color={colors.textSecondary}>暂无摄像头</ThemedText>
              <ThemedText variant="small" color={colors.textMuted}>点击右上角 + 添加WiFi摄像头</ThemedText>
            </View>
          )}

          {/* 帮助 */}
          <View style={styles.helpSection}>
            <ThemedText variant="smallMedium" color={colors.textPrimary}>使用说明</ThemedText>
            <ThemedText variant="small" color={colors.textSecondary}>
              {'\n'}1. 确保摄像头已连接电源和WiFi{'\n'}
              2. 在摄像头标签或App中找到IP地址{'\n'}
              3. 输入摄像头登录用户名和密码{'\n'}
              4. 支持海康威视、大华、小米、TP-Link等品牌
            </ThemedText>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

const createStyles = (_theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 20 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['5xl'] },
  
  addForm: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    shadowColor: '#a3b8cc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundTertiary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  brandGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs, marginBottom: Spacing.md },
  brandItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    backgroundColor: colors.backgroundTertiary, borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  brandItemActive: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary },
  formButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.lg },
  cancelButton: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  confirmButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primary, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md, gap: Spacing.xs,
  },
  
  section: { marginBottom: Spacing.xl },
  sectionLabel: { marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  cameraCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#a3b8cc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cameraHeader: { flexDirection: 'row', alignItems: 'center' },
  cameraIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  cameraInfo: { flex: 1, marginLeft: Spacing.md },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  cameraActions: {
    flexDirection: 'row', justifyContent: 'flex-end',
    marginTop: Spacing.md, paddingTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
    gap: Spacing.lg,
  },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  
  emptyContainer: { alignItems: 'center', padding: Spacing['2xl'], marginTop: Spacing.xl, gap: Spacing.sm },
  helpSection: { backgroundColor: colors.backgroundTertiary, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.md },
});