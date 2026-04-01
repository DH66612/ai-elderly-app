/**
 * AI健康分析API路由
 * 使用扣子Bot大模型实现智能健康分析
 * 支持全部健康数据分析：心率、血压、血氧、步数、睡眠、体温、血糖、体脂等
 */
import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const router = express.Router();

// 健康分析系统提示词
const HEALTH_ANALYSIS_PROMPT = `你是一位专业的老年健康管理AI分析师。你需要根据提供的健康数据，生成一份详细、易懂的健康分析报告。

## 分析要求
1. 数据解读：分析心率、血压、血氧、步数、睡眠、体温、血糖、体脂等全部健康数据
2. 异常识别：识别数据中的异常指标和潜在风险
3. 趋势分析：分析近期数据变化趋势
4. 健康建议：提供针对性的健康改善建议
5. 预警提示：对需要关注的指标发出预警

## 健康指标参考范围
- 心率：正常范围 60-100 bpm，<50 或 >100 需关注
- 血压：正常收缩压 90-140 mmHg，舒张压 60-90 mmHg
- 血氧：正常范围 ≥95%，<95% 需关注
- 体温：正常范围 36.0-37.3°C，>37.3°C 为发热
- 血糖（空腹）：正常范围 3.9-6.1 mmol/L
- 体脂率（老年人）：男性 15-25%，女性 20-30% 为正常
- 步数：建议每日 ≥6000 步，<2000 步为活动量过低
- 睡眠：建议 7-8 小时，<6 小时或 >9 小时需关注

## 输出格式
请以JSON格式输出分析结果，结构如下：
{
  "summary": "总体健康状态概述（50字以内）",
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
  "alerts": ["需要关注的问题列表"],
  "suggestions": ["健康建议列表"],
  "followUp": "后续跟进建议"
}

## 注意事项
- 风险等级：low(正常)、medium(需关注)、high(需紧急处理)
- 语言简洁明了，适合监护人阅读
- 对于异常数据，给出可能的原因和建议
- 如有紧急情况，在alerts中标注"紧急"
- 必须分析所有提供的健康指标，不能遗漏
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

  // 并行获取用户信息和健康数据
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
 * 分析老人健康状况（AI分析）- URL参数版本
 * POST /api/v1/ai/analyze/:userId
 * Body: { analysisType: string, bluetoothData?: object }
 */
router.post('/analyze/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { analysisType, analysis_type, bluetoothData, bluetooth_data } = req.body;
    
    // 兼容驼峰和下划线命名
    const analysisTypeValue = analysisType || analysis_type || 'health';
    const bluetoothDataValue = bluetoothData || bluetooth_data;

    if (!userId) {
      return res.status(400).json({ success: false, error: '用户ID不能为空' });
    }

    // 获取完整的健康数据
    const { userData, latestTrend, recentTrends } = await getFullHealthData(parseInt(userId));

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);

    // 初始化LLM客户端
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    console.log(`[AI分析] 开始分析 - 用户: ${userId}, 类型: ${analysisTypeValue}`);

    // 构建分析请求
    const analysisPrompt = buildAnalysisPrompt(analysisTypeValue, userData, bluetoothDataValue, latestTrend, recentTrends);

    // 调用LLM进行分析
    const response = await llmClient.invoke([
      { role: 'system', content: HEALTH_ANALYSIS_PROMPT },
      { role: 'user', content: analysisPrompt },
    ], {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.3,
      thinking: 'enabled',
    });

    // 解析LLM返回的JSON
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

    // 存储分析结果
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
 * 分析老人健康状况（AI分析）- Body参数版本
 * POST /api/v1/ai/analyze
 * Body: { user_id: number, bluetooth_data?: object, analysis_type: string }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { user_id, bluetooth_data, analysis_type } = req.body;

    if (!user_id || !analysis_type) {
      return res.status(400).json({ error: '用户ID和分析类型不能为空' });
    }

    // 获取完整的健康数据
    const { userData, latestTrend, recentTrends } = await getFullHealthData(parseInt(user_id));

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);

    // 初始化LLM客户端
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    console.log(`[AI分析] 开始分析 - 用户: ${user_id}, 类型: ${analysis_type}`);

    // 构建分析请求
    const analysisPrompt = buildAnalysisPrompt(analysis_type, userData, bluetooth_data, latestTrend, recentTrends);

    // 调用LLM进行分析
    const response = await llmClient.invoke([
      { role: 'system', content: HEALTH_ANALYSIS_PROMPT },
      { role: 'user', content: analysisPrompt },
    ], {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.3, // 使用较低温度保证分析的稳定性
      thinking: 'enabled', // 启用深度思考模式
    });

    // 解析LLM返回的JSON
    let analysisResult;
    try {
      // 尝试提取JSON内容
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析分析结果');
      }
    } catch (parseError) {
      // 如果解析失败，使用默认结构
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

    // 存储分析结果
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
 * 构建分析提示词
 */
function buildAnalysisPrompt(
  analysisType: string, 
  userData: any, 
  bluetoothData: any[],
  latestTrend: any,
  recentTrends: any[]
): string {
  // 用户基本信息
  const userInfo = userData 
    ? `姓名: ${userData.name || '未知'}`
    : '用户信息未知';

  // 健康状况标签
  const healthConditions = userData?.health_conditions?.length > 0
    ? `\n健康状况: ${userData.health_conditions.join('、')}`
    : '';

  // 生活环境标签
  const livingConditions = userData?.living_conditions?.length > 0
    ? `\n生活环境: ${userData.living_conditions.join('、')}`
    : '';

  // 地址信息
  const addressInfo = userData?.home_address
    ? `\n居住地址: ${userData.home_address}`
    : '';

  // 用户完整信息
  const userFullInfo = `${userInfo}${healthConditions}${livingConditions}${addressInfo}`;

  // 构建今日健康数据
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
- 消耗热量: ${latestTrend.calories || '--'} 千卡
- 更新时间: ${latestTrend.time_point || '未知'}`;
  }

  // 构建近7天趋势数据
  let trendInfo = '';
  if (recentTrends && recentTrends.length > 0) {
    const dates = recentTrends.map((t: any) => t.date).reverse();
    const heartRates = recentTrends.map((t: any) => t.heart_rate || '--').reverse();
    const systolic = recentTrends.map((t: any) => t.systolic || '--').reverse();
    const diastolic = recentTrends.map((t: any) => t.diastolic || '--').reverse();
    const bloodOxygen = recentTrends.map((t: any) => t.blood_oxygen || '--').reverse();
    const steps = recentTrends.map((t: any) => t.steps || '--').reverse();
    const sleepHours = recentTrends.map((t: any) => t.sleep_hours || '--').reverse();
    const temperature = recentTrends.map((t: any) => t.temperature || '--').reverse();
    const bloodSugar = recentTrends.map((t: any) => t.blood_sugar || '--').reverse();
    const bodyFat = recentTrends.map((t: any) => t.body_fat || '--').reverse();

    trendInfo = `\n【近${recentTrends.length}天健康趋势】
日期: ${dates.join(' → ')}
心率(bpm): ${heartRates.join(' → ')}
收缩压(mmHg): ${systolic.join(' → ')}
舒张压(mmHg): ${diastolic.join(' → ')}
血氧(%): ${bloodOxygen.join(' → ')}
步数: ${steps.join(' → ')}
睡眠(小时): ${sleepHours.join(' → ')}
体温(°C): ${temperature.join(' → ')}
血糖(mmol/L): ${bloodSugar.join(' → ')}
体脂率(%): ${bodyFat.join(' → ')}`;
  }

  // 蓝牙实时数据
  const dataInfo = bluetoothData?.length > 0
    ? `最近实时数据:\n${bluetoothData.map((d: any, i: number) => 
        `${i + 1}. 时间: ${d.timestamp}, 数据: ${JSON.stringify(d.data || d)}`
      ).join('\n')}`
    : '暂无实时健康数据';

  switch (analysisType) {
    case 'health':
      return `请分析以下老人的健康状况：

【用户信息】
${userFullInfo}
${todayHealthData}
${trendInfo}

【实时数据】
${dataInfo}

请根据以上全部健康数据（心率、血压、血氧、步数、睡眠、体温、血糖、体脂），生成完整的健康分析报告。`;

    case 'behavior':
      return `请分析以下老人的行为模式：

【用户信息】
${userFullInfo}
${todayHealthData}
${trendInfo}

【活动数据】
${dataInfo}

请分析老人的日常活动模式、作息规律，并给出行为分析报告。`;

    case 'emergency':
      return `【紧急情况分析】

【用户信息】
${userFullInfo}
${todayHealthData}
${trendInfo}

【最新数据】
${dataInfo}

请立即分析是否存在紧急情况，如有异常请标注为高风险。`;

    default:
      return `请分析以下数据：

【用户信息】
${userFullInfo}
${todayHealthData}
${trendInfo}

【数据】
${dataInfo}`;
  }
}

/**
 * 获取用户的 AI 分析历史
 * GET /api/v1/ai/history/:userId?analysis_type=xxx&limit=10
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

    // 解析存储的JSON结果
    const parsedData = (data || []).map(item => ({
      ...item,
      parsed_result: item.result ? JSON.parse(item.result) : null,
    }));

    res.json({ data: parsedData });
  } catch (error) {
    console.error('Get AI history error:', error);
    res.status(500).json({ error: '获取 AI 分析历史失败' });
  }
});

/**
 * 获取最新的 AI 分析结果
 * GET /api/v1/ai/latest/:userId?analysis_type=xxx
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
    
    // 解析存储的JSON结果
    if (latestData && latestData.result) {
      latestData.parsed_result = JSON.parse(latestData.result);
    }

    res.json({ data: latestData });
  } catch (error) {
    console.error('Get latest AI analysis error:', error);
    res.status(500).json({ error: '获取最新 AI 分析失败' });
  }
});

// 每日报告系统提示词
const DAILY_REPORT_PROMPT = `你是一位专业的老年健康管理AI助手。请根据提供的健康数据，撰写一份温暖、专业的每日健康报告。

## 报告要求
1. 语言风格：温暖、亲切，像家人一样关心老人健康
2. 内容结构：
   - 今日健康概述（整体评价）
   - 各项指标分析（心率、血压、血氧、步数、睡眠等）
   - 健康亮点（做得好的地方）
   - 需要关注（需要改进的地方）
   - 今日建议（具体的健康建议）
3. 字数要求：约400字左右
4. 注意事项：
   - 使用简单易懂的语言
   - 多用鼓励性的话语
   - 对异常数据给出温馨提示
   - 避免过于专业的术语

## 输出格式
请直接输出报告正文，不需要JSON格式，只需要纯文本即可。`;

/**
 * 生成每日健康报告
 * POST /api/v1/ai/daily-report/:userId
 */
router.post('/daily-report/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, error: '用户ID不能为空' });
    }

    // 获取完整的健康数据
    const { userData, latestTrend, recentTrends } = await getFullHealthData(parseInt(userId));

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);

    // 初始化LLM客户端
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    console.log(`[每日报告] 开始生成 - 用户: ${userId}`);

    // 构建用户信息
    const userName = userData?.name || '老人';
    const healthConditions = userData?.health_conditions?.length > 0
      ? `健康状况: ${userData.health_conditions.join('、')}`
      : '';

    // 构建今日健康数据
    let healthDataInfo = '';
    if (latestTrend) {
      healthDataInfo = `
今日健康数据：
- 心率: ${latestTrend.heart_rate || '--'} bpm
- 血压: ${latestTrend.systolic || '--'}/${latestTrend.diastolic || '--'} mmHg
- 血氧: ${latestTrend.blood_oxygen || '--'}%
- 步数: ${latestTrend.steps || '--'} 步
- 睡眠: ${latestTrend.sleep_hours || '--'} 小时
- 体温: ${latestTrend.temperature || '--'}°C
- 血糖: ${latestTrend.blood_sugar || '--'} mmol/L
- 消耗热量: ${latestTrend.calories || '--'} 千卡`;
    }

    // 构建趋势数据
    let trendInfo = '';
    if (recentTrends && recentTrends.length > 1) {
      const avgHeartRate = recentTrends.reduce((sum: number, t: any) => sum + (t.heart_rate || 0), 0) / recentTrends.length;
      const avgSteps = recentTrends.reduce((sum: number, t: any) => sum + (t.steps || 0), 0) / recentTrends.length;
      trendInfo = `
近${recentTrends.length}天平均数据：
- 平均心率: ${Math.round(avgHeartRate)} bpm
- 平均步数: ${Math.round(avgSteps)} 步`;
    }

    const userPrompt = `请为以下老人生成今日健康报告：

姓名: ${userName}
${healthConditions}
${healthDataInfo}
${trendInfo}

今天是${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}。`;

    // 调用LLM生成报告
    const response = await llmClient.invoke([
      { role: 'system', content: DAILY_REPORT_PROMPT },
      { role: 'user', content: userPrompt },
    ], {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.7,
    });

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
const CHAT_PROMPT = `你是一位专业的老年健康管理AI助手。你可以回答关于老人健康的问题，提供健康建议和关怀。

## 你的特点
1. 语言温暖亲切，像家人一样关心
2. 回答简洁明了，避免过于复杂
3. 对于健康问题给出专业但易懂的建议
4. 遇到紧急情况会提醒就医
5. 了解老人的健康数据，可以提供个性化建议

## 你可以回答的问题
- 健康数据解读
- 健康建议和指导
- 日常护理知识
- 用药提醒
- 饮食建议
- 运动建议
- 心理关怀

## 注意事项
- 不要给出明确的医疗诊断
- 对于严重症状建议就医
- 保持积极正面的态度
- 用简单的语言解释专业概念`;

/**
 * AI健康对话
 * POST /api/v1/ai/chat
 * Body: { user_id: number, message: string, history?: Array<{role: string, content: string}> }
 */
router.post('/chat', async (req, res) => {
  try {
    const { user_id, message, history = [] } = req.body;

    if (!user_id || !message) {
      return res.status(400).json({ success: false, error: '用户ID和消息内容不能为空' });
    }

    // 获取用户健康数据作为上下文
    const { userData, latestTrend } = await getFullHealthData(parseInt(user_id));

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);

    // 初始化LLM客户端
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    console.log(`[AI对话] 用户 ${user_id} 发送消息: ${message.substring(0, 50)}...`);

    // 构建上下文
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
- 步数: ${latestTrend.steps || '--'} 步
- 睡眠: ${latestTrend.sleep_hours || '--'} 小时`;
    }

    const contextPrompt = `当前对话的老人信息：
姓名: ${userName}
${healthConditions}
${healthContext}

请根据以上信息回答用户的问题。`;

    // 构建消息列表
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: CHAT_PROMPT },
      { role: 'system', content: contextPrompt },
    ];

    // 添加历史消息
    for (const msg of history) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // 添加当前消息
    messages.push({ role: 'user', content: message });

    // 调用LLM
    const response = await llmClient.invoke(messages, {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.7,
    });

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
