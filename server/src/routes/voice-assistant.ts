/**
 * 语音助手API路由
 * 使用扣子Bot大模型实现智能对话
 * 支持SSE流式输出
 * 支持TTS语音朗读
 * 支持查询健康数据、备忘录、记事本、个人资料
 */
import express, { type Response } from 'express';
import { LLMClient, TTSClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = express.Router();

// 存储会话历史（生产环境应使用Redis等持久化存储）
const sessionHistories = new Map<string, Array<{ role: 'system' | 'user' | 'assistant'; content: string }>>();

// 老人端语音助手系统提示词模板
const ELDERLY_SYSTEM_PROMPT_TEMPLATE = `你是一位专业、温暖的老年护理助手。你的任务是帮助老年人解决日常生活中的问题，提供健康建议和情感支持。

## 你的特点
- 说话语气温和、亲切，像家人一样
- 使用简单、清晰的语言，避免复杂术语
- 回答简洁明了，不要过长
- 主动关心老人的身体状况和情绪
- 对于紧急情况，及时提醒联系家人或就医

## 你可以帮忙的事情
1. 健康提醒：提醒吃药、测量血压、记录健康数据
2. 日常咨询：天气查询、时间查询、日历提醒
3. 情感陪伴：聊天解闷、讲笑话、分享养生知识
4. 生活协助：设置提醒、查询信息、拨打电话
5. 紧急求助：识别紧急情况并提醒联系家人
6. 数据查询：帮助老人查看自己的健康数据、备忘录、记事本内容

## 你可以查询的数据
当老人询问以下内容时，你可以根据提供的数据直接回答：
1. **健康数据**：心率、血压、血氧、步数、睡眠情况、体温、血糖、体脂率等
2. **备忘录/记事本**：老人自己或家人记录的备忘事项
3. **个人资料**：姓名、健康状况、生活环境、居住地址等

## 回答原则
- 每次回答控制在3-5句话以内
- 用"您"来称呼老人，表示尊重
- 对于需要家人处理的事情，主动提醒
- 如果老人说身体不舒服，要关切询问并建议就医或联系家人
- 保持积极乐观的态度，传递正能量
{USER_INFO}
{HEALTH_DATA}
{MEMOS_DATA}

## 特殊情况处理
- 如果老人提到"救命"、"不舒服"、"摔倒"等紧急词汇，立即回复"我马上帮您联系家人，请您保持冷静，不要乱动。"
- 如果老人问"你是谁"，回复"我是您的智能助手，随时为您服务。"
- 如果老人问健康数据，请根据提供的健康数据信息回答，用简单易懂的方式解释数据含义
`;

// 监护人端语音助手系统提示词模板
const GUARDIAN_SYSTEM_PROMPT_TEMPLATE = `你是一位专业的老年人护理顾问。你的任务是帮助监护人更好地照顾老人，提供专业的健康建议和护理知识。

## 你的特点
- 专业、可靠，提供科学的护理建议
- 回答详细但有条理，使用结构化的方式呈现信息
- 关注老人的身心健康，提供全面的建议
- 对异常情况保持敏感，及时预警

## 你可以帮忙的事情
1. 健康分析：解读健康数据，提供专业建议
2. 护理知识：老年常见病护理、康复训练建议
3. 心理关怀：如何与老人沟通、缓解老人焦虑
4. 安全防范：居家安全、防摔倒、用药安全
5. 紧急应对：识别危险信号、紧急处理建议
6. 数据查询：帮助监护人查看老人的健康数据、备忘录、记事本内容

## 你可以查询的数据
当监护人询问以下内容时，你可以根据提供的数据直接回答：
1. **健康数据**：老人的心率、血压、血氧、步数、睡眠情况、体温、血糖、体脂率等
2. **备忘录/记事本**：老人或监护人记录的备忘事项
3. **个人资料**：老人的姓名、健康状况、生活环境、居住地址等

## 回答原则
- 提供专业、可靠的建议
- 对于健康问题，建议咨询专业医生
- 对异常数据保持警惕，建议及时关注
- 提供可操作的具体建议
{USER_INFO}
{HEALTH_DATA}
{MEMOS_DATA}
`;

/**
 * 获取用户的健康数据
 */
async function getUserHealthData(userId: number): Promise<string> {
  try {
    const supabase = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];
    
    // 获取今日健康趋势数据
    const { data: healthTrend } = await supabase
      .from('health_trend')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .order('time_point', { ascending: false })
      .limit(1)
      .single();

    if (!healthTrend) {
      return '\n## 健康数据\n暂无今日健康数据记录。';
    }

    const lines = ['\n## 今日健康数据'];
    
    // 心率
    if (healthTrend.heart_rate) {
      lines.push(`- 心率: ${healthTrend.heart_rate} bpm ${healthTrend.heart_rate >= 60 && healthTrend.heart_rate <= 100 ? '（正常）' : healthTrend.heart_rate < 60 ? '（偏低）' : '（偏高）'}`);
    }
    
    // 血压
    if (healthTrend.systolic && healthTrend.diastolic) {
      lines.push(`- 血压: ${healthTrend.systolic}/${healthTrend.diastolic} mmHg ${healthTrend.systolic >= 90 && healthTrend.systolic <= 140 ? '（正常）' : '（偏高）'}`);
    }
    
    // 血氧
    if (healthTrend.blood_oxygen) {
      lines.push(`- 血氧: ${healthTrend.blood_oxygen}% ${healthTrend.blood_oxygen >= 95 ? '（正常）' : '（偏低）'}`);
    }
    
    // 步数
    if (healthTrend.steps) {
      lines.push(`- 今日步数: ${healthTrend.steps} 步`);
    }
    
    // 睡眠
    if (healthTrend.sleep_hours) {
      lines.push(`- 昨晚睡眠: ${healthTrend.sleep_hours} 小时`);
    }
    
    // 体温
    if (healthTrend.temperature) {
      lines.push(`- 体温: ${healthTrend.temperature}°C ${healthTrend.temperature >= 36.0 && healthTrend.temperature <= 37.3 ? '（正常）' : healthTrend.temperature > 37.3 ? '（发热）' : '（偏低）'}`);
    }
    
    // 血糖
    if (healthTrend.blood_sugar) {
      lines.push(`- 血糖: ${healthTrend.blood_sugar} mmol/L ${healthTrend.blood_sugar >= 3.9 && healthTrend.blood_sugar <= 6.1 ? '（正常空腹）' : healthTrend.blood_sugar < 3.9 ? '（偏低）' : '（偏高）'}`);
    }
    
    // 体脂
    if (healthTrend.body_fat) {
      lines.push(`- 体脂率: ${healthTrend.body_fat}%`);
    }
    
    // 热量
    if (healthTrend.calories) {
      lines.push(`- 今日消耗: ${healthTrend.calories} 千卡`);
    }

    lines.push(`- 数据更新时间: ${healthTrend.time_point || '未知'}`);

    return lines.join('\n');
  } catch (err) {
    console.error('[语音助手] 获取健康数据失败:', err);
    return '\n## 健康数据\n暂无健康数据记录。';
  }
}

/**
 * 获取用户的备忘录/记事本数据
 */
async function getUserMemos(userId: number): Promise<string> {
  try {
    const supabase = getSupabaseClient();
    
    // 获取用户相关的备忘录（包括自己创建的和绑定用户创建的）
    const { data: memos } = await supabase
      .from('memos')
      .select('*')
      .or(`user_id.eq.${userId},related_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!memos || memos.length === 0) {
      return '\n## 备忘录/记事本\n暂无备忘录记录。';
    }

    const lines = ['\n## 备忘录/记事本（最近10条）'];
    
    memos.forEach((memo, index) => {
      const typeLabel = memo.category || '日常';
      const time = new Date(memo.created_at).toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      lines.push(`${index + 1}. [${typeLabel}] ${memo.title || memo.content} (${time})`);
    });

    return lines.join('\n');
  } catch (err) {
    console.error('[语音助手] 获取备忘录失败:', err);
    return '\n## 备忘录/记事本\n暂无备忘录记录。';
  }
}

/**
 * 获取或创建会话历史
 */
async function getSessionHistory(
  sessionId: string, 
  role: 'elderly' | 'guardian',
  userId?: number
): Promise<Array<{ role: 'system' | 'user' | 'assistant'; content: string }>> {
  if (!sessionHistories.has(sessionId)) {
    // 获取用户标签信息
    let userInfoTags = '';
    let healthDataStr = '';
    let memosStr = '';
    
    if (userId) {
      try {
        const supabase = getSupabaseClient();
        
        // 并行获取用户信息、健康数据、备忘录
        const [userResult, healthResult, memosResult] = await Promise.all([
          supabase
            .from('users')
            .select('id, name, health_conditions, living_conditions, home_address')
            .eq('id', userId)
            .single(),
          getUserHealthData(userId),
          getUserMemos(userId),
        ]);

        const userData = userResult.data;

        if (userData) {
          const tags: string[] = [];
          
          // 添加用户姓名
          if (userData.name) {
            tags.push(`姓名: ${userData.name}`);
          }
          
          // 数据库字段使用snake_case
          const healthConditions = (userData as any).health_conditions;
          const livingConditions = (userData as any).living_conditions;
          const homeAddress = (userData as any).home_address;
          
          if (healthConditions && Array.isArray(healthConditions) && healthConditions.length > 0) {
            tags.push(`健康状况: ${healthConditions.join('、')}`);
          }
          
          if (livingConditions && Array.isArray(livingConditions) && livingConditions.length > 0) {
            tags.push(`生活环境: ${livingConditions.join('、')}`);
          }
          
          if (homeAddress) {
            tags.push(`居住地址: ${homeAddress}`);
          }
          
          if (tags.length > 0) {
            userInfoTags = `\n## 用户信息\n${tags.join('\n')}`;
          }
        }

        healthDataStr = healthResult;
        memosStr = memosResult;
        
      } catch (err) {
        console.error('[语音助手] 获取用户数据失败:', err);
      }
    }
    
    // 根据角色选择提示词模板并注入用户信息
    const template = role === 'elderly' ? ELDERLY_SYSTEM_PROMPT_TEMPLATE : GUARDIAN_SYSTEM_PROMPT_TEMPLATE;
    const systemPrompt = template
      .replace('{USER_INFO}', userInfoTags)
      .replace('{HEALTH_DATA}', healthDataStr)
      .replace('{MEMOS_DATA}', memosStr);
    
    sessionHistories.set(sessionId, [
      { role: 'system', content: systemPrompt }
    ]);
  }
  return sessionHistories.get(sessionId)!;
}

/**
 * 清除会话历史
 * POST /api/v1/voice-assistant/clear-session
 * Body: { session_id: string }
 */
router.post('/clear-session', (req, res) => {
  const { session_id } = req.body;
  
  if (session_id && sessionHistories.has(session_id)) {
    sessionHistories.delete(session_id);
  }
  
  res.json({ success: true, message: '会话已清除' });
});

/**
 * 刷新会话数据（重新加载健康数据、备忘录等）
 * POST /api/v1/voice-assistant/refresh-session
 * Body: { session_id: string, user_id: number, role: 'elderly' | 'guardian' }
 */
router.post('/refresh-session', async (req, res) => {
  const { session_id, user_id, role = 'elderly' } = req.body;
  
  if (session_id && sessionHistories.has(session_id)) {
    sessionHistories.delete(session_id);
  }
  
  // 重新创建会话，会自动加载最新数据
  await getSessionHistory(session_id, role, user_id);
  
  res.json({ success: true, message: '会话数据已刷新' });
});

/**
 * 语音助手对话（非流式）
 * POST /api/v1/voice-assistant/chat
 * Body: { 
 *   message: string, 
 *   session_id?: string, 
 *   role?: 'elderly' | 'guardian',
 *   user_id?: number 
 * }
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, session_id = 'default', role = 'elderly', user_id } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: '请提供消息内容',
      });
    }

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);

    // 获取会话历史
    const history = await getSessionHistory(session_id, role, user_id);
    
    // 添加用户消息
    history.push({ role: 'user', content: message });

    // 初始化LLM客户端
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    console.log(`[语音助手] 对话请求 - 会话: ${session_id}, 角色: ${role}, 消息: ${message.substring(0, 50)}...`);

    // 调用LLM
    const response = await llmClient.invoke(history, {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.7,
    });

    // 添加AI回复到历史
    history.push({ role: 'assistant', content: response.content });

    // 限制历史长度（保留最近的10轮对话 + 系统提示词）
    if (history.length > 21) {
      const systemPrompt = history[0];
      const recentHistory = history.slice(-20);
      sessionHistories.set(session_id, [systemPrompt, ...recentHistory]);
    }

    console.log(`[语音助手] 回复成功: ${response.content.substring(0, 50)}...`);

    res.json({
      success: true,
      response: response.content,
      session_id,
    });
  } catch (error: any) {
    console.error('[语音助手] 对话错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '对话失败',
    });
  }
});

/**
 * 语音助手对话（流式输出）
 * POST /api/v1/voice-assistant/chat-stream
 * Body: { 
 *   message: string, 
 *   session_id?: string, 
 *   role?: 'elderly' | 'guardian',
 *   user_id?: number 
 * }
 * 
 * 返回: SSE 流式数据
 */
router.post('/chat-stream', async (req, res: Response) => {
  try {
    const { message, session_id = 'default', role = 'elderly', user_id } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: '请提供消息内容',
      });
    }

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, no-transform, must-revalidate');
    res.setHeader('Connection', 'keep-alive');

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);

    // 获取会话历史
    const history = await getSessionHistory(session_id, role, user_id);
    
    // 添加用户消息
    history.push({ role: 'user', content: message });

    // 初始化LLM客户端
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    console.log(`[语音助手] 流式对话请求 - 会话: ${session_id}, 角色: ${role}, 消息: ${message.substring(0, 50)}...`);

    // 调用LLM流式输出
    const stream = llmClient.stream(history, {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.7,
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      if (chunk.content) {
        const text = chunk.content.toString();
        fullResponse += text;
        // 发送SSE事件
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    // 添加完整回复到历史
    history.push({ role: 'assistant', content: fullResponse });

    // 限制历史长度
    if (history.length > 21) {
      const systemPrompt = history[0];
      const recentHistory = history.slice(-20);
      sessionHistories.set(session_id, [systemPrompt, ...recentHistory]);
    }

    // 发送结束标记
    res.write(`data: [DONE]\n\n`);
    res.end();

    console.log(`[语音助手] 流式回复完成: ${fullResponse.substring(0, 50)}...`);
  } catch (error: any) {
    console.error('[语音助手] 流式对话错误:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || '对话失败',
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || '对话失败' })}\n\n`);
      res.end();
    }
  }
});

/**
 * TTS语音合成
 * POST /api/v1/voice-assistant/tts
 * Body: { 
 *   text: string, 
 *   speaker?: string,
 *   speechRate?: number,
 *   loudnessRate?: number 
 * }
 */
router.post('/tts', async (req, res) => {
  try {
    const { 
      text, 
      speaker = 'zh_female_xiaohe_uranus_bigtts',
      speechRate = 0,
      loudnessRate = 0 
    } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: '请提供要合成的文本内容',
      });
    }

    // 限制文本长度，避免过长的请求
    if (text.length > 1000) {
      return res.status(400).json({
        success: false,
        error: '文本内容过长，最多支持1000个字符',
      });
    }

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);

    // 初始化TTS客户端
    const config = new Config();
    const ttsClient = new TTSClient(config, customHeaders);

    console.log(`[语音助手] TTS请求 - 文本: ${text.substring(0, 50)}..., 发音人: ${speaker}`);

    // 调用TTS合成
    const response = await ttsClient.synthesize({
      uid: `tts_${Date.now()}`,
      text,
      speaker,
      audioFormat: 'mp3',
      sampleRate: 24000,
      speechRate,
      loudnessRate,
    });

    console.log(`[语音助手] TTS成功 - 音频URL: ${response.audioUri}, 大小: ${response.audioSize} bytes`);

    res.json({
      success: true,
      audioUri: response.audioUri,
      audioSize: response.audioSize,
    });
  } catch (error: any) {
    console.error('[语音助手] TTS错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '语音合成失败',
    });
  }
});

/**
 * 获取可用的TTS发音人列表
 * GET /api/v1/voice-assistant/tts/voices
 */
router.get('/tts/voices', (req, res) => {
  const voices = [
    // 通用场景
    { id: 'zh_female_xiaohe_uranus_bigtts', name: '小荷', gender: 'female', category: '通用', description: '温柔女声（默认）' },
    { id: 'zh_female_vv_uranus_bigtts', name: 'Vivi', gender: 'female', category: '通用', description: '中英双语女声' },
    { id: 'zh_male_m191_uranus_bigtts', name: '云舟', gender: 'male', category: '通用', description: '稳重男声' },
    { id: 'zh_male_taocheng_uranus_bigtts', name: '小天', gender: 'male', category: '通用', description: '亲切男声' },
    // 有声阅读
    { id: 'zh_female_xueayi_saturn_bigtts', name: '雪阿姨', gender: 'female', category: '有声阅读', description: '儿童故事' },
    // 视频配音
    { id: 'zh_male_dayi_saturn_bigtts', name: '大义', gender: 'male', category: '视频配音', description: '沉稳男声' },
    { id: 'zh_female_mizai_saturn_bigtts', name: '米仔', gender: 'female', category: '视频配音', description: '活泼女声' },
    { id: 'zh_female_jitangnv_saturn_bigtts', name: '鸡汤女', gender: 'female', category: '视频配音', description: '励志女声' },
    { id: 'zh_female_meilinvyou_saturn_bigtts', name: '魅力女友', gender: 'female', category: '视频配音', description: '甜美女声' },
    { id: 'zh_male_ruyayichen_saturn_bigtts', name: '儒雅一尘', gender: 'male', category: '视频配音', description: '儒雅男声' },
  ];

  res.json({
    success: true,
    voices,
  });
});

export default router;
