/**
 * 蓝牙设备类型定义
 * 仅支持：健康手环、智能摄像头
 */

/**
 * 蓝牙设备基础信息
 */
export interface BleDevice {
  id: string;
  name: string | null;
  rssi: number;
  advertisementData?: {
    localName?: string;
    manufacturerData?: string; // Base64 编码的厂商数据
    manufacturerId?: number; // 厂商ID
    serviceUUIDs?: string[];
  };
  isConnected?: boolean;
  // 真实设备信息
  manufacturerName?: string; // 厂家名称
  modelNumber?: string; // 型号
  serialNumber?: string; // 序列号
  firmwareRevision?: string; // 固件版本
  hardwareRevision?: string; // 硬件版本
}

/**
 * 设备类型枚举 - 仅保留摄像头和健康手环
 */
export enum DeviceType {
  BRACELET = 'bracelet', // 健康手环
  CAMERA = 'camera',     // 智能摄像头
  UNKNOWN = 'unknown',   // 未知设备
}

/**
 * 常见蓝牙厂商ID映射
 */
export const MANUFACTURER_MAP: Record<number, string> = {
  0x004C: 'Apple',
  0x0006: 'Microsoft',
  0x000F: 'Broadcom',
  0x001D: 'Texas Instruments',
  0x001F: 'Qualcomm',
  0x0059: 'Nordic Semiconductor',
  0x0075: 'Samsung',
  0x0087: 'Garmin',
  0x0157: 'Xiaomi',
  0x0171: 'Huawei',
  0x01A7: 'Fitbit',
  0x038F: 'Amazfit',
};

/**
 * 设备类型配置
 */
export const DEVICE_TYPE_CONFIG: Record<DeviceType, {
  label: string;
  icon: string;
  keywords: string[];
  description: string;
  // 标准 BLE 服务 UUID
  serviceUUIDs?: string[];
  // 数据特征 UUID
  dataCharacteristicUUIDs?: string[];
}> = {
  [DeviceType.BRACELET]: {
    label: '健康手环',
    icon: 'heart-pulse',
    keywords: [
      'band', 'bracelet', 'watch', 'fitbit', 'garmin', 
      'huawei', 'xiaomi', 'mi band', 'amazfit', 'apple watch',
      '手环', '手表', '运动', '健康'
    ],
    description: '监测心率、步数、睡眠等健康数据',
    // 心率服务 UUID (标准 Bluetooth Heart Rate Service)
    serviceUUIDs: ['180D'],
    // 心率测量特征 UUID
    dataCharacteristicUUIDs: ['2A37'],
  },
  [DeviceType.CAMERA]: {
    label: '智能摄像头',
    icon: 'video',
    keywords: [
      'camera', 'cam', 'webcam', 'ipc', 'monitor', 
      'surveillance', '摄像头', '摄像', '监控', '看家',
      'baby monitor', 'pet camera', 'yi camera', 'tplink', 'reolink'
    ],
    description: '实时视频监控和安全看护',
    // 视频流服务（通常是厂商自定义）
    serviceUUIDs: [],
    dataCharacteristicUUIDs: [],
  },
  [DeviceType.UNKNOWN]: {
    label: '其他设备',
    icon: 'question',
    keywords: [],
    description: '未知类型的蓝牙设备',
    serviceUUIDs: [],
    dataCharacteristicUUIDs: [],
  },
};

/**
 * 已保存的设备信息
 */
export interface SavedDevice {
  id: string;
  name: string;
  type: DeviceType;
  manufacturerName?: string;
  modelNumber?: string;
  lastConnected?: string;
  customName?: string;
}

/**
 * 蓝牙状态
 */
export interface BluetoothState {
  isPoweredOn: boolean;
  isScanning: boolean;
  discoveredDevices: BleDevice[];
  connectedDevices: BleDevice[];
  savedDevices: SavedDevice[];
}

/**
 * 手环健康数据 - 只显示能真实读取的数据
 * 心率：标准BLE服务(0x180D)，大部分手环支持
 * 其他数据：需要品牌特定协议，显示 "--" 表示不可用
 */
export interface BraceletHealthData {
  // 标准BLE心率服务 - 大部分手环支持
  heartRate: number | null; // 心率 bpm，null表示读取失败
  
  // 以下数据需要品牌特定协议，显示"--"表示不支持
  steps: number | null; // 步数
  calories: number | null; // 卡路里
  distance: number | null; // 距离 米
  sleepDuration: number | null; // 睡眠时长 分钟
  bloodPressure: {
    systolic: number | null; // 收缩压
    diastolic: number | null; // 舒张压
  } | null;
  bloodOxygen: number | null; // 血氧 %
  
  timestamp: string;
  
  // 数据来源标识
  dataSource: {
    heartRate: 'standard' | 'brand' | 'none'; // standard=标准BLE, brand=品牌协议, none=不支持
  };
}

/**
 * 摄像头状态数据
 */
export interface CameraStatusData {
  isRecording: boolean;
  motionDetected: boolean;
  batteryLevel?: number;
  signalStrength: number;
  timestamp: string;
}

/**
 * 设备数据回调
 */
export interface DeviceDataCallbacks {
  onBraceletData?: (deviceId: string, data: BraceletHealthData) => void;
  onCameraStatus?: (deviceId: string, data: CameraStatusData) => void;
  onCameraFrame?: (deviceId: string, frameBase64: string) => void;
  onDisconnected?: (deviceId: string) => void;
  onError?: (deviceId: string, error: Error) => void;
}
