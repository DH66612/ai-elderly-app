/**
 * 健康数据路由
 * 接收来自手机传感器、手环等多源健康数据
 */
import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { sseManager } from './realtime';

const router = express.Router();

/**
 * 上传健康数据
 * POST /api/v1/health-data/upload
 * 
 * Body: {
 *   user_id: number,
 *   data: {
 *     steps: { steps: number, distance?: number, source: string, timestamp: string },
 *     heartRate?: { value: number, source: string, timestamp: string },
 *     ...
 *   },
 *   source: 'phone_sensor' | 'bluetooth' | 'google_fit' | 'health_connect'
 * }
 */
router.post('/upload', async (req, res) => {
  try {
    const { user_id, data, source } = req.body;

    if (!user_id || !data) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const client = getSupabaseClient();
    const now = new Date().toISOString();

    // 保存步数数据
    if (data.steps) {
      await client.from('health_data').insert({
        user_id,
        device_id: `phone_${source}`,
        device_name: source === 'phone_sensor' ? '手机计步器' : '健康设备',
        data_type: 'steps',
        data: {
          steps: data.steps.steps,
          distance: data.steps.distance,
          floors: data.steps.floors,
          source: data.steps.source,
        },
        created_at: now,
      });
    }

    // 保存心率数据
    if (data.heartRate) {
      await client.from('health_data').insert({
        user_id,
        device_id: `health_${source}`,
        device_name: '健康数据源',
        data_type: 'heart_rate',
        data: {
          value: data.heartRate.value,
          resting: data.heartRate.resting,
          source: data.heartRate.source,
        },
        created_at: now,
      });
    }

    // 保存血压数据
    if (data.bloodPressure) {
      await client.from('health_data').insert({
        user_id,
        device_id: `health_${source}`,
        device_name: '健康数据源',
        data_type: 'blood_pressure',
        data: {
          systolic: data.bloodPressure.systolic,
          diastolic: data.bloodPressure.diastolic,
          source: data.bloodPressure.source,
        },
        created_at: now,
      });
    }

    // 实时推送给监护人
    const pushData = {
      type: 'health_data_update',
      userId: user_id,
      source,
      data,
      timestamp: now,
    };
    sseManager.broadcast(user_id, 'health_data', pushData);

    console.log(`[HealthData] 上传成功: 用户${user_id} 来源${source} 步数${data.steps?.steps || 0}`);

    res.json({
      success: true,
      timestamp: now,
    });
  } catch (error) {
    console.error('[HealthData] 上传失败:', error);
    res.status(500).json({ success: false, error: '上传失败' });
  }
});

/**
 * 获取健康数据趋势（支持真实数据）
 * GET /api/v1/health-data/trend/:userId
 */
router.get('/trend/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 7 } = req.query;

    const client = getSupabaseClient();

    // 获取最近N天的步数数据
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const { data: stepsData, error: stepsError } = await client
      .from('health_data')
      .select('*')
      .eq('user_id', parseInt(userId))
      .eq('data_type', 'steps')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // 获取心率数据
    const { data: heartRateData } = await client
      .from('health_data')
      .select('*')
      .eq('user_id', parseInt(userId))
      .eq('data_type', 'heart_rate')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })
      .limit(50);

    // 处理数据
    const steps = processStepsData(stepsData || [], Number(days));
    const heartRate = processHeartRateData(heartRateData || []);
    const timeLabels = generateTimeLabels(Number(days));

    // 血压和血氧暂时使用模拟数据（需要Health Connect）
    const bloodPressure = Array.from({ length: Number(days) }, () => 
      Math.floor(105 + Math.random() * 25)
    );
    const bloodOxygen = Array.from({ length: Number(days) }, () => 
      Math.floor(96 + Math.random() * 3)
    );

    res.json({
      success: true,
      data: {
        steps,
        heartRate: heartRate.length > 0 ? heartRate : generateMockHeartRate(Number(days)),
        bloodPressure,
        bloodOxygen,
        timeLabels,
        dataSource: {
          steps: stepsData && stepsData.length > 0 ? 'real' : 'mock',
          heartRate: heartRateData && heartRateData.length > 0 ? 'real' : 'mock',
        },
      },
    });
  } catch (error) {
    console.error('[HealthData] 获取趋势失败:', error);
    res.status(500).json({ success: false, error: '获取趋势失败' });
  }
});

/**
 * 获取今日健康数据
 * GET /api/v1/health-data/today/:userId
 */
router.get('/today/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const client = getSupabaseClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 获取今日步数
    const { data: stepsData } = await client
      .from('health_data')
      .select('*')
      .eq('user_id', parseInt(userId))
      .eq('data_type', 'steps')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 获取最新心率
    const { data: heartRateData } = await client
      .from('health_data')
      .select('*')
      .eq('user_id', parseInt(userId))
      .eq('data_type', 'heart_rate')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    res.json({
      success: true,
      data: {
        steps: stepsData?.data?.steps || 0,
        distance: stepsData?.data?.distance || 0,
        heartRate: heartRateData?.data?.value || null,
        lastUpdate: stepsData?.created_at || heartRateData?.created_at || null,
      },
    });
  } catch (error) {
    console.error('[HealthData] 获取今日数据失败:', error);
    res.status(500).json({ success: false, error: '获取数据失败' });
  }
});

// 辅助函数

function processStepsData(data: any[], days: number): number[] {
  const result: number[] = [];
  const stepsByDay = new Map<string, number>();

  // 按天聚合步数
  data.forEach((item) => {
    const date = new Date(item.created_at).toDateString();
    const currentSteps = stepsByDay.get(date) || 0;
    stepsByDay.set(date, currentSteps + (item.data?.steps || 0));
  });

  // 生成最近N天的数据
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    result.push(stepsByDay.get(date.toDateString()) || 0);
  }

  return result;
}

function processHeartRateData(data: any[]): number[] {
  return data.map((item) => item.data?.value || 0);
}

function generateTimeLabels(days: number): string[] {
  const labels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
  }
  return labels;
}

function generateMockHeartRate(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(65 + Math.random() * 30));
}

export default router;
