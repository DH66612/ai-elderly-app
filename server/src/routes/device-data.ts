/**
 * 设备数据推送路由
 * 接收老人端的设备数据（手环、摄像头），推送给监护人端
 */
import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { sseManager } from './realtime';

const router = express.Router();

/**
 * 上传手环健康数据
 * POST /api/v1/device-data/bracelet
 * 
 * Body: {
 *   user_id: number,           // 老人ID
 *   device_id: string,         // 设备ID
 *   device_name: string,       // 设备名称
 *   manufacturer?: string,     // 厂家
 *   data: {
 *     heartRate: number,       // 心率
 *     steps: number,           // 步数
 *     calories: number,        // 卡路里
 *     distance: number,        // 距离
 *     bloodOxygen?: number,    // 血氧
 *     bloodPressure?: { systolic: number, diastolic: number }
 *   }
 * }
 */
router.post('/bracelet', async (req, res) => {
  try {
    const { user_id, device_id, device_name, manufacturer, data } = req.body;

    if (!user_id || !device_id || !data) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const client = getSupabaseClient();

    // 1. 存储到数据库
    const { error: insertError } = await client.from('health_data').insert({
      user_id,
      device_id,
      device_name,
      manufacturer,
      data_type: 'bracelet',
      data,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('[DeviceData] 存储手环数据失败:', insertError);
    }

    // 2. 实时推送给监护人
    const pushData = {
      type: 'bracelet_data',
      userId: user_id,
      deviceId: device_id,
      deviceName: device_name,
      manufacturer,
      data,
      timestamp: new Date().toISOString(),
    };

    const pushed = sseManager.broadcast(user_id, 'bracelet_data', pushData);

    console.log(`[DeviceData] 手环数据上传: 用户${user_id}, 设备${device_name}, 心率${data.heartRate}, 推送${pushed ? '成功' : '无订阅'}`);

    res.json({
      success: true,
      pushed,
      subscriber_count: sseManager.getConnectionCount(user_id),
    });
  } catch (error) {
    console.error('[DeviceData] 上传手环数据失败:', error);
    res.status(500).json({ success: false, error: '上传数据失败' });
  }
});

/**
 * 上传摄像头状态/帧数据通知
 * POST /api/v1/device-data/camera
 * 
 * Body: {
 *   user_id: number,
 *   device_id: string,
 *   device_name: string,
 *   status: {
 *     isOnline: boolean,
 *     isRecording: boolean,
 *     motionDetected: boolean
 *   }
 * }
 */
router.post('/camera', async (req, res) => {
  try {
    const { user_id, device_id, device_name, status, frame_base64 } = req.body;

    if (!user_id || !device_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 实时推送给监护人
    const pushData = {
      type: 'camera_data',
      userId: user_id,
      deviceId: device_id,
      deviceName: device_name,
      status,
      frameBase64: frame_base64, // 如果有帧数据
      timestamp: new Date().toISOString(),
    };

    const pushed = sseManager.broadcast(user_id, 'camera_data', pushData);

    console.log(`[DeviceData] 摄像头数据: 用户${user_id}, 设备${device_name}, 推送${pushed ? '成功' : '无订阅'}`);

    res.json({
      success: true,
      pushed,
    });
  } catch (error) {
    console.error('[DeviceData] 上传摄像头数据失败:', error);
    res.status(500).json({ success: false, error: '上传数据失败' });
  }
});

/**
 * 批量上传设备数据（用于定期同步）
 * POST /api/v1/device-data/batch
 */
router.post('/batch', async (req, res) => {
  try {
    const { user_id, devices } = req.body;

    if (!user_id || !devices || !Array.isArray(devices)) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const client = getSupabaseClient();
    const results: any[] = [];

    for (const device of devices) {
      try {
        // 存储数据
        await client.from('health_data').insert({
          user_id,
          device_id: device.device_id,
          device_name: device.device_name,
          manufacturer: device.manufacturer,
          data_type: device.type,
          data: device.data,
          created_at: new Date().toISOString(),
        });

        // 推送
        const pushData = {
          type: device.type === 'bracelet' ? 'bracelet_data' : 'camera_data',
          userId: user_id,
          ...device,
          timestamp: new Date().toISOString(),
        };

        const event = device.type === 'bracelet' ? 'bracelet_data' : 'camera_data';
        sseManager.broadcast(user_id, event, pushData);

        results.push({ device_id: device.device_id, success: true });
      } catch (e) {
        results.push({ device_id: device.device_id, success: false, error: String(e) });
      }
    }

    res.json({
      success: true,
      results,
      subscriber_count: sseManager.getConnectionCount(user_id),
    });
  } catch (error) {
    console.error('[DeviceData] 批量上传失败:', error);
    res.status(500).json({ success: false, error: '批量上传失败' });
  }
});

/**
 * 获取设备历史数据
 * GET /api/v1/device-data/history/:userId
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { device_id, data_type, limit = 100 } = req.query;

    const client = getSupabaseClient();

    let query = client
      .from('health_data')
      .select('*')
      .eq('user_id', parseInt(userId))
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (device_id) {
      query = query.eq('device_id', device_id);
    }
    if (data_type) {
      query = query.eq('data_type', data_type);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('[DeviceData] 获取历史数据失败:', error);
    res.status(500).json({ success: false, error: '获取历史数据失败' });
  }
});

/**
 * 获取最新设备数据
 * GET /api/v1/device-data/latest/:userId
 */
router.get('/latest/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const client = getSupabaseClient();

    // 获取每种设备类型的最新数据
    const { data, error } = await client
      .from('health_data')
      .select('*')
      .eq('user_id', parseInt(userId))
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    // 按设备分组取最新
    const latestByDevice: Record<string, any> = {};
    for (const item of data || []) {
      if (!latestByDevice[item.device_id]) {
        latestByDevice[item.device_id] = item;
      }
    }

    res.json({
      success: true,
      data: Object.values(latestByDevice),
    });
  } catch (error) {
    console.error('[DeviceData] 获取最新数据失败:', error);
    res.status(500).json({ success: false, error: '获取最新数据失败' });
  }
});

/**
 * 获取最新手环健康数据
 * GET /api/v1/device-data/bracelet/latest/:userId
 */
router.get('/bracelet/latest/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('health_data')
      .select('*')
      .eq('user_id', parseInt(userId))
      .eq('data_type', 'bracelet')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    res.json({
      success: true,
      data: data || null,
    });
  } catch (error) {
    console.error('[DeviceData] 获取最新手环数据失败:', error);
    res.status(500).json({ success: false, error: '获取最新手环数据失败' });
  }
});

/**
 * 获取健康数据趋势（每4小时一个数据点，一天6个点）
 * GET /api/v1/device-data/health-trend/:userId
 * 
 * 返回模拟数据用于折线图展示
 */
router.get('/health-trend/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 时间标签（每4小时）
    const timeLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
    
    // 生成模拟健康数据（实际项目中应从数据库读取）
    // 心率：60-100 bpm
    const heartRate = Array.from({ length: 6 }, () => 
      Math.floor(65 + Math.random() * 30)
    );
    
    // 血压（收缩压）：90-140 mmHg
    const bloodPressure = Array.from({ length: 6 }, () => 
      Math.floor(105 + Math.random() * 25)
    );
    
    // 血氧：95-99%
    const bloodOxygen = Array.from({ length: 6 }, () => 
      Math.floor(96 + Math.random() * 3)
    );
    
    // 步数（累计）：早低晚高
    const stepsBase = [0, 50, 2000, 5500, 8000, 10000];
    const steps = stepsBase.map(v => v + Math.floor(Math.random() * 500));
    
    res.json({
      success: true,
      data: {
        heartRate,
        bloodPressure,
        bloodOxygen,
        steps,
        timeLabels,
      },
    });
  } catch (error) {
    console.error('[DeviceData] 获取健康趋势失败:', error);
    res.status(500).json({ success: false, error: '获取健康趋势失败' });
  }
});

export default router;
