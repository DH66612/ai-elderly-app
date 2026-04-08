/**
 * 健康数据服务
 * 
 * 集成多种健康数据源：
 * 1. expo-sensors: 手机计步器（步数）
 * 2. Health Connect / Google Fit（需授权）
 * 3. 蓝牙健康手环（已有）
 */
import { Platform } from 'react-native';
import * as Pedometer from 'expo-sensors/build/Pedometer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  HealthData,
  HealthDataSource,
  StepData,
  HealthTrend,
  HealthPermissions,
} from './types';

// 存储键
const STORAGE_KEYS = {
  TODAY_STEPS: 'health_today_steps',
  STEPS_DATE: 'health_steps_date',
  STEP_HISTORY: 'health_step_history',
};

class HealthDataService {
  private pedometerAvailable: boolean = false;
  private pedometerSubscription: Pedometer.Subscription | null = null;
  private currentStepCount: number = 0;
  private listeners: Set<(data: HealthData) => void> = new Set();

  constructor() {
    this.initPedometer();
  }

  /**
   * 初始化计步器
   */
  private async initPedometer(): Promise<void> {
    try {
      // 检查计步器是否可用
      this.pedometerAvailable = await Pedometer.isAvailableAsync();
      console.log(`[HealthData] 计步器可用: ${this.pedometerAvailable}`);

      if (this.pedometerAvailable) {
        // 恢复今日步数
        await this.restoreTodaySteps();
      }
    } catch (error) {
      console.warn('[HealthData] 初始化计步器失败:', error);
      this.pedometerAvailable = false;
    }
  }

  /**
   * 恢复今日步数
   */
  private async restoreTodaySteps(): Promise<void> {
    try {
      const today = new Date().toDateString();
      const savedDate = await AsyncStorage.getItem(STORAGE_KEYS.STEPS_DATE);

      if (savedDate === today) {
        const savedSteps = await AsyncStorage.getItem(STORAGE_KEYS.TODAY_STEPS);
        if (savedSteps) {
          this.currentStepCount = parseInt(savedSteps, 10) || 0;
        }
      } else {
        // 新的一天，重置步数
        this.currentStepCount = 0;
        await this.saveTodaySteps(0, today);
      }
    } catch (error) {
      console.warn('[HealthData] 恢复步数失败:', error);
    }
  }

  /**
   * 保存今日步数
   */
  private async saveTodaySteps(steps: number, date?: string): Promise<void> {
    try {
      const today = date || new Date().toDateString();
      await AsyncStorage.setItem(STORAGE_KEYS.TODAY_STEPS, steps.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.STEPS_DATE, today);
    } catch (error) {
      console.warn('[HealthData] 保存步数失败:', error);
    }
  }

  /**
   * 开始监听步数变化
   */
  async startPedometerUpdates(): Promise<void> {
    if (!this.pedometerAvailable || this.pedometerSubscription) {
      return;
    }

    try {
      // 获取今日起始时间
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // 获取今日累计步数
      const result = await Pedometer.getStepCountAsync(startOfDay, now);
      this.currentStepCount = result.steps;
      console.log(`[HealthData] 今日步数: ${this.currentStepCount}`);

      // 保存步数
      await this.saveTodaySteps(this.currentStepCount);

      // 开始实时监听
      this.pedometerSubscription = Pedometer.watchStepCount((result) => {
        this.currentStepCount += result.steps;
        this.saveTodaySteps(this.currentStepCount);
        this.notifyListeners();
      });

      // 通知监听器
      this.notifyListeners();
    } catch (error) {
      console.error('[HealthData] 启动计步器监听失败:', error);
    }
  }

  /**
   * 停止监听步数变化
   */
  stopPedometerUpdates(): void {
    if (this.pedometerSubscription) {
      this.pedometerSubscription.remove();
      this.pedometerSubscription = null;
    }
  }

  /**
   * 获取当前步数
   */
  async getStepCount(): Promise<StepData | null> {
    if (!this.pedometerAvailable) {
      return null;
    }

    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const result = await Pedometer.getStepCountAsync(startOfDay, now);

      return {
        steps: result.steps,
        source: 'pedometer',
        timestamp: now.toISOString(),
        startDate: startOfDay.toISOString(),
        endDate: now.toISOString(),
      };
    } catch (error) {
      console.error('[HealthData] 获取步数失败:', error);
      return null;
    }
  }

  /**
   * 获取历史步数（最近7天）
   */
  async getStepHistory(days: number = 7): Promise<StepData[]> {
    if (!this.pedometerAvailable) {
      return [];
    }

    try {
      const history: StepData[] = [];
      const now = new Date();

      for (let i = 0; i < days; i++) {
        const end = new Date(now);
        end.setDate(end.getDate() - i);
        end.setHours(23, 59, 59, 999);

        const start = new Date(end);
        start.setHours(0, 0, 0, 0);

        try {
          const result = await Pedometer.getStepCountAsync(start, end);
          history.push({
            steps: result.steps,
            source: 'pedometer',
            timestamp: end.toISOString(),
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          });
        } catch {
          // 某些天可能没有数据
          history.push({
            steps: 0,
            source: 'pedometer',
            timestamp: end.toISOString(),
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          });
        }
      }

      return history.reverse();
    } catch (error) {
      console.error('[HealthData] 获取步数历史失败:', error);
      return [];
    }
  }

  /**
   * 获取完整健康数据
   */
  async getHealthData(): Promise<HealthData> {
    const steps = await this.getStepCount();

    return {
      steps: steps || undefined,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取健康趋势数据（用于图表）
   */
  async getHealthTrend(): Promise<HealthTrend> {
    const stepHistory = await this.getStepHistory(6);
    
    // 时间标签
    const timeLabels = stepHistory.map((d) => {
      const date = new Date(d.timestamp || '');
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    // 步数数据
    const steps = stepHistory.map((d) => d.steps || 0);

    // 心率数据（目前使用模拟，需要手环或Health Connect）
    const heartRate = Array.from({ length: 6 }, () => 
      Math.floor(65 + Math.random() * 30)
    );

    // 血压数据（模拟）
    const bloodPressure = Array.from({ length: 6 }, () => 
      Math.floor(105 + Math.random() * 25)
    );

    // 血氧数据（模拟）
    const bloodOxygen = Array.from({ length: 6 }, () => 
      Math.floor(96 + Math.random() * 3)
    );

    return {
      heartRate,
      bloodPressure,
      bloodOxygen,
      steps,
      timeLabels,
    };
  }

  /**
   * 检查权限状态
   */
  async checkPermissions(): Promise<HealthPermissions> {
    return {
      steps: this.pedometerAvailable,
      heartRate: false, // 需要Health Connect/HealthKit
      sleep: false,
      bloodPressure: false,
      bloodOxygen: false,
      weight: false,
    };
  }

  /**
   * 检查计步器是否可用
   */
  isPedometerAvailable(): boolean {
    return this.pedometerAvailable;
  }

  /**
   * 获取当前步数（同步）
   */
  getCurrentSteps(): number {
    return this.currentStepCount;
  }

  /**
   * 订阅健康数据更新
   */
  subscribe(listener: (data: HealthData) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    const data: HealthData = {
      steps: {
        steps: this.currentStepCount,
        source: 'pedometer',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    this.listeners.forEach((listener) => listener(data));
  }

  /**
   * 上传健康数据到服务器
   */
  async uploadHealthData(userId: number): Promise<boolean> {
    try {
      const healthData = await this.getHealthData();
      
      if (!healthData.steps) {
        return false;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/health-data/upload`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            data: healthData,
            source: 'phone_sensor',
          }),
        }
      );

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('[HealthData] 上传数据失败:', error);
      return false;
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopPedometerUpdates();
    this.listeners.clear();
  }
}

export const healthDataService = new HealthDataService();
