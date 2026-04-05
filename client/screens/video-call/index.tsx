/**
 * 视频通话页面 - 统一入口
 * 
 * 平台检测策略：
 * - Web 端：使用 agora-rtc-sdk-ng
 * - Android/iOS 原生构建：使用 react-native-agora
 * - Expo Go：显示不支持提示
 * 
 * 使用 Constants.appOwnership 检测运行环境
 */
import React from 'react';
import { Platform, View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Constants from 'expo-constants';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

// 检测运行环境
// appOwnership: 'expo' = Expo Go, 'standalone' = 独立构建, 'guest' = 其他
const isExpoGo = Constants.appOwnership === 'expo';
const isNativeBuild = !isExpoGo && Platform.OS !== 'web';

// 不可用时的回退组件
function UnsupportedScreen() {
  const { theme } = useTheme();
  const router = useSafeRouter();
  const styles = createStyles(theme);

  return (
    <Screen backgroundColor="#f0f5fa" statusBarStyle="dark">
      <View style={styles.unsupportedContainer}>
        <FontAwesome6 name="video-slash" size={64} color="#9aa9b7" />
        <ThemedText variant="h3" color="#5e7e9f" style={styles.unsupportedText}>
          视频通话不可用
        </ThemedText>
        <ThemedText variant="body" color="#8a9aaa" style={styles.unsupportedHint}>
          {isExpoGo 
            ? '视频通话功能需要开发构建版本\nExpo Go 不支持此功能'
            : '视频通话功能暂时不可用\n请稍后重试'}
        </ThemedText>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>返回</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

// 动态选择实现
let VideoCallImplementation: React.ComponentType<any>;

if (Platform.OS === 'web') {
  // Web 端使用 agora-rtc-sdk-ng
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  VideoCallImplementation = require('./index.web').default;
} else if (isNativeBuild) {
  // 原生构建使用 react-native-agora
  // 这里使用 try-catch 以防模块加载失败
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    VideoCallImplementation = require('./index.native').default;
  } catch (e) {
    console.error('[Agora] 加载原生模块失败:', e);
    VideoCallImplementation = UnsupportedScreen;
  }
} else {
  // Expo Go 环境
  VideoCallImplementation = UnsupportedScreen;
}

export default VideoCallImplementation;

const createStyles = (_theme: any) =>
  StyleSheet.create({
    unsupportedContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    unsupportedText: {
      marginTop: 24,
      marginBottom: 12,
    },
    unsupportedHint: {
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
    },
    backButton: {
      backgroundColor: '#8ab3cf',
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 12,
    },
  });
