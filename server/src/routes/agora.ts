/**
 * Agora视频通话路由
 * 提供Token生成接口
 */
import express from 'express';
import { generateRtcToken, getAgoraConfig, APP_ID } from '../services/agora';

const router = express.Router();

/**
 * 获取Agora配置
 * GET /api/v1/agora/config
 * 返回App ID（公开信息）
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      appId: APP_ID,
    },
  });
});

/**
 * 生成RTC Token
 * POST /api/v1/agora/token
 * 
 * Body: {
 *   channelName: string,    // 频道名称
 *   uid?: number | string,  // 用户ID（可选，默认为0）
 *   role?: 'publisher' | 'subscriber',  // 角色（默认发布者）
 *   expireTime?: number,    // 过期时间秒数（可选，默认24小时）
 * }
 * 
 * 返回: {
 *   success: boolean,
 *   data: {
 *     appId: string,
 *     channelName: string,
 *     uid: number | string,
 *     token: string,
 *     expireTime: number,
 *   }
 * }
 */
router.post('/token', (req, res) => {
  try {
    const { channelName, uid, role, expireTime } = req.body;

    if (!channelName) {
      return res.status(400).json({
        success: false,
        error: '缺少频道名称',
      });
    }

    // 生成Token
    const token = generateRtcToken(
      channelName,
      uid || 0,
      role || 'publisher',
      expireTime || 86400
    );

    console.log(`[Agora] 生成Token: channel=${channelName}, uid=${uid || 0}`);

    res.json({
      success: true,
      data: {
        appId: APP_ID,
        channelName,
        uid: uid || 0,
        token,
        expireTime: expireTime || 86400,
      },
    });
  } catch (error: any) {
    console.error('[Agora] 生成Token失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '生成Token失败',
    });
  }
});

/**
 * 批量生成Token（用于多人通话）
 * POST /api/v1/agora/batch-token
 * 
 * Body: {
 *   channelName: string,
 *   uids: (number | string)[],
 *   role?: 'publisher' | 'subscriber',
 *   expireTime?: number,
 * }
 */
router.post('/batch-token', (req, res) => {
  try {
    const { channelName, uids, role, expireTime } = req.body;

    if (!channelName) {
      return res.status(400).json({
        success: false,
        error: '缺少频道名称',
      });
    }

    if (!uids || !Array.isArray(uids) || uids.length === 0) {
      return res.status(400).json({
        success: false,
        error: '缺少用户ID列表',
      });
    }

    const results = uids.map((uid: number | string) => ({
      uid,
      token: generateRtcToken(channelName, uid, role || 'publisher', expireTime || 86400),
    }));

    res.json({
      success: true,
      data: {
        appId: APP_ID,
        channelName,
        expireTime: expireTime || 86400,
        tokens: results,
      },
    });
  } catch (error: any) {
    console.error('[Agora] 批量生成Token失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '生成Token失败',
    });
  }
});

export default router;
