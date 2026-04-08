/**
 * 跌倒检测服务
 * 使用时间窗口检测和确认机制
 * 使用 DeepSeek 进行AI分析
 */
import { getSupabaseClient } from '../storage/database/supabase-client';
import { sseManager } from '../routes/realtime';
import { DeepSeekClient } from '../services/deepseek';

// 跌倒检测配置
const FALL_DETECTION_CONFIG = {
  REQUIRED_FRAMES: 3,
  FRAME_INTERVAL: 1000,
  CONFIRMATION_TIMEOUT: 30000,
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

const activeSessions: Map<string, DetectionSession> = new Map();

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

// LLM 客户端实例
const llmClient = new DeepSeekClient();

class FallDetectionService {
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

    if (session.status === 'alerting') {
      return {
        isAbnormal: true,
        confidence: 1,
        analysis: '告警确认中...',
        alertTriggered: false,
      };
    }

    const analysis = await this.analyzeFrame(frameData);

    const frame: DetectionFrame = {
      timestamp: Date.now(),
      isAbnormal: analysis.isAbnormal,
      confidence: analysis.confidence,
      analysis: analysis.analysis,
    };
    session.frames.push(frame);

    const now = Date.now();
    session.frames = session.frames.filter(
      (f) => now - f.timestamp < FALL_DETECTION_CONFIG.FRAME_EXPIRY
    );

    const recentAbnormalFrames = session.frames
      .filter((f) => f.isAbnormal && f.confidence >= 0.7)
      .slice(-FALL_DETECTION_CONFIG.REQUIRED_FRAMES);

    console.log(`[FallDetection] Session: ${sessionKey}, Frames: ${session.frames.length}, Abnormal: ${recentAbnormalFrames.length}, Status: ${session.status}`);

    const alertTriggered =
      recentAbnormalFrames.length >= FALL_DETECTION_CONFIG.REQUIRED_FRAMES &&
      session.status === 'monitoring';

    if (alertTriggered) {
      console.log(`[FallDetection] 触发告警! Session: ${sessionKey}`);
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

  private async analyzeFrame(frameData: string): Promise<{
    isAbnormal: boolean;
    confidence: number;
    analysis: string;
  }> {
    try {
      const prompt = `分析以下摄像头画面描述，判断是否存在跌倒或异常情况：

画面描述：${frameData}

请输出JSON格式的分析结果。`;

      const response = await llmClient.invoke(
        [
          { role: 'system', content: FALL_DETECTION_PROMPT },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.1 }
      );

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

    return {
      isAbnormal: false,
      confidence: 0,
      analysis: '分析失败',
    };
  }

  private async triggerAlert(session: DetectionSession, deviceName: string): Promise<void> {
    const alertId = `alert_${session.userId}_${Date.now()}`;
    session.alertId = alertId;

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

    sseManager.broadcast(session.userId, 'fall_confirmation', {
      alertId,
      deviceName,
      deviceId: session.deviceId,
      message: '检测到异常情况，您是否安好？',
      timestamp: new Date().toISOString(),
    });

    session.confirmTimer = setTimeout(async () => {
      const pendingAlert = pendingAlerts.get(alertId);
      if (pendingAlert && !pendingAlert.responded) {
        await this.notifyGuardian(session.userId, deviceName, session.deviceId, alertId);
        session.status = 'confirmed';
      }
    }, FALL_DETECTION_CONFIG.CONFIRMATION_TIMEOUT);

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

  async confirmSafe(alertId: string): Promise<boolean> {
    const alert = pendingAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.responded = true;
    alert.confirmed = true;

    const sessionKey = `${alert.userId}_${alert.deviceId}`;
    const session = activeSessions.get(sessionKey);
    if (session && session.confirmTimer) {
      clearTimeout(session.confirmTimer);
      session.status = 'dismissed';
    }

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

    sseManager.broadcast(alert.userId, 'fall_resolved', {
      alertId,
      message: '老人已确认安全',
      timestamp: new Date().toISOString(),
    });

    pendingAlerts.delete(alertId);

    return true;
  }

  async requestHelp(alertId: string): Promise<boolean> {
    const alert = pendingAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.responded = true;

    const sessionKey = `${alert.userId}_${alert.deviceId}`;
    const session = activeSessions.get(sessionKey);
    if (session && session.confirmTimer) {
      clearTimeout(session.confirmTimer);
      session.status = 'confirmed';
    }

    await this.notifyGuardian(alert.userId, alert.deviceName, alert.deviceId, alertId, true);

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

    try {
      const client = getSupabaseClient();
      
      const { data: bindings } = await client
        .from('user_bindings')
        .select('guardian_id')
        .eq('elderly_id', userId)
        .eq('status', 'accepted');

      if (bindings && bindings.length > 0) {
        for (const binding of bindings) {
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

  getPendingAlerts(userId: number): PendingAlert[] {
    return Array.from(pendingAlerts.values()).filter((a) => a.userId === userId);
  }

  getDetectionStatus(userId: number, deviceId: string): DetectionSession | null {
    const sessionKey = `${userId}_${deviceId}`;
    return activeSessions.get(sessionKey) || null;
  }
}

export const fallDetectionService = new FallDetectionService();
