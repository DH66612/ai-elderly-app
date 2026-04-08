/**
 * 跌倒检测API路由
 */
import express from 'express';
import { fallDetectionService } from '../services/fall-detection';

const router = express.Router();

/**
 * 上传摄像头帧进行分析
 * POST /api/v1/fall-detection/frame
 * 
 * Body: {
 *   user_id: number,       // 用户ID
 *   device_id: string,     // 设备ID
 *   device_name: string,   // 设备名称
 *   frame_data: string,    // 帧数据（base64或描述）
 *   enable_detection: boolean  // 是否启用跌倒检测
 * }
 */
router.post('/frame', async (req, res) => {
  try {
    const { user_id, device_id, device_name, frame_data, enable_detection } = req.body;

    if (!user_id || !device_id || !frame_data) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数',
      });
    }

    // 如果未启用跌倒检测，直接返回
    if (!enable_detection) {
      return res.json({
        success: true,
        detection: {
          enabled: false,
          isAbnormal: false,
          confidence: 0,
          analysis: '跌倒检测未启用',
          alertTriggered: false,
        },
      });
    }

    // 处理帧数据
    const result = await fallDetectionService.processFrame(
      user_id,
      device_id,
      device_name || '摄像头',
      frame_data,
      {} // headers 不再需要
    );

    res.json({
      success: true,
      detection: {
        enabled: true,
        ...result,
      },
    });
  } catch (error: any) {
    console.error('[FallDetection] 帧处理失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '处理失败',
    });
  }
});

/**
 * 老人确认无恙
 * POST /api/v1/fall-detection/confirm
 * 
 * Body: {
 *   alert_id: string,  // 告警ID
 *   safe: boolean      // true=确认安全, false=需要帮助
 * }
 */
router.post('/confirm', async (req, res) => {
  try {
    const { alert_id, safe } = req.body;

    if (!alert_id) {
      return res.status(400).json({
        success: false,
        error: '缺少告警ID',
      });
    }

    let success: boolean;
    if (safe) {
      success = await fallDetectionService.confirmSafe(alert_id);
    } else {
      success = await fallDetectionService.requestHelp(alert_id);
    }

    res.json({
      success,
      message: safe ? '已确认安全' : '已通知监护人',
    });
  } catch (error: any) {
    console.error('[FallDetection] 确认失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '确认失败',
    });
  }
});

/**
 * 获取待确认的告警列表
 * GET /api/v1/fall-detection/pending/:userId
 */
router.get('/pending/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const alerts = fallDetectionService.getPendingAlerts(parseInt(userId));

    res.json({
      success: true,
      alerts,
    });
  } catch (error: any) {
    console.error('[FallDetection] 获取告警失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取失败',
    });
  }
});

/**
 * 获取检测状态
 * GET /api/v1/fall-detection/status/:userId/:deviceId
 */
router.get('/status/:userId/:deviceId', async (req, res) => {
  try {
    const { userId, deviceId } = req.params;
    const status = fallDetectionService.getDetectionStatus(
      parseInt(userId),
      deviceId
    );

    res.json({
      success: true,
      status: status || {
        status: 'inactive',
        frames: [],
      },
    });
  } catch (error: any) {
    console.error('[FallDetection] 获取状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取失败',
    });
  }
});

export default router;
