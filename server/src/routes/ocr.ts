/**
 * OCR 图片识字路由
 * 
 * 功能：
 * 1. 接收图片（base64 或 URL）
 * 2. 使用 LLM Vision 模型识别文字
 * 3. 使用 TTS 生成语音朗读
 */
import express from 'express';
import { LLMClient, TTSClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const router = express.Router();

// 初始化客户端
const config = new Config();

/**
 * POST /api/v1/ocr/recognize
 * 
 * 识别图片中的文字
 * 
 * Body: { image: string (base64 或 URL) }
 * Response: { text: string }
 */
router.post('/recognize', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: '请提供图片' });
    }

    // 判断是 base64 还是 URL
    let imageUrl: string;
    if (image.startsWith('http://') || image.startsWith('https://')) {
      imageUrl = image;
    } else if (image.startsWith('data:image')) {
      // 已经是 data URI 格式
      imageUrl = image;
    } else {
      // 纯 base64，添加前缀
      imageUrl = `data:image/jpeg;base64,${image}`;
    }

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    
    // 使用 LLM Vision 模型识别文字
    const llmClient = new LLMClient(config, customHeaders);
    
    const messages = [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: '请仔细识别这张图片中的所有文字内容，按照从上到下、从左到右的顺序，完整准确地输出识别到的文字。如果图片中没有文字，请回复"图片中没有检测到文字"。只输出文字内容，不要添加任何解释或说明。',
          },
          {
            type: 'image_url' as const,
            image_url: {
              url: imageUrl,
              detail: 'high' as const, // 高精度识别
            },
          },
        ],
      },
    ];

    const response = await llmClient.invoke(messages, {
      model: 'doubao-seed-1-6-vision-250815',
      temperature: 0.3, // 低温度，更准确的识别
    });

    const text = response.content.trim();
    
    console.log('[OCR] 识别成功，文字长度:', text.length);
    
    res.json({ 
      success: true, 
      text,
      length: text.length,
    });
  } catch (error) {
    console.error('[OCR] 识别失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '文字识别失败，请重试' 
    });
  }
});

/**
 * POST /api/v1/ocr/recognize-and-read
 * 
 * 识别图片中的文字并生成语音
 * 
 * Body: { image: string (base64 或 URL), userId?: string }
 * Response: { text: string, audioUri: string }
 */
router.post('/recognize-and-read', async (req, res) => {
  try {
    const { image, userId = 'elderly-user' } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: '请提供图片' });
    }

    // 判断是 base64 还是 URL
    let imageUrl: string;
    if (image.startsWith('http://') || image.startsWith('https://')) {
      imageUrl = image;
    } else if (image.startsWith('data:image')) {
      imageUrl = image;
    } else {
      imageUrl = `data:image/jpeg;base64,${image}`;
    }

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    
    // 1. 使用 LLM Vision 模型识别文字
    const llmClient = new LLMClient(config, customHeaders);
    
    const messages = [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: '请仔细识别这张图片中的所有文字内容，按照从上到下、从左到右的顺序，完整准确地输出识别到的文字。如果图片中没有文字，请回复"图片中没有检测到文字"。只输出文字内容，不要添加任何解释或说明。',
          },
          {
            type: 'image_url' as const,
            image_url: {
              url: imageUrl,
              detail: 'high' as const,
            },
          },
        ],
      },
    ];

    const ocrResponse = await llmClient.invoke(messages, {
      model: 'doubao-seed-1-6-vision-250815',
      temperature: 0.3,
    });

    const text = ocrResponse.content.trim();
    
    console.log('[OCR] 识别成功，文字长度:', text.length);

    // 如果没有识别到文字，直接返回
    if (text === '图片中没有检测到文字' || text.length === 0) {
      return res.json({
        success: true,
        text: '图片中没有检测到文字',
        audioUri: null,
      });
    }

    // 2. 使用 TTS 生成语音
    const ttsClient = new TTSClient(config, customHeaders);
    
    const ttsResponse = await ttsClient.synthesize({
      uid: userId,
      text,
      speaker: 'zh_female_xiaohe_uranus_bigtts', // 默认女声
      audioFormat: 'mp3',
      sampleRate: 24000,
      speechRate: -10, // 稍慢一点，适合老年人
    });

    console.log('[OCR-TTS] 语音生成成功:', ttsResponse.audioUri);

    res.json({
      success: true,
      text,
      audioUri: ttsResponse.audioUri,
      audioSize: ttsResponse.audioSize,
    });
  } catch (error) {
    console.error('[OCR] 识别并朗读失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '文字识别失败，请重试' 
    });
  }
});

/**
 * POST /api/v1/ocr/text-to-speech
 * 
 * 将文字转为语音
 * 
 * Body: { text: string, userId?: string }
 * Response: { audioUri: string, audioSize: number }
 */
router.post('/text-to-speech', async (req, res) => {
  try {
    const { text, userId = 'elderly-user' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: '请提供文字内容' });
    }

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    
    // 使用 TTS 生成语音
    const ttsClient = new TTSClient(config, customHeaders);
    
    const response = await ttsClient.synthesize({
      uid: userId,
      text,
      speaker: 'zh_female_xiaohe_uranus_bigtts',
      audioFormat: 'mp3',
      sampleRate: 24000,
      speechRate: -10, // 稍慢一点
    });

    console.log('[OCR-TTS] 语音生成成功:', response.audioUri);

    res.json({
      success: true,
      audioUri: response.audioUri,
      audioSize: response.audioSize,
    });
  } catch (error) {
    console.error('[OCR-TTS] 语音生成失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '语音生成失败，请重试' 
    });
  }
});

export default router;
