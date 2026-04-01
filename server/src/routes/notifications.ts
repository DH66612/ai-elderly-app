import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { sendPushToUser } from './push-notifications';

const router = express.Router();

/**
 * 获取用户通知列表
 * GET /api/v1/notifications?user_id=xxx
 */
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const client = getSupabaseClient();

    // 从数据库获取通知
    const { data: notifications, error } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.log('Notifications query error:', error.message);
      // 返回空列表而不是模拟数据
      return res.json({ notifications: [] });
    }

    const transformedNotifications = (notifications || []).map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      content: n.content,
      isRead: n.is_read,
      time: formatTime(new Date(n.created_at)),
      timestamp: n.created_at,
    }));

    res.json({ notifications: transformedNotifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.json({ notifications: [] });
  }
});

/**
 * 标记单条通知为已读
 * POST /api/v1/notifications/:id/read
 */
router.post('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { error } = await client
      .from('notifications')
      .update({ is_read: true })
      .eq('id', parseInt(id));

    if (error) {
      console.error('Mark as read error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
});

/**
 * 标记所有通知为已读
 * POST /api/v1/notifications/read-all
 * Body: { user_id: number }
 */
router.post('/read-all', async (req, res) => {
  try {
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const client = getSupabaseClient();

    const { error } = await client
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user_id)
      .eq('is_read', false);

    if (error) {
      console.error('Mark all as read error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all as read' });
  }
});

/**
 * 创建通知（同时触发推送）
 * POST /api/v1/notifications
 * Body: { user_id: number, type: string, title: string, content: string, push?: boolean }
 */
router.post('/', async (req, res) => {
  try {
    const { user_id, type, title, content, push = true } = req.body;

    if (!user_id || !type || !title || !content) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const client = getSupabaseClient();

    // 1. 保存通知到数据库
    const { data, error } = await client
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        content,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Create notification error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // 2. 发送 Expo Push 推送（异步，不阻塞响应）
    if (push) {
      sendPushToUser(user_id, title, content, { 
        type, 
        notificationId: data.id,
        screen: type === 'emergency' ? 'notification-detail' : 'notifications'
      })
        .then(success => {
          console.log(`[通知] 用户 ${user_id} 推送${success ? '成功' : '失败（无Token）'}`);
        })
        .catch(err => {
          console.error('[通知] 推送失败:', err);
        });
    }

    // 3. SSE 实时推送（如果有活跃连接）
    // 这个功能在 realtime.ts 中已实现

    res.json({ success: true, notification: data });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to create notification' });
  }
});

/**
 * 批量创建通知并发送推送
 * POST /api/v1/notifications/batch
 * Body: { notifications: [{ user_id, type, title, content }], push?: boolean }
 */
router.post('/batch', async (req, res) => {
  try {
    const { notifications, push = true } = req.body;

    if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({ success: false, error: 'notifications array is required' });
    }

    const client = getSupabaseClient();

    // 批量插入通知
    const notificationsToInsert = notifications.map(n => ({
      user_id: n.user_id,
      type: n.type,
      title: n.title,
      content: n.content,
      is_read: false,
    }));

    const { data, error } = await client
      .from('notifications')
      .insert(notificationsToInsert)
      .select();

    if (error) {
      console.error('Batch create notifications error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // 批量发送推送
    if (push) {
      // 按用户分组发送推送
      const userNotifications = new Map<number, { title: string; content: string }[]>();
      notifications.forEach(n => {
        if (!userNotifications.has(n.user_id)) {
          userNotifications.set(n.user_id, []);
        }
        userNotifications.get(n.user_id)!.push({ title: n.title, content: n.content });
      });

      // 异步发送推送
      userNotifications.forEach((items, userId) => {
        // 每个用户只发送第一条通知的推送
        const first = items[0];
        sendPushToUser(userId, first.title, first.content)
          .then(success => {
            console.log(`[批量通知] 用户 ${userId} 推送${success ? '成功' : '失败'}`);
          })
          .catch(err => {
            console.error(`[批量通知] 用户 ${userId} 推送失败:`, err);
          });
      });
    }

    res.json({ success: true, count: data.length, notifications: data });
  } catch (error) {
    console.error('Batch create notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to batch create notifications' });
  }
});

/**
 * 获取未读通知数量
 * GET /api/v1/notifications/unread-count?user_id=xxx
 */
router.get('/unread-count', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const client = getSupabaseClient();

    const { count, error } = await client
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('is_read', false);

    if (error) {
      console.error('Get unread count error:', error);
      return res.json({ count: 0 });
    }

    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.json({ count: 0 });
  }
});

/**
 * 发送紧急通知（高优先级推送）
 * POST /api/v1/notifications/emergency
 * Body: { user_id: number, title: string, content: string }
 */
router.post('/emergency', async (req, res) => {
  try {
    const { user_id, title, content } = req.body;

    if (!user_id || !title || !content) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const client = getSupabaseClient();

    // 创建紧急通知
    const { data, error } = await client
      .from('notifications')
      .insert({
        user_id,
        type: 'emergency',
        title: `🚨 ${title}`,
        content,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Create emergency notification error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // 立即发送高优先级推送
    const pushSuccess = await sendPushToUser(user_id, `🚨 ${title}`, content, {
      type: 'emergency',
      notificationId: data.id,
      screen: 'notification-detail',
      priority: 'high',
    });

    res.json({ 
      success: true, 
      notification: data,
      pushSent: pushSuccess 
    });
  } catch (error) {
    console.error('Create emergency notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to create emergency notification' });
  }
});

// 格式化时间
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return minutes <= 1 ? '刚刚' : `${minutes}分钟前`;
  } else if (hours < 24) {
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } else if (hours < 48) {
    return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } else if (hours < 168) {
    return `${Math.floor(hours / 24)}天前`;
  } else {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
}

export default router;
