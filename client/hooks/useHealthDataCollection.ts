/**
 * 健康数据采集 Hook
 * 
 * 在老人端使用，自动采集健康数据并上传
 * 数据来源优先级：
 * 1. Health Connect（心率、血压、血氧等）
 * 2. 手机计步器（步数）
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { healthDataService } from '@/services/health/HealthDataService';
import { healthConnectService } from '@/services/health/HealthConnectService';
import { HealthData } from '@/services/health/types';
import { useAuth } from '@/contexts/AuthContext';

interface UseHealthDataCollectionOptions {
  enabled?: boolean;
  uploadInterval?: number; // 上传间隔（毫秒），默认5分钟
  onHealthDataUpdate?: (data: HealthData) => void;
}

export function useHealthDataCollection(options: UseHealthDataCollectionOptions = {}) {
  const { enabled = true, uploadInterval = 5 * 60 * 1000, onHealthDataUpdate } = options;
  const { user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasHealthConnect, setHasHealthConnect] = useState(false);
  const [currentSteps, setCurrentSteps] = useState(0);
  const uploadIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化健康数据采集
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') {
      return;
    }

    // 检查计步器是否可用
    setIsAvailable(healthDataService.isPedometerAvailable());

    // 检查 Health Connect 是否可用
    if (Platform.OS === 'android') {
      healthConnectService.checkAvailability().then(setHasHealthConnect);
    }

    // 订阅步数更新
    const unsubscribe = healthDataService.subscribe((data) => {
      if (data.steps) {
        setCurrentSteps(data.steps.steps);
        onHealthDataUpdate?.(data);
      }
    });

    // 开始监听步数
    healthDataService.startPedometerUpdates();

    return () => {
      unsubscribe();
      healthDataService.stopPedometerUpdates();
    };
  }, [enabled, onHealthDataUpdate]);

  // 定期上传数据
  useEffect(() => {
    if (!enabled || !user?.id || Platform.OS === 'web') {
      return;
    }

    // 首次上传
    healthDataService.uploadHealthData(user.id);

    // 定期上传
    uploadIntervalRef.current = setInterval(() => {
      healthDataService.uploadHealthData(user.id);
    }, uploadInterval);

    return () => {
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
      }
    };
  }, [enabled, user?.id, uploadInterval]);

  // 手动上传
  const uploadNow = useCallback(async () => {
    if (!user?.id) return false;
    return healthDataService.uploadHealthData(user.id);
  }, [user?.id]);

  return {
    isAvailable,
    hasHealthConnect,
    currentSteps,
    uploadNow,
  };
}
