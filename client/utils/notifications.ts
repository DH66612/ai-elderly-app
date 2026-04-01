/**
 * 通知反馈工具
 * 提供铃声和震动反馈功能，用于首页提醒增强
 * 
 * 运行环境：
 * - 原生构建（APK/IPA）：铃声 + 震动完整功能
 * - Expo Go：仅震动功能（expo-haptics 始终可用）
 * - Web：仅震动功能
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
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
    console.log('[通知反馈] expo-notifications 已加载（原生构建）');
  } catch (e) {
    console.warn('[通知反馈] expo-notifications 加载失败:', e);
  }
} else if (isExpoGo || Platform.OS === 'web') {
  console.log('[通知反馈] 仅震动功能可用');
}

/**
 * 提醒类型
 */
export type AlertType = 
  | 'fall'          // 跌倒告警
  | 'medication'    // 用药提醒
  | 'emergency'     // 紧急告警
  | 'video_call'    // 视频通话
  | 'device';       // 设备告警

/**
 * 震动模式配置
 */
const HAPTIC_PATTERNS: Record<AlertType, Haptics.NotificationFeedbackType> = {
  fall: Haptics.NotificationFeedbackType.Warning,
  medication: Haptics.NotificationFeedbackType.Success,
  emergency: Haptics.NotificationFeedbackType.Error,
  video_call: Haptics.NotificationFeedbackType.Warning,
  device: Haptics.NotificationFeedbackType.Warning,
};

/**
 * 初始化通知渠道（Android需要）
 */
export async function initNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android' || !notificationsAvailable || !Notifications) return;

  try {
    await Notifications.setNotificationChannelAsync('emergency', {
      name: '紧急通知',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      lightColor: '#FF0000',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
    });

    await Notifications.setNotificationChannelAsync('medication', {
      name: '用药提醒',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#4CAF50',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
    });

    await Notifications.setNotificationChannelAsync('video-call', {
      name: '视频通话',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2196F3',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
    });

    await Notifications.setNotificationChannelAsync('device', {
      name: '设备告警',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: '#FF9800',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
    });

    console.log('[通知反馈] 通知渠道已初始化');
  } catch (error) {
    console.error('[通知反馈] 初始化通知渠道失败:', error);
  }
}

/**
 * 触发提醒反馈（铃声 + 震动）
 * @param alertType 提醒类型
 * @param title 通知标题（可选，不传则只触发震动）
 * @param body 通知内容（可选）
 * @param data 附加数据（可选）
 */
export async function triggerAlertFeedback(
  alertType: AlertType,
  title?: string,
  body?: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    // 1. 触发震动反馈（始终可用）
    await Haptics.notificationAsync(HAPTIC_PATTERNS[alertType]);

    // 2. 如果有标题且通知功能可用，发送系统通知（带铃声）
    if (title && notificationsAvailable && Notifications) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body: body || '',
            data: { type: alertType, ...data },
            sound: 'default',
            priority: alertType === 'emergency' || alertType === 'fall'
              ? Notifications.AndroidNotificationPriority.MAX
              : Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null,
        });
      } catch (e) {
        console.warn('[通知反馈] 发送通知失败:', e);
      }
    }

    console.log(`[通知反馈] ${alertType} 提醒已触发`);
  } catch (error) {
    console.error('[通知反馈] 触发失败:', error);
  }
}

/**
 * 仅触发震动反馈（无铃声）
 */
export async function triggerHapticOnly(alertType: AlertType): Promise<void> {
  try {
    await Haptics.notificationAsync(HAPTIC_PATTERNS[alertType]);
    console.log(`[通知反馈] ${alertType} 震动已触发`);
  } catch (error) {
    console.error('[通知反馈] 震动触发失败:', error);
  }
}

/**
 * 触发连续震动（用于紧急告警）
 */
export async function triggerRepeatedHaptic(
  count: number = 3,
  interval: number = 500
): Promise<void> {
  try {
    for (let i = 0; i < count; i++) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    console.log(`[通知反馈] 连续震动 ${count} 次已触发`);
  } catch (error) {
    console.error('[通知反馈] 连续震动触发失败:', error);
  }
}

/**
 * 触发跌倒告警反馈（特殊处理：多次震动 + 紧急铃声）
 */
export async function triggerFallAlertFeedback(
  title: string = '跌倒告警',
  body: string = '检测到可能发生跌倒，请及时关注！',
  data?: Record<string, any>
): Promise<void> {
  try {
    // 1. 连续震动3次
    await triggerRepeatedHaptic(3, 400);

    // 2. 发送紧急通知（如果可用）
    if (notificationsAvailable && Notifications) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `⚠️ ${title}`,
            body,
            data: { type: 'fall', ...data },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: null,
        });
      } catch (e) {
        console.warn('[通知反馈] 发送跌倒通知失败:', e);
      }
    }

    console.log('[通知反馈] 跌倒告警反馈已触发');
  } catch (error) {
    console.error('[通知反馈] 跌倒告警反馈失败:', error);
  }
}

/**
 * 触发用药提醒反馈
 */
export async function triggerMedicationReminderFeedback(
  medicineName: string,
  dosage?: string,
  time?: string
): Promise<void> {
  const body = dosage 
    ? `药品：${medicineName}，剂量：${dosage}${time ? `，时间：${time}` : ''}`
    : `该服用 ${medicineName} 了`;

  await triggerAlertFeedback(
    'medication',
    '💊 用药提醒',
    body
  );
}

/**
 * 触发设备告警反馈
 */
export async function triggerDeviceAlertFeedback(
  deviceName: string,
  message: string
): Promise<void> {
  await triggerAlertFeedback(
    'device',
    '📱 设备告警',
    `${deviceName}：${message}`
  );
}
