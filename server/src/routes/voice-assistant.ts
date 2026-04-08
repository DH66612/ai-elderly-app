/**
 * 语音助手API路由
 * 使用 DeepSeek 大模型实现智能对话
 * 支持 SSE 流式输出
 * 支持 讯飞 TTS 语音朗读
 * 支持查询健康数据、备忘录、记事本、个人资料
 */
import express, { type Response } from 'express';
import { DeepSeekClient } from '../services/deepseek';
import { XunfeiTTSClient, TTS_VOICES } from '../services/xunfei-tts';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = express.Router();

// LLM 和 TTS 客户端实例
const llmClient = new DeepSeekClient();
const ttsClient = new XunfeiTTSClient();

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

## 医疗知识库
### 老年人常见疾病（简洁说明）
1. **高血压**：动脉血压持续升高，是心脑血管病的主要危险因素，常无明显症状。
2. **糖尿病**：血糖代谢紊乱，易引发多器官并发症，典型表现为"三多一少"（多饮、多食、多尿、体重下降）。
3. **冠心病**：冠状动脉粥样硬化导致心肌缺血，可表现为心绞痛或心肌梗死。
4. **骨质疏松**：骨量减少、骨微结构破坏，骨折风险显著增加。
5. **阿尔茨海默病**：进行性认知功能障碍，早期表现为近记忆减退。
6. **关节炎**：关节退行性变或炎症，导致疼痛、僵硬和活动受限。
7. **慢性阻塞性肺疾病（COPD）**：持续性气流受限，表现为慢性咳嗽、咳痰和呼吸困难。
8. **帕金森病**：中脑黑质多巴胺能神经元变性，出现震颤、肌强直、运动迟缓。
9. **脑卒中后遗症**：脑血管意外后遗留的偏瘫、失语、认知障碍等功能缺损。
10. **白内障**：晶状体混浊导致视力渐进性下降，严重时可致盲。

### 常用检查指标参考
- 血压：正常<140/90mmHg，老年人可适当放宽至<150/90mmHg
- 血糖（空腹）：正常3.9-6.1mmol/L，糖尿病患者控制目标7.0mmol/L以下
- 心率：正常60-100次/分，休息时<50或>100需注意
- 血氧：正常≥95%，<90%为低氧血症需就医
- 体温：正常36.0-37.3°C

### 常用药物知识
1. **降压药**：建议早晨空腹服用，定期测量血压
2. **降糖药**：餐前30分钟服用，注意监测血糖
3. **他汀类**：晚上服用效果好，定期检查肝功能
4. **阿司匹林**：肠溶片空腹服，普通餐后服，注意出血倾向

### 健康生活方式
- 饮食：少盐少油，多蔬菜水果，七八分饱
- 运动：每天散步30分钟，量力而行
- 睡眠：保证7-8小时，午休30分钟为宜
- 饮水：每天1500-2000ml，少量多次

### 危险信号识别
以下情况需立即联系家人或就医：
- 胸痛、胸闷持续不缓解
- 单侧肢体无力或麻木
- 突然说话不清或口角歪斜
- 意识模糊或晕厥
- 严重头痛伴有恶心呕吐
- 血糖<3.9mmol/L或>16.7mmol/L
- 血压>180/120mmHg

## 你可以帮忙的事情
1. 健康提醒：提醒吃药、测量血压、记录健康数据
2. 日常咨询：时间查询、日历提醒
3. 情感陪伴：聊天解闷、讲笑话、分享养生知识
4. 生活协助：设置提醒、查询信息、拨打电话
5. 紧急求助：识别紧急情况并提醒联系家人
6. 数据查询：帮助老人查看自己的健康数据、备忘录、记事本内容
7. 健康建议：根据老人健康数据提供个性化建议

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

## 医疗知识库
### 老年人常见疾病（简洁说明）
1. **高血压**：动脉血压持续升高，是心脑血管病的主要危险因素，常无明显症状。
2. **糖尿病**：血糖代谢紊乱，易引发多器官并发症，典型表现为"三多一少"。
3. **冠心病**：冠状动脉粥样硬化导致心肌缺血，可表现为心绞痛或心肌梗死。
4. **骨质疏松**：骨量减少、骨微结构破坏，骨折风险显著增加。
5. **阿尔茨海默病**：进行性认知功能障碍，早期表现为近记忆减退。
6. **关节炎**：关节退行性变或炎症，导致疼痛、僵硬和活动受限。
7. **慢性阻塞性肺疾病（COPD）**：持续性气流受限，表现为慢性咳嗽、咳痰和呼吸困难。
8. **帕金森病**：中脑黑质多巴胺能神经元变性，出现震颤、肌强直、运动迟缓。
9. **脑卒中后遗症**：脑血管意外后遗留的偏瘫、失语、认知障碍等功能缺损。
10. **白内障**：晶状体混浊导致视力渐进性下降，严重时可致盲。

### 护理关注要点
- 高血压：低盐饮食、规律服药、定期监测血压
- 糖尿病：饮食控制、适量运动、按时服药、监测血糖
- 冠心病：饮食清淡、避免剧烈运动、随身带急救药
- 骨质疏松：多补钙、晒太阳、预防跌倒
- 阿尔茨海默病：早期识别记忆下降、定向障碍，给予陪伴和照护
- 关节炎：适度活动、理疗、缓解疼痛
- COPD：戒烟、避免受凉、呼吸锻炼
- 帕金森病：药物治疗配合康复训练
- 脑卒中：康复训练、预防复发
- 白内障：手术治疗为主，注意用眼卫生

### 检查指标参考范围
| 指标 | 正常范围 | 老年人参考 | 需关注 |
|------|----------|-----------|--------|
| 收缩压 | <120mmHg | <140mmHg | >150mmHg |
| 舒张压 | <80mmHg | <90mmHg | >90mmHg |
| 空腹血糖 | 3.9-6.1 | 4.4-7.0 | <4.4或>10 |
| 餐后2h血糖 | <7.8 | <10.0 | >13.9 |
| 血氧 | ≥95% | ≥93% | <90% |
| 心率 | 60-100 | 60-100 | <50或>100 |
| 体温 | 36-37.3°C | 36-37.3°C | >37.5°C |

### 常用药物知识
| 药物类型 | 服用时间 | 注意事项 |
|----------|----------|----------|
| 降压药 | 早晨空腹 | 起床即服，定期测压 |
| 降糖药 | 餐前30分 | 餐前服用，注意低血糖 |
| 他汀类 | 晚上 | 肝功能监测 |
| 阿司匹林 | 肠溶片空腹 | 关注出血倾向 |
| 硝酸甘油 | 心绞痛时 | 舌下含服，坐位服用 |

### 护理要点
1. **用药护理**：督促按时服药，注意药物不良反应，记录用药情况
2. **饮食护理**：低盐低脂低糖，多蔬果粗粮，少食多餐
3. **运动护理**：每天散步30分钟，量力而行，循序渐进
4. **心理护理**：多陪伴倾听，关注情绪变化，防止抑郁
5. **安全护理**：防跌倒、防走失、防烫伤、定期检查居家环境

### 紧急情况处理
需立即就医的信号：
- 胸痛持续>20分钟不缓解
- 单侧肢体无力或麻木
- 突然口角歪斜、言语不清
- 意识障碍或晕厥
- 严重头痛伴呕吐
- 血糖<3.9或>16.7mmol/L
- 血压>180/120mmHg
- 呼吸困难、口唇发紫

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
    
    // 查询最近一条健康数据（从 device_health_data 表）
    const { data: healthData } = await supabase
      .from('device_health_data')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    if (!healthData) {
      return '\n## 健康数据\n暂无健康数据记录。';
    }

    const recordDate = new Date(healthData.recorded_at).toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
    });
    const lines = [`\n## 健康数据（${recordDate}）`];
    
    if (healthData.heart_rate) {
      lines.push(`- 心率: ${healthData.heart_rate} bpm`);
    }
    if (healthData.blood_pressure_systolic && healthData.blood_pressure_diastolic) {
      lines.push(`- 血压: ${healthData.blood_pressure_systolic}/${healthData.blood_pressure_diastolic} mmHg`);
    }
    if (healthData.blood_oxygen) {
      lines.push(`- 血氧: ${healthData.blood_oxygen}%`);
    }
    if (healthData.steps) {
      lines.push(`- 今日步数: ${healthData.steps} 步`);
    }
    if (healthData.calories) {
      lines.push(`- 消耗卡路里: ${healthData.calories} kcal`);
    }
    if (healthData.distance) {
      lines.push(`- 行走距离: ${healthData.distance} 米`);
    }

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
    
    // 1. 先查询用户的所有绑定关系，获取binding_id列表
    const { data: bindings } = await supabase
      .from('bindings')
      .select('id')
      .or(`elder_id.eq.${userId},guardian_id.eq.${userId}`);
    
    if (!bindings || bindings.length === 0) {
      return '\n## 备忘录/记事本\n暂无备忘录记录。';
    }
    
    const bindingIds = bindings.map((b: any) => b.id);
    
    // 2. 通过binding_id或creator_id查询备忘录
    const { data: memos } = await supabase
      .from('memos')
      .select('*')
      .or(`binding_id.in.(${bindingIds.join(',')}),creator_id.eq.${userId}`)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);

    if (!memos || memos.length === 0) {
      return '\n## 备忘录/记事本\n暂无备忘录记录。';
    }

    const categoryLabels: Record<string, string> = {
      'general': '日常',
      'health': '健康',
      'important': '重要',
      'todo': '待办',
    };
    
    const lines = ['\n## 备忘录/记事本（最近10条）'];
    
    memos.forEach((memo, index) => {
      const category = memo.category || 'general';
      const typeLabel = categoryLabels[category] || category;
      const time = new Date(memo.created_at).toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const pinnedMark = memo.is_pinned ? '[置顶]' : '';
      const completedMark = memo.is_completed ? '[已完成]' : '';
      const title = memo.title || memo.content.substring(0, 30);
      lines.push(`${index + 1}. ${pinnedMark}${completedMark}[${typeLabel}] ${title} (${time})`);
      if (memo.title && memo.content) {
        lines.push(`   内容: ${memo.content.substring(0, 100)}${memo.content.length > 100 ? '...' : ''}`);
      }
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
    let userInfoTags = '';
    let healthDataStr = '';
    let memosStr = '';
    
    if (userId) {
      try {
        const supabase = getSupabaseClient();
        
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
          
          if (userData.name) {
            tags.push(`姓名: ${userData.name}`);
          }
          
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
 */
router.post('/clear-session', (req, res) => {
  const { session_id } = req.body;
  
  if (session_id && sessionHistories.has(session_id)) {
    sessionHistories.delete(session_id);
  }
  
  res.json({ success: true, message: '会话已清除' });
});

/**
 * 刷新会话数据
 */
router.post('/refresh-session', async (req, res) => {
  const { session_id, user_id, role = 'elderly' } = req.body;
  
  if (session_id && sessionHistories.has(session_id)) {
    sessionHistories.delete(session_id);
  }
  
  await getSessionHistory(session_id, role, user_id);
  
  res.json({ success: true, message: '会话数据已刷新' });
});

/**
 * 语音助手对话（非流式）
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

    const history = await getSessionHistory(session_id, role, user_id);
    history.push({ role: 'user', content: message });

    console.log(`[语音助手] 对话请求 - 会话: ${session_id}, 角色: ${role}`);

    const response = await llmClient.invoke(history, { temperature: 0.7 });

    history.push({ role: 'assistant', content: response.content });

    if (history.length > 21) {
      const systemPrompt = history[0];
      const recentHistory = history.slice(-20);
      sessionHistories.set(session_id, [systemPrompt, ...recentHistory]);
    }

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

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, no-transform, must-revalidate');
    res.setHeader('Connection', 'keep-alive');

    const history = await getSessionHistory(session_id, role, user_id);
    history.push({ role: 'user', content: message });

    console.log(`[语音助手] 流式对话请求 - 会话: ${session_id}, 角色: ${role}`);

    let fullResponse = '';

    for await (const chunk of llmClient.stream(history, { temperature: 0.7 })) {
      if (chunk.content) {
        fullResponse += chunk.content;
        res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`);
      }
    }

    history.push({ role: 'assistant', content: fullResponse });

    if (history.length > 21) {
      const systemPrompt = history[0];
      const recentHistory = history.slice(-20);
      sessionHistories.set(session_id, [systemPrompt, ...recentHistory]);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();

    console.log(`[语音助手] 流式回复完成`);
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
 */
router.post('/tts', async (req, res) => {
  try {
    const { 
      text, 
      speaker = 'xiaoyan',
      speechRate = 0,
      loudnessRate = 0 
    } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: '请提供要合成的文本内容',
      });
    }

    if (text.length > 1000) {
      return res.status(400).json({
        success: false,
        error: '文本内容过长，最多支持1000个字符',
      });
    }

    console.log(`[语音助手] TTS请求 - 文本长度: ${text.length}, 发音人: ${speaker}`);

    const response = await ttsClient.synthesize({
      uid: `tts_${Date.now()}`,
      text,
      speaker,
      audioFormat: 'mp3',
      speechRate,
      loudnessRate,
    });

    console.log(`[语音助手] TTS成功 - 音频大小: ${response.audioSize} bytes`);

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
 */
router.get('/tts/voices', (req, res) => {
  res.json({
    success: true,
    voices: TTS_VOICES,
  });
});

export default router;
