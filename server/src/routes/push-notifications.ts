/**
 * Expo Push Notifications 推送服务
 * 
 * 功能：
 * 1. 保存用户的 Expo Push Token
 * 2. 发送后台推送通知
 * 3. 支持批量推送
 */
import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = express.Router();

// Expo Push API 地址
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * 推送消息接口
 */
interface PushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

/**
 * 发送 Expo Push 通知
 */
export async function sendExpoPushNotification(message: PushMessage): Promise<any> {
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        ...message,
        sound: message.sound ?? 'default',
        priority: message.priority ?? 'high',
      }),
    });

    const result = await response.json();
    console.log('[Push] Expo Push 响应:', JSON.stringify(result));
    return result;
  } catch (error) {
    console.error('[Push] 发送推送失败:', error);
    throw error;
  }
}

/**
 * 批量发送推送通知
 */
export async function sendBatchPushNotifications(messages: PushMessage[]): Promise<any[]> {
  const results = [];
  
  // Expo 限制每次最多发送 100 条
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(batch.map(msg => ({
          ...msg,
          sound: msg.sound ?? 'default',
          priority: msg.priority ?? 'high',
        }))),
      });

      const result = await response.json();
      results.push(result);
    } catch (error) {
      console.error('[Push] 批量推送失败:', error);
      results.push({ error });
    }
  }
  
  return results;
}

/**
 * 获取用户的所有 Push Token
 */
export async function getUserPushTokens(userId: number): Promise<string[]> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId);

  if (error) {
    console.error('[Push] 获取用户Token失败:', error);
    return [];
  }

  return data?.map(row => row.token) || [];
}

/**
 * 发送推送给指定用户
 */
export async function sendPushToUser(
  userId: number,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  const tokens = await getUserPushTokens(userId);
  
  if (tokens.length === 0) {
    console.log(`[Push] 用户 ${userId} 没有注册的 Push Token`);
    return false;
  }

  try {
    await sendExpoPushNotification({
      to: tokens,
      title,
      body,
      data,
    });
    return true;
  } catch (error) {
    console.error(`[Push] 发送给用户 ${userId} 失败:`, error);
    return false;
  }
}

/**
 * 保存用户的 Expo Push Token
 * POST /api/v1/push/register-token
 */
router.post('/register-token', async (req, res) => {
  try {
    const { userId, token, deviceType } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId 和 token 是必填字段' 
      });
    }

    // 验证 Token 格式 (Expo Push Token 以 ExponentPushToken[ 开头)
    if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
      return res.status(400).json({ 
        success: false, 
        error: '无效的 Expo Push Token 格式' 
      });
    }

    const client = getSupabaseClient();

    // 检查 Token 是否已存在
    const { data: existing } = await client
      .from('push_tokens')
      .select('id')
      .eq('token', token)
      .single();

    if (existing) {
      // 更新 updated_at
      await client
        .from('push_tokens')
        .update({ 
          user_id: userId,
          device_type: deviceType || 'mobile',
          updated_at: new Date().toISOString() 
        })
        .eq('token', token);

      return res.json({ 
        success: true, 
        message: 'Token 已更新' 
      });
    }

    // 插入新 Token
    const { error } = await client
      .from('push_tokens')
      .insert({
        user_id: userId,
        token,
        device_type: deviceType || 'mobile',
      });

    if (error) {
      return res.status(500).json({ 
        success: false, 
        error: '保存 Token 失败' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Token 注册成功' 
    });
  } catch (error: any) {
    console.error('[Push] 注册 Token 失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * 删除用户的 Push Token（登出时调用）
 * DELETE /api/v1/push/unregister-token
 */
router.delete('/unregister-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: 'token 是必填字段' 
      });
    }

    const client = getSupabaseClient();

    await client
      .from('push_tokens')
      .delete()
      .eq('token', token);

    res.json({ 
      success: true, 
      message: 'Token 已删除' 
    });
  } catch (error: any) {
    console.error('[Push] 删除 Token 失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * 发送测试推送
 * POST /api/v1/push/test
 */
router.post('/test', async (req, res) => {
  try {
    const { userId, title, body } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId 是必填字段' 
      });
    }

    const success = await sendPushToUser(
      userId,
      title || '测试推送',
      body || '这是一条测试消息'
    );

    res.json({ 
      success,
      message: success ? '推送发送成功' : '推送发送失败（用户无有效Token）' 
    });
  } catch (error: any) {
    console.error('[Push] 测试推送失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * 发送推送给指定用户
 * POST /api/v1/push/send
 */
router.post('/send', async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId, title, body 是必填字段' 
      });
    }

    const success = await sendPushToUser(userId, title, body, data);

    res.json({ 
      success,
      message: success ? '推送发送成功' : '推送发送失败' 
    });
  } catch (error: any) {
    console.error('[Push] 发送推送失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * 批量发送推送
 * POST /api/v1/push/batch-send
 */
router.post('/batch-send', async (req, res) => {
  try {
    const { userIds, title, body, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'userIds 必须是非空数组' 
      });
    }

    if (!title || !body) {
      return res.status(400).json({ 
        success: false, 
        error: 'title 和 body 是必填字段' 
      });
    }

    const client = getSupabaseClient();

    // 获取所有用户的 Token
    const { data: tokens } = await client
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', userIds);

    if (!tokens || tokens.length === 0) {
      return res.json({ 
        success: true, 
        sent: 0, 
        message: '没有可用的 Push Token' 
      });
    }

    // 发送推送
    const pushMessages: PushMessage[] = tokens.map(t => ({
      to: t.token,
      title,
      body,
      data,
    }));

    const results = await sendBatchPushNotifications(pushMessages);

    res.json({ 
      success: true, 
      sent: tokens.length,
      results,
    });
  } catch (error: any) {
    console.error('[Push] 批量推送失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
