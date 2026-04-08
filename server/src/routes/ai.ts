/**
 * AI健康分析API路由
 * 使用 DeepSeek 大模型实现智能健康分析
 */
import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { DeepSeekClient } from '../services/deepseek';

const router = express.Router();

// LLM 客户端实例
const llmClient = new DeepSeekClient();

// 健康分析系统提示词
const HEALTH_ANALYSIS_PROMPT = `你是一位专业的老年健康管理AI分析师，专门为监护人提供被监护老人的健康分析报告。

## 你的角色
你是老人的监护人（子女/亲属）的健康顾问，帮助他们了解和关注被监护老人的健康状况。

## 医疗知识库

### 老年人常见疾病参考
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

### 健康指标参考范围
| 指标 | 正常范围 | 老年人目标 | 危险阈值 |
|------|----------|-----------|---------|
| 收缩压 | <120mmHg | <140mmHg | >150mmHg |
| 舒张压 | <80mmHg | <90mmHg | >90mmHg |
| 空腹血糖 | 3.9-6.1mmol/L | 4.4-7.0mmol/L | >10mmol/L |
| 餐后2h血糖 | <7.8mmol/L | <10.0mmol/L | >13.9mmol/L |
| 血氧 | ≥95% | ≥93% | <90% |
| 心率(静息) | 60-100bpm | 60-100bpm | <50或>100bpm |
| 体温 | 36.0-37.3°C | 36.0-37.3°C | >37.5°C |
| 步数(每日) | ≥6000步 | ≥4000步 | <2000步 |
| 睡眠时长 | 7-8小时 | 6-9小时 | <5h或>10h |
| BMI | 18.5-24.9 | 22-27 | <18.5或>30 |

### 分析要求
1. 数据解读：分析心率、血压、血氧、步数、睡眠、体温、血糖、体脂等全部健康数据
2. 异常识别：识别数据中的异常指标和潜在风险
3. 趋势分析：分析近期数据变化趋势
4. 健康建议：提供针对老人的健康改善建议，监护人可以协助执行
5. 预警提示：对需要关注的指标发出预警，提醒监护人重点关注

## 输出格式
请以JSON格式输出分析结果，结构如下：
{
  "summary": "老人总体健康状态概述（50字以内，面向监护人）",
  "riskLevel": "low|medium|high",
  "indicators": [
    {
      "name": "指标名称",
      "value": "数值",
      "status": "normal|warning|danger",
      "trend": "上升|下降|稳定",
      "comment": "简短评价"
    }
  ],
  "alerts": ["需要监护人关注的问题列表"],
  "suggestions": ["监护人可以协助执行的健康建议"],
  "followUp": "后续跟进建议"
}

## 注意事项
- 风险等级：low(正常)、medium(需关注)、high(需紧急处理)
- 语言要适合监护人阅读，专业但易懂
- 对于异常数据，说明可能的原因和监护建议
- 如有紧急情况，在alerts中标注"紧急"
- 必须分析所有提供的健康指标，不能遗漏
- 建议要具体可执行，例如"建议提醒老人按时服药"、"可以陪老人散步增加活动量"
`;

/**
 * 获取用户完整的健康数据
 */
async function getFullHealthData(userId: number): Promise<{
  latestTrend: any;
  recentTrends: any[];
  userData: any;
}> {
  const supabase = getSupabaseClient();

  const [userResult, latestTrendResult, recentTrendsResult] = await Promise.all([
    supabase
      .from('users')
      .select('id, name, phone, role, health_conditions, living_conditions, home_address')
      .eq('id', userId)
      .single(),
    supabase
      .from('health_trend')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('health_trend')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(7),
  ]);

  return {
    userData: userResult.data,
    latestTrend: latestTrendResult.data,
    recentTrends: recentTrendsResult.data || [],
  };
}

/**
 * 构建分析提示词
 */
function buildAnalysisPrompt(
  analysisType: string, 
  userData: any, 
  bluetoothData: any[],
  latestTrend: any,
  recentTrends: any[]
): string {
  const userInfo = userData 
    ? `姓名: ${userData.name || '未知'}`
    : '用户信息未知';

  const healthConditions = userData?.health_conditions?.length > 0
    ? `\n健康状况: ${userData.health_conditions.join('、')}`
    : '';

  const livingConditions = userData?.living_conditions?.length > 0
    ? `\n生活环境: ${userData.living_conditions.join('、')}`
    : '';

  const addressInfo = userData?.home_address
    ? `\n居住地址: ${userData.home_address}`
    : '';

  const userFullInfo = `${userInfo}${healthConditions}${livingConditions}${addressInfo}`;

  let todayHealthData = '';
  if (latestTrend) {
    todayHealthData = `\n【今日健康数据】
- 心率: ${latestTrend.heart_rate || '--'} bpm
- 血压: ${latestTrend.systolic || '--'}/${latestTrend.diastolic || '--'} mmHg
- 血氧: ${latestTrend.blood_oxygen || '--'}%
- 步数: ${latestTrend.steps || '--'} 步
- 睡眠: ${latestTrend.sleep_hours || '--'} 小时
- 体温: ${latestTrend.temperature || '--'}°C
- 血糖: ${latestTrend.blood_sugar || '--'} mmol/L
- 体脂率: ${latestTrend.body_fat || '--'}%
- 消耗热量: ${latestTrend.calories || '--'} 千卡`;
  }

  let trendInfo = '';
  if (recentTrends && recentTrends.length > 0) {
    const dates = recentTrends.map((t: any) => t.date).reverse();
    const heartRates = recentTrends.map((t: any) => t.heart_rate || '--').reverse();
    const steps = recentTrends.map((t: any) => t.steps || '--').reverse();

    trendInfo = `\n【近${recentTrends.length}天健康趋势】
日期: ${dates.join(' → ')}
心率(bpm): ${heartRates.join(' → ')}
步数: ${steps.join(' → ')}`;
  }

  const dataInfo = bluetoothData?.length > 0
    ? `最近实时数据:\n${bluetoothData.map((d: any, i: number) => 
        `${i + 1}. 时间: ${d.timestamp}, 数据: ${JSON.stringify(d.data || d)}`
      ).join('\n')}`
    : '暂无实时健康数据';

  return `请为监护人分析以下老人的健康状况：

【用户信息】
${userFullInfo}
${todayHealthData}
${trendInfo}

【实时数据】
${dataInfo}

请根据以上全部健康数据，生成一份给监护人看的健康分析报告。`;
}

/**
 * 分析老人健康状况 - URL参数版本
 */
router.post('/analyze/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { analysisType, analysis_type, bluetoothData, bluetooth_data } = req.body;
    
    const analysisTypeValue = analysisType || analysis_type || 'health';
    const bluetoothDataValue = bluetoothData || bluetooth_data;

    if (!userId) {
      return res.status(400).json({ success: false, error: '用户ID不能为空' });
    }

    const { userData, latestTrend, recentTrends } = await getFullHealthData(parseInt(userId));

    console.log(`[AI分析] 开始分析 - 用户: ${userId}, 类型: ${analysisTypeValue}`);

    const analysisPrompt = buildAnalysisPrompt(analysisTypeValue, userData, bluetoothDataValue, latestTrend, recentTrends);

    const response = await llmClient.invoke([
      { role: 'system', content: HEALTH_ANALYSIS_PROMPT },
      { role: 'user', content: analysisPrompt },
    ], { temperature: 0.3 });

    let analysisResult;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析分析结果');
      }
    } catch (parseError) {
      analysisResult = {
        summary: response.content.substring(0, 100),
        riskLevel: 'low',
        indicators: [],
        alerts: [],
        suggestions: ['请咨询医生获取专业建议'],
        followUp: '建议定期监测健康数据',
      };
    }

    const riskLevel = analysisResult.riskLevel || 'low';

    const supabase = getSupabaseClient();
    const { data: analysis, error } = await supabase
      .from('ai_analysis')
      .insert({
        user_id: parseInt(userId),
        analysis_type: analysisTypeValue,
        result: JSON.stringify(analysisResult),
        risk_level: riskLevel,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`[AI分析] 分析完成 - 风险等级: ${riskLevel}`);

    res.json({ 
      success: true,
      analysis: {
        ...analysis,
        parsed_result: analysisResult,
      },
    });
  } catch (error: any) {
    console.error('AI analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'AI 分析失败' 
    });
  }
});

/**
 * 分析老人健康状况 - Body参数版本
 */
router.post('/analyze', async (req, res) => {
  try {
    const { user_id, bluetooth_data, analysis_type } = req.body;

    if (!user_id || !analysis_type) {
      return res.status(400).json({ error: '用户ID和分析类型不能为空' });
    }

    const { userData, latestTrend, recentTrends } = await getFullHealthData(parseInt(user_id));

    console.log(`[AI分析] 开始分析 - 用户: ${user_id}, 类型: ${analysis_type}`);

    const analysisPrompt = buildAnalysisPrompt(analysis_type, userData, bluetooth_data, latestTrend, recentTrends);

    const response = await llmClient.invoke([
      { role: 'system', content: HEALTH_ANALYSIS_PROMPT },
      { role: 'user', content: analysisPrompt },
    ], { temperature: 0.3 });

    let analysisResult;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析分析结果');
      }
    } catch (parseError) {
      analysisResult = {
        summary: response.content.substring(0, 100),
        riskLevel: 'low',
        indicators: [],
        alerts: [],
        suggestions: ['请咨询医生获取专业建议'],
        followUp: '建议定期监测健康数据',
      };
    }

    const riskLevel = analysisResult.riskLevel || 'low';

    const supabase = getSupabaseClient();
    const { data: analysis, error } = await supabase
      .from('ai_analysis')
      .insert({
        user_id: parseInt(user_id),
        analysis_type,
        result: JSON.stringify(analysisResult),
        risk_level: riskLevel,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`[AI分析] 分析完成 - 风险等级: ${riskLevel}`);

    res.json({ 
      success: true,
      analysis: {
        ...analysis,
        parsed_result: analysisResult,
      },
    });
  } catch (error: any) {
    console.error('AI analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'AI 分析失败' 
    });
  }
});

/**
 * 获取用户的 AI 分析历史
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { analysis_type, limit } = req.query;

    const supabase = getSupabaseClient();

    let query = supabase
      .from('ai_analysis')
      .select('*')
      .eq('user_id', parseInt(userId))
      .order('created_at', { ascending: false });

    if (analysis_type) {
      query = query.eq('analysis_type', analysis_type);
    }

    if (limit) {
      query = query.limit(parseInt(limit as string));
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const parsedData = (data || []).map(item => ({
      ...item,
      parsed_result: item.result ? JSON.parse(item.result) : null,
    }));

    res.json({ data: parsedData });
  } catch (error: any) {
    console.error('Get AI history error:', error);
    res.status(500).json({ error: '获取 AI 分析历史失败' });
  }
});

/**
 * 获取最新的 AI 分析结果
 */
router.get('/latest/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { analysis_type } = req.query;

    const supabase = getSupabaseClient();

    let query = supabase
      .from('ai_analysis')
      .select('*')
      .eq('user_id', parseInt(userId))
      .order('created_at', { ascending: false })
      .limit(1);

    if (analysis_type) {
      query = query.eq('analysis_type', analysis_type);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const latestData = data?.[0] || null;
    
    if (latestData && latestData.result) {
      latestData.parsed_result = JSON.parse(latestData.result);
    }

    res.json({ data: latestData });
  } catch (error: any) {
    console.error('Get latest AI analysis error:', error);
    res.status(500).json({ error: '获取最新 AI 分析失败' });
  }
});

// 每日报告系统提示词
const DAILY_REPORT_PROMPT = `你是一位专业的老年健康管理AI助手，专门为监护人撰写被监护老人的每日健康报告。

## 你的角色
你是监护人的健康顾问，每天为监护人提供一份关于被监护老人健康状况的报告。

## 报告要求
1. 语言风格：专业但温暖，让监护人感到安心
2. 内容结构：
   - 今日健康概述（老人整体状态评价）
   - 各项指标分析（心率、血压、血氧、步数、睡眠等）
   - 今日亮点（老人做得好的地方）
   - 需要关注（需要监护人留意的事项）
   - 护理建议（监护人可以采取的行动）
3. 字数要求：约400字左右
4. 注意事项：
   - 使用监护人的视角，用"您的家人"或"老人"称呼
   - 对异常数据给出温馨提示和具体建议
   - 多用鼓励性的话语，让监护人对老人的健康有信心
   - 提供可操作的建议，如"可以提醒老人多喝水"、"周末可以陪老人散步"

## 输出格式
请直接输出报告正文，不需要JSON格式，只需要纯文本即可。`;

/**
 * 生成每日健康报告
 */
router.post('/daily-report/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, error: '用户ID不能为空' });
    }

    const { userData, latestTrend, recentTrends } = await getFullHealthData(parseInt(userId));

    console.log(`[每日报告] 开始生成 - 用户: ${userId}`);

    const userName = userData?.name || '老人';
    const healthConditions = userData?.health_conditions?.length > 0
      ? `健康状况: ${userData.health_conditions.join('、')}`
      : '';

    let healthDataInfo = '';
    if (latestTrend) {
      healthDataInfo = `
今日健康数据：
- 心率: ${latestTrend.heart_rate || '--'} bpm
- 血压: ${latestTrend.systolic || '--'}/${latestTrend.diastolic || '--'} mmHg
- 血氧: ${latestTrend.blood_oxygen || '--'}%
- 步数: ${latestTrend.steps || '--'} 步
- 睡眠: ${latestTrend.sleep_hours || '--'} 小时
- 体温: ${latestTrend.temperature || '--'}°C`;
    }

    let trendInfo = '';
    if (recentTrends && recentTrends.length > 1) {
      const avgHeartRate = recentTrends.reduce((sum: number, t: any) => sum + (t.heart_rate || 0), 0) / recentTrends.length;
      const avgSteps = recentTrends.reduce((sum: number, t: any) => sum + (t.steps || 0), 0) / recentTrends.length;
      trendInfo = `
近${recentTrends.length}天平均数据：
- 平均心率: ${Math.round(avgHeartRate)} bpm
- 平均步数: ${Math.round(avgSteps)} 步`;
    }

    const userPrompt = `请为监护人生成一份关于以下老人的每日健康报告：

老人姓名: ${userName}
${healthConditions}
${healthDataInfo}
${trendInfo}

今天是${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}。

请以监护人的视角撰写报告，帮助监护人了解老人今天的健康状况。`;

    const response = await llmClient.invoke([
      { role: 'system', content: DAILY_REPORT_PROMPT },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.7 });

    const report = response.content;

    console.log(`[每日报告] 生成完成`);

    res.json({ 
      success: true,
      report,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Daily report error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || '生成每日报告失败' 
    });
  }
});

// AI对话系统提示词
const CHAT_PROMPT = `你是一位专业的老年健康管理AI助手，专门为监护人解答关于被监护老人健康的问题。

## 你的角色
你是监护人的健康顾问，帮助他们了解和照顾被监护的老人。

## 你可以回答的问题
- 老人健康数据解读（心率、血压、血氧等指标含义）
- 护理建议和日常照料指导
- 用药提醒和注意事项
- 饮食营养建议
- 适合老人的运动建议
- 心理关怀和沟通技巧
- 异常情况应对建议

## 你的特点
1. 语言专业但易懂，让监护人感到安心
2. 回答具体可操作，监护人可以直接执行
3. 对于健康问题给出专业建议
4. 遇到紧急情况会提醒监护人带老人就医
5. 了解老人的健康数据，可以提供个性化建议

## 注意事项
- 不要给出明确的医疗诊断
- 对于严重症状建议监护人带老人就医
- 保持积极正面的态度
- 建议要具体可执行，例如"建议每天提醒老人测量血压"、"可以准备易消化的食物"
- 始终记得你是和监护人对话，不是和老人对话
`;

/**
 * AI健康对话
 */
router.post('/chat', async (req, res) => {
  try {
    const { user_id, message, history = [] } = req.body;

    if (!user_id || !message) {
      return res.status(400).json({ success: false, error: '用户ID和消息内容不能为空' });
    }

    const { userData, latestTrend } = await getFullHealthData(parseInt(user_id));

    console.log(`[AI对话] 用户 ${user_id} 发送消息: ${message.substring(0, 50)}...`);

    const userName = userData?.name || '老人';
    const healthConditions = userData?.health_conditions?.length > 0
      ? `健康状况: ${userData.health_conditions.join('、')}`
      : '';
    
    let healthContext = '';
    if (latestTrend) {
      healthContext = `
当前健康数据：
- 心率: ${latestTrend.heart_rate || '--'} bpm
- 血压: ${latestTrend.systolic || '--'}/${latestTrend.diastolic || '--'} mmHg
- 血氧: ${latestTrend.blood_oxygen || '--'}%
- 步数: ${latestTrend.steps || '--'} 步`;
    }

    const contextPrompt = `当前对话的背景信息：

被监护老人信息：
姓名: ${userName}
${healthConditions}
${healthContext}

用户身份：监护人（子女/亲属）
请以监护人的视角回答问题，提供可操作的护理建议。`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: CHAT_PROMPT },
      { role: 'system', content: contextPrompt },
    ];

    for (const msg of history) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    messages.push({ role: 'user', content: message });

    const response = await llmClient.invoke(messages, { temperature: 0.7 });

    console.log(`[AI对话] 回复完成`);

    res.json({ 
      success: true,
      reply: response.content,
    });
  } catch (error: any) {
    console.error('AI chat error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'AI 对话失败' 
    });
  }
});

export default router;
