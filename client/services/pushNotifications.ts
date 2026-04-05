/**
 * Expo Push Notifications 服务
 * 
 * 运行环境：
 * - 原生构建（APK/IPA）：完整功能
 * - Expo Go：功能受限
 * - Web：不支持推送
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// 检测运行环境
const isExpoGo = Constants.appOwnership === 'expo';
const isNativeBuild = !isExpoGo && Platform.OS !== 'web';

// 通知模块引用
let Notifications: any = null;
let notificationsAvailable = false;

// 在原生构建中加载 expo-notifications
if (isNativeBuild) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Notifications = require('expo-notifications');
    notificationsAvailable = true;
    
    // 配置通知处理器
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    
    console.log('[Push] expo-notifications 已加载（原生构建）');
  } catch (e) {
    console.warn('[Push] expo-notifications 加载失败:', e);
    notificationsAvailable = false;
  }
} else if (isExpoGo) {
  console.log('[Push] Expo Go 环境，推送功能受限');
}

/**
 * 检查推送通知是否可用
 */
export function isPushAvailable(): boolean {
  return notificationsAvailable;
}

/**
 * 注册推送通知并获取 Token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!notificationsAvailable || !Notifications) {
    console.log('[Push] 推送通知不可用');
    return null;
  }

  // 检查是否是物理设备
  if (!Constants.isDevice) {
    console.log('[Push] 需要物理设备才能使用推送通知');
    return null;
  }

  try {
    // 请求权限
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] 推送通知权限被拒绝');
      return null;
    }

    // 获取 Expo Push Token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    const token = tokenData.data;
    console.log('[Push] 获取到 Push Token:', token);

    // Android 需要创建通知渠道
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      await Notifications.setNotificationChannelAsync('emergency', {
        name: '紧急告警',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 500, 500],
        lightColor: '#FF0000',
      });

      await Notifications.setNotificationChannelAsync('normal', {
        name: '普通通知',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#4F46E5',
      });
    }

    return token;
  } catch (error) {
    console.error('[Push] 获取 Push Token 失败:', error);
    return null;
  }
}

/**
 * 上传 Push Token 到后端
 */
export async function uploadPushToken(userId: number, token: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/push-notifications/register-token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          token,
          deviceType: Platform.OS,
        }),
      }
    );

    const data = await response.json();
    
    if (data.success) {
      console.log('[Push] Token 上传成功');
      return true;
    } else {
      console.error('[Push] Token 上传失败:', data.error);
      return false;
    }
  } catch (error) {
    console.error('[Push] Token 上传异常:', error);
    return false;
  }
}

/**
 * 删除后端的 Push Token（登出时调用）
 */
export async function removePushToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/push-notifications/unregister-token`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }
    );

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('[Push] Token 删除异常:', error);
    return false;
  }
}

/**
 * 初始化推送服务
 */
export async function initializePushNotifications(userId: number): Promise<string | null> {
  if (!notificationsAvailable) {
    console.log('[Push] 推送通知不可用，跳过初始化');
    return null;
  }

  const token = await registerForPushNotificationsAsync();
  
  if (token && userId) {
    await uploadPushToken(userId, token);
  }
  
  return token;
}

/**
 * 添加通知接收监听器
 */
export function addNotificationReceivedListener(
  callback: (notification: any) => void
): any {
  if (!notificationsAvailable || !Notifications) {
    return { remove: () => {} };
  }
  
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * 添加通知响应监听器
 */
export function addNotificationResponseReceivedListener(
  callback: (response: any) => void
): any {
  if (!notificationsAvailable || !Notifications) {
    return { remove: () => {} };
  }
  
  return Notifications.addNotificationResponseReceivedListener(callback);
}
