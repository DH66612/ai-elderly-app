/**
 * SSE实时推送Hook
 * 用于接收服务端的实时消息推送
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import RNSSE from 'react-native-sse';

interface SSEMessage {
  id?: number;
  type: string;
  title?: string;
  content?: string;
  level?: string;
  alertType?: string;
  message?: string;
  data?: any;
  timestamp?: string;
  // 视频通话请求
  callerId?: number;
  calleeId?: number;
  callerName?: string;
  status?: string;
  // 跌倒告警
  alertId?: string;
  deviceName?: string;
  deviceId?: string;
  isEmergency?: boolean;
  // 用药提醒
  medicineName?: string;
  dosage?: string;
  time?: string;
  notes?: string;
}

interface UseSSEOptions {
  elderId: number | null;
  onNotification?: (message: SSEMessage) => void;
  onEmergency?: (message: SSEMessage) => void;
  onVideoCallRequest?: (message: SSEMessage) => void;
  onHealthData?: (message: SSEMessage) => void;
  onDeviceStatus?: (message: SSEMessage) => void;
  onBraceletData?: (message: SSEMessage) => void;
  onCameraData?: (message: SSEMessage) => void;
  onFallAlert?: (message: SSEMessage) => void;
  onMedicationReminder?: (message: SSEMessage) => void;
  onConnected?: () => void;
  enabled?: boolean;
}

export function useSSE({
  elderId,
  onNotification,
  onEmergency,
  onVideoCallRequest,
  onHealthData,
  onDeviceStatus,
  onBraceletData,
  onCameraData,
  onFallAlert,
  onMedicationReminder,
  onConnected,
  enabled = true,
}: UseSSEOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sseRef = useRef<any>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_INTERVAL = 5000; // 5秒

  // 使用 ref 存储回调函数，避免依赖变化导致重连
  const callbacksRef = useRef({
    onNotification,
    onEmergency,
    onVideoCallRequest,
    onHealthData,
    onDeviceStatus,
    onBraceletData,
    onCameraData,
    onFallAlert,
    onMedicationReminder,
    onConnected,
  });

  // 同步更新 ref
  useEffect(() => {
    callbacksRef.current = {
      onNotification,
      onEmergency,
      onVideoCallRequest,
      onHealthData,
      onDeviceStatus,
      onBraceletData,
      onCameraData,
      onFallAlert,
      onMedicationReminder,
      onConnected,
    };
  }, [onNotification, onEmergency, onVideoCallRequest, onHealthData, onDeviceStatus, onBraceletData, onCameraData, onFallAlert, onMedicationReminder, onConnected]);

  const connect = useCallback(() => {
    if (!elderId || !enabled) {
      return;
    }

    // 断开旧连接
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    const url = `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/realtime/subscribe/${elderId}`;
    console.log('[SSE] 连接:', url);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sse: any = new RNSSE(url, {
      headers: {
        'Accept': 'text/event-stream',
      },
    });

    // 连接成功
    sse.addEventListener('connected', (event: any) => {
      console.log('[SSE] 已连接');
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0; // 重置重连计数
      callbacksRef.current.onConnected?.();
    });

    // 通知消息
    sse.addEventListener('notification', (event: any) => {
      console.log('[SSE] 收到通知:', event.data);
      try {
        const data = JSON.parse(event.data);
        callbacksRef.current.onNotification?.(data);
      } catch (e) {
        console.error('[SSE] 解析通知失败:', e);
      }
    });

    // 紧急告警
    sse.addEventListener('emergency', (event: any) => {
      console.log('[SSE] 收到紧急告警:', event.data);
      try {
        const data = JSON.parse(event.data);
        callbacksRef.current.onEmergency?.(data);
      } catch (e) {
        console.error('[SSE] 解析告警失败:', e);
      }
    });

    // 视频通话请求
    sse.addEventListener('video_call_request', (event: any) => {
      console.log('[SSE] 收到视频通话请求:', event.data);
      try {
        const data = JSON.parse(event.data);
        callbacksRef.current.onVideoCallRequest?.(data);
      } catch (e) {
        console.error('[SSE] 解析视频通话请求失败:', e);
      }
    });

    // 健康数据更新
    sse.addEventListener('health_data', (event: any) => {
      console.log('[SSE] 收到健康数据:', event.data);
      try {
        const data = JSON.parse(event.data);
        callbacksRef.current.onHealthData?.(data);
      } catch (e) {
        console.error('[SSE] 解析健康数据失败:', e);
      }
    });

    // 设备状态变化
    sse.addEventListener('device_status', (event: any) => {
      console.log('[SSE] 收到设备状态:', event.data);
      try {
        const data = JSON.parse(event.data);
        callbacksRef.current.onDeviceStatus?.(data);
      } catch (e) {
        console.error('[SSE] 解析设备状态失败:', e);
      }
    });

    // 手环数据
    sse.addEventListener('bracelet_data', (event: any) => {
      console.log('[SSE] 收到手环数据:', event.data);
      try {
        const data = JSON.parse(event.data);
        callbacksRef.current.onBraceletData?.(data);
      } catch (e) {
        console.error('[SSE] 解析手环数据失败:', e);
      }
    });

    // 摄像头数据
    sse.addEventListener('camera_data', (event: any) => {
      console.log('[SSE] 收到摄像头数据:', event.data);
      try {
        const data = JSON.parse(event.data);
        callbacksRef.current.onCameraData?.(data);
      } catch (e) {
        console.error('[SSE] 解析摄像头数据失败:', e);
      }
    });

    // 跌倒告警
    sse.addEventListener('fall_alert', (event: any) => {
      console.log('[SSE] 收到跌倒告警:', event.data);
      try {
        const data = JSON.parse(event.data);
        callbacksRef.current.onFallAlert?.(data);
        // 同时触发紧急告警回调
        callbacksRef.current.onEmergency?.(data);
      } catch (e) {
        console.error('[SSE] 解析跌倒告警失败:', e);
      }
    });

    // 紧急告警（通用）
    sse.addEventListener('emergency_alert', (event: any) => {
      console.log('[SSE] 收到紧急告警:', event.data);
      try {
        const data = JSON.parse(event.data);
        callbacksRef.current.onEmergency?.(data);
      } catch (e) {
        console.error('[SSE] 解析紧急告警失败:', e);
      }
    });

    // 跌倒确认请求（给老人端）
    sse.addEventListener('fall_confirmation', (event: any) => {
      console.log('[SSE] 收到跌倒确认请求:', event.data);
      try {
        const data = JSON.parse(event.data);
        // 这个事件主要给老人端处理
      } catch (e) {
        console.error('[SSE] 解析跌倒确认请求失败:', e);
      }
    });

    // 跌倒已解决
    sse.addEventListener('fall_resolved', (event: any) => {
      console.log('[SSE] 跌倒告警已解决:', event.data);
      try {
        const data = JSON.parse(event.data);
        callbacksRef.current.onNotification?.(data);
      } catch (e) {
        console.error('[SSE] 解析跌倒解决消息失败:', e);
      }
    });

    // 用药提醒
    sse.addEventListener('medication_reminder', (event: any) => {
      console.log('[SSE] 收到用药提醒:', event.data);
      try {
        const data = JSON.parse(event.data);
        callbacksRef.current.onMedicationReminder?.(data);
      } catch (e) {
        console.error('[SSE] 解析用药提醒失败:', e);
      }
    });

    // 心跳
    sse.addEventListener('heartbeat', () => {
      // console.log('[SSE] 心跳');
    });

    // 错误
    sse.addEventListener('error', (event: any) => {
      console.warn('[SSE] 连接错误:', event?.message || '未知错误');
      setIsConnected(false);
      setError(null);
      
      // 自动重连逻辑
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        const delay = RECONNECT_INTERVAL * reconnectAttemptsRef.current;
        console.log(`[SSE] 将在 ${delay / 1000} 秒后尝试重连 (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
        
        reconnectTimerRef.current = setTimeout(() => {
          if (sseRef.current) {
            sseRef.current.close();
            sseRef.current = null;
          }
          connect();
        }, delay);
      } else {
        console.warn('[SSE] 已达到最大重连次数，停止重连');
        setError('连接失败，请检查网络后刷新页面');
      }
    });

    sseRef.current = sse;
  }, [elderId, enabled]);

  const disconnect = useCallback(() => {
    // 清理重连定时器
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
      setIsConnected(false);
      console.log('[SSE] 已断开');
    }
  }, []);

  // 连接/断开
  useEffect(() => {
    if (elderId && enabled) {
      connect();
    }
    // 注意：disconnect会更新state，这里不在effect body中直接调用
    // 而是让返回的cleanup函数来处理

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elderId, enabled]);

  // 重连
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0; // 手动重连时重置计数器
    disconnect();
    setTimeout(connect, 1000);
  }, [connect, disconnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
    reconnect,
  };
}

export default useSSE;
