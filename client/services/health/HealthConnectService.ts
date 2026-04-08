/**
 * Health Connect 服务
 * 
 * Android: 使用 Health Connect API (替代已弃用的 Google Fit)
 * iOS: 使用 HealthKit (需要 react-native-health)
 * 
 * 支持读取的数据类型：
 * - 步数 (Steps)
 * - 心率 (HeartRate)
 * - 血压 (BloodPressure)
 * - 血氧 (OxygenSaturation)
 * - 睡眠 (SleepSession)
 * - 体重 (Weight)
 */
import { Platform, Linking, Alert } from 'react-native';
import {
  initialize,
  requestPermission,
  getSdkStatus,
  SdkAvailabilityStatus,
  readRecords,
  openHealthConnectSettings,
  Permission,
} from 'react-native-health-connect';
import {
  HealthData,
  StepData,
  HeartRateData,
  BloodPressureData,
  BloodOxygenData,
  SleepData,
  WeightData,
  HealthPermissions,
  HealthTrend,
} from './types';

// Health Connect 数据类型
const RECORD_TYPES = {
  steps: 'Steps' as const,
  heartRate: 'HeartRate' as const,
  restingHeartRate: 'RestingHeartRate' as const,
  bloodPressure: 'BloodPressure' as const,
  bloodOxygen: 'OxygenSaturation' as const,
  sleep: 'SleepSession' as const,
  weight: 'Weight' as const,
};

class HealthConnectService {
  private isInitialized: boolean = false;
  private isAvailable: boolean = false;
  private permissionsGranted: HealthPermissions = {
    steps: false,
    heartRate: false,
    sleep: false,
    bloodPressure: false,
    bloodOxygen: false,
    weight: false,
  };

  constructor() {
    this.checkAvailability();
  }

  /**
   * 检查 Health Connect 可用性
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // Web 端不支持
      if (Platform.OS === 'web') {
        console.log('[HealthConnect] Web 端不支持 Health Connect');
        this.isAvailable = false;
        return false;
      }

      // iOS 使用 HealthKit，需要另外处理
      if (Platform.OS === 'ios') {
        console.log('[HealthConnect] iOS 端请使用 HealthKit');
        this.isAvailable = false;
        return false;
      }

      // Android: 检查 Health Connect SDK 状态
      const sdkStatus = await getSdkStatus();
      
      if (sdkStatus === SdkAvailabilityStatus.SDK_AVAILABLE) {
        console.log('[HealthConnect] Health Connect 可用');
        this.isAvailable = true;
        return true;
      } else if (sdkStatus === SdkAvailabilityStatus.SDK_UNAVAILABLE) {
        console.log('[HealthConnect] Health Connect 未安装');
        this.isAvailable = false;
        return false;
      } else if (sdkStatus === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
        console.log('[HealthConnect] Health Connect 需要更新');
        this.isAvailable = false;
        return false;
      }

      return false;
    } catch (error) {
      console.warn('[HealthConnect] 检查可用性失败:', error);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * 初始化 Health Connect
   */
  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      // 检查可用性
      const available = await this.checkAvailability();
      if (!available) {
        return false;
      }

      // 初始化 SDK
      const result = await initialize();
      console.log('[HealthConnect] 初始化结果:', result);
      
      this.isInitialized = result;
      return result;
    } catch (error) {
      console.error('[HealthConnect] 初始化失败:', error);
      return false;
    }
  }

  /**
   * 请求健康数据权限
   */
  async requestPermissions(): Promise<HealthPermissions> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        return this.permissionsGranted;
      }
    }

    try {
      // 构建权限请求列表
      const permissions: Permission[] = [
        { accessType: 'read', recordType: RECORD_TYPES.steps },
        { accessType: 'read', recordType: RECORD_TYPES.heartRate },
        { accessType: 'read', recordType: RECORD_TYPES.restingHeartRate },
        { accessType: 'read', recordType: RECORD_TYPES.bloodPressure },
        { accessType: 'read', recordType: RECORD_TYPES.bloodOxygen },
        { accessType: 'read', recordType: RECORD_TYPES.sleep },
        { accessType: 'read', recordType: RECORD_TYPES.weight },
      ];

      // 请求权限
      const granted = await requestPermission(permissions);
      console.log('[HealthConnect] 权限请求结果:', granted);

      // 更新权限状态
      this.permissionsGranted = {
        steps: granted.some((p) => p.accessType === 'read' && p.recordType === RECORD_TYPES.steps),
        heartRate: granted.some((p) => p.accessType === 'read' && (p.recordType === RECORD_TYPES.heartRate || p.recordType === RECORD_TYPES.restingHeartRate)),
        bloodPressure: granted.some((p) => p.accessType === 'read' && p.recordType === RECORD_TYPES.bloodPressure),
        bloodOxygen: granted.some((p) => p.accessType === 'read' && p.recordType === RECORD_TYPES.bloodOxygen),
        sleep: granted.some((p) => p.accessType === 'read' && p.recordType === RECORD_TYPES.sleep),
        weight: granted.some((p) => p.accessType === 'read' && p.recordType === RECORD_TYPES.weight),
      };

      return this.permissionsGranted;
    } catch (error) {
      console.error('[HealthConnect] 请求权限失败:', error);
      return this.permissionsGranted;
    }
  }

  /**
   * 检查当前权限状态
   */
  async checkPermissions(): Promise<HealthPermissions> {
    return this.permissionsGranted;
  }

  /**
   * 打开 Health Connect 设置页面
   */
  async openHealthConnectSettings(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        openHealthConnectSettings();
      }
    } catch (error) {
      console.error('[HealthConnect] 打开设置失败:', error);
      Alert.alert(
        '无法打开 Health Connect',
        '请确保您的设备已安装 Health Connect 应用',
        [{ text: '确定' }]
      );
    }
  }

  /**
   * 读取步数数据
   */
  async readSteps(startDate: Date, endDate: Date): Promise<StepData | null> {
    if (!this.permissionsGranted.steps) {
      return null;
    }

    try {
      const result = await readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      if (!result.records || result.records.length === 0) {
        return null;
      }

      // 计算总步数
      const totalSteps = result.records.reduce((sum, record) => sum + (record.count || 0), 0);

      return {
        steps: totalSteps,
        source: 'health_connect',
        timestamp: endDate.toISOString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    } catch (error) {
      console.error('[HealthConnect] 读取步数失败:', error);
      return null;
    }
  }

  /**
   * 读取心率数据
   */
  async readHeartRate(startDate: Date, endDate: Date): Promise<HeartRateData | null> {
    if (!this.permissionsGranted.heartRate) {
      return null;
    }

    try {
      // 先尝试读取静息心率
      const restingResult = await readRecords('RestingHeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      if (restingResult.records && restingResult.records.length > 0) {
        const latestRecord = restingResult.records[restingResult.records.length - 1];
        return {
          value: latestRecord.beatsPerMinute || 0,
          source: 'health_connect',
          timestamp: latestRecord.time || endDate.toISOString(),
        };
      }

      // 如果没有静息心率，尝试读取心率记录
      const heartRateResult = await readRecords('HeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      if (!heartRateResult.records || heartRateResult.records.length === 0) {
        return null;
      }

      // 计算平均心率
      const allSamples = heartRateResult.records.flatMap((r) => r.samples || []);
      if (allSamples.length === 0) {
        return null;
      }

      const values = allSamples.map((s) => s.beatsPerMinute || 0);
      const avgHeartRate = values.reduce((a, b) => a + b, 0) / values.length;

      return {
        value: Math.round(avgHeartRate),
        source: 'health_connect',
        timestamp: endDate.toISOString(),
        max: Math.max(...values),
        min: Math.min(...values),
      };
    } catch (error) {
      console.error('[HealthConnect] 读取心率失败:', error);
      return null;
    }
  }

  /**
   * 读取血压数据
   */
  async readBloodPressure(startDate: Date, endDate: Date): Promise<BloodPressureData | null> {
    if (!this.permissionsGranted.bloodPressure) {
      return null;
    }

    try {
      const result = await readRecords('BloodPressure', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      if (!result.records || result.records.length === 0) {
        return null;
      }

      // 获取最新血压
      const latestRecord = result.records[result.records.length - 1];

      return {
        systolic: latestRecord.systolic?.inMillimetersOfMercury || 0,
        diastolic: latestRecord.diastolic?.inMillimetersOfMercury || 0,
        source: 'health_connect',
        timestamp: latestRecord.time || endDate.toISOString(),
      };
    } catch (error) {
      console.error('[HealthConnect] 读取血压失败:', error);
      return null;
    }
  }

  /**
   * 读取血氧数据
   */
  async readBloodOxygen(startDate: Date, endDate: Date): Promise<BloodOxygenData | null> {
    if (!this.permissionsGranted.bloodOxygen) {
      return null;
    }

    try {
      const result = await readRecords('OxygenSaturation', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      if (!result.records || result.records.length === 0) {
        return null;
      }

      // 获取最新血氧
      const latestRecord = result.records[result.records.length - 1];

      return {
        value: (latestRecord.percentage || 0) * 100, // 转换为百分比
        source: 'health_connect',
        timestamp: latestRecord.time || endDate.toISOString(),
      };
    } catch (error) {
      console.error('[HealthConnect] 读取血氧失败:', error);
      return null;
    }
  }

  /**
   * 读取睡眠数据
   */
  async readSleep(startDate: Date, endDate: Date): Promise<SleepData | null> {
    if (!this.permissionsGranted.sleep) {
      return null;
    }

    try {
      const result = await readRecords('SleepSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      if (!result.records || result.records.length === 0) {
        return null;
      }

      // 获取最近一次睡眠
      const latestRecord = result.records[result.records.length - 1];
      const startTime = new Date(latestRecord.startTime);
      const endTime = new Date(latestRecord.endTime);
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // 分钟

      return {
        duration,
        source: 'health_connect',
        startTime: latestRecord.startTime,
        endTime: latestRecord.endTime,
      };
    } catch (error) {
      console.error('[HealthConnect] 读取睡眠失败:', error);
      return null;
    }
  }

  /**
   * 读取体重数据
   */
  async readWeight(startDate: Date, endDate: Date): Promise<WeightData | null> {
    if (!this.permissionsGranted.weight) {
      return null;
    }

    try {
      const result = await readRecords('Weight', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      if (!result.records || result.records.length === 0) {
        return null;
      }

      // 获取最新体重
      const latestRecord = result.records[result.records.length - 1];

      return {
        value: latestRecord.weight?.inKilograms || 0,
        source: 'health_connect',
        timestamp: latestRecord.time || endDate.toISOString(),
      };
    } catch (error) {
      console.error('[HealthConnect] 读取体重失败:', error);
      return null;
    }
  }

  /**
   * 获取今日健康数据
   */
  async getTodayHealthData(): Promise<HealthData> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [steps, heartRate, bloodPressure, bloodOxygen, sleep, weight] = await Promise.all([
      this.readSteps(startOfDay, now),
      this.readHeartRate(startOfDay, now),
      this.readBloodPressure(startOfDay, now),
      this.readBloodOxygen(startOfDay, now),
      this.readSleep(startOfDay, now),
      this.readWeight(startOfDay, now),
    ]);

    return {
      steps: steps || undefined,
      heartRate: heartRate || undefined,
      bloodPressure: bloodPressure || undefined,
      bloodOxygen: bloodOxygen || undefined,
      sleep: sleep || undefined,
      weight: weight || undefined,
      timestamp: now.toISOString(),
    };
  }

  /**
   * 获取健康趋势数据（最近7天）
   */
  async getHealthTrend(): Promise<HealthTrend | null> {
    const now = new Date();
    const trendData: HealthTrend = {
      heartRate: [],
      bloodPressure: [],
      bloodOxygen: [],
      steps: [],
      timeLabels: [],
    };

    try {
      // 获取最近6天的数据
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = new Date(startOfDay);
        endOfDay.setHours(23, 59, 59, 999);

        // 时间标签
        trendData.timeLabels.push(`${date.getMonth() + 1}/${date.getDate()}`);

        // 步数
        const steps = await this.readSteps(startOfDay, endOfDay);
        trendData.steps.push(steps?.steps || 0);

        // 心率（取当天平均值）
        const heartRate = await this.readHeartRate(startOfDay, endOfDay);
        trendData.heartRate.push(heartRate?.value || 0);

        // 血压（取收缩压）
        const bloodPressure = await this.readBloodPressure(startOfDay, endOfDay);
        trendData.bloodPressure.push(bloodPressure?.systolic || 0);

        // 血氧
        const bloodOxygen = await this.readBloodOxygen(startOfDay, endOfDay);
        trendData.bloodOxygen.push(bloodOxygen?.value || 0);
      }

      return trendData;
    } catch (error) {
      console.error('[HealthConnect] 获取趋势数据失败:', error);
      return null;
    }
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized && this.isAvailable;
  }

  /**
   * 检查 Health Connect 是否可用
   */
  isHealthConnectAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * 获取当前权限状态
   */
  getPermissionsStatus(): HealthPermissions {
    return { ...this.permissionsGranted };
  }
}

export const healthConnectService = new HealthConnectService();
