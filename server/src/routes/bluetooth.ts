import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { sseManager } from './realtime';

const router = express.Router();

// ==================== 设备连接管理 ====================

/**
 * 连接设备
 * POST /api/v1/bluetooth/connect
 * Body: { user_id: number, device_name: string, device_address: string, device_type: string }
 */
router.post('/connect', async (req, res) => {
  try {
    const { user_id, device_name, device_address, device_type } = req.body;

    if (!user_id || !device_name || !device_address) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const client = getSupabaseClient();

    // 先断开之前连接的同类型设备
    await client
      .from('device_connections')
      .update({ status: 'disconnected', updated_at: new Date().toISOString() })
      .eq('user_id', user_id)
      .eq('device_type', device_type || 'wristband')
      .eq('status', 'connected');

    // 创建新的连接记录
    const { data, error } = await client
      .from('device_connections')
      .insert({
        user_id,
        device_name,
        device_address,
        device_type: device_type || 'wristband',
        status: 'connected',
        last_sync: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 实时推送设备状态变化给监护人
    sseManager.broadcast(user_id, 'device_status', {
      userId: user_id,
      deviceName: device_name,
      deviceAddress: device_address,
      deviceType: device_type || 'wristband',
      status: 'connected',
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Connect device error:', error);
    res.status(500).json({ error: '连接设备失败' });
  }
});

/**
 * 断开设备
 * POST /api/v1/bluetooth/disconnect
 * Body: { user_id: number, device_address?: string }
 */
router.post('/disconnect', async (req, res) => {
  try {
    const { user_id, device_address } = req.body;

    const client = getSupabaseClient();

    // 获取要断开的设备信息（用于推送）
    const { data: devices } = await client
      .from('device_connections')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'connected');

    let query = client
      .from('device_connections')
      .update({ status: 'disconnected', updated_at: new Date().toISOString() })
      .eq('user_id', user_id)
      .eq('status', 'connected');

    if (device_address) {
      query = query.eq('device_address', device_address);
    }

    const { error } = await query;

    if (error) throw error;

    // 实时推送设备断开状态给监护人
    if (devices) {
      devices.forEach((device) => {
        if (!device_address || device.device_address === device_address) {
          sseManager.broadcast(user_id, 'device_status', {
            userId: user_id,
            deviceName: device.device_name,
            deviceAddress: device.device_address,
            deviceType: device.device_type,
            status: 'disconnected',
            timestamp: new Date().toISOString(),
          });
        }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Disconnect device error:', error);
    res.status(500).json({ error: '断开设备失败' });
  }
});

/**
 * 获取用户已连接的设备
 * GET /api/v1/bluetooth/devices/:userId
 */
router.get('/devices/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('device_connections')
      .select('*')
      .eq('user_id', parseInt(userId))
      .eq('status', 'connected')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: '获取设备失败' });
  }
});

// ==================== 蓝牙数据管理 ====================

/**
 * 接收蓝牙数据
 * POST /api/v1/bluetooth/data
 * Body: { user_id: number, device_type: string, data: object }
 */
router.post('/data', async (req, res) => {
  try {
    const { user_id, device_type, data } = req.body;

    if (!user_id || !device_type || !data) {
      return res.status(400).json({ error: '用户ID、设备类型和数据不能为空' });
    }

    if (!['camera', 'wristband'].includes(device_type)) {
      return res.status(400).json({ error: '设备类型必须是 camera 或 wristband' });
    }

    const client = getSupabaseClient();

    // 存储蓝牙数据
    const { data: bluetoothData, error } = await client
      .from('bluetooth_data')
      .insert({
        user_id: parseInt(user_id),
        device_type,
        data,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({ data: bluetoothData });
  } catch (error) {
    console.error('Bluetooth data error:', error);
    res.status(500).json({ error: '存储蓝牙数据失败' });
  }
});

/**
 * 获取用户的蓝牙数据
 * GET /api/v1/bluetooth/data/:userId?device_type=xxx&limit=10
 */
router.get('/data/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { device_type, limit } = req.query;

    const client = getSupabaseClient();

    let query = client
      .from('bluetooth_data')
      .select('*')
      .eq('user_id', parseInt(userId))
      .order('timestamp', { ascending: false });

    if (device_type) {
      query = query.eq('device_type', device_type);
    }

    if (limit) {
      query = query.limit(parseInt(limit as string));
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json({ data: data || [] });
  } catch (error) {
    console.error('Get bluetooth data error:', error);
    res.status(500).json({ error: '获取蓝牙数据失败' });
  }
});

/**
 * 获取最新的蓝牙数据
 * GET /api/v1/bluetooth/latest/:userId?device_type=xxx
 */
router.get('/latest/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { device_type } = req.query;

    const client = getSupabaseClient();

    let query = client
      .from('bluetooth_data')
      .select('*')
      .eq('user_id', parseInt(userId))
      .order('timestamp', { ascending: false })
      .limit(1);

    if (device_type) {
      query = query.eq('device_type', device_type);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json({ data: data?.[0] || null });
  } catch (error) {
    console.error('Get latest bluetooth data error:', error);
    res.status(500).json({ error: '获取最新蓝牙数据失败' });
  }
});

export default router;
