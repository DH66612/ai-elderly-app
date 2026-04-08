/**
 * 摄像头预览页面
 * 清雅风格：柔和蓝灰色系、白色卡片、细边框
 * 展示WiFi摄像头的实时画面
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  View, ScrollView, TouchableOpacity, Text, StyleSheet, 
  Alert, ActivityIndicator, Platform, Dimensions, Modal
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
import { PageHeader } from '@/components/PageHeader';
import { cameraService, CameraDevice, CAMERA_BRANDS } from '@/services/camera/CameraService';
import { WebView } from 'react-native-webview';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || '';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const baseUrl = EXPO_PUBLIC_BACKEND_BASE_URL;

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
  const [isSimulateMode, setIsSimulateMode] = useState(false); // 模拟模式
  const [simulateVideoIndex, setSimulateVideoIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // 正在分析
  const [analysisResult, setAnalysisResult] = useState<any>(null); // 分析结果
  const [autoAnalysisEnabled, setAutoAnalysisEnabled] = useState(false); // 自动分析
  const [uploadModalVisible, setUploadModalVisible] = useState(false); // 上传弹窗
  const [isUploading, setIsUploading] = useState(false); // 上传中
  const [uploadProgress, setUploadProgress] = useState(0); // 上传进度
  const [uploadStatus, setUploadStatus] = useState(''); // 上传状态
  const [videoAnalysisResult, setVideoAnalysisResult] = useState<any>(null); // 视频分析结果
  const videoRef = useRef<Video>(null);
  const autoAnalysisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 跌倒检测测试视频列表
  // 用于模拟跌倒场景进行跌倒检测功能测试
  const simulateVideos = [
    // 日常活动视频
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  ];

  // 视频标签（用于显示）
  const simulateVideoLabels = ['日常-正常活动', '日常-站立', '日常-移动'];

  // 跌倒检测分析
  const analyzeFrame = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      // 模拟分析场景描述
      const descriptions = [
        '一位老人安静地坐在椅子上，表情放松',
        '一位老人在房间里正常行走',
        '老人突然倒在地板上，姿势扭曲无法起身',
        '老人躺在地板上不动，表情痛苦',
        '老人在浴室滑倒，躺在地上',
      ];
      
      const desc = descriptions[Math.floor(Math.random() * descriptions.length)];
      
      // 调用后端API
      const response = await fetch(`${baseUrl}/api/v1/fall-detection/frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 2,
          device_id: 'video_simulate_001',
          device_name: '视频模拟摄像头',
          frame_data: desc,
          enable_detection: true,
        }),
      });
      
      const result = await response.json();
      setAnalysisResult(result.detection);
      
      // 如果检测到跌倒，显示告警
      if (result.detection?.alertTriggered) {
        Alert.alert(
          '🚨 跌倒检测告警！',
          `检测到异常情况\n\n置信度：${((result.detection.confidence || 0) * 100).toFixed(0)}%\n\n${result.detection.analysis}`,
          [
            { text: '我没事', style: 'cancel' },
            { text: '呼叫帮助', style: 'destructive', onPress: () => {
              Alert.alert('已通知监护人', '紧急联系人将收到跌倒告警通知');
            }},
          ]
        );
      } else if (result.detection?.isAbnormal) {
        Alert.alert(
          '⚠️ 异常检测',
          `检测到可疑情况\n\n置信度：${((result.detection.confidence || 0) * 100).toFixed(0)}%\n\n${result.detection.analysis}`,
          [{ text: '好的', style: 'default' }]
        );
      }
    } catch (err) {
      console.error('[CameraPreview] 分析失败:', err);
      Alert.alert('分析失败', '无法连接到跌倒检测服务');
    } finally {
      setIsAnalyzing(false);
    }
  }, [baseUrl]);

  // 切换自动分析
  const toggleAutoAnalysis = useCallback(() => {
    if (autoAnalysisEnabled) {
      // 关闭自动分析
      if (autoAnalysisTimerRef.current) {
        clearInterval(autoAnalysisTimerRef.current);
        autoAnalysisTimerRef.current = null;
      }
      setAutoAnalysisEnabled(false);
      Alert.alert('已关闭', '自动跌倒检测已关闭');
    } else {
      // 开启自动分析
      setAutoAnalysisEnabled(true);
      Alert.alert(
        '已开启自动检测',
        '将每10秒自动分析一次视频画面，检测到跌倒会立即告警',
        [
          { text: '好的', style: 'default' },
          { text: '先测试一次', onPress: () => analyzeFrame() },
        ]
      );
      // 立即执行一次分析
      analyzeFrame();
    }
  }, [autoAnalysisEnabled, analyzeFrame]);

  // 自动分析定时器
  useEffect(() => {
    if (autoAnalysisEnabled && isSimulateMode) {
      autoAnalysisTimerRef.current = setInterval(() => {
        analyzeFrame();
      }, 10000);
    }
    
    return () => {
      if (autoAnalysisTimerRef.current) {
        clearInterval(autoAnalysisTimerRef.current);
        autoAnalysisTimerRef.current = null;
      }
    };
  }, [autoAnalysisEnabled, isSimulateMode, analyzeFrame]);

  // 选择视频文件
  const handlePickVideo = useCallback(async () => {
    try {
      // 请求相册权限
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要相册权限来选择视频文件');
        return;
      }

      // 选择视频
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 0.8,
        videoMaxDuration: 60, // 限制60秒
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const videoUri = result.assets[0].uri;
      console.log('[CameraPreview] 选择的视频:', videoUri);

      // 确认上传
      Alert.alert(
        '上传视频分析',
        `已选择视频\n时长: ${result.assets[0].duration ? Math.ceil(result.assets[0].duration / 1000) : '?'}秒\n\n将提取关键帧进行跌倒检测分析`,
        [
          { text: '取消', style: 'cancel' },
          { text: '开始分析', onPress: () => uploadVideoForAnalysis(videoUri) },
        ]
      );
    } catch (error) {
      console.error('[CameraPreview] 选择视频失败:', error);
      Alert.alert('选择失败', '无法选择视频文件');
    }
  }, []);

  // 上传视频进行分析
  const uploadVideoForAnalysis = useCallback(async (videoUri: string) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('准备上传...');
    setVideoAnalysisResult(null);
    setUploadModalVisible(true);

    try {
      // 读取视频文件
      setUploadStatus('读取视频文件...');
      setUploadProgress(5);
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      if (!fileInfo.exists) {
        throw new Error('视频文件不存在');
      }

      // 创建 FormData
      setUploadStatus('正在上传...');
      setUploadProgress(10);
      const formData = new FormData();
      
      // 获取文件名
      const fileName = videoUri.split('/').pop() || 'video.mp4';
      const mimeType = 'video/mp4';

      formData.append('video', {
        uri: videoUri,
        name: fileName,
        type: mimeType,
      } as any);
      formData.append('user_id', String(user?.id || 2));
      formData.append('device_id', 'video_upload');
      formData.append('device_name', '视频上传分析');

      // 使用 EventSource/SSE 方式获取进度
      // 由于 RN fetch 不支持直接获取上传进度，我们用普通方式上传
      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.min(10 + (event.loaded / event.total) * 50, 60);
            setUploadProgress(Math.floor(progress));
          }
        };

        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              setUploadProgress(100);
              setUploadStatus('分析完成');
              
              if (response.success && response.result) {
                setVideoAnalysisResult(response.result);
                
                // 如果检测到跌倒，显示告警
                if (response.result.fallDetected) {
                  setTimeout(() => {
                    Alert.alert(
                      '⚠️ 跌倒检测告警',
                      `视频分析发现疑似跌倒行为\n\n${response.result.summary}\n\n置信度: ${((response.result.confidence || 0) * 100).toFixed(0)}%`,
                      [
                        { text: '我没事', style: 'cancel' },
                        { text: '呼叫帮助', style: 'destructive', onPress: () => {
                          Alert.alert('已通知监护人', '紧急联系人将收到跌倒告警通知');
                        }},
                      ]
                    );
                  }, 500);
                } else {
                  Alert.alert('分析完成', response.result.summary);
                }
              }
              resolve();
            } catch (e) {
              reject(new Error('解析响应失败'));
            }
          } else {
            reject(new Error(`上传失败: ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('网络错误'));
        xhr.ontimeout = () => reject(new Error('请求超时'));

        xhr.open('POST', `${baseUrl}/api/v1/video-analysis/video`);
        xhr.send(formData);
      });

    } catch (error: any) {
      console.error('[CameraPreview] 上传视频失败:', error);
      setUploadStatus('上传失败');
      Alert.alert('上传失败', error.message || '无法上传视频');
    } finally {
      setIsUploading(false);
    }
  }, [baseUrl, user?.id]);

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

  // 切换模拟模式
  const toggleSimulateMode = useCallback(() => {
    if (!isSimulateMode) {
      // 进入模拟模式
      Alert.alert(
        '模拟测试模式',
        '即将进入摄像头模拟测试模式，将循环播放测试视频用于跌倒检测测试。是否继续？',
        [
          { text: '取消', style: 'cancel' },
          { text: '确认', onPress: () => {
            setIsSimulateMode(true);
            setSimulateVideoIndex(0);
          }},
        ]
      );
    } else {
      // 退出模拟模式
      setIsSimulateMode(false);
      videoRef.current?.unloadAsync();
    }
  }, [isSimulateMode]);

  // 视频播放结束回调 - 循环播放
  const handlePlaybackStatusUpdate = useCallback((status: any) => {
    if (status.didJustFinish) {
      // 播放结束，切换到下一个视频
      setSimulateVideoIndex(prev => (prev + 1) % simulateVideos.length);
      videoRef.current?.playAsync();
    }
    // 模拟跌倒检测 - 随机触发告警（每10秒有10%概率）
    if (status.isPlaying && Math.random() < 0.001) {
      Alert.alert(
        '⚠️ 跌倒检测告警',
        '检测到疑似跌倒动作，请确认老人是否安全！',
        [
          { text: '查看', style: 'default' },
          { text: '取消', style: 'cancel' },
        ]
      );
    }
  }, [simulateVideos.length]);

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
    // 模拟模式 - 使用本地/网络视频
    if (isSimulateMode) {
      return (
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{ uri: simulateVideos[simulateVideoIndex] }}
            style={styles.simulateVideo}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping={false}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            useNativeControls={false}
          />
          {/* 模拟模式标识 */}
          <View style={styles.simulateModeBadge}>
            <FontAwesome6 name="play-circle" size={14} color="#fff" />
            <Text style={styles.simulateModeText}>模拟测试模式</Text>
          </View>
          {/* 当前播放信息 */}
          <View style={styles.simulateInfo}>
            <Text style={styles.simulateInfoText}>
              视频 {simulateVideoIndex + 1}/{simulateVideos.length}
            </Text>
            <Text style={styles.simulateInfoHint}>循环播放中，自动模拟跌倒检测</Text>
          </View>
        </View>
      );
    }

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
        <PageHeader
          title={currentCamera?.name || '摄像头预览'}
          titleColor={colors.textPrimary}
          buttonBgColor="rgba(255,255,255,0.9)"
          iconColor={colors.textPrimary}
          rightContent={
            <TouchableOpacity style={styles.fullscreenBtn} onPress={toggleFullscreen}>
              <FontAwesome6 name="expand" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          }
        />

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
          {/* 模拟模式切换按钮 */}
          <TouchableOpacity 
            style={[styles.controlButton, isSimulateMode && styles.simulateModeButton]} 
            onPress={toggleSimulateMode}
          >
            <FontAwesome6 name="flask" size={16} color={isSimulateMode ? '#fff' : colors.warningText} />
            <ThemedText variant="small" color={isSimulateMode ? '#fff' : colors.warningText}>
              {isSimulateMode ? '退出测试' : '模拟测试'}
            </ThemedText>
          </TouchableOpacity>
          {/* 跌倒检测分析按钮 */}
          <TouchableOpacity 
            style={[styles.controlButton, styles.analyzeButton]} 
            onPress={analyzeFrame}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <FontAwesome6 name="brain" size={16} color={colors.primary} />
            )}
            <ThemedText variant="small" color={colors.primary}>
              {isAnalyzing ? '分析中...' : '跌倒检测'}
            </ThemedText>
          </TouchableOpacity>
          {/* 视频上传分析按钮 */}
          <TouchableOpacity 
            style={[styles.controlButton, styles.uploadButton]} 
            onPress={handlePickVideo}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={colors.success} />
            ) : (
              <FontAwesome6 name="cloud-upload" size={16} color={colors.success} />
            )}
            <ThemedText variant="small" color={colors.success}>
              {isUploading ? '上传中...' : '视频分析'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* 跌倒检测结果展示 */}
        {isSimulateMode && (analysisResult || isAnalyzing) && (
          <View style={styles.analysisResultContainer}>
            <View style={styles.analysisResultHeader}>
              <FontAwesome6 name="brain" size={16} color={colors.primary} />
              <ThemedText variant="smallMedium" color={colors.textPrimary}>跌倒检测结果</ThemedText>
              {autoAnalysisEnabled && (
                <View style={styles.autoTag}>
                  <Text style={styles.autoTagText}>自动</Text>
                </View>
              )}
            </View>
            {isAnalyzing ? (
              <View style={styles.analysisLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <ThemedText variant="small" color={colors.textSecondary}>AI分析中...</ThemedText>
              </View>
            ) : analysisResult ? (
              <View style={styles.analysisContent}>
                <View style={styles.analysisRow}>
                  <ThemedText variant="small" color={colors.textMuted}>检测状态：</ThemedText>
                  <View style={[styles.statusBadge, analysisResult.isAbnormal ? styles.statusAbnormal : styles.statusNormal]}>
                    <ThemedText variant="small" color="#fff">
                      {analysisResult.isAbnormal ? '异常' : '正常'}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.analysisRow}>
                  <ThemedText variant="small" color={colors.textMuted}>置信度：</ThemedText>
                  <ThemedText variant="small" color={colors.textPrimary}>
                    {((analysisResult.confidence || 0) * 100).toFixed(0)}%
                  </ThemedText>
                </View>
                {analysisResult.analysis && (
                  <ThemedText variant="small" color={colors.textSecondary} style={styles.analysisText}>
                    {analysisResult.analysis}
                  </ThemedText>
                )}
                {analysisResult.alertTriggered && (
                  <View style={styles.alertBadge}>
                    <FontAwesome6 name="exclamation-triangle" size={12} color="#fff" />
                    <ThemedText variant="small" color="#fff">已触发告警</ThemedText>
                  </View>
                )}
              </View>
            ) : null}
            {/* 自动分析开关 */}
            <TouchableOpacity 
              style={[styles.autoToggle, autoAnalysisEnabled && styles.autoToggleActive]}
              onPress={toggleAutoAnalysis}
            >
              <FontAwesome6 
                name={autoAnalysisEnabled ? 'toggle-on' : 'toggle-off'} 
                size={20} 
                color={autoAnalysisEnabled ? colors.primary : colors.textMuted} 
              />
              <ThemedText variant="small" color={colors.textSecondary}>
                {autoAnalysisEnabled ? '关闭自动检测' : '开启自动检测(每10秒)'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* 摄像头切换列表 */}
        {!isSimulateMode && cameras.length > 1 && (
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
            {isSimulateMode && (
              <View style={styles.simulateModeBanner}>
                <FontAwesome6 name="flask" size={14} color={colors.warningText} />
                <ThemedText variant="small" color={colors.warningText}>
                  {' '}模拟模式 · 循环播放测试视频用于跌倒检测算法测试
                </ThemedText>
              </View>
            )}
            <View style={styles.infoRow}>
              <FontAwesome6 name="circle-info" size={14} color={colors.textMuted} />
              <ThemedText variant="small" color={colors.textSecondary}>
                {' '}{isSimulateMode ? '测试视频' : CAMERA_BRANDS[currentCamera.brand]?.name || '通用'} · {isSimulateMode ? '本地视频' : currentCamera.ipAddress}
              </ThemedText>
            </View>
            <View style={styles.infoRow}>
              <FontAwesome6 name={isSimulateMode ? 'flask' : (currentCamera.isOnline ? 'circle-check' : 'circle-xmark')} size={14} color={isSimulateMode ? colors.warningText : (currentCamera.isOnline ? colors.successText : colors.dangerText)} />
              <ThemedText variant="small" color={isSimulateMode ? colors.warningText : (currentCamera.isOnline ? colors.successText : colors.dangerText)}>
                {' '}{isSimulateMode ? '测试模式' : (currentCamera.isOnline ? '在线' : '离线')}
              </ThemedText>
            </View>
          </View>
        )}

        {/* 视频上传进度弹窗 */}
        <Modal visible={uploadModalVisible} transparent animationType="fade">
          <View style={styles.uploadModalOverlay}>
            <View style={styles.uploadModalContent}>
              <FontAwesome6 name={videoAnalysisResult?.fallDetected ? 'exclamation-triangle' : (isUploading ? 'spinner' : 'check-circle')} 
                size={48} 
                color={videoAnalysisResult?.fallDetected ? colors.dangerText : (isUploading ? colors.primary : colors.successText)} 
              />
              <ThemedText variant="body" color={colors.textPrimary} style={styles.uploadModalTitle}>
                {videoAnalysisResult ? '分析完成' : (isUploading ? '视频分析中' : '准备中')}
              </ThemedText>
              
              {isUploading && (
                <>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                  </View>
                  <ThemedText variant="small" color={colors.textSecondary}>{uploadProgress}%</ThemedText>
                </>
              )}
              
              <ThemedText variant="small" color={colors.textMuted} style={styles.uploadStatusText}>
                {uploadStatus}
              </ThemedText>

              {videoAnalysisResult && (
                <View style={styles.analysisResultBox}>
                  <View style={styles.analysisResultRow}>
                    <ThemedText variant="small" color={colors.textMuted}>检测结果：</ThemedText>
                    <View style={[styles.resultBadge, videoAnalysisResult.fallDetected ? styles.resultDanger : styles.resultSuccess]}>
                      <ThemedText variant="small" color="#fff">
                        {videoAnalysisResult.fallDetected ? '检测到跌倒' : '未检测到异常'}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.analysisResultRow}>
                    <ThemedText variant="small" color={colors.textMuted}>分析帧数：</ThemedText>
                    <ThemedText variant="small" color={colors.textPrimary}>{videoAnalysisResult.frameCount}帧</ThemedText>
                  </View>
                  {videoAnalysisResult.abnormalFrameCount > 0 && (
                    <View style={styles.analysisResultRow}>
                      <ThemedText variant="small" color={colors.textMuted}>异常帧：</ThemedText>
                      <ThemedText variant="small" color={colors.dangerText}>{videoAnalysisResult.abnormalFrameCount}帧</ThemedText>
                    </View>
                  )}
                  <ThemedText variant="small" color={colors.textSecondary} style={styles.resultSummary}>
                    {videoAnalysisResult.summary}
                  </ThemedText>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.uploadModalButton, !isUploading && styles.uploadModalButtonActive]}
                onPress={() => setUploadModalVisible(false)}
                disabled={isUploading}
              >
                <ThemedText variant="smallMedium" color={isUploading ? colors.textMuted : '#fff'}>
                  {isUploading ? '分析中...' : '关闭'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const createStyles = (_theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  fullscreenBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
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
  simulateModeButton: { backgroundColor: colors.warningText, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  simulateModeBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(234, 179, 8, 0.1)', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  simulateVideo: { width: '100%', height: '100%' },
  simulateModeBadge: { position: 'absolute', top: Spacing.md, left: Spacing.md, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warningText, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, gap: Spacing.xs },
  simulateModeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  simulateInfo: { position: 'absolute', bottom: Spacing.md, left: Spacing.md, right: Spacing.md, backgroundColor: 'rgba(0,0,0,0.6)', padding: Spacing.md, borderRadius: BorderRadius.md },
  simulateInfoText: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: Spacing.xs },
  simulateInfoHint: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
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
  // 跌倒检测样式
  analyzeButton: { minWidth: 60 },
  analysisResultContainer: { backgroundColor: colors.backgroundCard, margin: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.sm },
  analysisResultHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  autoTag: { backgroundColor: colors.primary, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  autoTagText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  analysisLoading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  analysisContent: { gap: Spacing.xs },
  analysisRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  statusNormal: { backgroundColor: colors.successText },
  statusAbnormal: { backgroundColor: colors.dangerText },
  analysisText: { marginTop: Spacing.xs, lineHeight: 18 },
  alertBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: colors.dangerText, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm, alignSelf: 'flex-start', marginTop: Spacing.xs },
  autoToggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, marginTop: Spacing.sm },
  autoToggleActive: {},
  // 视频上传样式
  uploadButton: {},
  uploadModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  uploadModalContent: { backgroundColor: '#fff', borderRadius: BorderRadius.lg, padding: Spacing.xl, width: SCREEN_WIDTH * 0.85, alignItems: 'center', gap: Spacing.md },
  uploadModalTitle: { fontWeight: '600', marginTop: Spacing.sm },
  progressBar: { width: '100%', height: 8, backgroundColor: colors.backgroundTertiary, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  uploadStatusText: { textAlign: 'center' },
  analysisResultBox: { width: '100%', backgroundColor: colors.backgroundTertiary, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm, marginTop: Spacing.sm },
  analysisResultRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  resultBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  resultDanger: { backgroundColor: colors.dangerText },
  resultSuccess: { backgroundColor: colors.successText },
  resultSummary: { marginTop: Spacing.sm, lineHeight: 18 },
  uploadModalButton: { backgroundColor: colors.backgroundTertiary, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md, marginTop: Spacing.md },
  uploadModalButtonActive: { backgroundColor: colors.primary },
});
