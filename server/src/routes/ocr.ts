/**
 * OCR 图片识字路由
 * 
 * 功能：
 * 1. 接收图片（base64 或 URL）
 * 2. 使用百度OCR识别文字（优先）
 * 3. 使用 讯飞 TTS 生成语音朗读
 */
import express from 'express';
import { DeepSeekClient, type ContentPart } from '../services/deepseek';
import { XunfeiTTSClient } from '../services/xunfei-tts';
import { recognizeTextByBaidu, recognizeTextByBaiduAccurate, isBaiduOCRConfigured } from '../services/baidu-ocr';

const router = express.Router();

// LLM 和 TTS 客户端实例
const llmClient = new DeepSeekClient();
const ttsClient = new XunfeiTTSClient();

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
 * 使用DeepSeek Vision进行OCR识别（降级方案）
 */
async function recognizeByLLM(imageUrl: string): Promise<string> {
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
      ] as ContentPart[],
    },
  ];

  // DeepSeek 目前不支持 Vision，这里需要使用其他模型
  // 暂时返回提示信息
  console.log('[OCR] DeepSeek 不支持 Vision，请配置百度OCR');
  throw new Error('DeepSeek 不支持图像识别，请配置百度OCR');
}

/**
 * POST /api/v1/ocr/recognize
 * 
 * 识别图片中的文字
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
      const matches = image.match(/base64,(.+)/);
      imageBase64 = matches ? matches[1] : image;
      imageUrl = image;
    } else {
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

    // 2. 百度OCR失败，提示用户配置
    res.status(400).json({ 
      success: false, 
      error: '请配置百度OCR以使用文字识别功能' 
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
        return res.status(400).json({
          success: false,
          error: '未识别到文字，请配置百度OCR',
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: '请配置百度OCR以使用文字识别功能',
      });
    }

    // 如果没有识别到文字，直接返回
    if (!text || text.includes('没有检测到文字')) {
      return res.json({
        success: true,
        text: '图片中没有检测到文字',
        audioUri: null,
        engine,
      });
    }

    // 2. 使用讯飞 TTS 生成语音
    console.log('[OCR-TTS] 开始生成语音...');
    const ttsResponse = await ttsClient.synthesize({
      uid: userId,
      text,
      speaker: 'xiaoyan',
      audioFormat: 'mp3',
      speechRate: -10, // 稍慢一点，适合老年人
    });

    console.log('[OCR-TTS] 语音生成成功');

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
 */
router.post('/text-to-speech', async (req, res) => {
  try {
    const { text, userId = 'elderly-user' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: '请提供文字' });
    }

    const response = await ttsClient.synthesize({
      uid: userId,
      text,
      speaker: 'xiaoyan',
      audioFormat: 'mp3',
      speechRate: -10,
    });

    console.log('[OCR-TTS] 语音生成成功');

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
