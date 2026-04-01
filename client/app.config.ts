import { ExpoConfig, ConfigContext } from 'expo/config';

const appName = process.env.COZE_PROJECT_NAME || process.env.EXPO_PUBLIC_COZE_PROJECT_NAME || '应用';
const projectId = process.env.COZE_PROJECT_ID || process.env.EXPO_PUBLIC_COZE_PROJECT_ID;

// Agora App ID
const AGORA_APP_ID = '7809bad23efd48ab9b8d1a9798c9909c';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    "name": appName,
    "slug": "ai-elderly-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "aielderly",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "NSMicrophoneUsageDescription": "AI助老App需要使用麦克风进行视频通话",
        "NSCameraUsageDescription": "AI助老App需要使用摄像头进行视频通话",
        "NSLocationWhenInUseUsageDescription": "AI助老App需要访问您的位置以提供周边服务及天气信息",
        "NSBluetoothAlwaysUsageDescription": "AI助老App需要蓝牙权限以连接智能健康设备",
        "NSBluetoothPeripheralUsageDescription": "AI助老App需要蓝牙外设权限以连接智能健康设备"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.aielderly.app",
      "permissions": [
        "android.permission.RECORD_AUDIO",
        "android.permission.CAMERA",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.INTERNET",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      "react-native-health-connect",
      [
        "expo-build-properties",
        {
          "android": {
            "kotlinVersion": "1.9.24",
            "extraMavenRepos": [
              "https://www.jitpack.io"
            ]
          }
        }
      ],
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "允许AI助老App访问您的相册，以便您上传或保存图片。",
          "cameraPermission": "允许AI助老App使用您的相机，以便您直接拍摄照片上传。",
          "microphonePermission": "允许AI助老App访问您的麦克风，以便您拍摄带有声音的视频。"
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "AI助老App需要访问您的位置以提供周边服务及导航功能。"
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "AI助老App需要访问相机以拍摄照片和视频。",
          "microphonePermission": "AI助老App需要访问麦克风以录制视频声音。",
          "recordAudioAndroid": true
        }
      ],
      [
        "react-native-ble-plx",
        {
          "bluetoothAlwaysUsagePermission": "AI助老App需要蓝牙权限以连接智能设备（手环、血压计等）。",
          "bluetoothPeripheralUsagePermission": "AI助老App需要蓝牙外设权限以连接智能健康设备。"
        }
      ],
      [
        "expo-av",
        {
          "microphonePermission": "AI助老App需要使用麦克风进行语音识别和语音通话。"
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/images/icon.png",
          "color": "#8ab3cf",
          "sounds": []
        }
      ],
      [
        "./plugins/agora",
        {
          "appId": AGORA_APP_ID
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
