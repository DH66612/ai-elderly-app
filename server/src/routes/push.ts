/**
 * 推送服务路由
 * 提供通用推送接口，支持扣子HTTP节点调用
 */
import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { sseManager } from './realtime';

const router = express.Router();

/**
 * 通用消息推送接口（供扣子HTTP节点调用）
 * POST /api/v1/push/message
 * 
 * Body: {
 *   user_id: number,          // 目标用户ID（老人ID）
 *   type: string,             // 消息类型：notification | alert | health | device
 *   title: string,            // 消息标题
 *   content: string,          // 消息内容
 *   level?: 'info' | 'warning' | 'emergency',  // 告警级别
 *   data?: object,            // 额外数据
 *   save_to_db?: boolean      // 是否保存到数据库（默认true）
 * }
 * 
 * 返回: {
 *   success: boolean,
 *   message_id?: number,      // 数据库消息ID
 *   pushed: boolean,          // 是否实时推送成功
 *   subscriber_count: number  // 在线订阅者数量
 * }
 */
router.post('/message', async (req, res) => {
  try {
    const { user_id, type, title, content, level, data, save_to_db } = req.body;

    // 参数校验
    if (!user_id) {
      return res.status(400).json({ success: false, error: '缺少 user_id 参数' });
    }
    if (!type) {
      return res.status(400).json({ success: false, error: '缺少 type 参数' });
    }
    if (!title) {
      return res.status(400).json({ success: false, error: '缺少 title 参数' });
    }
    if (!content) {
      return res.status(400).json({ success: false, error: '缺少 content 参数' });
    }

    const client = getSupabaseClient();
    let messageId: number | undefined;
    const shouldSave = save_to_db !== false; // 默认保存

    // 1. 保存到通知数据库
    if (shouldSave) {
      const { data: notification, error: insertError } = await client
        .from('notifications')
        .insert({
          user_id,
          type,
          title,
          content,
          is_read: false,
        })
        .select('id')
        .single();

      if (!insertError && notification) {
        messageId = notification.id;
      }
    }

    // 2. 构建推送数据
    const pushData = {
      id: messageId,
      type,
      title,
      content,
      level: level || 'info',
      data: data || {},
      timestamp: new Date().toISOString(),
    };

    // 3. 实时推送给订阅者（监护人）
    const pushed = sseManager.broadcast(user_id, 'notification', pushData);

    res.json({
      success: true,
      message_id: messageId,
      pushed,
      subscriber_count: sseManager.getConnectionCount(user_id),
    });
  } catch (error) {
    console.error('Push message error:', error);
    res.status(500).json({ success: false, error: '推送消息失败' });
  }
});

/**
 * 批量推送消息
 * POST /api/v1/push/batch
 * 
 * Body: {
 *   user_ids: number[],       // 目标用户ID列表
 *   type: string,
 *   title: string,
 *   content: string,
 *   level?: string,
 *   data?: object
 * }
 */
router.post('/batch', async (req, res) => {
  try {
    const { user_ids, type, title, content, level, data } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ success: false, error: '缺少 user_ids 参数或格式错误' });
    }
    if (!type || !title || !content) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const client = getSupabaseClient();
    const results: { userId: number; pushed: boolean; messageId?: number }[] = [];

    // 批量插入通知
    const notifications = user_ids.map(userId => ({
      user_id: userId,
      type,
      title,
      content,
      is_read: false,
    }));

    const { data: savedNotifications, error } = await client
      .from('notifications')
      .insert(notifications)
      .select('id, user_id');

    // 推送给每个用户
    for (const userId of user_ids) {
      const saved = savedNotifications?.find(n => n.user_id === userId);
      const pushData = {
        id: saved?.id,
        type,
        title,
        content,
        level: level || 'info',
        data: data || {},
        timestamp: new Date().toISOString(),
      };

      const pushed = sseManager.broadcast(userId, 'notification', pushData);

      results.push({
        userId,
        pushed,
        messageId: saved?.id,
      });
    }

    res.json({
      success: true,
      total: user_ids.length,
      pushed_count: results.filter(r => r.pushed).length,
      results,
    });
  } catch (error) {
    console.error('Batch push error:', error);
    res.status(500).json({ success: false, error: '批量推送失败' });
  }
});

/**
 * 紧急告警推送（高优先级）
 * POST /api/v1/push/emergency
 * 
 * Body: {
 *   user_id: number,
 *   alert_type: string,       // 告警类型：fall | heart_rate | blood_pressure | sos
 *   message: string,
 *   location?: { lat: number, lng: number, address: string },
 *   data?: object
 * }
 */
router.post('/emergency', async (req, res) => {
  try {
    const { user_id, alert_type, message, location, data } = req.body;

    if (!user_id || !alert_type || !message) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const client = getSupabaseClient();

    // 1. 创建紧急通知
    const { data: notification } = await client
      .from('notifications')
      .insert({
        user_id,
        type: 'emergency',
        title: `紧急告警：${getAlertTypeLabel(alert_type)}`,
        content: message,
        is_read: false,
      })
      .select('id')
      .single();

    // 2. 构建告警数据
    const alertData = {
      id: notification?.id,
      type: 'emergency',
      alertType: alert_type,
      title: getAlertTypeLabel(alert_type),
      message,
      level: 'emergency',
      location: location || null,
      data: data || {},
      timestamp: new Date().toISOString(),
    };

    // 3. 紧急推送（多次重试确保送达）
    let pushed = sseManager.broadcast(user_id, 'emergency', alertData);
    
    // 如果第一次没推送成功，等待1秒后重试
    if (!pushed) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      pushed = sseManager.broadcast(user_id, 'emergency', alertData);
    }

    // 4. 记录告警日志
    try {
      await client.from('alerts').insert({
        user_id,
        alert_type,
        message,
        level: 'emergency',
        created_at: new Date().toISOString(),
      });
    } catch {
      // 忽略表不存在错误
    }

    res.json({
      success: true,
      alert_id: notification?.id,
      pushed,
      subscriber_count: sseManager.getConnectionCount(user_id),
    });
  } catch (error) {
    console.error('Emergency push error:', error);
    res.status(500).json({ success: false, error: '紧急告警推送失败' });
  }
});

/**
 * 视频通话请求推送
 * POST /api/v1/push/video-call
 * 
 * Body: {
 *   caller_id: number,        // 发起方ID
 *   callee_id: number,        // 接收方ID
 *   caller_name: string,      // 发起方名称
 *   session_id: number        // 通话会话ID
 * }
 */
router.post('/video-call', async (req, res) => {
  try {
    const { caller_id, callee_id, caller_name, session_id } = req.body;

    if (!caller_id || !callee_id || !session_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 推送视频通话请求给接收方
    const callData = {
      id: session_id,
      callerId: caller_id,
      calleeId: callee_id,
      callerName: caller_name || '用户',
      status: 'pending',
      timestamp: new Date().toISOString(),
    };

    const pushed = sseManager.broadcast(callee_id, 'video_call_request', callData);

    res.json({
      success: true,
      pushed,
      subscriber_count: sseManager.getConnectionCount(callee_id),
    });
  } catch (error) {
    console.error('Video call push error:', error);
    res.status(500).json({ success: false, error: '视频通话推送失败' });
  }
});

/**
 * 推送状态查询
 * GET /api/v1/push/status/:userId
 */
router.get('/status/:userId', (req, res) => {
  const { userId } = req.params;
  const count = sseManager.getConnectionCount(parseInt(userId));

  res.json({
    user_id: parseInt(userId),
    online: count > 0,
    subscriber_count: count,
  });
});

// 辅助函数：获取告警类型标签
function getAlertTypeLabel(alertType: string): string {
  const labels: Record<string, string> = {
    fall: '跌倒检测',
    heart_rate: '心率异常',
    blood_pressure: '血压异常',
    sos: '紧急呼救',
    device_offline: '设备离线',
    low_battery: '电量过低',
  };
  return labels[alertType] || '未知告警';
}

export default router;
