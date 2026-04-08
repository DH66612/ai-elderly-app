# AI 助老 App 功能集成指南

本文档详细说明四大核心功能的预留集成空间和实现要点。

---

## 功能1：健康数据读取（HealthKit/Google Fit）

### 功能说明
从老人端手机的健康数据（HealthKit/Google Fit）获取步数、心率、睡眠等健康数据，并同步到服务器供监护人端查看。

### 技术方案
- **iOS**: 使用 `react-native-health`（HealthKit）
- **Android**: 使用 `react-native-health-connect`（Google Health Connect）

### 实现要点
1. 请求健康数据权限
2. 读取步数、心率、睡眠等数据
3. 数据同步到服务器
4. 定期自动同步（后台任务）

### 集成代码空间

#### 1. 安装依赖

```bash
# iOS
cd client && npx expo install react-native-health

# Android
cd client && npx expo install react-native-health-connect
```

#### 2. 健康数据服务

```typescript
// client/services/health-service.ts
import AppleHealthKit from 'react-native-health';
import { Platform } from 'react-native';

export interface HealthData {
  type: 'steps' | 'heartRate' | 'sleep';
  value: number;
  timestamp: string;
}

class HealthService {
  async init() {
    if (Platform.OS === 'ios') {
      const options = {
        permissions: {
          read: ['Steps', 'HeartRate', 'SleepAnalysis', 'ActiveEnergyBurned'],
          write: [],
        },
      };

      AppleHealthKit.initHealthKit(options, (error) => {
        if (error) {
          console.log('HealthKit init error:', error);
          return false;
        }
        return true;
      });
    } else if (Platform.OS === 'android') {
      // Android Health Connect 初始化
      // 参考 react-native-health-connect 文档
    }
  }

  async getSteps(date: Date): Promise<HealthData | null> {
    if (Platform.OS === 'ios') {
      return new Promise((resolve) => {
        AppleHealthKit.getStepCount(
          {
            date: date.toISOString(),
          },
          (err, results) => {
            if (err || !results) {
              resolve(null);
              return;
            }
            resolve({
              type: 'steps',
              value: results.value,
              timestamp: date.toISOString(),
            });
          }
        );
      });
    }
    return null;
  }

  async getHeartRate(startDate: Date, endDate: Date): Promise<HealthData | null> {
    if (Platform.OS === 'ios') {
      return new Promise((resolve) => {
        AppleHealthKit.getHeartRateSamples(
          {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            limit: 100,
          },
          (err, results) => {
            if (err || !results || results.length === 0) {
              resolve(null);
              return;
            }
            resolve({
              type: 'heartRate',
              value: results[0]?.value,
              timestamp: results[0]?.startDate,
            });
          }
        );
      });
    }
    return null;
  }

  async syncHealthData(userId: number) {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // 获取步数
    const steps = await this.getSteps(today);
    if (steps) {
      await this.uploadHealthData(userId, steps);
    }

    // 获取心率
    const heartRate = await this.getHeartRate(weekAgo, today);
    if (heartRate) {
      await this.uploadHealthData(userId, heartRate);
    }
  }

  private async uploadHealthData(userId: number, data: HealthData) {
    /**
     * 服务端文件：server/src/routes/bluetooth.ts
     * 接口：POST /api/v1/bluetooth/data
     * Body 参数：user_id: number, device_type: string, data: object
     */
    await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/bluetooth/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        device_type: 'healthkit',
        data,
      }),
    });
  }
}

export const healthService = new HealthService();
```

#### 3. 使用示例（在老人端主页）

```typescript
import { healthService } from '@/services/health-service';

useEffect(() => {
  // 初始化健康数据服务
  healthService.init();

  // 每小时同步一次
  const interval = setInterval(() => {
    healthService.syncHealthData(user.id);
  }, 3600000);

  return () => clearInterval(interval);
}, []);
```

### 参考文档
- iOS HealthKit: https://github.com/reggie3/react-native-health
- Android Health Connect: https://developer.android.com/health-connect

---

## 功能2：视频通话（腾讯云TRTC）

### 功能说明
集成腾讯云实时音视频（TRTC），实现老人端与监护人端之间的视频通话功能。

### 技术方案
- 使用 `react-native-trtc`（腾讯云TRTC React Native SDK）
- 后端生成TRTC用户签名
- WebRTC实时音视频传输

### 实现要点
1. 获取TRTC用户签名（后端生成）
2. 初始化TRTC SDK
3. 创建房间/加入房间
4. 音视频流管理
5. 摄像头/麦克风控制

### 集成代码空间

#### 1. 安装依赖

```bash
cd client && npx expo install react-native-trtc
```

#### 2. TRTC服务

```typescript
// client/services/trtc-service.ts
import TRTCCloud from 'react-native-trtc';

export interface TRTCConfig {
  userId: number;
  roomId: string;
  signature: string;
}

class TRTCService {
  private trtcCloud: any = null;

  async init(config: TRTCConfig) {
    this.trtcCloud = new TRTCCloud();

    // 初始化SDK
    await this.trtcCloud.init({
      appId: process.env.EXPO_PUBLIC_TRTC_APP_ID,
      userId: config.userId.toString(),
      userSig: config.signature,
    });

    // 监听事件
    this.setupEventListeners();

    return this.trtcCloud;
  }

  async createRoom(roomId: string, role: 'anchor' | 'audience') {
    if (!this.trtcCloud) {
      throw new Error('TRTC not initialized');
    }

    await this.trtcCloud.createRoom({
      roomId,
      role,
    });
  }

  async startLocalPreview(frontCamera: boolean = true) {
    if (!this.trtcCloud) return;

    await this.trtcCloud.startLocalPreview({
      isFrontCamera: frontCamera,
    });
  }

  async startLocalAudio() {
    if (!this.trtcCloud) return;

    await this.trtcCloud.startLocalAudio();
  }

  async enterRoom(roomId: string) {
    if (!this.trtcCloud) return;

    await this.trtcCloud.enterRoom({
      roomId,
      scene: 1, // 视频通话场景
    });
  }

  async exitRoom() {
    if (!this.trtcCloud) return;

    await this.trtcCloud.exitRoom();
    this.trtcCloud = null;
  }

  private setupEventListeners() {
    // 监听远端用户加入
    this.trtcCloud.on('onRemoteUserEnterRoom', (data) => {
      console.log('远端用户加入:', data);
    });

    // 监听远端用户离开
    this.trtcCloud.on('onRemoteUserLeaveRoom', (data) => {
      console.log('远端用户离开:', data);
    });

    // 监听错误
    this.trtcCloud.on('onError', (error) => {
      console.error('TRTC error:', error);
    });
  }
}

export const trtcService = new TRTCService();
```

#### 3. 后端TRTC签名生成

```typescript
// server/src/services/trtc-sign.ts
import crypto from 'crypto';

/**
 * 生成腾讯云TRTC用户签名
 * 文档：https://cloud.tencent.com/document/product/647/17275
 */
export function generateTRTCSignature(userId: string, expireTime: number = 86400): string {
  const appId = process.env.TRTC_APP_ID;
  const secretKey = process.env.TRTC_SECRET_KEY;
  const currentTime = Math.floor(Date.now() / 1000);
  const expire = currentTime + expireTime;

  const sigStr = `appId:${appId}\nexpired:${expire}\nuserId:${userId}\n`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(sigStr)
    .digest('base64');

  return signature;
}
```

#### 4. 后端API路由

```typescript
// server/src/routes/trtc.ts
import express from 'express';
import { generateTRTCSignature } from '@/services/trtc-sign';

const router = express.Router();

/**
 * 获取TRTC签名
 * GET /api/v1/trtc/signature?userId=xxx
 */
router.get('/signature', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: '用户ID不能为空' });
  }

  try {
    const signature = generateTRTCSignature(userId as string);
    res.json({
      signature,
      appId: process.env.TRTC_APP_ID,
      userId,
    });
  } catch (error) {
    console.error('Generate signature error:', error);
    res.status(500).json({ error: '生成签名失败' });
  }
});

export default router;
```

#### 5. 使用示例（在老人端/监护人端）

```typescript
import { trtcService } from '@/services/trtc-service';

const handleVideoCall = async () => {
  try {
    // 1. 获取TRTC签名
    const signatureRes = await fetch(
      `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/trtc/signature?userId=${user.id}`
    );
    const { signature, appId } = await signatureRes.json();

    // 2. 初始化TRTC
    await trtcService.init({
      userId: user.id,
      roomId: `room_${user.id}_${user.boundUserId}`,
      signature,
    });

    // 3. 创建房间
    await trtcService.createRoom(`room_${user.id}_${user.boundUserId}`, 'anchor');

    // 4. 开启摄像头和麦克风
    await trtcService.startLocalPreview(true);
    await trtcService.startLocalAudio();

    // 5. 进入通话页面
    router.push('/video-call', {
      roomId: `room_${user.id}_${user.boundUserId}`,
    });
  } catch (error) {
    console.error('视频通话失败:', error);
  }
};
```

### 参考文档
- 腾讯云TRTC: https://cloud.tencent.com/document/product/647/45707
- TRTC签名生成: https://cloud.tencent.com/document/product/647/17275

---

## 功能3：方言识别（科大讯飞API）

### 功能说明
集成科大讯飞语音识别API，支持多种方言的实时语音转文字功能，用于语音助手功能。

### 技术方案
- 使用科大讯飞语音听写（流式版）API
- WebSocket实时语音传输
- 支持多种方言配置

### 实现要点
1. 配置科大讯飞API密钥
2. 实现WebSocket连接
3. 实时音频数据传输
4. 方言参数配置
5. 语音指令识别

### 集成代码空间

#### 1. 科大讯飞服务

```typescript
// client/services/iflytek-service.ts
import { Audio } from 'expo-av';

export interface IflytekConfig {
  appId: string;
  apiKey: string;
  apiSecret: string;
  dialect: 'mandarin' | 'cantonese' | 'sichuanese' | 'hunanese' | 'henanese';
}

export interface VoiceRecognitionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

class IflytekService {
  private config: IflytekConfig;
  private websocket: WebSocket | null = null;
  private recording: Audio.Recording | null = null;

  constructor(config: IflytekConfig) {
    this.config = config;
  }

  /**
   * 开始语音识别
   */
  async startVoiceRecognition(
    onResult: (result: VoiceRecognitionResult) => void,
    onError: (error: string) => void
  ) {
    try {
      // 1. 生成鉴权URL
      const authUrl = this.generateAuthUrl();

      // 2. 建立WebSocket连接
      this.websocket = new WebSocket(authUrl);

      this.websocket.onopen = () => {
        console.log('科大讯飞WebSocket连接成功');
        this.startRecording();
      };

      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(data, onResult);
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError('连接失败');
      };

      this.websocket.onclose = () => {
        console.log('WebSocket连接关闭');
        this.stopRecording();
      };
    } catch (error) {
      console.error('启动语音识别失败:', error);
      onError('启动失败');
    }
  }

  /**
   * 停止语音识别
   */
  async stopVoiceRecognition() {
    if (this.websocket) {
      this.websocket.send(JSON.stringify({ data: { status: 2 } })); // 结束识别
      this.websocket.close();
      this.websocket = null;
    }
    await this.stopRecording();
  }

  /**
   * 开始录音
   */
  private async startRecording() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('麦克风权限未授予');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });

      await this.recording.startAsync();

      // 实时发送音频数据
      this.recording.setOnRecordingStatusUpdate(async (status) => {
        if (status.isRecording) {
          const uri = this.recording?.getURI();
          if (uri && this.websocket) {
            // 读取音频数据并发送
            const audioData = await this.readAudioData(uri);
            if (audioData) {
              this.websocket.send(JSON.stringify({
                data: {
                  status: 1, // 实时音频数据
                  format: 'audio/L16;rate=16000',
                  audio: audioData,
                  encoding: 'raw',
                },
              }));
            }
          }
        }
      });
    } catch (error) {
      console.error('录音失败:', error);
    }
  }

  /**
   * 停止录音
   */
  private async stopRecording() {
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
    }
  }

  /**
   * 生成鉴权URL
   */
  private generateAuthUrl(): string {
    const host = 'wss://rtasr.xfyun.cn/v1/ws';
    const date = new Date().toUTCString();
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v1/ws HTTP/1.1`;
    
    // 使用HMAC-SHA256生成签名
    const signature = crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(signatureOrigin)
      .digest('base64');

    const authorization = `api_key="${this.config.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authUrl = `${host}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${encodeURIComponent(host)}`;

    return authUrl;
  }

  /**
   * 处理WebSocket消息
   */
  private handleMessage(data: any, onResult: (result: VoiceRecognitionResult) => void) {
    if (data.code === 0) {
      const result = {
        text: data.data.ws?.[0]?.cw?.[0]?.w || '',
        confidence: data.data.ws?.[0]?.sc || 0,
        isFinal: data.data.pgs === 'rpl', // 最终结果
      };
      onResult(result);
    }
  }

  private async readAudioData(uri: string): Promise<string> {
    // 读取音频数据并转换为Base64
    // 实现略
    return '';
  }
}

export const iflytekService = new IflytekService({
  appId: process.env.EXPO_PUBLIC_IFLYTEK_APP_ID || '',
  apiKey: process.env.EXPO_PUBLIC_IFLYTEK_API_KEY || '',
  apiSecret: process.env.EXPO_PUBLIC_IFLYTEK_API_SECRET || '',
  dialect: 'mandarin', // 默认普通话
});
```

#### 2. 使用示例（在老人端语音助手）

```typescript
import { iflytekService } from '@/services/iflytek-service';

const handleVoiceAssistant = async () => {
  if (!user?.boundUserId) {
    Alert.alert('提示', '请先绑定监护人');
    return;
  }

  Alert.alert('语音助手', '正在录音，请说话...', [
    { text: '停止', onPress: () => iflytekService.stopVoiceRecognition() },
  ]);

  iflytekService.startVoiceRecognition(
    (result) => {
      if (result.isFinal) {
        console.log('识别结果:', result.text);

        // 语音指令识别
        if (result.text.includes('呼叫监护人')) {
          iflytekService.stopVoiceRecognition();
          handleVideoCall();
        } else if (result.text.includes('紧急求助')) {
          iflytekService.stopVoiceRecognition();
          handleEmergencyCall();
        }
      }
    },
    (error) => {
      console.error('语音识别错误:', error);
      Alert.alert('错误', error);
    }
  );
};
```

### 参考文档
- 科大讯飞语音听写API: https://www.xfyun.cn/doc/asr/voicedictation/API.html
- WebSocket鉴权: https://www.xfyun.cn/doc/asr/voicedictation/API.html#%E9%89%BE%E5%AF%B9%E6%96%B9%E8%A8%80

---

## 功能4：本地跌倒检测（手机传感器）

### 功能说明
使用手机加速度传感器和陀螺仪进行实时跌倒检测，检测到跌倒后自动触发报警。

### 技术方案
- 使用 `expo-sensors` 获取加速度和陀螺仪数据
- 实时分析传感器数据
- 机器学习模型或阈值算法判断跌倒
- 检测到跌倒后自动触发报警

### 实现要点
1. 请求传感器权限
2. 订阅加速度和陀螺仪数据
3. 实时数据分析
4. 跌倒检测算法
5. 自动报警机制

### 集成代码空间

#### 1. 跌倒检测服务

```typescript
// client/services/fall-detection-service.ts
import { Accelerometer, Gyroscope } from 'expo-sensors';

export interface SensorData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface FallDetectionResult {
  isFall: boolean;
  confidence: number;
  fallType?: 'forward' | 'backward' | 'side' | 'unknown';
}

class FallDetectionService {
  private accelerationSubscription: any = null;
  private gyroscopeSubscription: any = null;
  private accelerometerData: SensorData[] = [];
  private gyroscopeData: SensorData[] = [];
  private isDetecting = false;

  // 跌倒检测阈值
  private readonly FALL_THRESHOLD = 2.5; // 加速度阈值（g）
  private readonly IMPACT_THRESHOLD = 15; // 冲击阈值（g）
  private readonly ORIENTATION_CHANGE_THRESHOLD = 45; // 方向变化阈值（度）
  private readonly TIME_WINDOW = 500; // 时间窗口（毫秒）

  /**
   * 启动跌倒检测
   */
  async startDetection(
    onFallDetected: (result: FallDetectionResult) => void,
    onError: (error: string) => void
  ) {
    try {
      // 请求传感器权限
      const { status: accelStatus } = await Accelerometer.requestPermissionsAsync();
      const { status: gyroStatus } = await Gyroscope.requestPermissionsAsync();

      if (accelStatus !== 'granted' || gyroStatus !== 'granted') {
        throw new Error('传感器权限未授予');
      }

      this.isDetecting = true;

      // 订阅加速度数据
      this.accelerationSubscription = Accelerometer.addListener((data) => {
        if (!this.isDetecting) return;

        const sensorData: SensorData = {
          x: data.x,
          y: data.y,
          z: data.z,
          timestamp: Date.now(),
        };

        this.accelerometerData.push(sensorData);

        // 保持最近1秒的数据
        const now = Date.now();
        this.accelerometerData = this.accelerometerData.filter(
          (d) => now - d.timestamp < 1000
        );

        // 检测跌倒
        const result = this.detectFall();
        if (result.isFall) {
          onFallDetected(result);
        }
      });

      // 设置加速度更新频率（最快 10ms）
      Accelerometer.setUpdateInterval(10);

      // 订阅陀螺仪数据
      this.gyroscopeSubscription = Gyroscope.addListener((data) => {
        if (!this.isDetecting) return;

        const sensorData: SensorData = {
          x: data.x,
          y: data.y,
          z: data.z,
          timestamp: Date.now(),
        };

        this.gyroscopeData.push(sensorData);

        // 保持最近1秒的数据
        const now = Date.now();
        this.gyroscopeData = this.gyroscopeData.filter(
          (d) => now - d.timestamp < 1000
        );
      });

      // 设置陀螺仪更新频率
      Gyroscope.setUpdateInterval(10);

    } catch (error) {
      console.error('启动跌倒检测失败:', error);
      onError('启动失败');
    }
  }

  /**
   * 停止跌倒检测
   */
  stopDetection() {
    this.isDetecting = false;

    if (this.accelerationSubscription) {
      this.accelerationSubscription.remove();
      this.accelerationSubscription = null;
    }

    if (this.gyroscopeSubscription) {
      this.gyroscopeSubscription.remove();
      this.gyroscopeSubscription = null;
    }

    this.accelerometerData = [];
    this.gyroscopeData = [];
  }

  /**
   * 跌倒检测算法
   */
  private detectFall(): FallDetectionResult {
    if (this.accelerometerData.length < 10) {
      return { isFall: false, confidence: 0 };
    }

    // 计算合加速度
    const totalAccelerations = this.accelerometerData.map(
      (d) => Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z)
    );

    // 1. 检测冲击（突然的加速度变化）
    const maxAcceleration = Math.max(...totalAccelerations);
    if (maxAcceleration < this.IMPACT_THRESHOLD) {
      return { isFall: false, confidence: 0 };
    }

    // 2. 检测失重状态（加速度接近0）
    const minAcceleration = Math.min(...totalAccelerations);
    const hasFreeFall = minAcceleration < this.FALL_THRESHOLD;

    // 3. 检测方向变化
    const orientationChange = this.calculateOrientationChange();
    const hasSignificantOrientationChange = orientationChange > this.ORIENTATION_CHANGE_THRESHOLD;

    // 4. 判断跌倒
    if (hasFreeFall && hasSignificantOrientationChange) {
      // 计算置信度
      const confidence = this.calculateConfidence(maxAcceleration, orientationChange);

      // 判断跌倒类型
      const fallType = this.determineFallType();

      return {
        isFall: true,
        confidence,
        fallType,
      };
    }

    return { isFall: false, confidence: 0 };
  }

  /**
   * 计算方向变化
   */
  private calculateOrientationChange(): number {
    if (this.accelerometerData.length < 2) return 0;

    const first = this.accelerometerData[0];
    const last = this.accelerometerData[this.accelerometerData.length - 1];

    // 计算初始和最终的重力方向
    const firstAngle = Math.atan2(first.y, first.x) * (180 / Math.PI);
    const lastAngle = Math.atan2(last.y, last.x) * (180 / Math.PI);

    const angleChange = Math.abs(lastAngle - firstAngle);

    return angleChange;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(maxAcceleration: number, orientationChange: number): number {
    // 简单的置信度计算
    const accelerationScore = Math.min(maxAcceleration / this.IMPACT_THRESHOLD, 1);
    const orientationScore = Math.min(orientationChange / this.ORIENTATION_CHANGE_THRESHOLD, 1);

    return (accelerationScore + orientationScore) / 2;
  }

  /**
   * 判断跌倒类型
   */
  private determineFallType(): 'forward' | 'backward' | 'side' | 'unknown' {
    if (this.accelerometerData.length < 2) return 'unknown';

    const first = this.accelerometerData[0];
    const last = this.accelerometerData[this.accelerometerData.length - 1];

    // 简单的跌倒类型判断
    if (last.z > 0.8) return 'forward';
    if (last.z < -0.8) return 'backward';
    if (Math.abs(last.x) > 0.8) return 'side';

    return 'unknown';
  }
}

export const fallDetectionService = new FallDetectionService();
```

#### 2. 使用示例（在老人端主页）

```typescript
import { fallDetectionService } from '@/services/fall-detection-service';
import { useEffect } from 'react';

useEffect(() => {
  // 启动跌倒检测
  fallDetectionService.startDetection(
    (result) => {
      if (result.isFall && result.confidence > 0.7) {
        // 检测到跌倒，触发报警
        Alert.alert(
          '⚠️ 跌倒检测',
          '检测到跌倒，是否紧急呼叫监护人？',
          [
            { text: '误报', style: 'cancel' },
            {
              text: '呼叫',
              style: 'destructive',
              onPress: handleEmergencyCall,
            },
          ]
        );
      }
    },
    (error) => {
      console.error('跌倒检测错误:', error);
    }
  );

  return () => {
    // 清理
    fallDetectionService.stopDetection();
  };
}, []);
```

### 参考文档
- Expo Sensors: https://docs.expo.dev/versions/latest/sdk/sensors/
- 跌倒检测算法研究: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6555729/

---

## 总结

四大功能的集成空间已在代码中预留，包括：

1. **健康数据读取** - 已在监护人端主页预留 `handleHealthDataRefresh` 函数
2. **视频通话** - 已在老人端/监护人端主页预留 `handleVideoCall` 函数
3. **方言识别** - 已在老人端主页预留 `handleVoiceAssistant` 函数
4. **跌倒检测** - 已在老人端主页预留 useEffect 钩子

每个功能的详细实现方案、依赖安装、API集成代码均已在本文档中说明。在开发时，只需按照文档进行集成即可。
