import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = express.Router();

// SSE连接管理器
class SSEManager {
  private connections: Map<number, Set<express.Response>> = new Map();

  // 添加监护人订阅连接
  addConnection(elderId: number, res: express.Response) {
    if (!this.connections.has(elderId)) {
      this.connections.set(elderId, new Set());
    }
    this.connections.get(elderId)!.add(res);
    console.log(`[SSE] 监护人订阅老人 ${elderId}，当前连接数: ${this.connections.get(elderId)!.size}`);
  }

  // 移除连接
  removeConnection(elderId: number, res: express.Response) {
    const connections = this.connections.get(elderId);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        this.connections.delete(elderId);
      }
      console.log(`[SSE] 断开老人 ${elderId} 的订阅，剩余连接数: ${connections.size}`);
    }
  }

  // 推送数据给老人的监护人
  broadcast(elderId: number, event: string, data: any) {
    const connections = this.connections.get(elderId);
    if (!connections || connections.size === 0) {
      console.log(`[SSE] 老人 ${elderId} 没有订阅者`);
      return false;
    }

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    let sentCount = 0;

    connections.forEach((res) => {
      try {
        res.write(message);
        sentCount++;
      } catch (error) {
        console.error('[SSE] 发送失败:', error);
        connections.delete(res);
      }
    });

    console.log(`[SSE] 向老人 ${elderId} 的 ${sentCount} 个订阅者推送 ${event} 事件`);
    return sentCount > 0;
  }

  // 获取连接状态
  getConnectionCount(elderId: number): number {
    return this.connections.get(elderId)?.size || 0;
  }
}

// 全局SSE管理器实例
export const sseManager = new SSEManager();

// ==================== SSE 订阅接口 ====================

/**
 * 监护人订阅老人数据更新（SSE）
 * GET /api/v1/realtime/subscribe/:elderId
 * 
 * 使用方式：
 * 前端使用 react-native-sse 库连接
 * 
 * 事件类型：
 * - health_data: 健康数据更新
 * - device_status: 设备状态变化
 * - alert: 告警消息
 * - heartbeat: 心跳保活
 */
router.get('/subscribe/:elderId', async (req, res) => {
  const { elderId } = req.params;

  // 验证老人ID
  if (!elderId || isNaN(parseInt(elderId))) {
    return res.status(400).json({ error: '无效的老人ID' });
  }

  // 设置SSE响应头
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, no-transform, must-revalidate');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用nginx缓冲

  // 发送初始连接成功消息
  res.write(`event: connected\ndata: ${JSON.stringify({ elderId: parseInt(elderId), timestamp: new Date().toISOString() })}\n\n`);

  // 注册连接
  sseManager.addConnection(parseInt(elderId), res);

  // 心跳保活（每30秒发送一次）
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    } catch (error) {
      clearInterval(heartbeatInterval);
      sseManager.removeConnection(parseInt(elderId), res);
    }
  }, 30000);

  // 连接关闭时清理
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    sseManager.removeConnection(parseInt(elderId), res);
    res.end();
  });

  req.on('error', (error) => {
    console.error('[SSE] 连接错误:', error);
    clearInterval(heartbeatInterval);
    sseManager.removeConnection(parseInt(elderId), res);
  });
});

// ==================== 数据推送接口 ====================

/**
 * 上传健康数据并实时推送给监护人
 * POST /api/v1/realtime/health-data
 * Body: { user_id: number, device_type: string, data: object }
 */
router.post('/health-data', async (req, res) => {
  try {
    const { user_id, device_type, data } = req.body;

    if (!user_id || !device_type || !data) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const client = getSupabaseClient();

    // 1. 存储健康数据到数据库
    const { data: savedData, error } = await client
      .from('bluetooth_data')
      .insert({
        user_id,
        device_type,
        data,
      })
      .select()
      .single();

    if (error) throw error;

    // 2. 实时推送给订阅该老人的监护人
    const pushData = {
      id: savedData.id,
      userId: user_id,
      deviceType: device_type,
      data: data,
      timestamp: savedData.timestamp,
    };

    const pushed = sseManager.broadcast(user_id, 'health_data', pushData);

    res.json({
      success: true,
      data: savedData,
      pushed: pushed, // 是否成功推送给监护人
      subscriberCount: sseManager.getConnectionCount(user_id),
    });
  } catch (error) {
    console.error('Health data upload error:', error);
    res.status(500).json({ error: '上传健康数据失败' });
  }
});

/**
 * 设备状态变化通知
 * POST /api/v1/realtime/device-status
 * Body: { user_id: number, device_name: string, device_address: string, status: 'connected' | 'disconnected' }
 */
router.post('/device-status', async (req, res) => {
  try {
    const { user_id, device_name, device_address, status } = req.body;

    if (!user_id || !device_name || !status) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 推送设备状态变化给监护人
    const pushed = sseManager.broadcast(user_id, 'device_status', {
      userId: user_id,
      deviceName: device_name,
      deviceAddress: device_address,
      status: status,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      pushed: pushed,
      subscriberCount: sseManager.getConnectionCount(user_id),
    });
  } catch (error) {
    console.error('Device status error:', error);
    res.status(500).json({ error: '推送设备状态失败' });
  }
});

/**
 * 告警消息推送
 * POST /api/v1/realtime/alert
 * Body: { user_id: number, alert_type: string, message: string, level: 'info' | 'warning' | 'emergency' }
 */
router.post('/alert', async (req, res) => {
  try {
    const { user_id, alert_type, message, level } = req.body;

    if (!user_id || !alert_type || !message) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 存储告警记录（可选）
    const client = getSupabaseClient();
    try {
      await client.from('alerts').insert({
        user_id,
        alert_type,
        message,
        level: level || 'info',
        created_at: new Date().toISOString(),
      });
    } catch {
      // 表可能不存在，忽略错误
    }

    // 实时推送告警给监护人
    const pushed = sseManager.broadcast(user_id, 'alert', {
      userId: user_id,
      alertType: alert_type,
      message: message,
      level: level || 'info',
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      pushed: pushed,
      subscriberCount: sseManager.getConnectionCount(user_id),
    });
  } catch (error) {
    console.error('Alert error:', error);
    res.status(500).json({ error: '推送告警失败' });
  }
});

/**
 * 获取订阅状态
 * GET /api/v1/realtime/status/:elderId
 */
router.get('/status/:elderId', (req, res) => {
  const { elderId } = req.params;
  const count = sseManager.getConnectionCount(parseInt(elderId));

  res.json({
    elderId: parseInt(elderId),
    subscriberCount: count,
    isOnline: count > 0,
  });
});

export default router;
