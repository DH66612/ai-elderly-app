/**
 * 拍图识字页面 - 适老化设计
 * 
 * 功能：
 * 1. 拍照或选择图片
 * 2. OCR 识别文字
 * 3. TTS 语音朗读
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { HeartMeteors } from '@/components/HeartMeteors';
import { Spacing, BorderRadius } from '@/constants/theme';

// 清雅色调 - 与老人端其他页面一致
const colors = {
  backgroundRoot: '#f0f5fa',
  backgroundDefault: '#ffffff',
  backgroundTertiary: '#eaf0f5',
  primary: '#8ab3cf',
  textPrimary: '#2d4c6e',
  textSecondary: '#5e7e9f',
  textMuted: '#8fa5bb',
  border: '#d6e4f0',
  success: '#5a8a7a',
  error: '#c27878',
  gradientStart: '#b8e0e8',
  gradientEnd: '#f0f5fa',
  cardBg: 'rgba(255, 255, 255, 0.95)',
};

export default function ImageReaderScreen() {
  const router = useSafeRouter();
  const { user } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // 清理音频资源
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // 拍照
  const handleTakePhoto = async () => {
    try {
      // 请求相机权限
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限提示', '需要相机权限才能拍照');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        base64: true, // 直接获取 base64
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setRecognizedText('');
        setAudioUri(null);
        
        // 自动识别
        await recognizeImage(asset.base64 || asset.uri);
      }
    } catch (error) {
      console.error('拍照失败:', error);
      Alert.alert('错误', '拍照失败，请重试');
    }
  };

  // 从相册选择
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限提示', '需要相册权限才能选择图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setRecognizedText('');
        setAudioUri(null);
        
        // 自动识别
        await recognizeImage(asset.base64 || asset.uri);
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      Alert.alert('错误', '选择图片失败，请重试');
    }
  };

  // 识别图片中的文字
  const recognizeImage = async (imageData: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ocr/recognize-and-read`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageData,
            userId: user?.id || 'elderly-user',
          }),
        }
      );

      const result = await response.json();
      
      if (result.success) {
        setRecognizedText(result.text);
        setAudioUri(result.audioUri);
      } else {
        Alert.alert('识别失败', result.error || '请重试');
      }
    } catch (error) {
      console.error('识别失败:', error);
      Alert.alert('识别失败', '网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 播放语音
  const handlePlayAudio = async () => {
    if (!audioUri) {
      // 如果没有音频，重新生成
      if (recognizedText) {
        setIsLoading(true);
        try {
          const response = await fetch(
            `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ocr/text-to-speech`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: recognizedText,
                userId: user?.id || 'elderly-user',
              }),
            }
          );
          
          const result = await response.json();
          if (result.success) {
            setAudioUri(result.audioUri);
            await playAudio(result.audioUri);
          }
        } catch (error) {
          console.error('生成语音失败:', error);
          Alert.alert('错误', '生成语音失败');
        } finally {
          setIsLoading(false);
        }
      }
      return;
    }

    await playAudio(audioUri);
  };

  // 播放音频
  const playAudio = async (uri: string) => {
    try {
      // 停止之前的播放
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // 播放新音频
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
          }
        }
      );

      soundRef.current = sound;
      setIsPlaying(true);
    } catch (error) {
      console.error('播放失败:', error);
      Alert.alert('播放失败', '请重试');
      setIsPlaying(false);
    }
  };

  // 停止播放
  const handleStopAudio = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      setIsPlaying(false);
    }
  };

  return (
    <Screen backgroundColor="transparent" statusBarStyle="dark">
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        locations={[0, 0.4]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <HeartMeteors count={6} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>拍图识字</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* 图片区域 */}
        <View style={styles.imageSection}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <FontAwesome6 name="image" size={64} color={colors.textMuted} />
              <Text style={styles.placeholderText}>点击下方按钮拍照或选择图片</Text>
            </View>
          )}
        </View>

        {/* 操作按钮 */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleTakePhoto}>
            <View style={[styles.buttonIcon, { backgroundColor: '#e3f2fd' }]}>
              <FontAwesome6 name="camera" size={28} color="#2196F3" />
            </View>
            <Text style={styles.buttonText}>拍照</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handlePickImage}>
            <View style={[styles.buttonIcon, { backgroundColor: '#e8f5e9' }]}>
              <FontAwesome6 name="images" size={28} color="#4CAF50" />
            </View>
            <Text style={styles.buttonText}>相册</Text>
          </TouchableOpacity>
        </View>

        {/* 识别结果 */}
        {(isLoading || recognizedText) && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <FontAwesome6 name="file-lines" size={24} color={colors.primary} />
              <Text style={styles.resultTitle}>识别结果</Text>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>正在识别文字...</Text>
              </View>
            ) : (
              <>
                <ScrollView style={styles.textContainer} nestedScrollEnabled>
                  <Text style={styles.recognizedText}>{recognizedText}</Text>
                </ScrollView>

                {/* 朗读按钮 */}
                {recognizedText && recognizedText !== '图片中没有检测到文字' && (
                  <TouchableOpacity
                    style={[
                      styles.readButton,
                      isPlaying && { backgroundColor: colors.error },
                    ]}
                    onPress={isPlaying ? handleStopAudio : handlePlayAudio}
                    disabled={isLoading}
                  >
                    <FontAwesome6
                      name={isPlaying ? 'stop' : 'volume-high'}
                      size={24}
                      color="#fff"
                    />
                    <Text style={styles.readButtonText}>
                      {isPlaying ? '停止朗读' : '朗读文字'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {/* 使用提示 */}
        <View style={styles.tipCard}>
          <FontAwesome6 name="lightbulb" size={20} color="#FFA726" />
          <Text style={styles.tipText}>
            可以识别药品说明书、书籍、标签等文字，识别后会自动朗读
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = {
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['4xl'],
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: Spacing.lg,
  },
  backIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700' as const,
    color: colors.textPrimary,
  },
  imageSection: {
    backgroundColor: colors.cardBg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden' as const,
    marginBottom: Spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  previewImage: {
    width: '100%' as const,
    height: 300,
  },
  placeholderContainer: {
    height: 200,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: Spacing.md,
  },
  buttonRow: {
    flexDirection: 'row' as const,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center' as const,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: Spacing.sm,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  resultCard: {
    backgroundColor: colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: Spacing.md,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  loadingContainer: {
    alignItems: 'center' as const,
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: Spacing.md,
  },
  textContainer: {
    maxHeight: 200,
    marginBottom: Spacing.md,
  },
  recognizedText: {
    fontSize: 20,
    lineHeight: 32,
    color: colors.textPrimary,
  },
  readButton: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  readButtonText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#fff',
    marginLeft: Spacing.sm,
  },
  tipCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  tipText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
};
