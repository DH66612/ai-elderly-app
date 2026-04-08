/**
 * 讯飞语音合成 (TTS) 服务
 * 使用讯飞在线语音合成 WebAPI
 */

import * as crypto from 'crypto';
import WebSocket from 'ws';

// 讯飞 TTS 配置
const XUNFEI_TTS_URL = 'wss://tts-api.xfyun.cn/v2/tts';

// 可用的发音人列表
export const TTS_VOICES = [
  // 通用场景
  { id: 'xiaoyan', name: '小燕', gender: 'female', category: '通用', description: '亲和女声（默认）' },
  { id: 'xiaofeng', name: '小峰', gender: 'male', category: '通用', description: '成熟男声' },
  { id: 'xiaomei', name: '小梅', gender: 'female', category: '通用', description: '温柔女声' },
  { id: 'xiaolin', name: '小林', gender: 'male', category: '通用', description: '亲切男声' },
  // 特色发音人
  { id: 'xiaorong', name: '小容', gender: 'female', category: '客服', description: '客服女声' },
  { id: 'xiaoqi', name: '小琪', gender: 'female', category: '客服', description: '温柔客服' },
  // 方言发音人
  { id: 'xiaoguang', name: '小光', gender: 'male', category: '方言', description: '粤语男声' },
];

export interface TTSResult {
  audioUri: string;
  audioSize: number;
  duration?: number;
}

/**
 * 检查讯飞 TTS 是否已配置
 */
export function isXunfeiTTSConfigured(): boolean {
  return !!(
    process.env.XUNFEI_APP_ID &&
    process.env.XUNFEI_API_KEY &&
    process.env.XUNFEI_API_SECRET
  );
}

/**
 * 生成讯飞鉴权 URL
 */
function generateAuthUrl(apiKey: string, apiSecret: string, baseUrl: string): string {
  const host = new URL(baseUrl).host;
  const path = new URL(baseUrl).pathname;
  const date = new Date().toUTCString();
  
  // 生成签名
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(signatureOrigin)
    .digest('base64');
  
  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = Buffer.from(authorizationOrigin).toString('base64');
  
  const authUrl = `${baseUrl}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${encodeURIComponent(host)}`;
  
  return authUrl;
}

/**
 * 语音合成（WebSocket 方式）
 */
export async function synthesizeSpeech(
  text: string,
  options: {
    speaker?: string;
    speed?: number;
    volume?: number;
    pitch?: number;
    audioFormat?: string;
  } = {}
): Promise<TTSResult> {
  const appId = process.env.XUNFEI_APP_ID;
  const apiKey = process.env.XUNFEI_API_KEY;
  const apiSecret = process.env.XUNFEI_API_SECRET;

  if (!appId || !apiKey || !apiSecret) {
    throw new Error('讯飞语音合成未配置，请设置 XUNFEI_APP_ID, XUNFEI_API_KEY, XUNFEI_API_SECRET');
  }

  const speaker = options.speaker || 'xiaoyan';
  const speed = options.speed ?? 50; // 0-100
  const volume = options.volume ?? 50; // 0-100
  const pitch = options.pitch ?? 50; // 0-100
  const audioFormat = options.audioFormat || 'mp3';

  console.log(`[讯飞TTS] 开始合成，发音人: ${speaker}, 文本长度: ${text.length}`);

  const authUrl = generateAuthUrl(apiKey, apiSecret, XUNFEI_TTS_URL);

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(authUrl);
    
    let audioChunks: Buffer[] = [];
    let startTime = Date.now();
    
    ws.on('open', () => {
      console.log('[讯飞TTS] WebSocket 连接已建立');
      
      // 发送合成请求
      const request = {
        common: {
          app_id: appId,
        },
        business: {
          aue: audioFormat === 'mp3' ? 'lame' : 'raw',
          sfl: 1, // 开启流式返回
          auf: 'audio/L16;rate=16000',
          vcn: speaker,
          speed: speed,
          volume: volume,
          pitch: pitch,
          bgs: 0,
          tte: 'UTF8',
        },
        data: {
          status: 2, // 一次性发送
          text: Buffer.from(text).toString('base64'),
        },
      };
      
      ws.send(JSON.stringify(request));
    });
    
    ws.on('message', (data: Buffer) => {
      try {
        const response = JSON.parse(data.toString());
        
        if (response.code !== 0) {
          console.error('[讯飞TTS] 错误:', response.message);
          ws.close();
          reject(new Error(`讯飞TTS错误: ${response.message}`));
          return;
        }
        
        // 收集音频数据
        if (response.data && response.data.audio) {
          const audioBuffer = Buffer.from(response.data.audio, 'base64');
          audioChunks.push(audioBuffer);
        }
        
        // 合成完成
        if (response.data && response.data.status === 2) {
          ws.close();
        }
      } catch (e) {
        console.error('[讯飞TTS] 解析响应失败:', e);
      }
    });
    
    ws.on('close', () => {
      console.log('[讯飞TTS] WebSocket 关闭');
      
      // 合并音频数据
      const audioBuffer = Buffer.concat(audioChunks);
      const audioBase64 = audioBuffer.toString('base64');
      
      // 生成 data URI
      const mimeType = audioFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav';
      const audioUri = `data:${mimeType};base64,${audioBase64}`;
      
      resolve({
        audioUri,
        audioSize: audioBuffer.length,
        duration: Date.now() - startTime,
      });
    });
    
    ws.on('error', (error: Error) => {
      console.error('[讯飞TTS] WebSocket 错误:', error);
      reject(error);
    });
    
    // 超时处理
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
        const audioBuffer = Buffer.concat(audioChunks);
        if (audioBuffer.length > 0) {
          const audioBase64 = audioBuffer.toString('base64');
          const mimeType = audioFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav';
          resolve({
            audioUri: `data:${mimeType};base64,${audioBase64}`,
            audioSize: audioBuffer.length,
            duration: Date.now() - startTime,
          });
        } else {
          reject(new Error('TTS 合成超时'));
        }
      }
    }, 60000);
  });
}

/**
 * 讯飞 TTS 客户端类
 */
export class XunfeiTTSClient {
  constructor() {
    // 初始化检查
    if (!isXunfeiTTSConfigured()) {
      console.warn('[讯飞TTS] 未配置，请设置环境变量');
    }
  }

  /**
   * 语音合成
   */
  async synthesize(params: {
    uid?: string;
    text: string;
    speaker?: string;
    audioFormat?: string;
    sampleRate?: number;
    speechRate?: number;
    loudnessRate?: number;
  }): Promise<TTSResult> {
    // 转换参数
    // speechRate: -50 到 50，0为正常速度
    // loudnessRate: -50 到 50，0为正常音量
    const speed = 50 + (params.speechRate || 0);
    const volume = 50 + (params.loudnessRate || 0);
    
    return synthesizeSpeech(params.text, {
      speaker: params.speaker,
      speed: Math.max(0, Math.min(100, speed)),
      volume: Math.max(0, Math.min(100, volume)),
      audioFormat: params.audioFormat,
    });
  }
}

// 导出默认客户端实例
export const xunfeiTTSClient = new XunfeiTTSClient();
