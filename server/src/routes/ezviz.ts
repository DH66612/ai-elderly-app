/**
 * 萤石开放平台API路由
 * 文档：https://open.ys7.com/doc/zh/book/zh-book-api.html
 * 
 * 使用步骤：
 * 1. 注册萤石开放平台账号：https://open.ys7.com/
 * 2. 创建应用，获取 AppKey 和 AppSecret
 * 3. 在萤石App中绑定摄像头，获取设备序列号
 * 4. 调用API添加设备到应用，获取直播地址
 */
import express from 'express';
import type { Request, Response } from 'express';

const router = express.Router();

// 萤石开放平台配置（从环境变量获取）
const EZVIZ_APP_KEY = process.env.EZVIZ_APP_KEY || '';
const EZVIZ_APP_SECRET = process.env.EZVIZ_APP_SECRET || '';

// 萤石API基础地址
const EZVIZ_API_BASE = 'https://open.ys7.com/api/lapp';

// Token缓存
let accessToken: string | null = null;
let tokenExpireTime: number = 0;

/**
 * 获取AccessToken
 * 萤石Token有效期7天，建议缓存
 */
async function getAccessToken(): Promise<string> {
  // 检查缓存的Token是否有效（提前1小时刷新）
  if (accessToken && Date.now() < tokenExpireTime - 3600000) {
    return accessToken;
  }

  if (!EZVIZ_APP_KEY || !EZVIZ_APP_SECRET) {
    throw new Error('萤石开放平台未配置，请设置 EZVIZ_APP_KEY 和 EZVIZ_APP_SECRET 环境变量');
  }

  const url = new URL(`${EZVIZ_API_BASE}/token/get`);
  const params = new URLSearchParams({
    appKey: EZVIZ_APP_KEY,
    appSecret: EZVIZ_APP_SECRET,
  });

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json() as {
    code: string;
    msg?: string;
    data?: {
      accessToken: string;
      expireTime: number;
    };
  };

  if (data.code !== '200' || !data.data) {
    throw new Error(`获取AccessToken失败: ${data.msg || data.code}`);
  }

  accessToken = data.data.accessToken;
  tokenExpireTime = data.data.expireTime;
  
  console.log('[Ezviz] AccessToken获取成功，有效期至:', new Date(tokenExpireTime).toISOString());
  
  return accessToken;
}

/**
 * 构建萤石API请求
 */
async function ezvizRequest(apiPath: string, params: Record<string, string>): Promise<any> {
  const token = await getAccessToken();
  
  const url = new URL(`${EZVIZ_API_BASE}${apiPath}`);
  const body = new URLSearchParams({
    accessToken: token,
    ...params,
  });

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await response.json() as {
    code: string;
    msg?: string;
    data?: any;
  };
  
  if (data.code !== '200') {
    throw new Error(`萤石API错误: ${data.msg || data.code}`);
  }
  
  return data.data;
}

/**
 * GET /api/v1/ezviz/status
 * 检查萤石平台配置状态
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const configured = !!(EZVIZ_APP_KEY && EZVIZ_APP_SECRET);
    
    if (!configured) {
      return res.json({
        success: true,
        data: {
          configured: false,
          message: '萤石开放平台未配置',
          setupGuide: [
            '1. 注册萤石开放平台账号：https://open.ys7.com/',
            '2. 创建应用，获取 AppKey 和 AppSecret',
            '3. 在服务器环境变量中设置：',
            '   EZVIZ_APP_KEY=你的AppKey',
            '   EZVIZ_APP_SECRET=你的AppSecret',
            '4. 在萤石App中绑定摄像头',
            '5. 获取设备序列号（在摄像头标签或App中查看）',
          ],
        },
      });
    }

    // 尝试获取Token验证配置
    try {
      await getAccessToken();
      return res.json({
        success: true,
        data: {
          configured: true,
          message: '萤石开放平台已配置',
        },
      });
    } catch (tokenError) {
      return res.json({
        success: true,
        data: {
          configured: false,
          message: `配置有误: ${tokenError instanceof Error ? tokenError.message : '未知错误'}`,
        },
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: '检查状态失败' });
  }
});

/**
 * GET /api/v1/ezviz/devices
 * 获取设备列表
 */
router.get('/devices', async (req: Request, res: Response) => {
  try {
    const data = await ezvizRequest('/device/list', {
      pageStart: '0',
      pageSize: '50',
    });

    // 转换设备数据格式
    const devices = (data || []).map((device: any) => ({
      deviceSerial: device.deviceSerial,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      status: device.status, // 0-离线, 1-在线
      alarmStatus: device.alarmStatus,
      isEncrypt: device.isEncrypt,
      channelCount: device.channelCount,
      isShared: device.isShared,
      // 其他有用字段
      defense: device.defense,
      isBelong: device.isBelong,
    }));

    res.json({ success: true, data: devices });
  } catch (error) {
    console.error('[Ezviz] 获取设备列表失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : '获取设备列表失败',
      data: [], // 返回空数组，避免前端报错
    });
  }
});

/**
 * POST /api/v1/ezviz/device/add
 * 添加设备
 * Body: { deviceSerial: string, validateCode: string }
 */
router.post('/device/add', async (req: Request, res: Response) => {
  try {
    const { deviceSerial, validateCode } = req.body;

    if (!deviceSerial || !validateCode) {
      return res.status(400).json({
        success: false,
        error: '缺少设备序列号或验证码',
      });
    }

    await ezvizRequest('/device/add', {
      deviceSerial,
      validateCode,
    });

    res.json({
      success: true,
      message: '设备添加成功',
      data: { deviceSerial },
    });
  } catch (error) {
    console.error('[Ezviz] 添加设备失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : '添加设备失败',
    });
  }
});

/**
 * DELETE /api/v1/ezviz/device/:deviceSerial
 * 删除设备
 */
router.delete('/device/:deviceSerial', async (req: Request, res: Response) => {
  try {
    const deviceSerial = Array.isArray(req.params.deviceSerial) 
      ? req.params.deviceSerial[0] 
      : req.params.deviceSerial;

    await ezvizRequest('/device/delete', {
      deviceSerial,
    });

    res.json({ success: true, message: '设备删除成功' });
  } catch (error) {
    console.error('[Ezviz] 删除设备失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : '删除设备失败',
    });
  }
});

/**
 * POST /api/v1/ezviz/live/address
 * 获取直播地址
 * Body: { deviceSerial: string, channelNo?: number, quality?: 1-2 }
 * quality: 1-高清, 2-标清
 */
router.post('/live/address', async (req: Request, res: Response) => {
  try {
    const { deviceSerial, channelNo = 1, quality = 1 } = req.body;

    if (!deviceSerial) {
      return res.status(400).json({
        success: false,
        error: '缺少设备序列号',
      });
    }

    const data = await ezvizRequest('/live/address/get', {
      deviceSerial,
      channelNo: String(channelNo),
      quality: String(quality),
    });

    // 返回直播地址信息
    res.json({
      success: true,
      data: {
        deviceSerial,
        channelNo,
        url: data?.url, // HLS地址，可直接播放
        hdUrl: data?.hdUrl, // 高清地址
        sdUrl: data?.sdUrl, // 标清地址
        rtmpUrl: data?.rtmpUrl, // RTMP地址
        expireTime: data?.expireTime,
      },
    });
  } catch (error) {
    console.error('[Ezviz] 获取直播地址失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : '获取直播地址失败',
    });
  }
});

/**
 * POST /api/v1/ezviz/live/address/limited
 * 获取有限期直播地址（分享用）
 * Body: { deviceSerial: string, channelNo?: number, expireTime?: number }
 * expireTime: 有效期时间戳，最大7天
 */
router.post('/live/address/limited', async (req: Request, res: Response) => {
  try {
    const { deviceSerial, channelNo = 1, expireTime } = req.body;

    if (!deviceSerial) {
      return res.status(400).json({
        success: false,
        error: '缺少设备序列号',
      });
    }

    // 默认24小时有效
    const expire = expireTime || Date.now() + 24 * 60 * 60 * 1000;

    const data = await ezvizRequest('/live/address/limited', {
      deviceSerial,
      channelNo: String(channelNo),
      expireTime: String(expire),
    });

    res.json({
      success: true,
      data: {
        url: data?.url,
        expireTime: expire,
      },
    });
  } catch (error) {
    console.error('[Ezviz] 获取有限期直播地址失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : '获取直播地址失败',
    });
  }
});

/**
 * POST /api/v1/ezviz/capture
 * 抓拍图片
 * Body: { deviceSerial: string, channelNo?: number }
 */
router.post('/capture', async (req: Request, res: Response) => {
  try {
    const { deviceSerial, channelNo = 1 } = req.body;

    if (!deviceSerial) {
      return res.status(400).json({
        success: false,
        error: '缺少设备序列号',
      });
    }

    const data = await ezvizRequest('/device/capture', {
      deviceSerial,
      channelNo: String(channelNo),
    });

    res.json({
      success: true,
      data: {
        imageUrl: data?.picUrl,
        createTime: Date.now(),
      },
    });
  } catch (error) {
    console.error('[Ezviz] 抓拍失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : '抓拍失败',
    });
  }
});

/**
 * POST /api/v1/ezviz/ptz/start
 * 云台控制-开始
 * Body: { deviceSerial: string, channelNo?: number, direction: number, speed?: number }
 * direction: 0-上, 1-下, 2-左, 3-右, 4-左上, 5-右上, 6-左下, 7-右下, 8-放大, 9-缩小
 * speed: 0-7，默认4
 */
router.post('/ptz/start', async (req: Request, res: Response) => {
  try {
    const { deviceSerial, channelNo = 1, direction, speed = 4 } = req.body;

    if (!deviceSerial || direction === undefined) {
      return res.status(400).json({
        success: false,
        error: '缺少设备序列号或方向',
      });
    }

    await ezvizRequest('/device/ptz/start', {
      deviceSerial,
      channelNo: String(channelNo),
      direction: String(direction),
      speed: String(speed),
    });

    res.json({ success: true, message: '云台控制指令已发送' });
  } catch (error) {
    console.error('[Ezviz] 云台控制失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : '云台控制失败',
    });
  }
});

/**
 * POST /api/v1/ezviz/ptz/stop
 * 云台控制-停止
 */
router.post('/ptz/stop', async (req: Request, res: Response) => {
  try {
    const { deviceSerial, channelNo = 1, direction } = req.body;

    if (!deviceSerial) {
      return res.status(400).json({
        success: false,
        error: '缺少设备序列号',
      });
    }

    await ezvizRequest('/device/ptz/stop', {
      deviceSerial,
      channelNo: String(channelNo),
      direction: String(direction || 0),
    });

    res.json({ success: true, message: '云台已停止' });
  } catch (error) {
    console.error('[Ezviz] 云台停止失败:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : '云台停止失败',
    });
  }
});

export default router;
