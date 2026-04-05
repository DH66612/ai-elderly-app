/**
 * Health Connect 授权 Hook
 * 
 * 提供健康数据授权状态管理和数据读取功能
 */
import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { healthConnectService } from '@/services/health/HealthConnectService';
import { healthDataService } from '@/services/health/HealthDataService';
import {
  HealthData,
  HealthPermissions,
  HealthTrend,
} from '@/services/health/types';

export interface UseHealthConnectResult {
  // 状态
  isAvailable: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  permissions: HealthPermissions;
  hasAnyPermission: boolean;
  
  // 方法
  initialize: () => Promise<boolean>;
  requestPermissions: () => Promise<HealthPermissions>;
  openSettings: () => Promise<void>;
  getHealthData: () => Promise<HealthData>;
  getHealthTrend: () => Promise<HealthTrend>;
}

export function useHealthConnect(): UseHealthConnectResult {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState<HealthPermissions>({
    steps: false,
    heartRate: false,
    sleep: false,
    bloodPressure: false,
    bloodOxygen: false,
    weight: false,
  });

  // 检查是否有任何权限
  const hasAnyPermission = Object.values(permissions).some((v) => v);

  // 初始化
  useEffect(() => {
    const checkAvailability = async () => {
      // Web 端不支持
      if (Platform.OS === 'web') {
        setIsAvailable(false);
        return;
      }

      // iOS 使用 HealthKit（暂不支持）
      if (Platform.OS === 'ios') {
        setIsAvailable(false);
        return;
      }

      // Android: 检查 Health Connect
      const available = await healthConnectService.checkAvailability();
      setIsAvailable(available);

      if (available) {
        const initialized = await healthConnectService.initialize();
        setIsInitialized(initialized);
        setPermissions(healthConnectService.getPermissionsStatus());
      }
    };

    checkAvailability();
  }, []);

  // 初始化服务
  const initialize = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) {
      return false;
    }

    setIsLoading(true);
    try {
      const result = await healthConnectService.initialize();
      setIsInitialized(result);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  // 请求权限
  const requestPermissions = useCallback(async (): Promise<HealthPermissions> => {
    if (!isAvailable) {
      return permissions;
    }

    setIsLoading(true);
    try {
      const result = await healthConnectService.requestPermissions();
      setPermissions(result);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, permissions]);

  // 打开设置
  const openSettings = useCallback(async (): Promise<void> => {
    await healthConnectService.openHealthConnectSettings();
  }, []);

  // 获取健康数据
  const getHealthData = useCallback(async (): Promise<HealthData> => {
    // 优先使用 Health Connect
    if (hasAnyPermission && isInitialized) {
      const hcData = await healthConnectService.getTodayHealthData();
      if (hcData.steps || hcData.heartRate || hcData.bloodPressure || hcData.bloodOxygen) {
        return hcData;
      }
    }

    // 降级使用手机计步器
    const pedometerData = await healthDataService.getHealthData();
    return pedometerData;
  }, [hasAnyPermission, isInitialized]);

  // 获取健康趋势
  const getHealthTrend = useCallback(async (): Promise<HealthTrend> => {
    // 优先使用 Health Connect
    if (hasAnyPermission && isInitialized) {
      const hcTrend = await healthConnectService.getHealthTrend();
      if (hcTrend) {
        return hcTrend;
      }
    }

    // 降级使用手机计步器
    const pedometerTrend = await healthDataService.getHealthTrend();
    return pedometerTrend;
  }, [hasAnyPermission, isInitialized]);

  return {
    isAvailable,
    isInitialized,
    isLoading,
    permissions,
    hasAnyPermission,
    initialize,
    requestPermissions,
    openSettings,
    getHealthData,
    getHealthTrend,
  };
}
