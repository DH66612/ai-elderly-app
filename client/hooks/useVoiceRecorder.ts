/**
 * 语音录音与识别Hook
 * 使用expo-av进行录音，后端ASR进行语音识别
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Platform } from 'react-native';

// 支持的方言类型
export type Dialect = 
  | 'mandarin'    // 普通话
  | 'cantonese'   // 粤语
  | 'sichuan'     // 四川话
  | 'dongbei'     // 东北话
  | 'henan'       // 河南话
  | 'shaanxi'     // 陕西话
  | 'shanghai'    // 上海话
  | 'hunan';      // 湖南话

// 方言配置
export const DIALECT_OPTIONS = [
  { value: 'mandarin', label: '普通话', description: '标准普通话' },
  { value: 'cantonese', label: '粤语', description: '广东话' },
  { value: 'sichuan', label: '四川话', description: '四川方言' },
  { value: 'dongbei', label: '东北话', description: '东北方言' },
  { value: 'henan', label: '河南话', description: '河南方言' },
  { value: 'shaanxi', label: '陕西话', description: '陕西方言' },
  { value: 'shanghai', label: '上海话', description: '上海方言' },
  { value: 'hunan', label: '湖南话', description: '湖南方言' },
] as const;

interface UseVoiceRecorderOptions {
  dialect?: Dialect;
  autoRecognize?: boolean;  // 录音完成后自动识别
}

interface UseVoiceRecorderReturn {
  // 状态
  isRecording: boolean;
  isRecognizing: boolean;
  hasPermission: boolean;
  recognizedText: string;
  dialect: Dialect;
  error: string | null;
  
  // 方法
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  toggleRecording: () => Promise<void>;
  setDialect: (dialect: Dialect) => void;
  clearRecognizedText: () => void;
  recognizeAudio: (uri: string) => Promise<string | null>;
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const {
    dialect: initialDialect = 'mandarin',
    autoRecognize = true,
  } = options;

  // 状态
  const [isRecording, setIsRecording] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [dialect, setDialect] = useState<Dialect>(initialDialect);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const recordingRef = useRef<Audio.Recording | null>(null);
  const autoRecognizeRef = useRef(autoRecognize);
  const dialectRef = useRef(dialect);
  const recognizeAudioRef = useRef<((uri: string) => Promise<string | null>) | null>(null);

  // 同步 ref
  useEffect(() => {
    autoRecognizeRef.current = autoRecognize;
  }, [autoRecognize]);

  useEffect(() => {
    dialectRef.current = dialect;
  }, [dialect]);

  // 申请录音权限
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        setHasPermission(status === 'granted');
        
        if (status !== 'granted') {
          console.log('[VoiceRecorder] 录音权限未授予');
        }
      } catch (err) {
        console.error('[VoiceRecorder] 申请权限失败:', err);
        setHasPermission(false);
      }
    })();
  }, []);

  // 语音识别
  const recognizeAudio = useCallback(async (uri: string): Promise<string | null> => {
    setIsRecognizing(true);
    setError(null);

    try {
      console.log('[VoiceRecorder] 开始语音识别，方言:', dialectRef.current);
      console.log('[VoiceRecorder] 音频URI:', uri);

      // 读取音频文件并转为Base64
      let base64Audio: string;
      
      // Web 端特殊处理：blob URL 需要通过 fetch 读取
      if (Platform.OS === 'web' && uri.startsWith('blob:')) {
        console.log('[VoiceRecorder] Web端检测到blob URL，使用fetch读取');
        const response = await fetch(uri);
        const blob = await response.blob();
        console.log('[VoiceRecorder] Blob大小:', blob.size, '类型:', blob.type);
        
        // 将Blob转为Base64
        base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // 移除 data:audio/xxx;base64, 前缀
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        console.log('[VoiceRecorder] Web端Base64长度:', base64Audio.length);
      } else {
        // 移动端使用 FileSystem 读取
        base64Audio = await (FileSystem as any).readAsStringAsync(uri, {
          encoding: 'base64',
        });
        console.log('[VoiceRecorder] 移动端Base64长度:', base64Audio.length);
      }

      // 调用后端ASR API
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/asr/recognize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audio: base64Audio,
            dialect: dialectRef.current,
            uid: 'voice-assistant',
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        const text = result.text || '';
        console.log('[VoiceRecorder] 识别成功:', text);
        setRecognizedText(text);
        return text;
      } else {
        // 提供更友好的错误提示
        const errorMsg = result.error || '语音识别失败';
        console.error('[VoiceRecorder] ASR错误:', errorMsg);
        
        // 根据错误类型提供友好提示
        if (errorMsg.includes('audio convert failed') || errorMsg.includes('invalid argument')) {
          throw new Error('音频格式不支持，请重新录音');
        } else if (errorMsg.includes('timeout') || errorMsg.includes('网络')) {
          throw new Error('网络超时，请检查网络后重试');
        } else {
          throw new Error('语音识别失败，请重新说话');
        }
      }
    } catch (err: any) {
      console.error('[VoiceRecorder] 语音识别失败:', err);
      setError(err.message || '语音识别失败');
      return null;
    } finally {
      setIsRecognizing(false);
    }
  }, []);

  // 更新 recognizeAudio ref
  useEffect(() => {
    recognizeAudioRef.current = recognizeAudio;
  }, [recognizeAudio]);

  // 开始录音
  const startRecording = useCallback(async () => {
    setError(null);

    // 检查权限
    if (!hasPermission) {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('需要权限', '请授予录音权限以使用语音功能');
        setHasPermission(false);
        return;
      }
      setHasPermission(true);
    }

    // 清理之前的录音
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {
        // 忽略错误
      }
      recordingRef.current = null;
    }

    try {
      // 设置音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // 创建录音对象
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      
      recordingRef.current = recording;
      setIsRecording(true);
      
      console.log('[VoiceRecorder] 开始录音');
    } catch (err: any) {
      console.error('[VoiceRecorder] 开始录音失败:', err);
      setError('录音启动失败');
      setIsRecording(false);
    }
  }, [hasPermission]);

  // 停止录音
  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) {
      return null;
    }

    try {
      console.log('[VoiceRecorder] 停止录音...');
      
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (uri) {
        console.log('[VoiceRecorder] 录音完成:', uri);
        
        // 自动识别
        if (autoRecognizeRef.current && recognizeAudioRef.current) {
          console.log('[VoiceRecorder] 开始自动识别...');
          await recognizeAudioRef.current(uri);
        }
        
        return uri;
      }
      
      return null;
    } catch (err: any) {
      console.error('[VoiceRecorder] 停止录音失败:', err);
      setError('停止录音失败');
      setIsRecording(false);
      recordingRef.current = null;
      return null;
    }
  }, []);

  // 切换录音状态
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // 清除识别文本
  const clearRecognizedText = useCallback(() => {
    setRecognizedText('');
    setError(null);
  }, []);

  // 更新方言
  const handleSetDialect = useCallback((newDialect: Dialect) => {
    setDialect(newDialect);
    console.log('[VoiceRecorder] 方言设置为:', newDialect);
  }, []);

  return {
    isRecording,
    isRecognizing,
    hasPermission,
    recognizedText,
    dialect,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    setDialect: handleSetDialect,
    clearRecognizedText,
    recognizeAudio,
  };
}
