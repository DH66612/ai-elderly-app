/**
 * 蓝牙 Hook - 封装蓝牙操作
 */
import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { bluetoothService } from '@/services/bluetooth/BluetoothService';
import { BleDevice, DeviceType, BluetoothState } from '@/services/bluetooth/types';

export function useBluetooth() {
  const [state, setState] = useState<BluetoothState>(bluetoothService.getState());

  // 订阅蓝牙状态变化
  useEffect(() => {
    const unsubscribe = bluetoothService.subscribe(setState);
    return unsubscribe;
  }, []);

  // 是否支持蓝牙（仅移动端）
  const isSupported = Platform.OS !== 'web';

  // 检查蓝牙状态
  const checkBluetoothState = useCallback(async () => {
    return bluetoothService.checkBluetoothState();
  }, []);

  // 开始扫描
  const startScan = useCallback(async (duration?: number) => {
    await bluetoothService.startScan(duration);
  }, []);

  // 停止扫描
  const stopScan = useCallback(() => {
    bluetoothService.stopScan();
  }, []);

  // 连接设备
  const connectDevice = useCallback(async (deviceId: string) => {
    return bluetoothService.connectDevice(deviceId);
  }, []);

  // 断开设备
  const disconnectDevice = useCallback(async (deviceId: string) => {
    return bluetoothService.disconnectDevice(deviceId);
  }, []);

  // 保存设备
  const saveDevice = useCallback(async (device: BleDevice) => {
    await bluetoothService.saveDevice(device);
  }, []);

  // 移除已保存的设备
  const removeSavedDevice = useCallback(async (deviceId: string) => {
    await bluetoothService.removeSavedDevice(deviceId);
  }, []);

  // 获取设备类型
  const getDeviceType = useCallback((device: BleDevice) => {
    return bluetoothService.getDeviceType(device);
  }, []);

  // 获取设备类型名称
  const getDeviceTypeLabel = useCallback((type: DeviceType) => {
    return bluetoothService.getDeviceTypeLabel(type);
  }, []);

  return {
    // 状态
    isPoweredOn: state.isPoweredOn,
    isScanning: state.isScanning,
    discoveredDevices: state.discoveredDevices,
    connectedDevices: state.connectedDevices,
    savedDevices: state.savedDevices,
    
    // 方法
    checkBluetoothState,
    startScan,
    stopScan,
    connectDevice,
    disconnectDevice,
    saveDevice,
    removeSavedDevice,
    getDeviceType,
    getDeviceTypeLabel,
  };
}
