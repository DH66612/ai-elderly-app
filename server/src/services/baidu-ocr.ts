/**
 * 百度OCR服务
 *
 * 使用百度智能云OCR API识别图片中的文字。
 * 需要配置以下环境变量：
 *   BAIDU_OCR_API_KEY     - 百度云应用的 API Key
 *   BAIDU_OCR_SECRET_KEY  - 百度云应用的 Secret Key
 *
 * 文档：https://cloud.baidu.com/doc/OCR/index.html
 */

const BAIDU_OCR_API_KEY = process.env.BAIDU_OCR_API_KEY || '';
const BAIDU_OCR_SECRET_KEY = process.env.BAIDU_OCR_SECRET_KEY || '';

// 百度OCR Token缓存
let cachedToken: string | null = null;
let tokenExpireTime: number = 0;

/**
 * 获取百度OCR访问令牌（带缓存）
 */
async function getBaiduAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpireTime) {
    return cachedToken;
  }

  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_OCR_API_KEY}&client_secret=${BAIDU_OCR_SECRET_KEY}`;

  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`获取百度Token失败: HTTP ${response.status}`);
  }

  const data = await response.json() as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (data.error) {
    throw new Error(`百度Token错误: ${data.error} - ${data.error_description}`);
  }

  if (!data.access_token) {
    throw new Error('百度Token响应中缺少 access_token');
  }

  cachedToken = data.access_token;
  // 提前5分钟过期，避免边界问题
  tokenExpireTime = now + ((data.expires_in || 2592000) - 300) * 1000;

  return cachedToken;
}

export interface BaiduOCRResult {
  text: string;
  wordsCount: number;
  error?: string;
}

/**
 * 使用百度通用文字识别（标准版）识别图片
 * @param imageBase64 图片的 base64 编码（不含 data URI 前缀）
 */
export async function recognizeTextByBaidu(imageBase64: string): Promise<BaiduOCRResult> {
  try {
    const token = await getBaiduAccessToken();
    const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${token}`;

    const body = new URLSearchParams();
    body.append('image', imageBase64);
    body.append('detect_direction', 'true');
    body.append('language_type', 'CHN_ENG');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`百度OCR请求失败: HTTP ${response.status}`);
    }

    const data = await response.json() as {
      words_result?: Array<{ words: string }>;
      words_result_num?: number;
      error_code?: number;
      error_msg?: string;
    };

    if (data.error_code) {
      return { text: '', wordsCount: 0, error: `百度OCR错误 ${data.error_code}: ${data.error_msg}` };
    }

    const text = (data.words_result || []).map((w) => w.words).join('\n');
    return { text, wordsCount: data.words_result_num || 0 };
  } catch (error: any) {
    console.error('[BaiduOCR] 识别失败:', error.message || error);
    return { text: '', wordsCount: 0, error: error.message || '百度OCR调用失败' };
  }
}

/**
 * 使用百度通用文字识别（高精度版）识别图片
 * @param imageBase64 图片的 base64 编码（不含 data URI 前缀）
 */
export async function recognizeTextByBaiduAccurate(imageBase64: string): Promise<BaiduOCRResult> {
  try {
    const token = await getBaiduAccessToken();
    const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${token}`;

    const body = new URLSearchParams();
    body.append('image', imageBase64);
    body.append('detect_direction', 'true');
    body.append('language_type', 'CHN_ENG');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`百度OCR高精度请求失败: HTTP ${response.status}`);
    }

    const data = await response.json() as {
      words_result?: Array<{ words: string }>;
      words_result_num?: number;
      error_code?: number;
      error_msg?: string;
    };

    if (data.error_code) {
      return { text: '', wordsCount: 0, error: `百度OCR高精度错误 ${data.error_code}: ${data.error_msg}` };
    }

    const text = (data.words_result || []).map((w) => w.words).join('\n');
    return { text, wordsCount: data.words_result_num || 0 };
  } catch (error: any) {
    console.error('[BaiduOCR] 高精度识别失败:', error.message || error);
    return { text: '', wordsCount: 0, error: error.message || '百度OCR高精度调用失败' };
  }
}

/**
 * 检查百度OCR是否已配置
 */
export function isBaiduOCRConfigured(): boolean {
  return Boolean(BAIDU_OCR_API_KEY && BAIDU_OCR_SECRET_KEY);
}
