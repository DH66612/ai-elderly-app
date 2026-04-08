/**
 * API 配置
 * 自动检测运行环境，返回正确的后端地址
 */
import { Platform } from 'react-native';

/**
 * 后端服务端口
 */
const BACKEND_PORT = 9091;

/**
 * 缓存的 API 基础 URL
 */
let cachedApiBaseUrl: string | null = null;

/**
 * 获取后端API基础URL
 * 
 * 使用优先级：
 * 1. 环境变量 EXPO_PUBLIC_BACKEND_BASE_URL（最高优先级）
 * 2. 环境变量 EXPO_PUBLIC_LOCAL_IP（用于真机调试）
 * 3. 自动检测（Web用localhost，Android模拟器用10.0.2.2）
 * 
 * ⚠️ 真机调试步骤：
 * 1. 确保手机和电脑连接同一WiFi
 * 2. 在终端执行 ifconfig (Mac/Linux) 或 ipconfig (Windows) 查看电脑局域网IP
 * 3. 创建 client/.env 文件，添加：
 *    EXPO_PUBLIC_LOCAL_IP=192.168.1.100  （替换为你的电脑IP）
 * 4. 重新运行 npx expo start
 */
export function getApiBaseUrl(): string {
  // 返回缓存值
  if (cachedApiBaseUrl) {
    return cachedApiBaseUrl;
  }
  
  // 优先级1：完整URL环境变量（生产环境）
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  if (envUrl) {
    console.log('[API] 使用环境变量URL:', envUrl);
    cachedApiBaseUrl = envUrl;
    return envUrl;
  }

  // 优先级2：局域网IP环境变量（真机调试）
  const localIp = process.env.EXPO_PUBLIC_LOCAL_IP;
  if (localIp) {
    const url = `http://${localIp}:${BACKEND_PORT}`;
    console.log('[API] 使用局域网IP:', url);
    cachedApiBaseUrl = url;
    return url;
  }

  // 优先级3：自动检测
  if (__DEV__) {
    // Web端使用 localhost
    if (Platform.OS === 'web') {
      const url = `http://localhost:${BACKEND_PORT}`;
      console.log('[API] Web开发环境:', url);
      cachedApiBaseUrl = url;
      return url;
    }
    
    // Android模拟器使用特殊地址
    // 真机需要配置 EXPO_PUBLIC_LOCAL_IP 环境变量
    if (Platform.OS === 'android') {
      // 检测是否为模拟器（模拟器通常没有eth0网卡或特定属性）
      // 这里默认返回模拟器地址，如果是真机但没有配置IP，会网络错误
      const url = `http://10.0.2.2:${BACKEND_PORT}`;
      console.log('[API] Android环境（默认模拟器）:', url);
      console.log('[API] ⚠️ 如果是真机，请在 client/.env 中配置 EXPO_PUBLIC_LOCAL_IP');
      cachedApiBaseUrl = url;
      return url;
    }
    
    // iOS模拟器使用 localhost
    if (Platform.OS === 'ios') {
      const url = `http://localhost:${BACKEND_PORT}`;
      console.log('[API] iOS环境:', url);
      cachedApiBaseUrl = url;
      return url;
    }
  }

  // 默认返回localhost
  const defaultUrl = `http://localhost:${BACKEND_PORT}`;
  console.log('[API] 默认URL:', defaultUrl);
  cachedApiBaseUrl = defaultUrl;
  return defaultUrl;
}

/**
 * 统一导出的 API 基础 URL
 * 所有模块应该使用此常量，而不是直接访问 process.env
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * 构建完整的API URL
 */
export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${path}`;
}

/**
 * 获取当前API配置信息（用于调试）
 */
export function getApiDebugInfo(): string {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  const localIp = process.env.EXPO_PUBLIC_LOCAL_IP;
  
  return [
    `环境变量 BACKEND_URL: ${envUrl || '未设置'}`,
    `环境变量 LOCAL_IP: ${localIp || '未设置'}`,
    `当前平台: ${Platform.OS}`,
    `开发模式: ${__DEV__ ? '是' : '否'}`,
    `最终URL: ${getApiBaseUrl()}`,
  ].join('\n');
}
