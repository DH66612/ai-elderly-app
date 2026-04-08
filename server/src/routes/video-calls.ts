/**
 * 视频通话路由
 * 支持视频通话请求、接受、拒绝、状态查询
 */
import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { sseManager } from './realtime';

const router = express.Router();

/**
 * 发起视频通话请求
 * POST /api/v1/video-calls/request
 * Body: { callerId: number, calleeId: number }
 */
router.post('/request', async (req, res) => {
  try {
    const { callerId, calleeId } = req.body;

    if (!callerId || !calleeId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数',
      });
    }

    const supabase = getSupabaseClient();

    // 检查是否有进行中的通话
    const { data: existingCalls, error: checkError } = await supabase
      .from('video_call_sessions')
      .select('*')
      .eq('status', 'pending')
      .or(`caller_id.eq.${callerId},caller_id.eq.${calleeId}`)
      .limit(1);

    if (existingCalls && existingCalls.length > 0) {
      return res.status(400).json({
        success: false,
        message: '已有待处理的通话请求',
        data: existingCalls[0],
      });
    }

    // 获取发起方信息
    const { data: caller } = await supabase
      .from('users')
      .select('name')
      .eq('id', callerId)
      .single();

    // 创建通话请求
    const { data: session, error: insertError } = await supabase
      .from('video_call_sessions')
      .insert({
        caller_id: callerId,
        callee_id: calleeId,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({
        success: false,
        message: '创建通话请求失败',
      });
    }

    // 推送视频通话请求给被叫方
    const callerName = caller?.name || '用户';
    const callData = {
      id: session.id,
      callerId: callerId,
      calleeId: calleeId,
      callerName: callerName,
      status: 'pending',
      timestamp: new Date().toISOString(),
    };

    // 通过SSE推送给被叫方
    const pushed = sseManager.broadcast(calleeId, 'video_call_request', callData);
    console.log(`[视频通话] 推送给用户 ${calleeId}: ${pushed ? '成功' : '无在线连接'}`);

    res.json({
      success: true,
      message: '请求已发送',
      data: {
        ...session,
        callerName: callerName,
        pushed: pushed,
      },
    });
  } catch (error: any) {
    console.error('Video call request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 接受视频通话
 * POST /api/v1/video-calls/accept
 * Body: { sessionId: number }
 */
router.post('/accept', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: '缺少会话ID',
      });
    }

    const supabase = getSupabaseClient();

    const { data: session, error } = await supabase
      .from('video_call_sessions')
      .update({
        status: 'accepted',
        answered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error || !session) {
      return res.status(404).json({
        success: false,
        message: '通话会话不存在',
      });
    }

    res.json({
      success: true,
      message: '已接受通话',
      data: session,
    });
  } catch (error: any) {
    console.error('Video call accept error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 拒绝视频通话
 * POST /api/v1/video-calls/reject
 * Body: { sessionId: number, reason?: string }
 */
router.post('/reject', async (req, res) => {
  try {
    const { sessionId, reason } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: '缺少会话ID',
      });
    }

    const supabase = getSupabaseClient();

    const { data: session, error } = await supabase
      .from('video_call_sessions')
      .update({
        status: 'rejected',
        reject_reason: reason || '对方拒绝通话',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error || !session) {
      return res.status(404).json({
        success: false,
        message: '通话会话不存在',
      });
    }

    res.json({
      success: true,
      message: '已拒绝通话',
      data: session,
    });
  } catch (error: any) {
    console.error('Video call reject error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 取消视频通话
 * POST /api/v1/video-calls/cancel
 * Body: { sessionId: number }
 */
router.post('/cancel', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: '缺少会话ID',
      });
    }

    const supabase = getSupabaseClient();

    const { data: session, error } = await supabase
      .from('video_call_sessions')
      .update({
        status: 'cancelled',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('status', 'pending') // 只能取消待处理的通话
      .select()
      .single();

    if (error || !session) {
      return res.status(404).json({
        success: false,
        message: '通话会话不存在或已处理',
      });
    }

    res.json({
      success: true,
      message: '已取消通话',
      data: session,
    });
  } catch (error: any) {
    console.error('Video call cancel error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 结束视频通话
 * POST /api/v1/video-calls/end
 * Body: { sessionId: number }
 */
router.post('/end', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: '缺少会话ID',
      });
    }

    const supabase = getSupabaseClient();

    const { data: session, error } = await supabase
      .from('video_call_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error || !session) {
      return res.status(404).json({
        success: false,
        message: '通话会话不存在',
      });
    }

    res.json({
      success: true,
      message: '通话已结束',
      data: session,
    });
  } catch (error: any) {
    console.error('Video call end error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 获取待处理的通话请求（用于被叫方轮询）
 * GET /api/v1/video-calls/pending/:userId
 */
router.get('/pending/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户ID',
      });
    }

    const supabase = getSupabaseClient();

    // 查找该用户作为被叫方的待处理通话
    const { data: pendingCalls, error } = await supabase
      .from('video_call_sessions')
      .select('*')
      .eq('callee_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Query error:', error);
      return res.status(500).json({
        success: false,
        message: '查询失败',
      });
    }

    const call = pendingCalls?.[0];

    // 如果有待处理通话，查询发起人信息
    let callerName = '用户';
    if (call) {
      const { data: caller } = await supabase
        .from('users')
        .select('name')
        .eq('id', call.caller_id)
        .single();
      callerName = caller?.name || '用户';
    }

    res.json({
      success: true,
      data: call
        ? {
            ...call,
            callerName,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Get pending call error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 获取通话状态
 * GET /api/v1/video-calls/status/:sessionId
 */
router.get('/status/:sessionId', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: '无效的会话ID',
      });
    }

    const supabase = getSupabaseClient();

    const { data: session, error } = await supabase
      .from('video_call_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return res.status(404).json({
        success: false,
        message: '通话会话不存在',
      });
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error: any) {
    console.error('Get call status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
