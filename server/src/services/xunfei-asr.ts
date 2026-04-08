/**
 * 讯飞语音识别 (ASR) 服务
 * 使用讯飞语音听写（流式版）WebAPI
 * 
 * API文档：https://www.xfyun.cn/doc/asr/voicedictation/API.html
 * 支持普通话和多种方言
 */

import * as crypto from 'crypto';
import WebSocket from 'ws';

// 讯飞语音听写（流式版）API
// 参考：https://www.xfyun.cn/doc/asr/voicedictation/API.html
const XUNFEI_ASR_URL = 'wss://iat-api.xfyun.cn/v2/iat';

// 方言代码映射（讯飞语音听写API）
// 参考：https://www.xfyun.cn/doc/asr/voicedictation/API.html
// accent 参数可选值：mandarin(普通话), cantonese(粤语), henan(河南话), sichuan(四川话), dongbei(东北话), shaanxi(陕西方言), shandong(山东话), jiangsu(江苏话), ludian(泸滇), guangxi(广西), hubei(湖北话), hunan(湖南话), jiangxi(江西话), kejia(客家话), minnan(闽南语), anhui(安徽话), gansu(甘肃话), guizhou(贵州话), jinzhong(晋中话), ningbo(宁波话), shanbei(陕北话), wenzhou(温州话), xinhua(新华话), shanghai(上海话)
export const DIALECT_CODES: Record<string, string> = {
  mandarin: 'mandarin',      // 普通话
  cantonese: 'cantonese',    // 粤语
  sichuan: 'sichuan',        // 四川话
  dongbei: 'dongbei',        // 东北话
  henan: 'henan',            // 河南话
  shaanxi: 'shaanxi',        // 陕西话（陕西方言）
  shanghai: 'shanghai',      // 上海话
  hunan: 'hunan',            // 湖南话
};

// 方言名称映射（用于日志）
const DIALECT_NAMES: Record<string, string> = {
  mandarin: '普通话',
  cantonese: '粤语',
  sichuan: '四川话',
  dongbei: '东北话',
  henan: '河南话',
  shaanxi: '陕西话',
  shanghai: '上海话',
  hunan: '湖南话',
};

export interface ASRResult {
  text: string;
  duration?: number;
  utterances?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

/**
 * 检查讯飞 ASR 是否已配置
 */
export function isXunfeiASRConfigured(): boolean {
  return !!(
    process.env.XUNFEI_APP_ID &&
    process.env.XUNFEI_API_KEY &&
    process.env.XUNFEI_API_SECRET
  );
}

/**
 * 生成讯飞鉴权 URL
 */
function generateAuthUrl(apiKey: string, apiSecret: string): string {
  const url = new URL(XUNFEI_ASR_URL);
  const host = url.host;
  const path = url.pathname;
  const date = new Date().toUTCString();
  
  // 生成签名
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(signatureOrigin)
    .digest('base64');
  
  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = Buffer.from(authorizationOrigin).toString('base64');
  
  return `${XUNFEI_ASR_URL}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${encodeURIComponent(host)}`;
}

/**
 * 语音识别
 * @param audioBase64 PCM数据的Base64编码（16bit, 16000Hz, mono）
 * @param dialect 方言代码
 */
export async function recognizeSpeech(
  audioBase64: string,
  dialect: string = 'mandarin',
  options: {
    audioFormat?: string;
    sampleRate?: number;
  } = {}
): Promise<ASRResult> {
  const appId = process.env.XUNFEI_APP_ID;
  const apiKey = process.env.XUNFEI_API_KEY;
  const apiSecret = process.env.XUNFEI_API_SECRET;

  if (!appId || !apiKey || !apiSecret) {
    throw new Error('讯飞语音识别未配置，请设置 XUNFEI_APP_ID, XUNFEI_API_KEY, XUNFEI_API_SECRET');
  }

  const dialectName = DIALECT_NAMES[dialect] || dialect;
  const dialectCode = DIALECT_CODES[dialect] || 'mandarin';

  console.log(`[讯飞ASR] 开始识别，方言: ${dialectName} (${dialectCode})`);
  console.log(`[讯飞ASR] PCM数据长度: ${audioBase64.length} 字符`);
  console.log(`[讯飞ASR] AppID: ${appId.substring(0, 8)}...`);

  const authUrl = generateAuthUrl(apiKey, apiSecret);
  console.log(`[讯飞ASR] 鉴权URL已生成`);
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(authUrl);
    
    let resultText = '';
    let startTime = Date.now();
    let hasError = false;
    let messageCount = 0;
    
    ws.on('open', () => {
      console.log('[讯飞ASR] WebSocket 连接已建立');
      
      // 构建请求帧
      // 参考：https://www.xfyun.cn/doc/asr/ifasr/API.html
      const frame = {
        common: {
          app_id: appId,
        },
        business: {
          language: 'zh_cn',           // 语言：中文
          domain: 'iat',               // 领域：通用听写
          accent: dialectCode,         // 方言代码
          vad_eos: 5000,               // 静音检测超时（毫秒）
          nbest: 1,                    // 返回结果数
          dwa: 'wpgs',                 // 动态修正
          ptt: 1,                      // 标点符号
        },
        data: {
          status: 0,                   // 音频状态：0-首帧，1-中间帧，2-尾帧
          format: 'audio/L16;rate=16000',  // 音频格式：16bit PCM, 16000Hz
          encoding: 'raw',             // 编码：原始PCM数据
          audio: audioBase64,          // PCM数据的Base64编码
        },
      };
      
      console.log('[讯飞ASR] 发送识别请求，参数:', JSON.stringify({
        dialect: dialectCode,
        format: frame.data.format,
        encoding: frame.data.encoding,
        audioLength: audioBase64.length,
      }));
      
      ws.send(JSON.stringify(frame));
      
      // 延迟发送结束帧（等待处理）
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN && !hasError) {
          const endFrame = {
            data: {
              status: 2,
              format: 'audio/L16;rate=16000',
              encoding: 'raw',
              audio: '',
            },
          };
          console.log('[讯飞ASR] 发送结束帧');
          ws.send(JSON.stringify(endFrame));
        }
      }, 500);
    });
    
    ws.on('message', (data: Buffer) => {
      messageCount++;
      
      try {
        const responseStr = data.toString();
        const response = JSON.parse(responseStr);
        
        // 记录完整响应（调试用）
        console.log(`[讯飞ASR] 完整响应 #${messageCount}:`, responseStr);
        
        // 检查是否有header字段（新版API响应格式）
        if (response.header) {
          const { header, payload } = response;
          
          console.log('[讯飞ASR] Header:', JSON.stringify(header));
          console.log('[讯飞ASR] Payload:', payload ? 'exists' : 'null');
          
          // 检查错误
          if (header.code !== 0 && header.code !== undefined) {
            hasError = true;
            const errorMsg = header.message || `错误码: ${header.code}`;
            console.error('[讯飞ASR] API错误:', header.code, errorMsg);
            ws.close();
            reject(new Error(`讯飞ASR错误 (${header.code}): ${errorMsg}`));
            return;
          }
          
          // 解析识别结果
          if (payload && payload.result) {
            try {
              // payload.result 可能是base64编码的JSON
              const resultData = typeof payload.result === 'string' 
                ? JSON.parse(Buffer.from(payload.result, 'base64').toString())
                : payload.result;
              
              console.log('[讯飞ASR] 结果数据:', JSON.stringify(resultData).substring(0, 200));
              
              if (resultData.ws && Array.isArray(resultData.ws)) {
                for (const item of resultData.ws) {
                  if (item.cw && Array.isArray(item.cw)) {
                    for (const cw of item.cw) {
                      resultText += cw.w || '';
                    }
                  }
                }
              }
            } catch (e) {
              console.error('[讯飞ASR] 解析结果失败:', e);
            }
          }
          
          // 检查是否是最后一帧
          if (header.status === 2) {
            console.log('[讯飞ASR] 收到结束帧，识别结果:', resultText);
            ws.close();
          }
          return;
        }
        
        // 旧版API响应格式
        if (response.code !== undefined && response.code !== 0) {
          hasError = true;
          const errorMsg = response.message || `错误码: ${response.code}`;
          console.error('[讯飞ASR] API错误:', response.code, errorMsg);
          ws.close();
          reject(new Error(`讯飞ASR错误 (${response.code}): ${errorMsg}`));
          return;
        }
        
        // 解析识别结果（旧版格式）
        const responseData = response.data;
        if (responseData && responseData.result) {
          const wsResult = responseData.result;
          
          // 提取文本
          if (wsResult.ws && Array.isArray(wsResult.ws)) {
            for (const item of wsResult.ws) {
              if (item.cw && Array.isArray(item.cw)) {
                for (const cw of item.cw) {
                  resultText += cw.w || '';
                }
              }
            }
          }
          
          // 如果是最后一帧
          if (responseData.status === 2) {
            console.log('[讯飞ASR] 收到结束帧，识别结果:', resultText);
            ws.close();
          }
        }
      } catch (e: any) {
        console.error('[讯飞ASR] 解析响应失败:', e.message);
      }
    });
    
    ws.on('close', (code, reason) => {
      console.log(`[讯飞ASR] WebSocket 关闭, code: ${code}, reason: ${reason.toString()}`);
      
      if (!hasError) {
        const duration = Date.now() - startTime;
        console.log(`[讯飞ASR] 识别完成: "${resultText}", 耗时: ${duration}ms`);
        
        resolve({
          text: resultText,
          duration,
        });
      }
    });
    
    ws.on('error', (error: Error) => {
      console.error('[讯飞ASR] WebSocket 错误:', error.message);
      hasError = true;
      reject(new Error(`WebSocket错误: ${error.message}`));
    });
    
    // 超时处理（60秒）
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        console.log('[讯飞ASR] 识别超时，关闭连接');
        hasError = true;
        ws.close();
        reject(new Error('识别超时'));
      }
    }, 60000);
  });
}

/**
 * 讯飞 ASR 客户端类
 */
export class XunfeiASRClient {
  constructor() {
    if (!isXunfeiASRConfigured()) {
      console.warn('[讯飞ASR] 未配置，请设置 XUNFEI_APP_ID, XUNFEI_API_KEY, XUNFEI_API_SECRET');
    }
  }

  /**
   * 语音识别
   * @param params.base64Data PCM数据的Base64编码
   * @param params.dialect 方言代码
   */
  async recognize(params: {
    uid?: string;
    base64Data?: string;
    url?: string;
    dialect?: string;
    audioFormat?: string;
    sampleRate?: number;
  }): Promise<ASRResult> {
    let audioBase64 = params.base64Data;
    
    // 如果是URL，下载音频
    if (!audioBase64 && params.url) {
      console.log('[讯飞ASR] 从URL下载音频:', params.url);
      const response = await fetch(params.url);
      const arrayBuffer = await response.arrayBuffer();
      audioBase64 = Buffer.from(arrayBuffer).toString('base64');
    }
    
    if (!audioBase64) {
      throw new Error('请提供音频数据（base64Data 或 url）');
    }
    
    return recognizeSpeech(audioBase64, params.dialect, {
      audioFormat: params.audioFormat,
      sampleRate: params.sampleRate,
    });
  }
}

export const xunfeiASRClient = new XunfeiASRClient();
