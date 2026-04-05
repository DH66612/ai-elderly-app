/**
 * Expo Config Plugin for react-native-agora
 * 配置 Agora 原生 SDK 所需的权限和 App ID
 */
/* global require, module, process */
const { withAndroidManifest, withInfoPlist, AndroidConfig } = require('expo/config-plugins');

const { addMetaDataItemToMainApplication, getMainApplicationOrThrow } = AndroidConfig.Manifest;

/**
 * 配置 Android 权限和 App ID
 */
const withAgoraAndroid = (config, props) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const mainApplication = getMainApplicationOrThrow(manifest);

    // 添加 Agora App ID 到 meta-data
    addMetaDataItemToMainApplication(
      mainApplication,
      'AGORA_APP_ID',
      props.appId
    );

    // 添加必要的权限（如果不存在）
    const permissions = [
      'android.permission.RECORD_AUDIO',
      'android.permission.CAMERA',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.INTERNET',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_EXTERNAL_STORAGE',
    ];

    permissions.forEach((permission) => {
      const existingPermission = manifest.manifest['uses-permission']?.find(
        (p) => p.$['android:name'] === permission
      );
      if (!existingPermission) {
        if (!manifest.manifest['uses-permission']) {
          manifest.manifest['uses-permission'] = [];
        }
        manifest.manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    // 添加摄像头和麦克风硬件特性（可选，用于商店过滤）
    const features = [
      { name: 'android.hardware.camera', required: false },
      { name: 'android.hardware.camera.autofocus', required: false },
      { name: 'android.hardware.microphone', required: false },
    ];

    features.forEach((feature) => {
      if (!manifest.manifest['uses-feature']) {
        manifest.manifest['uses-feature'] = [];
      }
      const existingFeature = manifest.manifest['uses-feature']?.find(
        (f) => f.$['android:name'] === feature.name
      );
      if (!existingFeature) {
        manifest.manifest['uses-feature'].push({
          $: { 'android:name': feature.name, 'android:required': feature.required ? 'true' : 'false' },
        });
      }
    });

    return config;
  });
};

/**
 * 配置 iOS 权限描述
 */
const withAgoraIOS = (config, props) => {
  return withInfoPlist(config, (config) => {
    const infoPlist = config.modResults;

    // 添加麦克风和摄像头权限描述
    if (!infoPlist.NSMicrophoneUsageDescription) {
      infoPlist.NSMicrophoneUsageDescription = 'AI助老App需要使用麦克风进行视频通话';
    }
    if (!infoPlist.NSCameraUsageDescription) {
      infoPlist.NSCameraUsageDescription = 'AI助老App需要使用摄像头进行视频通话';
    }

    // 后台模式（音频播放）
    if (!infoPlist.UIBackgroundModes) {
      infoPlist.UIBackgroundModes = [];
    }
    if (!infoPlist.UIBackgroundModes.includes('audio')) {
      infoPlist.UIBackgroundModes.push('audio');
    }

    return config;
  });
};

/**
 * 主插件入口
 */
module.exports = function withAgora(config, props) {
  config = withAgoraAndroid(config, props);
  config = withAgoraIOS(config, props);
  return config;
};
