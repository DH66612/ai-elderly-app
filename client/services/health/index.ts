/**
 * 健康数据服务
 * 
 * 数据来源优先级：
 * 1. 蓝牙健康手环（如果有连接）
 * 2. Health Connect / Google Fit（需要用户授权）
 * 3. 手机传感器（计步器）
 */
export * from './HealthDataService';
export * from './HealthConnectService';
export * from './types';
