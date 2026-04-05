/**
 * 通知服务
 * 处理本地通知推送，用于视频通话等场景
 * 
 * 运行环境：
 * - 原生构建（APK/IPA）：完整功能
 * - Expo Go：功能受限，显示警告
 * - Web：不支持本地通知
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// 检测运行环境
const isExpoGo = Constants.appOwnership === 'expo';
const isNativeBuild = !isExpoGo && Platform.OS !== 'web';

// 通知模块引用
let Notifications: typeof import('expo-notifications') | null = null;
let notificationsAvailable = false;

// 在原生构建中加载 expo-notifications
if (isNativeBuild) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Notifications = require('expo-notifications');
    notificationsAvailable = true;
    
    // 配置通知处理器
    Notifications!.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    
    console.log('[通知] expo-notifications 已加载（原生构建）');
  } catch (e) {
    console.warn('[通知] expo-notifications 加载失败:', e);
    notificationsAvailable = false;
  }
} else if (isExpoGo) {
  console.log('[通知] Expo Go 环境，通知功能受限');
}

export interface VideoCallNotificationData {
  type: 'video_call';
  sessionId: number;
  callerId: number;
  callerName: string;
  calleeId: number;
  [key: string]: unknown;
}

/**
 * 检查通知功能是否可用
 */
export function isNotificationsAvailable(): boolean {
  return notificationsAvailable;
}

/**
 * 请求通知权限
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!notificationsAvailable || !Notifications) {
    console.log('[通知] 通知功能不可用');
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('[通知] 权限未授予');
      return false;
    }
    
    // Android 需要创建通知渠道
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('video-call', {
        name: '视频通话',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8ab3cf',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });
      
      await Notifications.setNotificationChannelAsync('emergency', {
        name: '紧急通知',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FF0000',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });
      
      await Notifications.setNotificationChannelAsync('default', {
        name: '普通通知',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#8ab3cf',
      });
    }
    
    console.log('[通知] 权限已授予');
    return true;
  } catch (error) {
    console.error('[通知] 请求权限失败:', error);
    return false;
  }
}

/**
 * 显示视频通话通知
 */
export async function showVideoCallNotification(data: VideoCallNotificationData): Promise<string> {
  if (!notificationsAvailable || !Notifications) {
    console.log('[通知] 通知功能不可用，跳过视频通话通知');
    return '';
  }

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '视频通话',
        body: `${data.callerName} 正在呼叫您`,
        data: data,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: 'video_call',
      },
      trigger: null, // 立即显示
    });
    
    console.log('[通知] 视频通话通知已发送:', identifier);
    return identifier;
  } catch (error) {
    console.error('[通知] 发送视频通话通知失败:', error);
    return '';
  }
}

/**
 * 显示紧急通知
 */
export async function showEmergencyNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<string> {
  if (!notificationsAvailable || !Notifications) {
    console.log('[通知] 通知功能不可用，跳过紧急通知');
    return '';
  }

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⚠️ ${title}`,
        body,
        data: { type: 'emergency', ...data },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
    
    console.log('[通知] 紧急通知已发送:', identifier);
    return identifier;
  } catch (error) {
    console.error('[通知] 发送紧急通知失败:', error);
    return '';
  }
}

/**
 * 显示普通通知
 */
export async function showNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<string> {
  if (!notificationsAvailable || !Notifications) {
    console.log('[通知] 通知功能不可用，跳过普通通知');
    return '';
  }

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null,
    });
    
    return identifier;
  } catch (error) {
    console.error('[通知] 发送通知失败:', error);
    return '';
  }
}

/**
 * 取消通知
 */
export async function cancelNotification(identifier: string): Promise<void> {
  if (!notificationsAvailable || !Notifications) return;
  
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.error('[通知] 取消通知失败:', error);
  }
}

/**
 * 取消所有通知
 */
export async function cancelAllNotifications(): Promise<void> {
  if (!notificationsAvailable || !Notifications) return;
  
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('[通知] 取消所有通知失败:', error);
  }
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

/**
 * 获取 Expo 推送 Token（如果需要远程推送）
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!notificationsAvailable || !Notifications) {
    return null;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_COZE_PROJECT_ID,
    });
    console.log('[通知] Expo Push Token:', token);
    return token;
  } catch (error) {
    console.error('[通知] 获取 Push Token 失败:', error);
    return null;
  }
}
