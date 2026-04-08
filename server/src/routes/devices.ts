/**
 * 设备数据路由
 * 处理蓝牙设备（手环、摄像头）数据的上传和实时推送
 */
import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { sseManager } from './realtime';

const router = express.Router();

// 设备状态阈值配置
const DEVICE_THRESHOLDS = {
  LOW_BATTERY: 20, // 电量低于20%视为低电量
  OFFLINE_HOURS: 12, // 离线超过12小时视为异常
};

/**
 * 设备自检 - 检查设备状态并生成告警
 * GET /api/v1/devices/check/:userId
 */
router.get('/check/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const client = getSupabaseClient();
    
    const alerts: any[] = [];
    const now = new Date();
    const offlineThreshold = new Date(now.getTime() - DEVICE_THRESHOLDS.OFFLINE_HOURS * 60 * 60 * 1000);

    // 1. 检查手环设备状态
    const { data: braceletDevices } = await client
      .from('device_connections')
      .select('*')
      .eq('user_id', parseInt(userId))
      .eq('device_type', 'band');

    if (braceletDevices && braceletDevices.length > 0) {
      for (const device of braceletDevices) {
        const lastSync = device.last_sync ? new Date(device.last_sync) : null;
        const isOffline = !lastSync || lastSync < offlineThreshold;
        
        // 获取最新电量（如果有）
        const { data: latestData } = await client
          .from('device_health_data')
          .select('battery_level, recorded_at')
          .eq('user_id', parseInt(userId))
          .order('recorded_at', { ascending: false })
          .limit(1);

        const batteryLevel = latestData?.[0]?.battery_level;
        const isLowBattery = batteryLevel !== null && batteryLevel !== undefined && batteryLevel < DEVICE_THRESHOLDS.LOW_BATTERY;

        if (device.status === 'connected') {
          // 已连接但长时间未同步数据
          if (isOffline) {
            alerts.push({
              type: 'offline',
              deviceType: 'band',
              deviceName: device.device_name || '健康手环',
              message: `手环已超过${DEVICE_THRESHOLDS.OFFLINE_HOURS}小时未同步数据，请检查设备连接`,
              severity: 'warning',
              lastActive: lastSync?.toISOString(),
            });
          }
          
          // 低电量告警
          if (isLowBattery) {
            alerts.push({
              type: 'low_battery',
              deviceType: 'band',
              deviceName: device.device_name || '健康手环',
              message: `手环电量仅剩${batteryLevel}%，请及时充电`,
              severity: 'warning',
              batteryLevel,
            });
          }
        } else if (device.status === 'disconnected') {
          // 设备已断开
          alerts.push({
            type: 'disconnected',
            deviceType: 'band',
            deviceName: device.device_name || '健康手环',
            message: '手环已断开连接，请重新连接设备',
            severity: 'error',
            lastActive: lastSync?.toISOString(),
          });
        }
      }
    } else {
      // 未连接任何手环
      alerts.push({
        type: 'no_device',
        deviceType: 'band',
        deviceName: '健康手环',
        message: '尚未连接健康手环，建议连接以监测健康数据',
        severity: 'info',
      });
    }

    // 2. 检查摄像头设备状态
    const { data: cameraDevices } = await client
      .from('device_connections')
      .select('*')
      .eq('user_id', parseInt(userId))
      .eq('device_type', 'camera');

    if (cameraDevices && cameraDevices.length > 0) {
      for (const device of cameraDevices) {
        const lastSync = device.last_sync ? new Date(device.last_sync) : null;
        const isOffline = !lastSync || lastSync < offlineThreshold;

        // 获取最新摄像头状态
        const { data: latestCamera } = await client
          .from('device_camera_status')
          .select('battery_level, signal_strength, recorded_at')
          .eq('user_id', parseInt(userId))
          .order('recorded_at', { ascending: false })
          .limit(1);

        const batteryLevel = latestCamera?.[0]?.battery_level;
        const signalStrength = latestCamera?.[0]?.signal_strength;
        const isLowBattery = batteryLevel !== null && batteryLevel !== undefined && batteryLevel < DEVICE_THRESHOLDS.LOW_BATTERY;

        if (device.status === 'connected') {
          // 已连接但长时间未同步
          if (isOffline) {
            alerts.push({
              type: 'offline',
              deviceType: 'camera',
              deviceName: device.device_name || '智能摄像头',
              message: `摄像头已超过${DEVICE_THRESHOLDS.OFFLINE_HOURS}小时未同步，请检查设备状态`,
              severity: 'warning',
              lastActive: lastSync?.toISOString(),
            });
          }

          // 低电量告警
          if (isLowBattery) {
            alerts.push({
              type: 'low_battery',
              deviceType: 'camera',
              deviceName: device.device_name || '智能摄像头',
              message: `摄像头电量仅剩${batteryLevel}%，请及时充电或检查电源`,
              severity: 'warning',
              batteryLevel,
            });
          }

          // 信号弱告警
          if (signalStrength !== null && signalStrength < 30) {
            alerts.push({
              type: 'weak_signal',
              deviceType: 'camera',
              deviceName: device.device_name || '智能摄像头',
              message: `摄像头信号较弱(${signalStrength}%)，可能影响画面传输`,
              severity: 'info',
              signalStrength,
            });
          }
        } else if (device.status === 'disconnected') {
          alerts.push({
            type: 'disconnected',
            deviceType: 'camera',
            deviceName: device.device_name || '智能摄像头',
            message: '摄像头已断开连接，请检查网络和电源',
            severity: 'error',
            lastActive: lastSync?.toISOString(),
          });
        }
      }
    } else {
      // 未连接摄像头
      alerts.push({
        type: 'no_device',
        deviceType: 'camera',
        deviceName: '智能摄像头',
        message: '尚未连接摄像头，建议连接以实现远程看护',
        severity: 'info',
      });
    }

    // 保存告警记录（仅保存warning和error级别）
    const criticalAlerts = alerts.filter(a => a.severity === 'warning' || a.severity === 'error');
    if (criticalAlerts.length > 0) {
      for (const alert of criticalAlerts) {
        await client
          .from('device_alerts')
          .upsert({
            user_id: parseInt(userId),
            device_type: alert.deviceType,
            device_name: alert.deviceName,
            alert_type: alert.type,
            message: alert.message,
            severity: alert.severity,
            is_resolved: false,
            created_at: now.toISOString(),
          }, {
            onConflict: 'user_id,device_type,alert_type,is_resolved',
          });
      }
    }

    res.json({ 
      success: true, 
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'error').length,
        warnings: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length,
      }
    });
  } catch (error) {
    console.error('[设备自检] 检查失败:', error);
    res.status(500).json({ success: false, error: '设备检查失败' });
  }
});

/**
 * 获取设备告警历史
 * GET /api/v1/devices/alerts/:userId
 */
router.get('/alerts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, unresolved_only = false } = req.query;
    
    const client = getSupabaseClient();
    
    let query = client
      .from('device_alerts')
      .select('*')
      .eq('user_id', parseInt(userId))
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (unresolved_only === 'true') {
      query = query.eq('is_resolved', false);
    }

    const { data, error } = await query;

    if (error) {
      // 表可能不存在
      return res.json({ success: true, alerts: [] });
    }

    res.json({ success: true, alerts: data || [] });
  } catch (error) {
    console.error('[设备告警] 获取失败:', error);
    res.status(500).json({ success: false, error: '获取告警失败' });
  }
});

/**
 * 标记告警为已解决
 * POST /api/v1/devices/alerts/resolve
 */
router.post('/alerts/resolve', async (req, res) => {
  try {
    const { alert_id, user_id } = req.body;
    
    const client = getSupabaseClient();
    
    const { error } = await client
      .from('device_alerts')
      .update({ 
        is_resolved: true, 
        resolved_at: new Date().toISOString() 
      })
      .eq('id', alert_id)
      .eq('user_id', user_id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('[设备告警] 解决失败:', error);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

/**
 * 上传手环健康数据
 * POST /api/v1/devices/bracelet/data
 * 
 * Body: {
 *   user_id: number,
 *   device_id: string,
 *   device_name: string,
 *   manufacturer?: string,
 *   data: {
 *     heartRate: number,
 *     steps: number,
 *     calories: number,
 *     distance: number,
 *     bloodPressure?: { systolic: number, diastolic: number },
 *     bloodOxygen?: number
 *   }
 * }
 */
router.post('/bracelet/data', async (req, res) => {
  try {
    const { user_id, device_id, device_name, manufacturer, data } = req.body;

    if (!user_id || !device_id || !data) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const client = getSupabaseClient();

    // 保存健康数据
    const { data: savedData, error } = await client
      .from('device_health_data')
      .insert({
        user_id,
        device_id,
        device_type: 'bracelet',
        device_name: device_name || '健康手环',
        manufacturer: manufacturer || null,
        heart_rate: data.heartRate,
        steps: data.steps,
        calories: data.calories,
        distance: data.distance,
        blood_pressure_systolic: data.bloodPressure?.systolic || null,
        blood_pressure_diastolic: data.bloodPressure?.diastolic || null,
        blood_oxygen: data.bloodOxygen || null,
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[设备数据] 保存失败:', error);
    }

    // 实时推送给监护人
    const pushData = {
      id: savedData?.id,
      userId: user_id,
      deviceId: device_id,
      deviceName: device_name || '健康手环',
      manufacturer: manufacturer,
      deviceType: 'bracelet',
      data: {
        heartRate: data.heartRate,
        steps: data.steps,
        calories: data.calories,
        distance: data.distance,
        bloodPressure: data.bloodPressure,
        bloodOxygen: data.bloodOxygen,
      },
      timestamp: new Date().toISOString(),
    };

    const pushed = sseManager.broadcast(user_id, 'bracelet_data', pushData);

    console.log(`[设备数据] 手环数据上传: 用户${user_id} 心率${data.heartRate} 推送${pushed ? '成功' : '无订阅'}`);

    res.json({
      success: true,
      data: savedData,
      pushed,
      subscriberCount: sseManager.getConnectionCount(user_id),
    });
  } catch (error) {
    console.error('[设备数据] 上传失败:', error);
    res.status(500).json({ success: false, error: '上传数据失败' });
  }
});

/**
 * 上传摄像头状态/画面
 * POST /api/v1/devices/camera/data
 * 
 * Body: {
 *   user_id: number,
 *   device_id: string,
 *   device_name: string,
 *   manufacturer?: string,
 *   data: {
 *     isRecording: boolean,
 *     motionDetected: boolean,
 *     batteryLevel?: number,
 *     signalStrength: number,
 *     // 视频帧（Base64编码的JPEG图片）
 *     frameBase64?: string
 *   }
 * }
 */
router.post('/camera/data', async (req, res) => {
  try {
    const { user_id, device_id, device_name, manufacturer, data } = req.body;

    if (!user_id || !device_id || !data) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const client = getSupabaseClient();

    // 保存摄像头状态（不含视频帧）
    const { data: savedData, error } = await client
      .from('device_camera_status')
      .insert({
        user_id,
        device_id,
        device_name: device_name || '智能摄像头',
        manufacturer: manufacturer || null,
        is_recording: data.isRecording || false,
        motion_detected: data.motionDetected || false,
        battery_level: data.batteryLevel || null,
        signal_strength: data.signalStrength || 100,
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[设备数据] 摄像头状态保存失败:', error);
    }

    // 实时推送状态和画面给监护人
    const pushData = {
      id: savedData?.id,
      userId: user_id,
      deviceId: device_id,
      deviceName: device_name || '智能摄像头',
      manufacturer: manufacturer,
      deviceType: 'camera',
      data: {
        isRecording: data.isRecording,
        motionDetected: data.motionDetected,
        batteryLevel: data.batteryLevel,
        signalStrength: data.signalStrength,
      },
      // 视频帧单独处理（可能很大）
      frameBase64: data.frameBase64,
      timestamp: new Date().toISOString(),
    };

    const pushed = sseManager.broadcast(user_id, 'camera_data', pushData);

    console.log(`[设备数据] 摄像头数据上传: 用户${user_id} 录制${data.isRecording ? '是' : '否'} 推送${pushed ? '成功' : '无订阅'}`);

    res.json({
      success: true,
      data: savedData,
      pushed,
      subscriberCount: sseManager.getConnectionCount(user_id),
    });
  } catch (error) {
    console.error('[设备数据] 摄像头数据上传失败:', error);
    res.status(500).json({ success: false, error: '上传数据失败' });
  }
});

/**
 * 获取设备历史数据
 * GET /api/v1/devices/history/:userId
 * Query: device_type?: 'bracelet' | 'camera', limit?: number
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { device_type, limit = 50 } = req.query;

    const client = getSupabaseClient();
    const results: any = {};

    // 获取手环数据
    if (!device_type || device_type === 'bracelet') {
      const { data: braceletData, error: braceletError } = await client
        .from('device_health_data')
        .select('*')
        .eq('user_id', parseInt(userId))
        .order('recorded_at', { ascending: false })
        .limit(parseInt(limit as string));

      if (!braceletError) {
        results.bracelet = braceletData?.map((d: any) => ({
          id: d.id,
          deviceId: d.device_id,
          deviceName: d.device_name,
          manufacturer: d.manufacturer,
          heartRate: d.heart_rate,
          steps: d.steps,
          calories: d.calories,
          distance: d.distance,
          bloodPressure: d.blood_pressure_systolic && d.blood_pressure_diastolic
            ? { systolic: d.blood_pressure_systolic, diastolic: d.blood_pressure_diastolic }
            : null,
          bloodOxygen: d.blood_oxygen,
          timestamp: d.recorded_at,
        }));
      }
    }

    // 获取摄像头状态
    if (!device_type || device_type === 'camera') {
      const { data: cameraData, error: cameraError } = await client
        .from('device_camera_status')
        .select('*')
        .eq('user_id', parseInt(userId))
        .order('recorded_at', { ascending: false })
        .limit(parseInt(limit as string));

      if (!cameraError) {
        results.camera = cameraData?.map((d: any) => ({
          id: d.id,
          deviceId: d.device_id,
          deviceName: d.device_name,
          manufacturer: d.manufacturer,
          isRecording: d.is_recording,
          motionDetected: d.motion_detected,
          batteryLevel: d.battery_level,
          signalStrength: d.signal_strength,
          timestamp: d.recorded_at,
        }));
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('[设备数据] 获取历史数据失败:', error);
    res.status(500).json({ success: false, error: '获取历史数据失败' });
  }
});

/**
 * 获取已连接设备列表
 * GET /api/v1/devices/connected/:userId
 */
router.get('/connected/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const client = getSupabaseClient();

    // 获取用户保存的设备
    const { data: devices, error } = await client
      .from('user_devices')
      .select('*')
      .eq('user_id', parseInt(userId))
      .eq('is_active', true);

    if (error) {
      // 表可能不存在，返回空数组
      return res.json({ success: true, devices: [] });
    }

    const formattedDevices = devices?.map((d: any) => ({
      id: d.device_id,
      name: d.device_name,
      type: d.device_type,
      manufacturer: d.manufacturer,
      modelNumber: d.model_number,
      lastConnected: d.last_connected,
      customName: d.custom_name,
    }));

    res.json({ success: true, devices: formattedDevices || [] });
  } catch (error) {
    console.error('[设备数据] 获取设备列表失败:', error);
    res.status(500).json({ success: false, error: '获取设备列表失败' });
  }
});

/**
 * 保存/更新用户设备
 * POST /api/v1/devices/save
 */
router.post('/save', async (req, res) => {
  try {
    const { user_id, device_id, device_name, device_type, manufacturer, model_number, custom_name } = req.body;

    if (!user_id || !device_id || !device_type) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const client = getSupabaseClient();

    // Upsert 设备
    const { data, error } = await client
      .from('user_devices')
      .upsert({
        user_id,
        device_id,
        device_name: device_name || '未知设备',
        device_type,
        manufacturer: manufacturer || null,
        model_number: model_number || null,
        custom_name: custom_name || null,
        last_connected: new Date().toISOString(),
        is_active: true,
      }, {
        onConflict: 'user_id,device_id',
      })
      .select()
      .single();

    if (error) {
      console.error('[设备数据] 保存设备失败:', error);
      return res.status(500).json({ success: false, error: '保存设备失败' });
    }

    res.json({ success: true, device: data });
  } catch (error) {
    console.error('[设备数据] 保存设备失败:', error);
    res.status(500).json({ success: false, error: '保存设备失败' });
  }
});

export default router;
