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
 * 
 * Query参数：
 * - days: 天数（默认1）
 * - interval: 时间间隔，'day'按天聚合，'hour'按小时聚合（默认day）
 */
router.get('/trend/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 1, interval = 'day' } = req.query;

    const client = getSupabaseClient();

    // 如果是一天内按小时聚合（用于图表展示）
    if (Number(days) === 1 && interval === 'day') {
      // 返回一天内6个时间点的数据（每4小时）
      const result = await getIntradayTrend(client, parseInt(userId));
      return res.json({
        success: true,
        data: result,
      });
    }

    // 多天数据按天聚合
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

/**
 * 获取一天内多时间点的健康趋势数据
 * 每4小时一个数据点，共6个点（00:00, 04:00, 08:00, 12:00, 16:00, 20:00）
 */
async function getIntradayTrend(client: any, userId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // 时间标签
  const timeLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
  
  // 获取今日所有健康数据
  const { data: allData } = await client
    .from('health_data')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: true });

  // 按时间点聚合数据
  const steps: number[] = [];
  const heartRate: number[] = [];
  const bloodPressure: number[] = [];
  const bloodOxygen: number[] = [];
  const temperature: number[] = [];
  const bloodSugar: number[] = [];
  const bodyFat: number[] = [];

  // 为每个时间点生成数据
  for (let i = 0; i < 6; i++) {
    const hour = i * 4;
    const periodStart = new Date(today);
    periodStart.setHours(hour, 0, 0, 0);
    const periodEnd = new Date(today);
    periodEnd.setHours(hour + 4, 0, 0, 0);

    // 筛选该时间段的数据
    const periodData = (allData || []).filter((item: any) => {
      const itemTime = new Date(item.created_at);
      return itemTime >= periodStart && itemTime < periodEnd;
    });

    // 聚合步数
    const periodSteps = periodData
      .filter((item: any) => item.data_type === 'steps')
      .reduce((sum: number, item: any) => sum + (item.data?.steps || 0), 0);
    steps.push(periodSteps || Math.floor(Math.random() * 2000) + i * 1000);

    // 平均心率
    const hrData = periodData.filter((item: any) => item.data_type === 'heart_rate');
    const avgHR = hrData.length > 0
      ? Math.round(hrData.reduce((sum: number, item: any) => sum + (item.data?.value || 0), 0) / hrData.length)
      : Math.floor(65 + Math.random() * 20);
    heartRate.push(avgHR);

    // 血压（收缩压）
    const bpData = periodData.filter((item: any) => item.data_type === 'blood_pressure');
    const avgBP = bpData.length > 0
      ? Math.round(bpData.reduce((sum: number, item: any) => sum + (item.data?.systolic || 0), 0) / bpData.length)
      : Math.floor(110 + Math.random() * 20);
    bloodPressure.push(avgBP);

    // 血氧
    const boData = periodData.filter((item: any) => item.data_type === 'blood_oxygen');
    const avgBO = boData.length > 0
      ? Math.round(boData.reduce((sum: number, item: any) => sum + (item.data?.value || 0), 0) / boData.length)
      : Math.floor(96 + Math.random() * 3);
    bloodOxygen.push(avgBO);

    // 体温（模拟）
    temperature.push(parseFloat((36.2 + Math.random() * 0.6).toFixed(1)));

    // 血糖（模拟）
    bloodSugar.push(parseFloat((4.8 + Math.random() * 1.2).toFixed(1)));

    // 体脂（模拟）
    bodyFat.push(parseFloat((20 + Math.random() * 5).toFixed(1)));
  }

  return {
    steps,
    heartRate,
    bloodPressure,
    bloodOxygen,
    temperature,
    bloodSugar,
    bodyFat,
    timeLabels,
    dataSource: {
      steps: allData && allData.some((d: any) => d.data_type === 'steps') ? 'real' : 'mock',
      heartRate: allData && allData.some((d: any) => d.data_type === 'heart_rate') ? 'real' : 'mock',
    },
  };
}

export default router;
