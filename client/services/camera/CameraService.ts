/**
 * WiFi摄像头服务
 * 支持主流品牌的WiFi摄像头（通过RTSP/HTTP流）
 * 支持海康威视、大华、小米、TP-Link等品牌
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 摄像头品牌配置
 */
export const CAMERA_BRANDS: Record<string, {
  name: string;
  rtspPort: number;
  httpPort: number;
  defaultUser: string;
  defaultPassword: string;
  rtspPath: string;
  streamUrls?: {
    rtsp?: string;
    http?: string;
    mjpeg?: string;
  };
}> = {
  hikvision: {
    name: '海康威视',
    rtspPort: 554,
    httpPort: 80,
    defaultUser: 'admin',
    defaultPassword: 'admin',
    rtspPath: '/ISAPI/streaming/channels/101',
    streamUrls: {
      rtsp: 'rtsp://{username}:{password}@{ip}:554/ISAPI/streaming/channels/101',
      http: 'http://{username}:{password}@{ip}/ISAPI/streaming/channels/101',
      mjpeg: 'http://{ip}/ISAPI/streaming/channels/101/picture',
    },
  },
  dahua: {
    name: '大华',
    rtspPort: 554,
    httpPort: 80,
    defaultUser: 'admin',
    defaultPassword: 'admin',
    rtspPath: '/cam/realmonitor?channel=1&subtype=0',
    streamUrls: {
      rtsp: 'rtsp://{username}:{password}@{ip}:554/cam/realmonitor?channel=1&subtype=0',
      http: 'http://{username}:{password}@{ip}/cam/realmonitor?channel=1&subtype=0',
      mjpeg: 'http://{ip}/cgi-bin/mjpg/video.cgi',
    },
  },
  xiaomi: {
    name: '小米',
    rtspPort: 554,
    httpPort: 8800,
    defaultUser: 'admin',
    defaultPassword: '',
    rtspPath: '/live/ch00_0',
    streamUrls: {
      rtsp: 'rtsp://{ip}:8554/live/ch00_0',
      http: 'http://{ip}:8800/live/ch00_0',
      mjpeg: 'http://{ip}:8800/live/ch00_0',
    },
  },
  tplink: {
    name: 'TP-Link',
    rtspPort: 554,
    httpPort: 80,
    defaultUser: 'admin',
    defaultPassword: 'admin',
    rtspPath: '/stream1',
    streamUrls: {
      rtsp: 'rtsp://{username}:{password}@{ip}:554/stream1',
      http: 'http://{username}:{password}@{ip}/stream1',
      mjpeg: 'http://{ip}/video/mjpg.cgi',
    },
  },
  reolink: {
    name: 'Reolink',
    rtspPort: 554,
    httpPort: 80,
    defaultUser: 'admin',
    defaultPassword: 'admin',
    rtspPath: '/h264Preview_01_main',
    streamUrls: {
      rtsp: 'rtsp://{username}:{password}@{ip}:554/h264Preview_01_main',
      http: 'http://{username}:{password}@{ip}/h264Preview_01_main',
      mjpeg: 'http://{ip}/cgi-bin/mjpg/video.cgi',
    },
  },
  generic: {
    name: '通用摄像头',
    rtspPort: 554,
    httpPort: 80,
    defaultUser: 'admin',
    defaultPassword: 'admin',
    rtspPath: '/stream',
    streamUrls: {
      rtsp: 'rtsp://{username}:{password}@{ip}:554/stream',
      http: 'http://{username}:{password}@{ip}/stream',
      mjpeg: 'http://{ip}/mjpeg',
    },
  },
};

/**
 * 已配置的摄像头信息
 */
export interface CameraDevice {
  id: string;
  name: string;
  brand: string;
  ipAddress: string;
  port?: number;
  username: string;
  password: string;
  isOnline: boolean;
  lastSeen?: string;
  streamUrl?: string;
}

/**
 * 摄像头帧数据
 */
export interface CameraFrame {
  deviceId: string;
  timestamp: string;
  imageBase64: string;
  motionDetected?: boolean;
}

/**
 * WiFi摄像头管理服务
 */
class CameraService {
  private cameras: CameraDevice[] = [];
  private listeners: Set<(cameras: CameraDevice[]) => void> = new Set();
  private frameCallbacks: Map<string, (frame: CameraFrame) => void> = new Map();
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.loadCameras();
  }

  /**
   * 加载已保存的摄像头
   */
  private async loadCameras(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem('wifi_cameras');
      if (data) {
        this.cameras = JSON.parse(data);
        console.log(`[Camera] 加载已保存摄像头: ${this.cameras.length} 个`);
      }
    } catch (error) {
      console.error('[Camera] 加载摄像头列表失败:', error);
    }
  }

  /**
   * 持久化摄像头列表
   */
  private async persistCameras(): Promise<void> {
    try {
      await AsyncStorage.setItem('wifi_cameras', JSON.stringify(this.cameras));
    } catch (error) {
      console.error('[Camera] 保存摄像头列表失败:', error);
    }
  }

  /**
   * 获取所有摄像头
   */
  getCameras(): CameraDevice[] {
    return [...this.cameras];
  }

  /**
   * 订阅摄像头列表变化
   */
  subscribe(listener: (cameras: CameraDevice[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getCameras());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const cameras = this.getCameras();
    this.listeners.forEach(listener => listener(cameras));
  }

  /**
   * 生成RTSP流URL
   */
  generateRtspUrl(camera: CameraDevice): string {
    const brand = CAMERA_BRANDS[camera.brand] || CAMERA_BRANDS.generic;
    const port = camera.port || brand.rtspPort;
    return `rtsp://${camera.username}:${camera.password}@${camera.ipAddress}:${port}${brand.rtspPath}`;
  }

  /**
   * 生成HTTP流URL（用于WebView）
   */
  generateHttpStreamUrl(camera: CameraDevice): string {
    const brand = CAMERA_BRANDS[camera.brand] || CAMERA_BRANDS.generic;
    const port = camera.port || brand.httpPort;
    // 大多数摄像头支持 MJPEG 流
    return `http://${camera.username}:${camera.password}@${camera.ipAddress}:${port}/video`;
  }

  /**
   * 添加摄像头
   */
  async addCamera(camera: Omit<CameraDevice, 'id' | 'isOnline'>): Promise<CameraDevice> {
    const newCamera: CameraDevice = {
      ...camera,
      id: `camera_${Date.now()}`,
      isOnline: false,
      streamUrl: this.generateRtspUrl({ ...camera, id: '', isOnline: false } as CameraDevice),
    };

    this.cameras.push(newCamera);
    await this.persistCameras();
    this.notifyListeners();

    // 测试连接
    this.testConnection(newCamera.id);

    console.log(`[Camera] 添加摄像头: ${camera.name} (${camera.ipAddress})`);
    return newCamera;
  }

  /**
   * 更新摄像头
   */
  async updateCamera(id: string, updates: Partial<CameraDevice>): Promise<void> {
    const index = this.cameras.findIndex(c => c.id === id);
    if (index >= 0) {
      this.cameras[index] = { ...this.cameras[index], ...updates };
      if (updates.ipAddress || updates.username || updates.password) {
        this.cameras[index].streamUrl = this.generateRtspUrl(this.cameras[index]);
      }
      await this.persistCameras();
      this.notifyListeners();
    }
  }

  /**
   * 删除摄像头
   */
  async removeCamera(id: string): Promise<void> {
    const camera = this.cameras.find(c => c.id === id);
    this.cameras = this.cameras.filter(c => c.id !== id);
    this.stopFramePolling(id);
    await this.persistCameras();
    this.notifyListeners();
    
    if (camera) {
      console.log(`[Camera] 删除摄像头: ${camera.name}`);
    }
  }

  /**
   * 测试摄像头连接
   */
  async testConnection(id: string): Promise<boolean> {
    const camera = this.cameras.find(c => c.id === id);
    if (!camera) return false;

    try {
      // 尝试HTTP请求测试连接
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `http://${camera.ipAddress}:${camera.port || 80}/`,
        { 
          method: 'HEAD',
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      
      const isOnline = response.ok || response.status === 401 || response.status === 403;
      
      // 更新状态
      const index = this.cameras.findIndex(c => c.id === id);
      if (index >= 0) {
        this.cameras[index].isOnline = isOnline;
        this.cameras[index].lastSeen = new Date().toISOString();
        await this.persistCameras();
        this.notifyListeners();
      }

      console.log(`[Camera] 连接测试: ${camera.name} ${isOnline ? '在线' : '离线'}`);
      return isOnline;
    } catch (error) {
      console.log(`[Camera] 连接测试失败: ${camera.name}`, error);
      
      const index = this.cameras.findIndex(c => c.id === id);
      if (index >= 0) {
        this.cameras[index].isOnline = false;
        await this.persistCameras();
        this.notifyListeners();
      }
      
      return false;
    }
  }

  /**
   * 注册帧数据回调
   */
  registerFrameCallback(id: string, callback: (frame: CameraFrame) => void): () => void {
    this.frameCallbacks.set(id, callback);
    return () => this.frameCallbacks.delete(id);
  }

  /**
   * 开始帧轮询（用于不支持实时流的场景）
   */
  startFramePolling(id: string, interval: number = 1000): void {
    const camera = this.cameras.find(c => c.id === id);
    if (!camera) return;

    // 停止之前的轮询
    this.stopFramePolling(id);

    // Web端可以定时请求快照
    if (typeof window !== 'undefined') {
      const poll = async () => {
        try {
          // 请求快照
          const response = await fetch(
            `http://${camera.ipAddress}:${camera.port || 80}/snapshot.jpg`,
            { 
              headers: {
                'Authorization': `Basic ${btoa(`${camera.username}:${camera.password}`)}`,
              },
            }
          );

          if (response.ok) {
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;
              const frameCallback = this.frameCallbacks.get(id);
              if (frameCallback) {
                frameCallback({
                  deviceId: id,
                  timestamp: new Date().toISOString(),
                  imageBase64: base64.split(',')[1],
                });
              }
            };
            reader.readAsDataURL(blob);
          }
        } catch (error) {
          // 忽略轮询错误
        }
      };

      const intervalId = setInterval(poll, interval);
      this.pollIntervals.set(id, intervalId);
    }
  }

  /**
   * 停止帧轮询
   */
  stopFramePolling(id: string): void {
    const intervalId = this.pollIntervals.get(id);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollIntervals.delete(id);
    }
  }

  /**
   * 获取摄像头品牌列表
   */
  getBrandList(): Array<{ id: string; name: string }> {
    return Object.entries(CAMERA_BRANDS).map(([id, config]) => ({
      id,
      name: config.name,
    }));
  }
}

export const cameraService = new CameraService();
