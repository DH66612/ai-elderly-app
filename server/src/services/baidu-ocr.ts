/**
 * 百度OCR服务
 *
 * 使用百度智能云OCR API识别图片中的文字。
 * 需要配置以下环境变量：
 *   BAIDU_OCR_APP_ID      - 百度云应用的 App ID
 *   BAIDU_OCR_API_KEY     - 百度云应用的 API Key（client_id）
 *   BAIDU_OCR_SECRET_KEY  - 百度云应用的 Secret Key（client_secret）
 *
 * 认证流程：
 *   使用 API Key 和 Secret Key 通过 OAuth 2.0 client_credentials 方式换取
 *   access_token，再携带 token 调用 OCR 接口。
 *
 * 文档：https://cloud.baidu.com/doc/OCR/index.html
 */

const BAIDU_OCR_APP_ID = process.env.BAIDU_OCR_APP_ID || '';
const BAIDU_OCR_API_KEY = process.env.BAIDU_OCR_API_KEY || '';
const BAIDU_OCR_SECRET_KEY = process.env.BAIDU_OCR_SECRET_KEY || '';

// Token 端点
const TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token';

// OCR 端点
const OCR_GENERAL_BASIC_URL = 'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic';
const OCR_ACCURATE_BASIC_URL = 'https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic';

// 百度OCR Token 缓存
let cachedToken: string | null = null;
let tokenExpireTime: number = 0;

/**
 * 获取百度 OCR 访问令牌（带缓存）
 *
 * 使用 BAIDU_OCR_API_KEY（client_id）和 BAIDU_OCR_SECRET_KEY（client_secret）
 * 通过 OAuth 2.0 client_credentials 授权模式换取 access_token。
 * Token 有效期默认 30 天，提前 5 分钟刷新以避免边界问题。
 */
async function getBaiduAccessToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && now < tokenExpireTime) {
    console.log('[BaiduOCR] 使用缓存 Token，剩余有效期:', Math.round((tokenExpireTime - now) / 1000), '秒');
    return cachedToken;
  }

  console.log('[BaiduOCR] 正在获取新的 access_token，APP_ID:', BAIDU_OCR_APP_ID);

  const url =
    `${TOKEN_URL}` +
    `?grant_type=client_credentials` +
    `&client_id=${encodeURIComponent(BAIDU_OCR_API_KEY)}` +
    `&client_secret=${encodeURIComponent(BAIDU_OCR_SECRET_KEY)}`;

  let response: Response;
  try {
    response = await fetch(url, { method: 'POST' });
  } catch (err: any) {
    throw new Error(`[BaiduOCR] 网络请求失败，无法获取 Token: ${err.message || err}`);
  }

  if (!response.ok) {
    throw new Error(`[BaiduOCR] 获取 Token 失败: HTTP ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (data.error) {
    throw new Error(`[BaiduOCR] Token 授权错误: ${data.error} - ${data.error_description}`);
  }

  if (!data.access_token) {
    throw new Error('[BaiduOCR] Token 响应中缺少 access_token 字段');
  }

  cachedToken = data.access_token;
  // 提前 5 分钟过期，避免边界竞争
  tokenExpireTime = now + ((data.expires_in || 2592000) - 300) * 1000;

  console.log('[BaiduOCR] 成功获取 access_token，有效期:', data.expires_in || 2592000, '秒');

  return cachedToken;
}

export interface BaiduOCRResult {
  text: string;
  wordsCount: number;
  error?: string;
}

/**
 * 调用百度 OCR 接口的通用实现
 * @param endpoint  OCR 接口 URL（不含 access_token）
 * @param imageBase64  图片的 base64 编码（不含 data URI 前缀）
 * @param label  日志标识，用于区分标准版 / 高精度版
 */
async function callBaiduOCR(
  endpoint: string,
  imageBase64: string,
  label: string,
): Promise<BaiduOCRResult> {
  const token = await getBaiduAccessToken();
  const url = `${endpoint}?access_token=${token}`;

  console.log(`[BaiduOCR] 发起 ${label} 请求，图片 base64 长度:`, imageBase64.length);

  const body = new URLSearchParams();
  body.append('image', imageBase64);
  body.append('detect_direction', 'true');
  body.append('language_type', 'CHN_ENG');

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch (err: any) {
    throw new Error(`[BaiduOCR] ${label} 网络请求失败: ${err.message || err}`);
  }

  if (!response.ok) {
    throw new Error(`[BaiduOCR] ${label} 请求失败: HTTP ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as {
    words_result?: Array<{ words: string }>;
    words_result_num?: number;
    error_code?: number;
    error_msg?: string;
  };

  if (data.error_code) {
    const errMsg = `[BaiduOCR] ${label} API 错误 ${data.error_code}: ${data.error_msg}`;
    console.error(errMsg);
    return { text: '', wordsCount: 0, error: errMsg };
  }

  const text = (data.words_result || []).map((w) => w.words).join('\n');
  const wordsCount = data.words_result_num ?? (data.words_result?.length ?? 0);

  console.log(`[BaiduOCR] ${label} 识别成功，识别行数: ${wordsCount}，文字长度: ${text.length}`);

  return { text, wordsCount };
}

/**
 * 使用百度通用文字识别（标准版）识别图片
 * @param imageBase64 图片的 base64 编码（不含 data URI 前缀）
 */
export async function recognizeTextByBaidu(imageBase64: string): Promise<BaiduOCRResult> {
  try {
    return await callBaiduOCR(OCR_GENERAL_BASIC_URL, imageBase64, '通用文字识别（标准版）');
  } catch (error: any) {
    console.error('[BaiduOCR] 标准版识别失败:', error.message || error);
    return { text: '', wordsCount: 0, error: error.message || '百度OCR标准版调用失败' };
  }
}

/**
 * 使用百度通用文字识别（高精度版）识别图片
 * @param imageBase64 图片的 base64 编码（不含 data URI 前缀）
 */
export async function recognizeTextByBaiduAccurate(imageBase64: string): Promise<BaiduOCRResult> {
  try {
    return await callBaiduOCR(OCR_ACCURATE_BASIC_URL, imageBase64, '通用文字识别（高精度版）');
  } catch (error: any) {
    console.error('[BaiduOCR] 高精度版识别失败:', error.message || error);
    return { text: '', wordsCount: 0, error: error.message || '百度OCR高精度版调用失败' };
  }
}

/**
 * 检查百度OCR所需的三个环境变量是否均已配置
 */
export function isBaiduOCRConfigured(): boolean {
  const configured = Boolean(BAIDU_OCR_APP_ID && BAIDU_OCR_API_KEY && BAIDU_OCR_SECRET_KEY);
  if (!configured) {
    const missing: string[] = [];
    if (!BAIDU_OCR_APP_ID) missing.push('BAIDU_OCR_APP_ID');
    if (!BAIDU_OCR_API_KEY) missing.push('BAIDU_OCR_API_KEY');
    if (!BAIDU_OCR_SECRET_KEY) missing.push('BAIDU_OCR_SECRET_KEY');
    console.warn('[BaiduOCR] 未配置以下环境变量:', missing.join(', '));
  }
  return configured;
}
