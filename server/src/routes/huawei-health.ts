/**
 * 华为运动健康开放平台集成 - 增强版
 * 
 * 支持的数据类型：
 * 
 * 日常活动：
 * - 步数 (step)
 * - 距离 (distance)
 * - 热量 (calories)
 * - 中高强度活动时间 (activeMinutes)
 * - 爬高/海拔 (altitude)
 * 
 * 健康数据：
 * - 心率 (heart_rate)
 * - 血压 (blood_pressure)
 * - 血氧 (blood_oxygen)
 * - 睡眠 (sleep)
 * - 压力 (stress)
 * - 体温 (temperature)
 * - 血糖 (blood_sugar)
 * - 体脂 (body_fat)
 * 
 * 锻炼记录：
 * - 运动次数、时长、热量消耗
 */
import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = express.Router();

// 华为运动健康 API 配置
const HUAWEI_CONFIG = {
  clientId: process.env.HUAWEI_HEALTH_CLIENT_ID || '',
  clientSecret: process.env.HUAWEI_HEALTH_CLIENT_SECRET || '',
  redirectUri: process.env.HUAWEI_HEALTH_REDIRECT_URI || '',
  authUrl: 'https://oauth-login.cloud.huawei.com/oauth2/v3/authorize',
  tokenUrl: 'https://oauth-login.cloud.huawei.com/oauth2/v3/token',
  apiUrl: 'https://health-api.huawei.com',
  // 完整的授权范围
  scope: [
    // 日常活动
    'https://www.huawei.com/health/step.read',
    'https://www.huawei.com/health/distance.read',
    'https://www.huawei.com/health/calories.read',
    'https://www.huawei.com/health/activity.read',
    // 健康数据
    'https://www.huawei.com/health/heart_rate.read',
    'https://www.huawei.com/health/blood_pressure.read',
    'https://www.huawei.com/health/blood_oxygen.read',
    'https://www.huawei.com/health/sleep.read',
    'https://www.huawei.com/health/stress.read',
    'https://www.huawei.com/health/temperature.read',
    'https://www.huawei.com/health/blood_sugar.read',
    'https://www.huawei.com/health/body_fat.read',
    // 锻炼记录
    'https://www.huawei.com/health/exercise.read',
    // 设备信息
    'https://www.huawei.com/health/device.read',
  ].join(' '),
};

function isConfigured(): boolean {
  return !!(HUAWEI_CONFIG.clientId && HUAWEI_CONFIG.clientSecret && HUAWEI_CONFIG.redirectUri);
}

/**
 * 生成授权URL
 * GET /api/v1/huawei-health/auth-url
 */
router.get('/auth-url', async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.status(400).json({
        success: false,
        error: '华为健康API未配置',
        guide: '请在环境变量中设置 HUAWEI_HEALTH_CLIENT_ID、HUAWEI_HEALTH_CLIENT_SECRET、HUAWEI_HEALTH_REDIRECT_URI',
      });
    }

    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId 是必填参数' });
    }

    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

    const authUrl = `${HUAWEI_CONFIG.authUrl}?${new URLSearchParams({
      response_type: 'code',
      client_id: HUAWEI_CONFIG.clientId,
      redirect_uri: HUAWEI_CONFIG.redirectUri,
      scope: HUAWEI_CONFIG.scope,
      state,
      access_type: 'offline',
    })}`;

    res.json({ success: true, authUrl });
  } catch (error: any) {
    console.error('[华为健康] 生成授权URL失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * OAuth 回调处理
 * GET /api/v1/huawei-health/callback
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error: authError } = req.query;

    if (authError) {
      return res.status(400).json({ success: false, error: `授权失败: ${authError}` });
    }

    if (!code || !state) {
      return res.status(400).json({ success: false, error: '缺少授权码或状态参数' });
    }

    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    const { userId } = stateData;

    // 获取 access_token
    const tokenResponse = await fetch(HUAWEI_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        client_id: HUAWEI_CONFIG.clientId,
        client_secret: HUAWEI_CONFIG.clientSecret,
        redirect_uri: HUAWEI_CONFIG.redirectUri,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.status(400).json({ success: false, error: `Token获取失败: ${tokenData.error_description || tokenData.error}` });
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // 保存到数据库
    const client = getSupabaseClient();
    
    await client.from('huawei_health_tokens').delete().eq('user_id', userId);
    
    const { error: insertError } = await client.from('huawei_health_tokens').insert({
      user_id: userId,
      access_token,
      refresh_token,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      return res.status(500).json({ success: false, error: '保存授权信息失败' });
    }

    res.send(`
      <html>
        <head><title>授权成功</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1 style="color: #4CAF50;">✅ 华为健康授权成功！</h1>
          <p>您可以关闭此页面，返回APP查看健康数据。</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('[华为健康] 回调处理失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 刷新 Token
 */
async function refreshAccessToken(userId: number): Promise<string | null> {
  const client = getSupabaseClient();
  
  const { data: tokenData } = await client
    .from('huawei_health_tokens')
    .select('refresh_token')
    .eq('user_id', userId)
    .single();

  if (!tokenData) return null;

  try {
    const response = await fetch(HUAWEI_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
        client_id: HUAWEI_CONFIG.clientId,
        client_secret: HUAWEI_CONFIG.clientSecret,
      }).toString(),
    });

    const data = await response.json();

    if (data.error) {
      console.error('[华为健康] Token刷新失败:', data.error);
      return null;
    }

    const expiresAt = new Date(Date.now() + data.expires_in * 1000);
    await client
      .from('huawei_health_tokens')
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return data.access_token;
  } catch (error) {
    console.error('[华为健康] Token刷新异常:', error);
    return null;
  }
}

/**
 * 获取有效的 Access Token
 */
async function getValidAccessToken(userId: number): Promise<string | null> {
  const client = getSupabaseClient();
  
  const { data: tokenData } = await client
    .from('huawei_health_tokens')
    .select('access_token, expires_at')
    .eq('user_id', userId)
    .single();

  if (!tokenData) return null;

  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();
  
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    return await refreshAccessToken(userId);
  }

  return tokenData.access_token;
}

/**
 * 获取指定类型的健康数据
 */
async function fetchHealthData(accessToken: string, dataType: string, startDate: string, endDate: string): Promise<any> {
  try {
    const response = await fetch(
      `${HUAWEI_CONFIG.apiUrl}/v1/data?${new URLSearchParams({
        dataType,
        startTime: startDate,
        endTime: endDate,
      })}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    const data = await response.json();
    return data.error ? null : data;
  } catch (error) {
    console.error(`[华为健康] 获取${dataType}失败:`, error);
    return null;
  }
}

/**
 * 同步健康数据 - 增强版
 * POST /api/v1/huawei-health/sync
 */
router.post('/sync', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId 是必填参数' });
    }

    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: '未授权或授权已过期',
        needAuth: true,
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 并行获取所有健康数据
    const dataTypes = [
      // 日常活动
      'step', 'distance', 'calories', 'activeMinutes', 'altitude',
      // 健康数据
      'heart_rate', 'blood_pressure', 'blood_oxygen', 'sleep', 
      'stress', 'temperature', 'blood_sugar', 'body_fat',
      // 锻炼记录
      'exercise',
      // 设备信息
      'device',
    ];
    
    const results: Record<string, any> = {};
    
    await Promise.all(dataTypes.map(async (dataType) => {
      const data = await fetchHealthData(accessToken, dataType, yesterday, today);
      if (data) {
        results[dataType] = data;
      }
    }));

    // 处理和格式化数据
    const formattedData = formatHealthData(results);

    // 保存到数据库
    const client = getSupabaseClient();
    await client
      .from('health_trend')
      .upsert({
        user_id: userId,
        date: today,
        data: formattedData,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,date' });

    res.json({
      success: true,
      data: formattedData,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[华为健康] 同步失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 格式化健康数据
 */
function formatHealthData(rawData: Record<string, any>): Record<string, any> {
  return {
    // 日常活动
    step: {
      value: rawData.step?.totalSteps || rawData.step?.value || 0,
      goal: rawData.step?.goal || 10000,
    },
    distance: {
      value: rawData.distance?.totalDistance || rawData.distance?.value || 0,
    },
    calories: {
      value: rawData.calories?.totalCalories || rawData.calories?.value || 0,
      goal: rawData.calories?.goal || 500,
    },
    activeMinutes: {
      value: rawData.activeMinutes?.totalMinutes || rawData.activeMinutes?.value || 0,
      goal: rawData.activeMinutes?.goal || 60,
    },
    altitude: {
      value: rawData.altitude?.totalAltitude || rawData.altitude?.value || 0,
    },
    
    // 健康数据
    heart_rate: {
      value: rawData.heart_rate?.latest || rawData.heart_rate?.value || 0,
      min: rawData.heart_rate?.min,
      max: rawData.heart_rate?.max,
      average: rawData.heart_rate?.average,
    },
    blood_pressure: {
      systolic: rawData.blood_pressure?.systolic || rawData.blood_pressure?.value?.systolic || 0,
      diastolic: rawData.blood_pressure?.diastolic || rawData.blood_pressure?.value?.diastolic || 0,
    },
    blood_oxygen: {
      value: rawData.blood_oxygen?.latest || rawData.blood_oxygen?.value || 0,
      min: rawData.blood_oxygen?.min,
      max: rawData.blood_oxygen?.max,
    },
    sleep: {
      hours: rawData.sleep?.totalTime ? rawData.sleep.totalTime / 60 : 0,
      quality: rawData.sleep?.quality || '未知',
      deep: rawData.sleep?.deepTime ? rawData.sleep.deepTime / 60 : 0,
      light: rawData.sleep?.lightTime ? rawData.sleep.lightTime / 60 : 0,
      rem: rawData.sleep?.remTime ? rawData.sleep.remTime / 60 : 0,
    },
    stress: {
      value: rawData.stress?.latest || rawData.stress?.value || 0,
      level: rawData.stress?.level,
    },
    temperature: {
      value: rawData.temperature?.latest || rawData.temperature?.value || 0,
    },
    blood_sugar: {
      value: rawData.blood_sugar?.latest || rawData.blood_sugar?.value || 0,
      type: rawData.blood_sugar?.type || '空腹',
    },
    body_fat: {
      value: rawData.body_fat?.percentage || rawData.body_fat?.value || 0,
    },
    
    // 锻炼数据
    exercise: {
      count: rawData.exercise?.count || 0,
      totalMinutes: rawData.exercise?.totalMinutes || 0,
      totalCalories: rawData.exercise?.totalCalories || 0,
    },
    
    // 设备信息
    device: {
      connected: rawData.device?.connected || false,
      name: rawData.device?.name || '未连接设备',
      battery: rawData.device?.battery || 0,
      lastSync: rawData.device?.lastSync || new Date().toISOString(),
    },
  };
}

/**
 * 检查授权状态
 * GET /api/v1/huawei-health/status
 */
router.get('/status', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId 是必填参数' });
    }

    const client = getSupabaseClient();
    
    const { data: tokenData } = await client
      .from('huawei_health_tokens')
      .select('id, expires_at, created_at')
      .eq('user_id', userId)
      .single();

    res.json({
      success: true,
      authorized: !!tokenData,
      expiresAt: tokenData?.expires_at,
      createdAt: tokenData?.created_at,
      configured: isConfigured(),
    });
  } catch (error: any) {
    console.error('[华为健康] 检查状态失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 取消授权
 * DELETE /api/v1/huawei-health/revoke
 */
router.delete('/revoke', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId 是必填参数' });
    }

    const client = getSupabaseClient();
    
    await client
      .from('huawei_health_tokens')
      .delete()
      .eq('user_id', userId);

    res.json({ success: true, message: '已取消华为健康授权' });
  } catch (error: any) {
    console.error('[华为健康] 取消授权失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
