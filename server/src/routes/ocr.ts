/**
 * OCR 图片识字路由
 * 
 * 功能：
 * 1. 接收图片（base64 或 URL）
 * 2. 使用百度OCR识别文字（优先）或LLM Vision（降级）
 * 3. 使用 TTS 生成语音朗读
 */
import express from 'express';
import { LLMClient, TTSClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { recognizeTextByBaidu, recognizeTextByBaiduAccurate, isBaiduOCRConfigured } from '../services/baidu-ocr';

const router = express.Router();

// 初始化客户端
const config = new Config();

// LLM Vision 的OCR prompt（作为降级方案）
const OCR_PROMPT = `你是一个专业的OCR文字识别引擎。请仔细分析这张图片，识别出所有的文字内容。

识别要求：
1. 按照从上到下、从左到右的自然阅读顺序识别
2. 保持原有的换行和段落结构
3. 完整输出所有可见文字，包括标题、正文、标注等
4. 对于模糊或倾斜的文字，尽可能准确推断
5. 如果图片中有表格，按行输出表格内容
6. 忽略图片中的非文字元素（图标、装饰等）

如果图片中确实没有文字内容，请回复：图片中没有检测到文字。

请只输出识别到的文字内容，不要添加任何解释、说明或额外信息。`;

/**
 * 从URL获取图片并转为base64
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return base64;
  } catch (error: any) {
    console.error('[OCR] 获取图片URL失败:', error.message || error);
    throw new Error('无法获取图片');
  }
}

/**
 * 使用LLM Vision进行OCR识别（降级方案）
 */
async function recognizeByLLM(imageUrl: string, customHeaders: Record<string, string>): Promise<string> {
  const llmClient = new LLMClient(config, customHeaders);
  
  const messages = [
    {
      role: 'user' as const,
      content: [
        {
          type: 'text' as const,
          text: OCR_PROMPT,
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

  const response = await llmClient.invoke(messages, {
    model: 'doubao-seed-1-6-vision-250815',
    temperature: 0.1,
    top_p: 0.9,
  });

  return response.content.trim();
}

/**
 * POST /api/v1/ocr/recognize
 * 
 * 识别图片中的文字
 * 
 * Body: { image: string (base64 或 URL), useHighAccuracy?: boolean }
 * Response: { text: string, engine: string }
 */
router.post('/recognize', async (req, res) => {
  try {
    const { image, useHighAccuracy = true } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: '请提供图片' });
    }

    let imageBase64: string;
    let imageUrl: string;

    // 处理图片数据
    if (image.startsWith('http://') || image.startsWith('https://')) {
      console.log('[OCR] 下载网络图片...');
      imageBase64 = await fetchImageAsBase64(image);
      imageUrl = image;
    } else if (image.startsWith('data:image')) {
      // Data URI格式，提取base64部分
      const matches = image.match(/base64,(.+)/);
      imageBase64 = matches ? matches[1] : image;
      imageUrl = image;
    } else {
      // 纯base64
      imageBase64 = image;
      imageUrl = `data:image/jpeg;base64,${image}`;
    }

    // 1. 优先使用百度OCR
    if (isBaiduOCRConfigured()) {
      console.log('[OCR] 使用百度OCR识别...');
      const ocrResult = useHighAccuracy 
        ? await recognizeTextByBaiduAccurate(imageBase64)
        : await recognizeTextByBaidu(imageBase64);
      
      if (ocrResult.text && ocrResult.text.length > 0) {
        console.log('[OCR] 百度OCR识别成功，文字长度:', ocrResult.text.length);
        return res.json({ 
          success: true, 
          text: ocrResult.text,
          length: ocrResult.text.length,
          engine: 'baidu',
        });
      }
      
      if (ocrResult.error) {
        console.log('[OCR] 百度OCR错误:', ocrResult.error);
      }
    }

    // 2. 百度OCR失败，降级到LLM Vision
    console.log('[OCR] 百度OCR未识别到文字，尝试LLM Vision...');
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    
    const text = await recognizeByLLM(imageUrl, customHeaders);
    
    console.log('[OCR] LLM Vision识别成功，文字长度:', text.length);
    
    res.json({ 
      success: true, 
      text,
      length: text.length,
      engine: 'llm-vision',
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
 * Body: { image: string (base64 或 URL), userId?: string, useHighAccuracy?: boolean }
 * Response: { text: string, audioUri: string, engine: string }
 */
router.post('/recognize-and-read', async (req, res) => {
  try {
    const { image, userId = 'elderly-user', useHighAccuracy = true } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: '请提供图片' });
    }

    let imageBase64: string;
    let imageUrl: string;

    // 处理图片数据
    if (image.startsWith('http://') || image.startsWith('https://')) {
      console.log('[OCR] 下载网络图片...');
      imageBase64 = await fetchImageAsBase64(image);
      imageUrl = image;
    } else if (image.startsWith('data:image')) {
      const matches = image.match(/base64,(.+)/);
      imageBase64 = matches ? matches[1] : image;
      imageUrl = image;
    } else {
      imageBase64 = image;
      imageUrl = `data:image/jpeg;base64,${image}`;
    }

    let text: string;
    let engine: string;

    // 1. 优先使用百度OCR
    if (isBaiduOCRConfigured()) {
      console.log('[OCR] 使用百度OCR识别...');
      const ocrResult = useHighAccuracy 
        ? await recognizeTextByBaiduAccurate(imageBase64)
        : await recognizeTextByBaidu(imageBase64);
      
      if (ocrResult.text && ocrResult.text.length > 0) {
        text = ocrResult.text;
        engine = 'baidu';
        console.log('[OCR] 百度OCR识别成功，文字长度:', text.length);
      } else {
        // 2. 降级到LLM Vision
        console.log('[OCR] 百度OCR未识别到文字，尝试LLM Vision...');
        const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
        text = await recognizeByLLM(imageUrl, customHeaders);
        engine = 'llm-vision';
        console.log('[OCR] LLM Vision识别成功，文字长度:', text.length);
      }
    } else {
      // 百度OCR未配置，直接使用LLM Vision
      console.log('[OCR] 百度OCR未配置，使用LLM Vision...');
      const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
      text = await recognizeByLLM(imageUrl, customHeaders);
      engine = 'llm-vision';
      console.log('[OCR] LLM Vision识别成功，文字长度:', text.length);
    }

    // 如果没有识别到文字，直接返回
    if (!text || text.includes('没有检测到文字') || text.includes('没有检测到可识别的文字')) {
      return res.json({
        success: true,
        text: '图片中没有检测到文字',
        audioUri: null,
        engine,
      });
    }

    // 3. 使用 TTS 生成语音
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const ttsClient = new TTSClient(config, customHeaders);
    
    const ttsResponse = await ttsClient.synthesize({
      uid: userId,
      text,
      speaker: 'zh_female_xiaohe_uranus_bigtts',
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
      engine,
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
      return res.status(400).json({ error: '请提供文字' });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const ttsClient = new TTSClient(config, customHeaders);
    
    const response = await ttsClient.synthesize({
      uid: userId,
      text,
      speaker: 'zh_female_xiaohe_uranus_bigtts',
      audioFormat: 'mp3',
      sampleRate: 24000,
      speechRate: -10,
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
      error: '语音生成失败' 
    });
  }
});

export default router;
