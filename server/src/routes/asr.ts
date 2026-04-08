/**
 * 语音识别API路由
 * 支持普通话和多种方言识别
 * 使用讯飞方言识别大模型
 * 
 * 音频格式转换流程：
 * 1. 前端录制 AAC/WebM 格式
 * 2. 后端使用 FFmpeg 转换为 PCM (16bit, 16000Hz, mono)
 * 3. 讯飞 ASR 识别 PCM 数据
 */
import express from 'express';
import multer from 'multer';
import { XunfeiASRClient, DIALECT_CODES } from '../services/xunfei-asr';
import { convertToPCM, convertBase64ToPCM, detectAudioFormat } from '../utils/audio-converter';

const router = express.Router();

// 配置multer用于接收音频文件
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    // 支持的音频格式
    const allowedMimes = [
      'audio/mpeg',      // mp3
      'audio/wav',       // wav
      'audio/ogg',       // ogg
      'audio/mp4',       // m4a
      'audio/webm',      // webm
      'audio/x-m4a',     // m4a
      'audio/aac',       // aac
      'audio/m4a',       // m4a
    ];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('不支持的音频格式'));
    }
  },
});

// 方言配置
export const DIALECT_CONFIG = {
  mandarin: {
    name: '普通话',
    code: 'mandarin',
    description: '标准普通话识别',
  },
  cantonese: {
    name: '粤语',
    code: 'cantonese',
    description: '广东话、白话识别',
  },
  sichuan: {
    name: '四川话',
    code: 'sichuan',
    description: '四川方言识别',
  },
  dongbei: {
    name: '东北话',
    code: 'dongbei',
    description: '东北方言识别',
  },
  henan: {
    name: '河南话',
    code: 'henan',
    description: '河南方言识别',
  },
  shaanxi: {
    name: '陕西话',
    code: 'shaanxi',
    description: '陕西方言识别',
  },
  shanghai: {
    name: '上海话',
    code: 'shanghai',
    description: '上海方言识别',
  },
  hunan: {
    name: '湖南话',
    code: 'hunan',
    description: '湖南方言识别',
  },
};

// ASR 客户端实例
const asrClient = new XunfeiASRClient();

/**
 * 获取支持的方言列表
 * GET /api/v1/asr/dialects
 */
router.get('/dialects', (req, res) => {
  res.json({
    success: true,
    dialects: Object.values(DIALECT_CONFIG),
  });
});

/**
 * 语音识别（上传音频文件）
 * POST /api/v1/asr/recognize
 * 
 * 支持两种格式：
 * 1. JSON Body: { audio: string (base64), dialect?: string, uid?: string }
 * 2. FormData: audio文件 + dialect + uid
 * 
 * 音频格式：支持 AAC, WebM, M4A, MP3, WAV 等常见格式
 * 会自动转换为讯飞 ASR 所需的 PCM 格式
 * 
 * 返回:
 * {
 *   success: boolean,
 *   text: string,           // 识别文本
 *   duration?: number,      // 音频时长(毫秒)
 *   dialect: string,        // 使用的方言
 * }
 */
router.post('/recognize', async (req, res) => {
  // 检查是否是 JSON 请求（通过 Content-Type 判断）
  const contentType = req.headers['content-type'] || '';
  const isJsonRequest = contentType.includes('application/json');
  
  if (isJsonRequest) {
    // JSON 格式：直接处理
    try {
      const { audio, dialect = 'mandarin', uid = 'anonymous' } = req.body;
      
      if (!audio) {
        return res.status(400).json({
          success: false,
          error: '请提供音频数据（base64格式）',
        });
      }

      console.log(`[ASR] 开始识别（JSON），方言: ${dialect}, 数据长度: ${audio.length}`);

      // 1. 将Base64转为Buffer
      const audioBuffer = Buffer.from(audio, 'base64');
      const audioFormat = detectAudioFormat(audioBuffer);
      console.log(`[ASR] 检测到音频格式: ${audioFormat}`);

      // 2. 转换为PCM格式
      let pcmBase64: string;
      let audioDuration: number;
      
      try {
        const pcmResult = await convertToPCM(audioBuffer);
        pcmBase64 = pcmResult.pcmBuffer.toString('base64');
        audioDuration = pcmResult.duration;
      } catch (convertError: any) {
        console.error('[ASR] 音频转换失败:', convertError);
        return res.status(400).json({
          success: false,
          error: `音频转换失败: ${convertError.message}`,
        });
      }

      console.log(`[ASR] PCM数据大小: ${pcmBase64.length} bytes, 时长: ${audioDuration}ms`);

      // 3. 调用讯飞ASR API
      const result = await asrClient.recognize({
        uid,
        base64Data: pcmBase64,
        dialect,
      });

      console.log(`[ASR] 识别完成: ${result.text}`);

      return res.json({
        success: true,
        text: result.text,
        duration: audioDuration,
        dialect,
        utterances: result.utterances,
      });
    } catch (error: any) {
      console.error('[ASR] 识别错误:', error);
      return res.status(500).json({
        success: false,
        error: error.message || '语音识别失败',
      });
    }
  }
  
  // FormData 格式：使用 multer 处理
  upload.single('audio')(req, res, async (err) => {
    if (err) {
      console.error('[ASR] Multer 错误:', err);
      return res.status(400).json({
        success: false,
        error: err.message || '文件上传失败',
      });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: '请上传音频文件',
        });
      }

      const dialect = req.body.dialect || 'mandarin';
      const uid = req.body.uid || 'anonymous';
      
      console.log(`[ASR] 开始识别（文件），方言: ${dialect}, 文件大小: ${req.file.size} bytes, MIME: ${req.file.mimetype}`);

      // 1. 检测音频格式
      const audioFormat = detectAudioFormat(req.file.buffer);
      console.log(`[ASR] 检测到音频格式: ${audioFormat}`);

      // 2. 转换为PCM格式
      let pcmBase64: string;
      let audioDuration: number;
      
      try {
        const pcmResult = await convertToPCM(req.file.buffer);
        pcmBase64 = pcmResult.pcmBuffer.toString('base64');
        audioDuration = pcmResult.duration;
      } catch (convertError: any) {
        console.error('[ASR] 音频转换失败:', convertError);
        return res.status(400).json({
          success: false,
          error: `音频转换失败: ${convertError.message}`,
        });
      }

      console.log(`[ASR] PCM数据大小: ${pcmBase64.length} bytes, 时长: ${audioDuration}ms`);

      // 3. 调用讯飞ASR API
      const result = await asrClient.recognize({
        uid,
        base64Data: pcmBase64,
        dialect,
      });

      console.log(`[ASR] 识别完成: ${result.text}`);

      return res.json({
        success: true,
        text: result.text,
        duration: audioDuration,
        dialect,
        utterances: result.utterances,
      });
    } catch (error: any) {
      console.error('[ASR] 识别错误:', error);
      return res.status(500).json({
        success: false,
        error: error.message || '语音识别失败',
      });
    }
  });
});

/**
 * 语音识别（通过URL）
 * POST /api/v1/asr/recognize-url
 * 
 * Body:
 * {
 *   audioUrl: string,       // 音频文件URL
 *   dialect?: string,       // 方言代码
 *   uid?: string,           // 用户ID
 * }
 */
router.post('/recognize-url', async (req, res) => {
  try {
    const { audioUrl, dialect = 'mandarin', uid = 'anonymous' } = req.body;

    if (!audioUrl) {
      return res.status(400).json({
        success: false,
        error: '请提供音频文件URL',
      });
    }

    console.log(`[ASR] 开始识别URL，方言: ${dialect}, URL: ${audioUrl}`);

    // 1. 下载音频文件
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    
    console.log(`[ASR] 下载完成，大小: ${audioBuffer.length} bytes`);

    // 2. 检测格式并转换为PCM
    const audioFormat = detectAudioFormat(audioBuffer);
    console.log(`[ASR] 检测到音频格式: ${audioFormat}`);

    const pcmResult = await convertToPCM(audioBuffer);
    const pcmBase64 = pcmResult.pcmBuffer.toString('base64');
    console.log(`[ASR] PCM数据大小: ${pcmBase64.length} bytes, 时长: ${pcmResult.duration}ms`);

    // 3. 调用ASR API
    const result = await asrClient.recognize({
      uid,
      base64Data: pcmBase64,
      dialect,
    });

    console.log(`[ASR] 识别完成: ${result.text}`);

    res.json({
      success: true,
      text: result.text,
      duration: pcmResult.duration,
      dialect,
      utterances: result.utterances,
    });
  } catch (error: any) {
    console.error('[ASR] 识别错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '语音识别失败',
    });
  }
});

export default router;
