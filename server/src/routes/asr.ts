/**
 * 语音识别API路由
 * 支持普通话和多种方言识别
 */
import express from 'express';
import multer from 'multer';
import { ASRClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

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
 * 返回:
 * {
 *   success: boolean,
 *   text: string,           // 识别文本
 *   duration?: number,      // 音频时长(毫秒)
 *   dialect: string,        // 使用的方言
 * }
 */
router.post('/recognize', async (req, res, next) => {
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

      // 提取请求头用于上下文传递
      const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);

      // 初始化 ASR 客户端
      const config = new Config();
      const asrClient = new ASRClient(config, customHeaders);

      console.log(`[ASR] 开始识别（JSON），方言: ${dialect}, 数据长度: ${audio.length}`);

      // 调用 ASR API
      const result = await asrClient.recognize({
        uid,
        base64Data: audio,
      });

      console.log(`[ASR] 识别完成: ${result.text}`);

      return res.json({
        success: true,
        text: result.text,
        duration: result.duration,
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
      
      // 将音频文件转为 Base64
      const audioBase64 = req.file.buffer.toString('base64');

      // 提取请求头用于上下文传递
      const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);

      // 初始化 ASR 客户端
      const config = new Config();
      const asrClient = new ASRClient(config, customHeaders);

      console.log(`[ASR] 开始识别（文件），方言: ${dialect}, 文件大小: ${req.file.size} bytes`);

      // 调用 ASR API
      const result = await asrClient.recognize({
        uid,
        base64Data: audioBase64,
      });

      console.log(`[ASR] 识别完成: ${result.text}`);

      res.json({
        success: true,
        text: result.text,
        duration: result.duration,
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

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);

    // 初始化ASR客户端
    const config = new Config();
    const asrClient = new ASRClient(config, customHeaders);

    console.log(`[ASR] 开始识别URL，方言: ${dialect}, URL: ${audioUrl}`);

    // 调用ASR API
    const result = await asrClient.recognize({
      uid,
      url: audioUrl,
    });

    console.log(`[ASR] 识别完成: ${result.text}`);

    res.json({
      success: true,
      text: result.text,
      duration: result.duration,
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
