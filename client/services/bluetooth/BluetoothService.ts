/**
 * 蓝牙服务 - 封装 BLE 操作
 * 仅支持健康手环设备
 * 支持读取厂家信息、实时健康数据
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  BleDevice, 
  DeviceType, 
  SavedDevice, 
  BluetoothState, 
  DEVICE_TYPE_CONFIG, 
  MANUFACTURER_MAP,
  BraceletHealthData,
  DeviceDataCallbacks
} from './types';

// Web 端不支持蓝牙，使用空实现
let BleManager: any = null;
let State: any = null;

// 仅在移动端导入蓝牙模块
if (Platform.OS !== 'web') {
  try {
    const BlePlx = require('react-native-ble-plx');
    BleManager = BlePlx.BleManager;
    State = BlePlx.State;
  } catch (e) {
    console.warn('[Bluetooth] 无法加载蓝牙模块:', e);
  }
}

// 检查蓝牙是否支持（移动端且模块加载成功）
const isBluetoothSupported = Platform.OS !== 'web' && BleManager !== null;

// 标准 BLE 服务和特征 UUID
const DEVICE_INFO_SERVICE_UUID = '180A';
const MANUFACTURER_NAME_UUID = '2A29';
const MODEL_NUMBER_UUID = '2A24';
const SERIAL_NUMBER_UUID = '2A25';
const FIRMWARE_REVISION_UUID = '2A26';
const HARDWARE_REVISION_UUID = '2A27';

// 心率服务
const HEART_RATE_SERVICE_UUID = '180D';
const HEART_RATE_MEASUREMENT_UUID = '2A37';

// 健康数据服务（部分手环使用）
const HEALTH_THERMOMETER_SERVICE_UUID = '1809';
const BLOOD_PRESSURE_SERVICE_UUID = '1810';

class BluetoothService {
  private bleManager: InstanceType<typeof BleManager> | null = null;
  private state: BluetoothState = {
    isPoweredOn: false,
    isScanning: false,
    discoveredDevices: [],
    connectedDevices: [],
    savedDevices: [],
  };

  private listeners: Set<(state: BluetoothState) => void> = new Set();
  private scanTimeout: ReturnType<typeof setTimeout> | null = null;
  private stateSubscription: any = null;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private initError: string | null = null;
  
  // 设备数据回调
  private dataCallbacks: Map<string, DeviceDataCallbacks> = new Map();
  // 心率通知订阅
  private heartRateSubscriptions: Map<string, any> = new Map();

  constructor() {
    this.loadSavedDevices();
    
    if (isBluetoothSupported) {
      this.initPromise = this.initializeBluetooth();
    } else {
      if (Platform.OS === 'web') {
        this.initError = 'Web端不支持蓝牙功能';
      } else {
        this.initError = '蓝牙模块加载失败，可能需要在真机上运行';
      }
      console.log('[Bluetooth] 蓝牙不支持:', this.initError);
    }
  }

  /**
   * 初始化蓝牙
   */
  private async initializeBluetooth(): Promise<void> {
    if (this.initialized) return;
    
    try {
      console.log('[Bluetooth] 开始初始化...');
      
      this.bleManager = new BleManager();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (this.bleManager) {
        try {
          const currentState = await this.bleManager.state();
          console.log('[Bluetooth] 当前蓝牙状态:', currentState);
          this.state.isPoweredOn = currentState === State.PoweredOn;
        } catch (e) {
          console.warn('[Bluetooth] 获取初始状态失败:', e);
        }
      }
      
      this.stateSubscription = this.bleManager.onStateChange((state: any) => {
        console.log('[Bluetooth] 蓝牙状态变化:', state);
        this.state.isPoweredOn = state === State.PoweredOn;
        this.notifyListeners();
        
        if (state === State.PoweredOff) {
          this.state.discoveredDevices = [];
          this.state.connectedDevices = [];
          this.stopAllDataNotifications();
          this.notifyListeners();
        }
      }, true);
      
      this.initialized = true;
      this.initError = null;
      console.log('[Bluetooth] 初始化完成，状态:', this.state.isPoweredOn ? '已开启' : '未开启');
      this.notifyListeners();
      
    } catch (error) {
      console.error('[Bluetooth] 初始化失败:', error);
      this.initialized = false;
      this.bleManager = null;
      this.initError = error instanceof Error ? error.message : '初始化失败';
    }
  }

  private async ensureInitialized(): Promise<boolean> {
    if (this.initialized && this.bleManager) return true;
    if (this.initPromise) {
      await this.initPromise;
      return this.initialized && this.bleManager !== null;
    }
    return false;
  }

  isSupported(): boolean {
    return isBluetoothSupported;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getInitError(): string | null {
    return this.initError;
  }

  getState(): BluetoothState {
    return { ...this.state };
  }

  subscribe(listener: (state: BluetoothState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  async checkBluetoothState(): Promise<boolean> {
    if (!isBluetoothSupported) return false;

    const isReady = await this.ensureInitialized();
    if (!isReady || !this.bleManager) return false;

    try {
      const state = await this.bleManager.state();
      const isPoweredOn = state === State.PoweredOn;
      this.state.isPoweredOn = isPoweredOn;
      this.notifyListeners();
      return isPoweredOn;
    } catch (error) {
      console.error('[Bluetooth] 检查状态失败:', error);
      return false;
    }
  }

  async refreshState(): Promise<boolean> {
    if (!this.initialized) {
      this.initPromise = this.initializeBluetooth();
      await this.initPromise;
    }
    return this.checkBluetoothState();
  }

  /**
   * 开始扫描设备 - 只扫描健康手环
   */
  async startScan(duration: number = 10000): Promise<void> {
    if (!isBluetoothSupported) return;

    const isReady = await this.ensureInitialized();
    if (!isReady || !this.bleManager) return;

    if (this.state.isScanning) return;

    const isPoweredOn = await this.checkBluetoothState();
    if (!isPoweredOn) {
      console.warn('[Bluetooth] 蓝牙未开启，无法扫描');
      return;
    }

    this.state.discoveredDevices = [];
    this.state.isScanning = true;
    this.notifyListeners();

    console.log('[Bluetooth] 开始扫描健康手环...');

    try {
      // 扫描所有设备，然后过滤出手环
      this.bleManager.startDeviceScan(
        null,
        { allowDuplicates: false },
        (error: any, device: any) => {
          if (error) {
            console.error('[Bluetooth] 扫描错误:', error);
            this.stopScan();
            return;
          }

          if (device) {
            // 只添加健康手环类型的设备
            if (this.isBraceletDevice(device)) {
              this.addDiscoveredDevice(device);
            }
          }
        }
      );

      this.scanTimeout = setTimeout(() => {
        console.log('[Bluetooth] 扫描超时，停止扫描');
        this.stopScan();
      }, duration);
    } catch (error) {
      console.error('[Bluetooth] 启动扫描失败:', error);
      this.state.isScanning = false;
      this.notifyListeners();
    }
  }

  /**
   * 判断设备是否为健康手环
   */
  private isBraceletDevice(device: any): boolean {
    const name = (device.name || device.localName || '').toLowerCase();
    
    // 检查关键词
    const keywords = DEVICE_TYPE_CONFIG[DeviceType.BRACELET].keywords;
    for (const keyword of keywords) {
      if (name.includes(keyword.toLowerCase())) {
        return true;
      }
    }

    // 检查心率服务 UUID
    const serviceUUIDs = device.serviceUUIDs || [];
    if (serviceUUIDs.some((uuid: string) => 
      uuid.toLowerCase().includes('180d') || 
      uuid.toLowerCase().includes('heart')
    )) {
      return true;
    }

    return false;
  }

  stopScan(): void {
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }

    if (this.bleManager) {
      this.bleManager.stopDeviceScan();
    }
    
    this.state.isScanning = false;
    this.notifyListeners();
    console.log('[Bluetooth] 停止扫描');
  }

  /**
   * 添加发现的设备
   */
  private addDiscoveredDevice(device: any): void {
    const exists = this.state.discoveredDevices.find(d => d.id === device.id);
    
    if (!exists) {
      const deviceName = device.name || device.localName || null;
      const manufacturerId = device.manufacturerData ? this.parseManufacturerId(device.manufacturerData) : undefined;
      
      const bleDevice: BleDevice = {
        id: device.id,
        name: deviceName,
        rssi: device.rssi || -100,
        advertisementData: {
          localName: device.localName || undefined,
          manufacturerData: device.manufacturerData || undefined,
          manufacturerId: manufacturerId,
          serviceUUIDs: device.serviceUUIDs || undefined,
        },
        isConnected: false,
        manufacturerName: manufacturerId ? MANUFACTURER_MAP[manufacturerId] : undefined,
      };

      this.state.discoveredDevices.push(bleDevice);
      this.state.discoveredDevices.sort((a, b) => b.rssi - a.rssi);
      this.notifyListeners();
      
      console.log(`[Bluetooth] 发现手环: ${deviceName || '未知'} 厂商: ${bleDevice.manufacturerName || '未知'} RSSI: ${bleDevice.rssi}`);
    }
  }

  /**
   * 解析厂商ID
   */
  private parseManufacturerId(manufacturerData: string): number | undefined {
    try {
      // 厂商ID通常在 manufacturerData 的前两个字节（小端序）
      if (manufacturerData && manufacturerData.length >= 4) {
        // Base64 解码后取前两个字节
        const hex = this.base64ToHex(manufacturerData);
        if (hex.length >= 4) {
          // 小端序：低字节在前
          return parseInt(hex.substring(2, 4) + hex.substring(0, 2), 16);
        }
      }
    } catch (e) {
      console.warn('[Bluetooth] 解析厂商ID失败:', e);
    }
    return undefined;
  }

  private base64ToHex(base64: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    
    base64 = base64.replace(/[^a-z0-9+/=]/gi, '');
    
    while (i < base64.length) {
      const enc1 = chars.indexOf(base64.charAt(i++));
      const enc2 = chars.indexOf(base64.charAt(i++));
      const enc3 = chars.indexOf(base64.charAt(i++));
      const enc4 = chars.indexOf(base64.charAt(i++));
      
      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;
      
      result += chr1.toString(16).padStart(2, '0');
      if (enc3 !== 64) result += chr2.toString(16).padStart(2, '0');
      if (enc4 !== 64) result += chr3.toString(16).padStart(2, '0');
    }
    
    return result;
  }

  /**
   * 连接设备并读取厂家信息
   */
  async connectDevice(deviceId: string): Promise<BleDevice | null> {
    const isReady = await this.ensureInitialized();
    if (!isReady || !this.bleManager) return null;

    console.log(`[Bluetooth] 正在连接设备: ${deviceId}`);

    try {
      await this.bleManager.cancelDeviceConnection(deviceId).catch(() => {});

      const device = await this.bleManager.connectToDevice(deviceId, {
        timeout: 15000,
      });

      await device.discoverAllServicesAndCharacteristics();

      // 读取设备信息
      const deviceInfo = await this.readDeviceInfo(device);

      const deviceName = device.name || device.localName || '未知设备';
      const bleDevice: BleDevice = {
        id: device.id,
        name: deviceName,
        rssi: device.rssi || -100,
        isConnected: true,
        ...deviceInfo,
      };

      // 更新状态
      this.state.connectedDevices = [
        ...this.state.connectedDevices.filter(d => d.id !== deviceId),
        bleDevice,
      ];

      const discoveredIndex = this.state.discoveredDevices.findIndex(d => d.id === deviceId);
      if (discoveredIndex >= 0) {
        this.state.discoveredDevices[discoveredIndex] = {
          ...this.state.discoveredDevices[discoveredIndex],
          isConnected: true,
          ...deviceInfo,
        };
      }

      // 监听断开事件
      device.onDisconnected((_: any, disconnectedDevice: any) => {
        console.log(`[Bluetooth] 设备已断开: ${disconnectedDevice.id}`);
        this.handleDeviceDisconnected(disconnectedDevice.id);
      });

      // 启动心率数据通知
      await this.startHeartRateNotifications(device.id);

      console.log(`[Bluetooth] 连接成功: ${deviceName} [${deviceInfo.manufacturerName || '未知厂商'}]`);

      await this.saveDevice(bleDevice);

      this.notifyListeners();
      return bleDevice;
    } catch (error) {
      console.error('[Bluetooth] 连接失败:', error);
      return null;
    }
  }

  /**
   * 读取设备厂家信息
   */
  private async readDeviceInfo(device: any): Promise<{
    manufacturerName?: string;
    modelNumber?: string;
    serialNumber?: string;
    firmwareRevision?: string;
    hardwareRevision?: string;
  }> {
    const info: any = {};

    try {
      // 尝试读取设备信息服务
      const services = await device.services();
      
      for (const service of services) {
        if (service.uuid.toLowerCase().includes('180a')) {
          // 找到设备信息服务
          const characteristics = await device.characteristicsForService(service.uuid);
          
          for (const char of characteristics) {
            try {
              if (char.uuid.toLowerCase().includes('2a29')) {
                // 厂家名称
                const value = await device.readCharacteristicForService(service.uuid, char.uuid);
                info.manufacturerName = this.decodeCharacteristicValue(value.value);
              } else if (char.uuid.toLowerCase().includes('2a24')) {
                // 型号
                const value = await device.readCharacteristicForService(service.uuid, char.uuid);
                info.modelNumber = this.decodeCharacteristicValue(value.value);
              } else if (char.uuid.toLowerCase().includes('2a25')) {
                // 序列号
                const value = await device.readCharacteristicForService(service.uuid, char.uuid);
                info.serialNumber = this.decodeCharacteristicValue(value.value);
              } else if (char.uuid.toLowerCase().includes('2a26')) {
                // 固件版本
                const value = await device.readCharacteristicForService(service.uuid, char.uuid);
                info.firmwareRevision = this.decodeCharacteristicValue(value.value);
              } else if (char.uuid.toLowerCase().includes('2a27')) {
                // 硬件版本
                const value = await device.readCharacteristicForService(service.uuid, char.uuid);
                info.hardwareRevision = this.decodeCharacteristicValue(value.value);
              }
            } catch (e) {
              // 忽略单个特征读取失败
            }
          }
          break;
        }
      }
    } catch (error) {
      console.warn('[Bluetooth] 读取设备信息失败:', error);
    }

    return info;
  }

  /**
   * 解码特征值
   */
  private decodeCharacteristicValue(base64Value: string | null): string {
    if (!base64Value) return '';
    try {
      const bytes = [];
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let i = 0;
      
      base64Value = base64Value.replace(/[^a-z0-9+/=]/gi, '');
      
      while (i < base64Value.length) {
        const enc1 = chars.indexOf(base64Value.charAt(i++));
        const enc2 = chars.indexOf(base64Value.charAt(i++));
        const enc3 = chars.indexOf(base64Value.charAt(i++));
        const enc4 = chars.indexOf(base64Value.charAt(i++));
        
        bytes.push((enc1 << 2) | (enc2 >> 4));
        if (enc3 !== 64) bytes.push(((enc2 & 15) << 4) | (enc3 >> 2));
        if (enc4 !== 64) bytes.push(((enc3 & 3) << 6) | enc4);
      }
      
      return String.fromCharCode(...bytes.filter(b => b >= 32 && b <= 126)).trim();
    } catch (e) {
      return '';
    }
  }

  /**
   * 启动心率数据通知
   */
  private async startHeartRateNotifications(deviceId: string): Promise<void> {
    if (!this.bleManager) return;

    try {
      // 查找心率服务
      const services = await this.bleManager.servicesForDevice(deviceId);
      
      for (const service of services) {
        if (service.uuid.toLowerCase().includes('180d')) {
          // 找到心率服务
          const characteristics = await this.bleManager.characteristicsForDevice(deviceId, service.uuid);
          
          for (const char of characteristics) {
            if (char.uuid.toLowerCase().includes('2a37')) {
              // 心率测量特征
              console.log('[Bluetooth] 启动心率通知');
              
              const subscription = await this.bleManager.monitorCharacteristicForDevice(
                deviceId,
                service.uuid,
                char.uuid,
                (error: any, characteristic: any) => {
                  if (error) {
                    console.error('[Bluetooth] 心率通知错误:', error);
                    return;
                  }
                  
                  if (characteristic?.value) {
                    const heartRate = this.parseHeartRateValue(characteristic.value);
                    if (heartRate !== null) {
                      console.log(`[Bluetooth] 收到心率数据: ${heartRate} bpm`);
                      const callbacks = this.dataCallbacks.get(deviceId);
                      if (callbacks?.onBraceletData) {
                        callbacks.onBraceletData(deviceId, {
                          heartRate,
                          steps: null,
                          calories: null,
                          distance: null,
                          sleepDuration: null,
                          bloodPressure: null,
                          bloodOxygen: null,
                          timestamp: new Date().toISOString(),
                          dataSource: {
                            heartRate: 'standard',
                          },
                        });
                      }
                    }
                  }
                }
              );
              
              this.heartRateSubscriptions.set(deviceId, subscription);
              return;
            }
          }
        }
      }
      
      console.log('[Bluetooth] 设备不支持标准心率服务');
    } catch (error) {
      console.warn('[Bluetooth] 启动心率通知失败:', error);
    }
  }

  /**
   * 解析心率值
   */
  private parseHeartRateValue(base64Value: string): number | null {
    try {
      const hex = this.base64ToHex(base64Value);
      if (hex.length < 4) return null;
      
      const flags = parseInt(hex.substring(0, 2), 16);
      // Bit 0: 心率值格式 (0 = UINT8, 1 = UINT16)
      const isUINT16 = (flags & 0x01) !== 0;
      
      if (isUINT16) {
        return parseInt(hex.substring(4, 6) + hex.substring(2, 4), 16);
      } else {
        return parseInt(hex.substring(2, 4), 16);
      }
    } catch (e) {
      return null;
    }
  }

  /**
   * 注册数据回调
   */
  registerDataCallbacks(deviceId: string, callbacks: DeviceDataCallbacks): () => void {
    this.dataCallbacks.set(deviceId, callbacks);
    return () => this.dataCallbacks.delete(deviceId);
  }

  /**
   * 读取当前健康数据（手动触发）
   * 只返回能真实读取的数据
   */
  async readHealthData(deviceId: string): Promise<BraceletHealthData | null> {
    const device = this.state.connectedDevices.find(d => d.id === deviceId);
    if (!device || !this.bleManager) return null;

    try {
      // 尝试读取心率（标准BLE服务）
      let heartRate: number | null = null;
      const services = await this.bleManager.servicesForDevice(deviceId);
      
      for (const service of services) {
        if (service.uuid.toLowerCase().includes('180d')) {
          const characteristics = await this.bleManager.characteristicsForDevice(deviceId, service.uuid);
          
          for (const char of characteristics) {
            if (char.uuid.toLowerCase().includes('2a37') && char.isReadable) {
              const value = await this.bleManager.readCharacteristicForDevice(deviceId, service.uuid, char.uuid);
              heartRate = this.parseHeartRateValue(value.value);
            }
          }
        }
      }

      // 返回真实数据 - 心率可读取，其他数据需要品牌特定协议
      return {
        heartRate,
        steps: null, // 需要品牌特定协议
        calories: null, // 需要品牌特定协议
        distance: null, // 需要品牌特定协议
        sleepDuration: null, // 需要品牌特定协议
        bloodPressure: null, // 需要品牌特定协议
        bloodOxygen: null, // 需要品牌特定协议
        timestamp: new Date().toISOString(),
        dataSource: {
          heartRate: heartRate !== null ? 'standard' : 'none',
        },
      };
    } catch (error) {
      console.error('[Bluetooth] 读取健康数据失败:', error);
      return null;
    }
  }

  /**
   * 停止所有数据通知
   */
  private stopAllDataNotifications(): void {
    this.heartRateSubscriptions.forEach((subscription) => {
      try {
        subscription?.remove();
      } catch (e) {
        // 忽略
      }
    });
    this.heartRateSubscriptions.clear();
  }

  async disconnectDevice(deviceId: string): Promise<boolean> {
    const isReady = await this.ensureInitialized();
    if (!isReady || !this.bleManager) return false;

    try {
      // 停止通知
      const subscription = this.heartRateSubscriptions.get(deviceId);
      if (subscription) {
        subscription.remove();
        this.heartRateSubscriptions.delete(deviceId);
      }
      this.dataCallbacks.delete(deviceId);

      await this.bleManager.cancelDeviceConnection(deviceId);
      this.handleDeviceDisconnected(deviceId);
      console.log(`[Bluetooth] 设备已断开: ${deviceId}`);
      return true;
    } catch (error) {
      console.error('[Bluetooth] 断开连接失败:', error);
      return false;
    }
  }

  private handleDeviceDisconnected(deviceId: string): void {
    const device = this.state.connectedDevices.find(d => d.id === deviceId);
    if (device) {
      console.log(`[Bluetooth] 设备断开: ${device.name || deviceId}`);
    }

    // 清理通知
    const subscription = this.heartRateSubscriptions.get(deviceId);
    if (subscription) {
      subscription.remove();
      this.heartRateSubscriptions.delete(deviceId);
    }
    
    // 触发断开回调
    const callbacks = this.dataCallbacks.get(deviceId);
    if (callbacks?.onDisconnected) {
      callbacks.onDisconnected(deviceId);
    }
    this.dataCallbacks.delete(deviceId);

    this.state.connectedDevices = this.state.connectedDevices.filter(d => d.id !== deviceId);

    const discoveredIndex = this.state.discoveredDevices.findIndex(d => d.id === deviceId);
    if (discoveredIndex >= 0) {
      this.state.discoveredDevices[discoveredIndex].isConnected = false;
    }

    this.notifyListeners();
  }

  getDeviceType(_device: BleDevice): DeviceType {
    // 只返回手环类型
    return DeviceType.BRACELET;
  }

  getDeviceTypeLabel(_type?: DeviceType): string {
    return '健康手环';
  }

  getDeviceTypeIcon(_type?: DeviceType): string {
    return 'heart-pulse';
  }

  async saveDevice(device: BleDevice, customName?: string): Promise<void> {
    const existingIndex = this.state.savedDevices.findIndex(d => d.id === device.id);
    
    const savedDevice: SavedDevice = {
      id: device.id,
      name: device.name || '未知设备',
      type: DeviceType.BRACELET,
      manufacturerName: device.manufacturerName,
      modelNumber: device.modelNumber,
      lastConnected: new Date().toISOString(),
      customName: customName || (existingIndex >= 0 ? this.state.savedDevices[existingIndex].customName : undefined),
    };

    if (existingIndex >= 0) {
      this.state.savedDevices[existingIndex] = savedDevice;
    } else {
      this.state.savedDevices.push(savedDevice);
    }

    await this.persistSavedDevices();
    this.notifyListeners();
    
    console.log(`[Bluetooth] 设备已保存: ${savedDevice.name} [${savedDevice.manufacturerName || '未知厂商'}]`);
  }

  async removeSavedDevice(deviceId: string): Promise<void> {
    const device = this.state.savedDevices.find(d => d.id === deviceId);
    this.state.savedDevices = this.state.savedDevices.filter(d => d.id !== deviceId);
    await this.persistSavedDevices();
    this.notifyListeners();
    
    if (device) {
      console.log(`[Bluetooth] 设备已移除: ${device.name}`);
    }
  }

  private async persistSavedDevices(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'bluetooth_saved_devices',
        JSON.stringify(this.state.savedDevices)
      );
    } catch (error) {
      console.error('[Bluetooth] 保存设备列表失败:', error);
    }
  }

  private async loadSavedDevices(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem('bluetooth_saved_devices');
      if (data) {
        this.state.savedDevices = JSON.parse(data);
        console.log(`[Bluetooth] 加载已保存设备: ${this.state.savedDevices.length} 个`);
      }
    } catch (error) {
      console.error('[Bluetooth] 加载设备列表失败:', error);
    }
  }

  destroy(): void {
    this.stopScan();
    this.stopAllDataNotifications();
    if (this.stateSubscription) {
      this.stateSubscription.remove();
    }
    if (this.bleManager) {
      this.bleManager.destroy();
    }
    this.listeners.clear();
    console.log('[Bluetooth] 服务已销毁');
  }
}

export const bluetoothService = new BluetoothService();
