/**
 * 视频通话页面 - 移动端（Android/iOS）
 * 使用 react-native-agora（需要原生构建）
 * 注意：此功能需要在真机上运行，Expo Go 不支持
 */
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Text, ActivityIndicator } from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import createAgoraRtcEngine, {
  IRtcEngine,
  IRtcEngineEventHandler,
  RtcSurfaceView,
  ChannelProfileType,
  ClientRoleType,
  RenderModeType,
  VideoSourceType,
  UserOfflineReasonType,
  ErrorCodeType,
} from 'react-native-agora';

const AGORA_APP_ID = '7809bad23efd48ab9b8d1a9798c9909c';

type CallStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export default function VideoCallScreen() {
  const { theme } = useTheme();
  const router = useSafeRouter();
  const { user } = useAuth();
  const params = useSafeSearchParams<{ sessionId?: string; isCallee?: string }>();

  const sessionId = params.sessionId ? parseInt(params.sessionId, 10) : null;
  const boundUserName = user?.boundUserName || '对方';

  const [callStatus, setCallStatus] = useState<CallStatus>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nativeReady, setNativeReady] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [localUid, setLocalUid] = useState<number>(0);

  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasJoinedRef = useRef(false);
  const engineRef = useRef<IRtcEngine | null>(null);

  useEffect(() => {
    if (callStatus === 'connected') {
      durationTimerRef.current = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callStatus]);

  const fetchAgoraToken = useCallback(async (channelName: string, uid?: number | string) => {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/agora/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelName, uid, role: 'publisher' }),
      }
    );
    if (!response.ok) throw new Error('获取Token失败');
    const result = await response.json();
    return { appId: result.data.appId, token: result.data.token };
  }, []);

  const joinChannel = useCallback(async (channelName: string, uid?: number | string) => {
    try {
      const { token } = await fetchAgoraToken(channelName, uid);
      
      // 使用新 API 创建引擎
      const engine = createAgoraRtcEngine();
      engineRef.current = engine;
      
      // 初始化引擎
      engine.initialize({
        appId: AGORA_APP_ID,
      });
      
      // 注册事件处理器
      const eventHandler: IRtcEngineEventHandler = {
        onJoinChannelSuccess: (_connection, elapsed) => {
          console.log('[Agora Native] 加入频道成功, elapsed:', elapsed);
          setCallStatus('connected');
          setNativeReady(true);
        },
        onUserJoined: (_connection, remoteUid, _elapsed) => {
          console.log('[Agora Native] 远端用户加入:', remoteUid);
          setRemoteUid(remoteUid);
        },
        onUserOffline: (_connection, remoteUid, _reason) => {
          console.log('[Agora Native] 远端用户离开:', remoteUid);
          setRemoteUid(null);
          handleEndCall(true);
        },
        onError: (err: ErrorCodeType, msg: string) => {
          console.error('[Agora Native] 错误:', err, msg);
          setError(`通话错误: ${msg}`);
        },
      };
      engine.registerEventHandler(eventHandler);
      
      engine.enableVideo();
      engine.enableAudio();
      engine.setChannelProfile(ChannelProfileType.ChannelProfileLiveBroadcasting);
      engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      
      const uidNumber = typeof uid === 'number' ? uid : 0;
      setLocalUid(uidNumber);
      
      // 加入频道
      engine.joinChannel(token, channelName, uidNumber, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });
      
      setNativeReady(true);
    } catch (err: any) {
      console.error('[Agora Native] 加入频道失败:', err);
      throw new Error(err.message || '初始化失败');
    }
  }, [fetchAgoraToken]);

  const leaveChannel = useCallback(async () => {
    if (engineRef.current) {
      engineRef.current.leaveChannel();
      engineRef.current.release();
      engineRef.current = null;
    }
  }, []);

  const toggleMute = useCallback(async () => {
    if (engineRef.current) {
      engineRef.current.muteLocalAudioStream(!isMuted);
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const toggleCamera = useCallback(async () => {
    if (engineRef.current) {
      engineRef.current.muteLocalVideoStream(!isCameraOff);
      setIsCameraOff(!isCameraOff);
    }
  }, [isCameraOff]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleEndCall = useCallback(async (isRemote?: boolean) => {
    await leaveChannel();
    if (sessionId && !isRemote) {
      try {
        await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/video-calls/end`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          }
        );
      } catch (e) {
        console.error('End call error:', e);
      }
    }
    setCallStatus('disconnected');
    router.back();
  }, [sessionId, router, leaveChannel]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId || !sessionId || hasJoinedRef.current) return;
    hasJoinedRef.current = true;
    
    const timer = setTimeout(() => {
      joinChannel(`call_${sessionId}`, userId).catch((err) => {
        console.error('[Agora] 通话建立失败:', err);
        setError(err.message || '连接失败');
        setCallStatus('error');
      });
    }, 100);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, sessionId]);

  useEffect(() => {
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      leaveChannel();
    };
  }, [leaveChannel]);

  useEffect(() => {
    if (error) {
      Alert.alert('视频通话错误', error, [{ text: '返回', onPress: () => router.back() }]);
    }
  }, [error, router]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!sessionId) {
    return (
      <Screen backgroundColor="#f0f5fa" statusBarStyle="dark">
        <View style={styles.unsupportedContainer}>
          <FontAwesome6 name="circle-exclamation" size={64} color="#9aa9b7" />
          <ThemedText variant="h3" color="#5e7e9f" style={styles.unsupportedText}>无效的通话</ThemedText>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ThemedText variant="title" color="#fff">返回</ThemedText>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="#1a2a3a" statusBarStyle="light">
      <View style={styles.container}>
        <View style={styles.remoteVideo}>
          {remoteUid && nativeReady ? (
            <RtcSurfaceView
              style={StyleSheet.absoluteFill}
              canvas={{
                uid: remoteUid,
                renderMode: RenderModeType.RenderModeHidden,
                sourceType: VideoSourceType.VideoSourceRemote,
              }}
            />
          ) : (
            <View style={styles.connectingOverlay}>
              <ActivityIndicator size="large" color="#8ab3cf" />
              <Text style={styles.connectingText}>
                {callStatus === 'connecting' ? '正在连接...' : '等待对方...'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.localVideo}>
          {nativeReady ? (
            <RtcSurfaceView
              style={StyleSheet.absoluteFill}
              canvas={{
                uid: localUid,
                renderMode: RenderModeType.RenderModeHidden,
                sourceType: VideoSourceType.VideoSourceCamera,
              }}
            />
          ) : (
            <FontAwesome6 name="circle-user" size={32} color="rgba(255,255,255,0.3)" />
          )}
        </View>

        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeButton} onPress={() => handleEndCall()}>
            <FontAwesome6 name="xmark" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.callInfo}>
            <ThemedText variant="h3" color="#fff" style={styles.callerName}>{boundUserName}</ThemedText>
            {callStatus === 'connected' && (
              <View style={styles.durationBadge}>
                <View style={styles.durationDot} />
                <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
              </View>
            )}
            {callStatus === 'connecting' && <Text style={styles.statusText}>连接中...</Text>}
          </View>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={toggleMute}
            disabled={callStatus !== 'connected'}
          >
            <FontAwesome6 name={isMuted ? 'microphone-slash' : 'microphone'} size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.endCallButton} onPress={() => handleEndCall()} activeOpacity={0.8}>
            <FontAwesome6 name="phone-slash" size={32} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, isCameraOff && styles.controlButtonActive]}
            onPress={toggleCamera}
            disabled={callStatus !== 'connected'}
          >
            <FontAwesome6 name={isCameraOff ? 'video-slash' : 'video'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2a3a' },
  remoteVideo: { flex: 1, backgroundColor: '#1e2a3a' },
  connectingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  connectingText: { color: '#8ab3cf', fontSize: 18, marginTop: Spacing.md },
  localVideo: { position: 'absolute', top: 80, right: Spacing.lg, width: 120, height: 160, backgroundColor: 'rgba(30, 42, 58, 0.8)', borderRadius: BorderRadius.lg, borderWidth: 2, borderColor: 'rgba(138, 179, 207, 0.5)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing['3xl'], paddingBottom: Spacing.lg, backgroundColor: 'rgba(30, 42, 58, 0.7)' },
  closeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(138, 179, 207, 0.3)', justifyContent: 'center', alignItems: 'center' },
  callInfo: { alignItems: 'center' },
  callerName: { fontSize: 22, fontWeight: '700', color: '#fff' },
  durationBadge: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs, backgroundColor: 'rgba(138, 179, 207, 0.4)', paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: 12 },
  durationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8ab3cf', marginRight: Spacing.xs },
  durationText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  statusText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: Spacing.xs },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: Spacing['3xl'], paddingBottom: Spacing['4xl'], backgroundColor: 'rgba(30, 42, 58, 0.7)', gap: Spacing['3xl'] },
  controlButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(138, 179, 207, 0.3)', justifyContent: 'center', alignItems: 'center' },
  controlButtonActive: { backgroundColor: '#e2c6c6' },
  endCallButton: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#e2c6c6', justifyContent: 'center', alignItems: 'center' },
  unsupportedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl, backgroundColor: '#f0f5fa' },
  unsupportedText: { marginTop: Spacing.lg, color: '#5e7e9f' },
  backButton: { marginTop: Spacing.xl, backgroundColor: '#8ab3cf', paddingHorizontal: Spacing['3xl'], paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg },
});
