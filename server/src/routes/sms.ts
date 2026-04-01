/**
 * 验证码服务
 * 支持模拟模式和真实短信模式切换
 */
import express from 'express';
import Dysmsapi20200111, * as dysmsapi from '@alicloud/dysmsapi20170525';
import * as OpenApi from '@alicloud/openapi-client';
import { getSupabaseClient } from '../storage/database/supabase-client';
import * as Util from '@alicloud/tea-util';

const router = express.Router();

// 验证码配置
const SMS_CONFIG = {
  // 模式：'mock' 模拟 | 'real' 真实短信
  mode: process.env.SMS_MODE || 'mock',
  // 验证码有效期（秒）
  expiresIn: 300,
  // 验证码长度
  codeLength: 6,
  // 短信服务商配置（真实模式时使用）
  provider: process.env.SMS_PROVIDER || 'aliyun', // aliyun | tencent | yunpian
  // 阿里云配置
  aliyun: {
    accessKeyId: process.env.ALIYUN_SMS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || '',
    signName: process.env.ALIYUN_SMS_SIGN_NAME || '', // 短信签名
    templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || '', // 短信模板ID
  },
};

// 阿里云短信客户端（延迟初始化）
let aliyunClient: Dysmsapi20200111 | null = null;

function getAliyunClient(): Dysmsapi20200111 {
  if (!aliyunClient) {
    const config = new OpenApi.Config({
      accessKeyId: SMS_CONFIG.aliyun.accessKeyId,
      accessKeySecret: SMS_CONFIG.aliyun.accessKeySecret,
    });
    // 访问的域名
    config.endpoint = 'dysmsapi.aliyuncs.com';
    aliyunClient = new Dysmsapi20200111(config);
  }
  return aliyunClient;
}

// 生成随机验证码
function generateCode(length: number): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

// 模拟发送验证码（开发环境）
async function mockSendSms(phone: string, code: string): Promise<{ success: boolean; message: string; _debug_code?: string }> {
  console.log(`[模拟短信] 手机号: ${phone}, 验证码: ${code}`);
  // 模拟延迟
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    success: true,
    message: `验证码已发送（模拟模式，验证码: ${code}）`,
    // 返回验证码方便开发调试
    _debug_code: code,
  };
}

// 阿里云短信发送
async function sendAliyunSms(phone: string, code: string): Promise<{ success: boolean; message: string }> {
  const { signName, templateCode } = SMS_CONFIG.aliyun;
  
  if (!signName || !templateCode) {
    console.error('[阿里云短信] 缺少配置: signName 或 templateCode');
    return { success: false, message: '短信服务未配置，请联系管理员' };
  }

  try {
    const client = getAliyunClient();
    
    // 发送短信请求
    const sendSmsRequest = new dysmsapi.SendSmsRequest({
      phoneNumbers: phone,
      signName: signName,
      templateCode: templateCode,
      templateParam: JSON.stringify({ code }), // 模板变量：验证码
    });

    const response = await client.sendSms(sendSmsRequest);
    
    console.log(`[阿里云短信] 发送结果: ${response.body?.code}, ${response.body?.message}`);
    
    // 判断发送是否成功
    if (response.body?.code === 'OK') {
      return { success: true, message: '验证码已发送' };
    } else {
      console.error('[阿里云短信] 发送失败:', response.body);
      // 常见错误码处理
      const errorMsgMap: Record<string, string> = {
        'isv.BUSINESS_LIMIT_CONTROL': '短信发送频率过高，请稍后再试',
        'isv.DAY_LIMIT_CONTROL': '当日发送次数已达上限',
        'isv.MOBILE_NUMBER_ILLEGAL': '手机号格式不正确',
        'isv.SIGN_NAME_ILLEGAL': '短信签名不合法',
        'isv.TEMPLATE_MISSING_PARAMETERS': '模板参数缺失',
        'isv.ACCOUNT_NOT_EXISTS': '短信账户不存在',
        'isv.ACCOUNT_ABNORMAL': '短信账户异常',
      };
      const errorMsg = errorMsgMap[response.body?.code || ''] || response.body?.message || '短信发送失败';
      return { success: false, message: errorMsg };
    }
  } catch (error) {
    console.error('[阿里云短信] 发送异常:', error);
    return { success: false, message: '短信发送失败，请稍后重试' };
  }
}

// 真实发送验证码
async function realSendSms(phone: string, code: string): Promise<{ success: boolean; message: string }> {
  const provider = SMS_CONFIG.provider;
  
  try {
    switch (provider) {
      case 'aliyun':
        return await sendAliyunSms(phone, code);
        
      case 'tencent':
        // TODO: 接入腾讯云短信
        console.log(`[腾讯云短信] TODO: 发送到 ${phone}, 验证码: ${code}`);
        return { success: false, message: '腾讯云短信服务未配置' };
        
      case 'yunpian':
        // TODO: 接入云片短信
        console.log(`[云片短信] TODO: 发送到 ${phone}, 验证码: ${code}`);
        return { success: false, message: '云片短信服务未配置' };
        
      default:
        return { success: false, message: '未知的短信服务商' };
    }
  } catch (error) {
    console.error('[短信发送错误]', error);
    return { success: false, message: '短信发送失败' };
  }
}

/**
 * 发送验证码
 * POST /api/v1/sms/send
 * Body: { phone: string, scene: 'register' | 'login' }
 */
router.post('/send', async (req, res) => {
  try {
    const { phone, scene = 'register' } = req.body;

    // 参数校验
    if (!phone) {
      return res.status(400).json({ success: false, error: '请输入手机号' });
    }

    // 手机号格式校验
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, error: '请输入正确的手机号' });
    }

    const client = getSupabaseClient();

    // 检查发送频率限制（60秒内只能发一次）
    const { data: recentCode } = await client
      .from('sms_codes')
      .select('*')
      .eq('phone', phone)
      .gte('created_at', new Date(Date.now() - 60000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (recentCode) {
      const waitSeconds = Math.ceil((new Date(recentCode.created_at).getTime() + 60000 - Date.now()) / 1000);
      return res.status(429).json({ 
        success: false, 
        error: `发送太频繁，请${waitSeconds}秒后重试`,
        waitSeconds,
      });
    }

    // 生成验证码
    const code = generateCode(SMS_CONFIG.codeLength);
    const expiresAt = new Date(Date.now() + SMS_CONFIG.expiresIn * 1000).toISOString();

    // 存储验证码
    const { error: insertError } = await client
      .from('sms_codes')
      .insert({
        phone,
        code,
        scene,
        expires_at: expiresAt,
        used: false,
      });

    if (insertError) {
      console.error('[存储验证码失败]', insertError);
      return res.status(500).json({ success: false, error: '发送失败，请重试' });
    }

    // 发送验证码
    let sendResult;
    if (SMS_CONFIG.mode === 'mock') {
      sendResult = await mockSendSms(phone, code);
    } else {
      sendResult = await realSendSms(phone, code);
    }

    if (!sendResult.success) {
      return res.status(500).json({ success: false, error: sendResult.message });
    }

    // 返回结果
    const response: any = {
      success: true,
      message: SMS_CONFIG.mode === 'mock' 
        ? `验证码已发送（开发模式）` 
        : '验证码已发送到您的手机',
      expiresIn: SMS_CONFIG.expiresIn,
    };

    // 模拟模式返回验证码（方便开发调试）
    if (SMS_CONFIG.mode === 'mock') {
      response._debug_code = code;
    }

    res.json(response);
  } catch (error) {
    console.error('[发送验证码错误]', error);
    res.status(500).json({ success: false, error: '发送失败，请重试' });
  }
});

/**
 * 验证验证码
 * POST /api/v1/sms/verify
 * Body: { phone: string, code: string, scene?: string }
 */
router.post('/verify', async (req, res) => {
  try {
    const { phone, code, scene } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ success: false, error: '请输入手机号和验证码' });
    }

    const client = getSupabaseClient();

    // 查询验证码记录
    const { data: record, error } = await client
      .from('sms_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !record) {
      return res.status(400).json({ success: false, error: '验证码错误或已过期' });
    }

    // 检查场景是否匹配
    if (scene && record.scene !== scene) {
      return res.status(400).json({ success: false, error: '验证码无效' });
    }

    // 标记验证码已使用
    await client
      .from('sms_codes')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', record.id);

    res.json({ success: true, message: '验证成功' });
  } catch (error) {
    console.error('[验证验证码错误]', error);
    res.status(500).json({ success: false, error: '验证失败，请重试' });
  }
});

/**
 * 获取当前配置（调试接口）
 * GET /api/v1/sms/config
 */
router.get('/config', (req, res) => {
  res.json({
    mode: SMS_CONFIG.mode,
    provider: SMS_CONFIG.provider,
    expiresIn: SMS_CONFIG.expiresIn,
    codeLength: SMS_CONFIG.codeLength,
    aliyun: {
      configured: !!(SMS_CONFIG.aliyun.accessKeyId && SMS_CONFIG.aliyun.accessKeySecret),
      signName: SMS_CONFIG.aliyun.signName || '未配置',
      templateCode: SMS_CONFIG.aliyun.templateCode || '未配置',
    },
  });
});

export default router;
