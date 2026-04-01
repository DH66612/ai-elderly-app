/**
 * 跌倒检测服务
 * 使用时间窗口检测和确认机制
 */
import { getSupabaseClient } from '../storage/database/supabase-client';
import { sseManager } from '../routes/realtime';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

// 跌倒检测配置
const FALL_DETECTION_CONFIG = {
  // 时间窗口：需要连续检测到的帧数
  REQUIRED_FRAMES: 3,
  // 每帧检测的时间间隔（毫秒）
  FRAME_INTERVAL: 1000,
  // 确认等待时间（毫秒）
  CONFIRMATION_TIMEOUT: 30000,
  // 帧数据过期时间（毫秒）
  FRAME_EXPIRY: 10000,
};

// 检测状态存储
interface DetectionFrame {
  timestamp: number;
  isAbnormal: boolean;
  confidence: number;
  analysis: string;
}

interface DetectionSession {
  userId: number;
  deviceId: string;
  frames: DetectionFrame[];
  status: 'monitoring' | 'alerting' | 'confirmed' | 'dismissed';
  alertId?: string;
  confirmTimer?: NodeJS.Timeout;
  createdAt: number;
}

// 活跃的检测会话
const activeSessions: Map<string, DetectionSession> = new Map();

// 待确认的告警
interface PendingAlert {
  id: string;
  userId: number;
  deviceId: string;
  deviceName: string;
  createdAt: number;
  confirmed: boolean;
  responded: boolean;
}

const pendingAlerts: Map<string, PendingAlert> = new Map();

// 跌倒检测系统提示词
const FALL_DETECTION_PROMPT = `你是一个专业的跌倒检测AI。分析摄像头画面描述，判断是否存在跌倒或异常情况。

## 分析要点
1. 人体姿态：是否倒地、蜷缩、异常姿势
2. 运动状态：是否突然倒下、长时间不动
3. 环境因素：地面是否有障碍物、湿滑等
4. 紧急程度：是否需要立即干预

## 输出格式（严格JSON）
{
  "isAbnormal": true/false,
  "confidence": 0.0-1.0,
  "analysis": "分析说明",
  "suggestion": "处理建议"
}

注意：
- confidence >= 0.7 且 isAbnormal=true 才算检测到异常
- 误报代价高，宁可漏报不可误报
`;

class FallDetectionService {
  /**
   * 处理摄像头帧数据
   * @param userId 用户ID
   * @param deviceId 设备ID
   * @param deviceName 设备名称
   * @param frameData 帧数据（base64或描述）
   * @param headers 请求头
   */
  async processFrame(
    userId: number,
    deviceId: string,
    deviceName: string,
    frameData: string,
    headers: Record<string, string>
  ): Promise<{
    isAbnormal: boolean;
    confidence: number;
    analysis: string;
    alertTriggered: boolean;
  }> {
    // 获取或创建检测会话
    const sessionKey = `${userId}_${deviceId}`;
    let session = activeSessions.get(sessionKey);

    if (!session) {
      session = {
        userId,
        deviceId,
        frames: [],
        status: 'monitoring',
        createdAt: Date.now(),
      };
      activeSessions.set(sessionKey, session);
    }

    // 如果已经在告警状态，不再处理新帧
    if (session.status === 'alerting') {
      return {
        isAbnormal: true,
        confidence: 1,
        analysis: '告警确认中...',
        alertTriggered: false,
      };
    }

    // 分析帧数据
    const analysis = await this.analyzeFrame(frameData, headers);

    // 添加帧到会话
    const frame: DetectionFrame = {
      timestamp: Date.now(),
      isAbnormal: analysis.isAbnormal,
      confidence: analysis.confidence,
      analysis: analysis.analysis,
    };
    session.frames.push(frame);

    // 清理过期帧
    const now = Date.now();
    session.frames = session.frames.filter(
      (f) => now - f.timestamp < FALL_DETECTION_CONFIG.FRAME_EXPIRY
    );

    // 检查是否满足告警条件（时间窗口内连续N帧异常）
    const recentAbnormalFrames = session.frames
      .filter((f) => f.isAbnormal && f.confidence >= 0.7)
      .slice(-FALL_DETECTION_CONFIG.REQUIRED_FRAMES);

    const alertTriggered =
      recentAbnormalFrames.length >= FALL_DETECTION_CONFIG.REQUIRED_FRAMES &&
      session.status === 'monitoring';

    // 触发告警
    if (alertTriggered) {
      session.status = 'alerting';
      await this.triggerAlert(session, deviceName);
    }

    return {
      isAbnormal: analysis.isAbnormal,
      confidence: analysis.confidence,
      analysis: analysis.analysis,
      alertTriggered,
    };
  }

  /**
   * 使用AI分析帧数据
   */
  private async analyzeFrame(
    frameData: string,
    headers: Record<string, string>
  ): Promise<{
    isAbnormal: boolean;
    confidence: number;
    analysis: string;
  }> {
    try {
      const config = new Config();
      const llmClient = new LLMClient(config, headers);

      // 构建分析请求
      const prompt = `分析以下摄像头画面描述，判断是否存在跌倒或异常情况：

画面描述：${frameData}

请输出JSON格式的分析结果。`;

      const response = await llmClient.invoke(
        [
          { role: 'system', content: FALL_DETECTION_PROMPT },
          { role: 'user', content: prompt },
        ],
        {
          model: 'doubao-seed-1-8-251228',
          temperature: 0.1, // 低温度保证稳定性
        }
      );

      // 解析结果
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          isAbnormal: result.isAbnormal ?? false,
          confidence: result.confidence ?? 0,
          analysis: result.analysis ?? '',
        };
      }
    } catch (error) {
      console.error('[FallDetection] AI分析失败:', error);
    }

    // 默认返回正常
    return {
      isAbnormal: false,
      confidence: 0,
      analysis: '分析失败',
    };
  }

  /**
   * 触发告警流程
   */
  private async triggerAlert(session: DetectionSession, deviceName: string): Promise<void> {
    const alertId = `alert_${session.userId}_${Date.now()}`;
    session.alertId = alertId;

    // 创建待确认告警
    const alert: PendingAlert = {
      id: alertId,
      userId: session.userId,
      deviceId: session.deviceId,
      deviceName,
      createdAt: Date.now(),
      confirmed: false,
      responded: false,
    };
    pendingAlerts.set(alertId, alert);

    console.log(`[FallDetection] 触发告警: ${alertId}, 用户: ${session.userId}`);

    // 1. 推送确认请求给老人端
    sseManager.broadcast(session.userId, 'fall_confirmation', {
      alertId,
      deviceName,
      deviceId: session.deviceId,
      message: '检测到异常情况，您是否安好？',
      timestamp: new Date().toISOString(),
    });

    // 2. 启动30秒确认定时器
    session.confirmTimer = setTimeout(async () => {
      const pendingAlert = pendingAlerts.get(alertId);
      if (pendingAlert && !pendingAlert.responded) {
        // 30秒无响应，通知监护人
        await this.notifyGuardian(session.userId, deviceName, session.deviceId, alertId);
        session.status = 'confirmed';
      }
    }, FALL_DETECTION_CONFIG.CONFIRMATION_TIMEOUT);

    // 3. 保存告警记录
    try {
      const client = getSupabaseClient();
      await client.from('fall_alerts').insert({
        user_id: session.userId,
        device_id: session.deviceId,
        device_name: deviceName,
        alert_id: alertId,
        status: 'pending',
        frames_count: session.frames.length,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[FallDetection] 保存告警记录失败:', error);
    }
  }

  /**
   * 老人确认无恙
   */
  async confirmSafe(alertId: string): Promise<boolean> {
    const alert = pendingAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.responded = true;
    alert.confirmed = true;

    // 清除定时器
    const sessionKey = `${alert.userId}_${alert.deviceId}`;
    const session = activeSessions.get(sessionKey);
    if (session && session.confirmTimer) {
      clearTimeout(session.confirmTimer);
      session.status = 'dismissed';
    }

    // 更新数据库
    try {
      const client = getSupabaseClient();
      await client
        .from('fall_alerts')
        .update({ status: 'dismissed', responded_at: new Date().toISOString() })
        .eq('alert_id', alertId);
    } catch (error) {
      console.error('[FallDetection] 更新告警状态失败:', error);
    }

    console.log(`[FallDetection] 老人确认无恙: ${alertId}`);

    // 通知监护人（已确认安全）
    sseManager.broadcast(alert.userId, 'fall_resolved', {
      alertId,
      message: '老人已确认安全',
      timestamp: new Date().toISOString(),
    });

    // 清理
    pendingAlerts.delete(alertId);

    return true;
  }

  /**
   * 老人请求帮助
   */
  async requestHelp(alertId: string): Promise<boolean> {
    const alert = pendingAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.responded = true;

    // 清除定时器，立即通知监护人
    const sessionKey = `${alert.userId}_${alert.deviceId}`;
    const session = activeSessions.get(sessionKey);
    if (session && session.confirmTimer) {
      clearTimeout(session.confirmTimer);
      session.status = 'confirmed';
    }

    // 立即通知监护人
    await this.notifyGuardian(alert.userId, alert.deviceName, alert.deviceId, alertId, true);

    // 更新数据库
    try {
      const client = getSupabaseClient();
      await client
        .from('fall_alerts')
        .update({ status: 'emergency', responded_at: new Date().toISOString() })
        .eq('alert_id', alertId);
    } catch (error) {
      console.error('[FallDetection] 更新告警状态失败:', error);
    }

    pendingAlerts.delete(alertId);

    return true;
  }

  /**
   * 通知监护人
   */
  private async notifyGuardian(
    userId: number,
    deviceName: string,
    deviceId: string,
    alertId: string,
    isEmergency: boolean = false
  ): Promise<void> {
    const title = isEmergency ? '🚨 紧急求助' : '⚠️ 跌倒告警';
    const message = isEmergency
      ? `老人在${deviceName}附近请求帮助，请立即处理！`
      : `检测到${deviceName}附近可能发生跌倒，老人30秒未响应，请立即确认！`;

    console.log(`[FallDetection] 通知监护人: ${title} - ${message}`);

    // 1. SSE实时推送给监护人
    sseManager.broadcast(userId, 'fall_alert', {
      alertId,
      deviceName,
      deviceId,
      title,
      message,
      isEmergency,
      level: 'emergency',
      timestamp: new Date().toISOString(),
    });

    // 2. 保存紧急通知到数据库
    try {
      const client = getSupabaseClient();
      await client.from('notifications').insert({
        user_id: userId,
        type: 'fall_alert',
        title,
        content: message,
        level: 'emergency',
        is_read: false,
        data: {
          alertId,
          deviceName,
          isEmergency,
        },
      });
    } catch (error) {
      console.error('[FallDetection] 保存通知失败:', error);
    }

    // 3. 调用统一推送接口发送紧急通知（用于App推送等）
    try {
      const client = getSupabaseClient();
      
      // 获取监护人的绑定关系
      const { data: bindings } = await client
        .from('user_bindings')
        .select('guardian_id')
        .eq('elderly_id', userId)
        .eq('status', 'accepted');

      if (bindings && bindings.length > 0) {
        // 推送给所有绑定的监护人
        for (const binding of bindings) {
          // SSE推送
          sseManager.broadcast(binding.guardian_id, 'emergency_alert', {
            type: 'fall_detection',
            alertId,
            elderlyId: userId,
            deviceName,
            title,
            message,
            isEmergency,
            level: 'emergency',
            timestamp: new Date().toISOString(),
          });

          // 保存到监护人的通知记录
          await client.from('notifications').insert({
            user_id: binding.guardian_id,
            type: 'fall_alert',
            title,
            content: message,
            level: 'emergency',
            is_read: false,
            data: {
              alertId,
              deviceName,
              isEmergency,
              elderlyId: userId,
            },
          });
        }
      }
    } catch (error) {
      console.error('[FallDetection] 推送给监护人失败:', error);
    }
  }

  /**
   * 获取待确认的告警
   */
  getPendingAlerts(userId: number): PendingAlert[] {
    return Array.from(pendingAlerts.values()).filter((a) => a.userId === userId);
  }

  /**
   * 获取检测状态
   */
  getDetectionStatus(userId: number, deviceId: string): DetectionSession | null {
    const sessionKey = `${userId}_${deviceId}`;
    return activeSessions.get(sessionKey) || null;
  }
}

// 导出单例
export const fallDetectionService = new FallDetectionService();
