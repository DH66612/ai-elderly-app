/**
 * 健康数据类型定义
 */

// 健康数据来源
export type HealthDataSource = 
  | 'pedometer'      // 手机计步器
  | 'bluetooth'      // 蓝牙手环
  | 'google_fit'     // Google Fit
  | 'health_connect' // Android Health Connect
  | 'health_kit'     // iOS HealthKit
  | 'manual';        // 手动输入

// 步数数据
export interface StepData {
  steps: number;
  distance?: number; // 米
  floors?: number;   // 爬楼层数
  source: HealthDataSource;
  timestamp: string;
  startDate?: string;
  endDate?: string;
}

// 心率数据
export interface HeartRateData {
  value: number;      // bpm
  source: HealthDataSource;
  timestamp: string;
  resting?: number;   // 静息心率
  max?: number;       // 最大心率
  min?: number;       // 最小心率
}

// 睡眠数据
export interface SleepData {
  duration: number;   // 分钟
  deepSleep?: number; // 深睡分钟
  lightSleep?: number; // 浅睡分钟
  remSleep?: number;  // REM睡眠分钟
  awakeTime?: number; // 清醒时间分钟
  source: HealthDataSource;
  startTime: string;
  endTime: string;
  quality?: 'poor' | 'fair' | 'good' | 'excellent';
}

// 血压数据
export interface BloodPressureData {
  systolic: number;   // 收缩压
  diastolic: number;  // 舒张压
  pulse?: number;     // 脉搏
  source: HealthDataSource;
  timestamp: string;
}

// 血氧数据
export interface BloodOxygenData {
  value: number;      // 百分比
  source: HealthDataSource;
  timestamp: string;
}

// 体重数据
export interface WeightData {
  value: number;      // kg
  source: HealthDataSource;
  timestamp: string;
}

// 综合健康数据
export interface HealthData {
  steps?: StepData;
  heartRate?: HeartRateData;
  sleep?: SleepData;
  bloodPressure?: BloodPressureData;
  bloodOxygen?: BloodOxygenData;
  weight?: WeightData;
  timestamp: string;
}

// 健康数据统计（用于图表）
export interface HealthTrend {
  heartRate: number[];
  bloodPressure: number[];
  bloodOxygen: number[];
  steps: number[];
  timeLabels: string[];
}

// 健康数据权限状态
export interface HealthPermissions {
  steps: boolean;
  heartRate: boolean;
  sleep: boolean;
  bloodPressure: boolean;
  bloodOxygen: boolean;
  weight: boolean;
}

// 健康数据提供者配置
export interface HealthProviderConfig {
  googleFit?: {
    enabled: boolean;
    clientId?: string;
  };
  healthConnect?: {
    enabled: boolean;
  };
  healthKit?: {
    enabled: boolean;
  };
}
