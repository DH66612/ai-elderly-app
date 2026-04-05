/**
 * 摄像头预览页面
 * 清雅风格：柔和蓝灰色系、白色卡片、细边框
 * 展示WiFi摄像头的实时画面
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, ScrollView, TouchableOpacity, Text, StyleSheet, 
  Alert, ActivityIndicator, Platform, Dimensions 
} from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';
import { GuardianBackground } from '@/components/GuardianBackground';
import { cameraService, CameraDevice, CAMERA_BRANDS } from '@/services/camera/CameraService';
import { WebView } from 'react-native-webview';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || '';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  borderLight: '#e8f0f5',
};

export default function CameraPreviewScreen() {
  const { theme, isDark } = useTheme();
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ cameraId?: string }>();
  const { user } = useAuth();

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  const styles = useMemo(() => createStyles(theme), [theme]);

  // 当前摄像头
  const currentCamera = useMemo(() => {
    if (cameras.length === 0) return null;
    if (selectedCameraId) {
      const found = cameras.find(c => c.id === selectedCameraId);
      if (found) return found;
    }
    if (params.cameraId) {
      const found = cameras.find(c => c.id === params.cameraId);
      if (found) return found;
    }
    const onlineCamera = cameras.find(c => c.isOnline);
    return onlineCamera || cameras[0];
  }, [cameras, selectedCameraId, params.cameraId]);

  const isLoading = cameras.length === 0;

  // 订阅摄像头列表
  useEffect(() => {
    const unsubscribe = cameraService.subscribe(setCameras);
    return unsubscribe;
  }, []);

  // 切换摄像头
  const handleSwitchCamera = useCallback((camera: CameraDevice) => {
    setSelectedCameraId(camera.id);
    setError(null);
  }, []);

  // 全屏切换
  const toggleFullscreen = useCallback(() => setIsFullscreen(prev => !prev), []);

  // 截图
  const handleCapture = useCallback(() => Alert.alert('截图', '截图功能开发中'), []);

  // 录像
  const handleRecord = useCallback(() => Alert.alert('录像', '录像功能开发中'), []);

  // 双向通话
  const handleTalk = useCallback(() => Alert.alert('双向通话', '双向通话功能开发中'), []);

  // 获取视频流URL
  const getStreamUrl = useCallback((camera: CameraDevice): string | null => {
    const brand = CAMERA_BRANDS[camera.brand];
    if (!brand || !camera.ipAddress) return null;
    const { username, password } = camera;

    if (Platform.OS === 'web') {
      if (brand.streamUrls?.mjpeg) {
        return brand.streamUrls.mjpeg.replace('{ip}', camera.ipAddress).replace('{username}', username || 'admin').replace('{password}', password || '');
      }
      return `http://${camera.ipAddress}/mjpeg`;
    }
    if (brand.streamUrls?.http) {
      return brand.streamUrls.http.replace('{ip}', camera.ipAddress).replace('{username}', username || 'admin').replace('{password}', password || '');
    }
    return `http://${camera.ipAddress}/stream`;
  }, []);

  // 渲染视频播放器
  const renderVideoPlayer = useCallback(() => {
    if (!currentCamera) {
      return (
        <View style={styles.placeholderContainer}>
          <FontAwesome6 name="video-slash" size={48} color={colors.textMuted} />
          <ThemedText variant="body" color={colors.textSecondary}>未选择摄像头</ThemedText>
        </View>
      );
    }

    if (!currentCamera.isOnline) {
      return (
        <View style={styles.placeholderContainer}>
          <FontAwesome6 name="wifi" size={48} color={colors.textMuted} />
          <ThemedText variant="body" color={colors.textSecondary}>摄像头离线</ThemedText>
          <ThemedText variant="small" color={colors.textMuted}>请检查摄像头电源和网络连接</ThemedText>
        </View>
      );
    }

    const streamUrl = getStreamUrl(currentCamera);
    if (!streamUrl) {
      return (
        <View style={styles.placeholderContainer}>
          <FontAwesome6 name="triangle-exclamation" size={48} color={colors.warningText} />
          <ThemedText variant="body" color={colors.textSecondary}>无法获取视频流</ThemedText>
        </View>
      );
    }

    if (Platform.OS === 'web') {
      return (
        <View style={styles.videoContainer}>
          <img src={streamUrl} alt={currentCamera.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setError('视频流加载失败')} />
        </View>
      );
    }

    return (
      <View style={styles.videoContainer}>
        <WebView
          source={{ uri: streamUrl }}
          style={styles.webView}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <ThemedText variant="small" color={colors.textSecondary}>加载视频中...</ThemedText>
            </View>
          )}
          onError={(syntheticEvent) => setError(`加载失败: ${syntheticEvent.nativeEvent.description}`)}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
        />
      </View>
    );
  }, [currentCamera, getStreamUrl, styles]);

  if (isLoading) {
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

  if (cameras.length === 0) {
    return (
      <Screen backgroundColor="transparent" statusBarStyle="dark">
        <GuardianBackground />
        <View style={styles.emptyContainer}>
          <FontAwesome6 name="video" size={48} color={colors.textMuted} />
          <ThemedText variant="body" color={colors.textSecondary}>暂无摄像头</ThemedText>
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/camera-manage')}>
            <FontAwesome6 name="plus" size={14} color="#fff" />
            <ThemedText variant="smallMedium" color="#fff">去添加</ThemedText>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  // 全屏模式
  if (isFullscreen) {
    return (
      <View style={styles.fullscreenContainer}>
        {renderVideoPlayer()}
        <View style={styles.fullscreenControls}>
          <TouchableOpacity style={styles.fullscreenButton} onPress={toggleFullscreen}>
            <FontAwesome6 name="compress" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <GuardianBackground />
      <View style={styles.container}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h3" color={colors.textPrimary}>{currentCamera?.name || '摄像头预览'}</ThemedText>
          <TouchableOpacity style={styles.fullscreenBtn} onPress={toggleFullscreen}>
            <FontAwesome6 name="expand" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* 视频播放区 */}
        {renderVideoPlayer()}

        {/* 错误提示 */}
        {error && (
          <View style={styles.errorBanner}>
            <FontAwesome6 name="circle-exclamation" size={14} color={colors.dangerText} />
            <ThemedText variant="small" color={colors.dangerText}>{error}</ThemedText>
          </View>
        )}

        {/* 控制栏 */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={handleCapture}>
            <FontAwesome6 name="camera" size={16} color={colors.textPrimary} />
            <ThemedText variant="small" color={colors.textSecondary}>截图</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={handleRecord}>
            <FontAwesome6 name="circle" size={16} color={colors.dangerText} />
            <ThemedText variant="small" color={colors.textSecondary}>录像</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={handleTalk}>
            <FontAwesome6 name="microphone" size={16} color={colors.textPrimary} />
            <ThemedText variant="small" color={colors.textSecondary}>通话</ThemedText>
          </TouchableOpacity>
        </View>

        {/* 摄像头切换列表 */}
        {cameras.length > 1 && (
          <View style={styles.cameraList}>
            <ThemedText variant="smallMedium" color={colors.textPrimary}>切换摄像头</ThemedText>
            <View style={styles.cameraListScroll}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {cameras.map(camera => (
                  <TouchableOpacity
                    key={camera.id}
                    style={[styles.cameraItem, currentCamera?.id === camera.id && styles.cameraItemActive]}
                    onPress={() => handleSwitchCamera(camera)}
                  >
                    <FontAwesome6 name="video" size={14} color={currentCamera?.id === camera.id ? '#fff' : colors.textPrimary} />
                    <ThemedText variant="small" color={currentCamera?.id === camera.id ? '#fff' : colors.textPrimary}>{camera.name}</ThemedText>
                    <View style={[styles.cameraStatusDot, { backgroundColor: camera.isOnline ? colors.successText : colors.textMuted }]} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* 摄像头信息 */}
        {currentCamera && (
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <FontAwesome6 name="circle-info" size={14} color={colors.textMuted} />
              <ThemedText variant="small" color={colors.textSecondary}>
                {' '}{CAMERA_BRANDS[currentCamera.brand]?.name || '通用'} · {currentCamera.ipAddress}
              </ThemedText>
            </View>
            <View style={styles.infoRow}>
              <FontAwesome6 name={currentCamera.isOnline ? 'circle-check' : 'circle-xmark'} size={14} color={currentCamera.isOnline ? colors.successText : colors.dangerText} />
              <ThemedText variant="small" color={currentCamera.isOnline ? colors.successText : colors.dangerText}>
                {' '}{currentCamera.isOnline ? '在线' : '离线'}
              </ThemedText>
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}

const createStyles = (_theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 0, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  fullscreenBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, padding: Spacing.xl },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md, gap: Spacing.xs, marginTop: Spacing.md },
  videoContainer: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.75, backgroundColor: '#000' },
  webView: { flex: 1, backgroundColor: '#000' },
  placeholderContainer: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.75, backgroundColor: colors.backgroundTertiary, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#faf0f0', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm },
  controls: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: Spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.backgroundCard },
  controlButton: { alignItems: 'center', gap: Spacing.xs },
  cameraList: { paddingVertical: Spacing.md, paddingHorizontal: 0, borderTopWidth: 1, borderTopColor: colors.border },
  cameraListScroll: { marginTop: Spacing.sm },
  cameraItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, marginRight: Spacing.sm, backgroundColor: colors.backgroundTertiary, borderRadius: BorderRadius.md, gap: Spacing.xs },
  cameraItemActive: { backgroundColor: colors.primary },
  cameraStatusDot: { width: 6, height: 6, borderRadius: 3 },
  infoSection: { padding: Spacing.lg, gap: Spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  fullscreenContainer: { flex: 1, backgroundColor: '#000' },
  fullscreenControls: { position: 'absolute', top: Spacing.lg, right: Spacing.lg },
  fullscreenButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
});
