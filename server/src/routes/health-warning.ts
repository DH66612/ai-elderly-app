/**
 * 健康预警与健康建议API路由
 * 
 * 功能：
 * 1. 异常趋势预警 - 基于规则引擎检测连续多日的健康异常
 * 2. 健康建议库 - 根据健康数据给出个性化建议
 */
import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = express.Router();

// ================== 预警规则配置 ==================

interface WarningRule {
  id: string;
  name: string;
  description: string;
  metric: 'heartRate' | 'steps' | 'bloodPressure' | 'bloodOxygen' | 'sleep';
  condition: 'increase' | 'decrease' | 'above' | 'below';
  threshold: number;
  days: number; // 连续天数
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

// 预警规则库
const WARNING_RULES: WarningRule[] = [
  // 心率相关规则
  {
    id: 'heart_rate_high_trend',
    name: '心率持续偏高',
    description: '连续7天平均心率较前一周升高超过10%',
    metric: 'heartRate',
    condition: 'increase',
    threshold: 10, // 百分比
    days: 7,
    severity: 'medium',
    suggestion: '建议监测血压，减少咖啡因摄入，保持充足休息。如持续偏高，请咨询医生。',
  },
  {
    id: 'heart_rate_high_absolute',
    name: '心率异常偏高',
    description: '心率持续超过100次/分钟',
    metric: 'heartRate',
    condition: 'above',
    threshold: 100,
    days: 3,
    severity: 'high',
    suggestion: '心率持续偏高可能提示心脏问题或甲状腺功能异常，建议尽快就医检查。',
  },
  {
    id: 'heart_rate_low',
    name: '心率异常偏低',
    description: '心率持续低于50次/分钟',
    metric: 'heartRate',
    condition: 'below',
    threshold: 50,
    days: 3,
    severity: 'medium',
    suggestion: '心率偏低可能影响供血，如感到头晕或乏力，请咨询医生。',
  },
  
  // 步数相关规则
  {
    id: 'steps_drop_sharp',
    name: '步数骤降',
    description: '连续3天步数较前一周平均下降超过50%',
    metric: 'steps',
    condition: 'decrease',
    threshold: 50, // 百分比
    days: 3,
    severity: 'medium',
    suggestion: '活动量骤减可能与身体不适有关，建议了解老人身体状况，必要时安排体检。',
  },
  {
    id: 'steps_low_activity',
    name: '活动量过低',
    description: '连续7天步数低于2000步',
    metric: 'steps',
    condition: 'below',
    threshold: 2000,
    days: 7,
    severity: 'low',
    suggestion: '长期活动量过低不利于心血管健康，建议适当增加散步等轻度运动。',
  },
  
  // 血压相关规则
  {
    id: 'blood_pressure_high',
    name: '血压持续偏高',
    description: '收缩压持续超过140mmHg',
    metric: 'bloodPressure',
    condition: 'above',
    threshold: 140,
    days: 3,
    severity: 'high',
    suggestion: '血压偏高是心血管疾病风险因素，建议低盐饮食，遵医嘱服药，定期监测。',
  },
  
  // 血氧相关规则
  {
    id: 'blood_oxygen_low',
    name: '血氧偏低',
    description: '血氧饱和度持续低于95%',
    metric: 'bloodOxygen',
    condition: 'below',
    threshold: 95,
    days: 3,
    severity: 'high',
    suggestion: '血氧偏低可能提示呼吸系统问题，建议就医检查肺部功能。',
  },
];

// ================== 健康建议库 ==================

interface HealthAdvice {
  category: string;
  condition: string;
  advice: string;
  priority: 'high' | 'medium' | 'low';
  tags: string[]; // 适用标签
}

// 健康建议库
const HEALTH_ADVICE_LIBRARY: HealthAdvice[] = [
  // 心血管相关
  {
    category: '心血管健康',
    condition: '心率偏高',
    advice: '建议减少咖啡、浓茶摄入，保持规律作息，避免剧烈运动。如持续偏高，建议进行心电图检查。',
    priority: 'medium',
    tags: ['高血压', '心脏病'],
  },
  {
    category: '心血管健康',
    condition: '血压偏高',
    advice: '建议低盐饮食（每日盐摄入<5g），控制体重，戒烟限酒。定期测量血压，遵医嘱服药。',
    priority: 'high',
    tags: ['高血压', '心脏病'],
  },
  {
    category: '心血管健康',
    condition: '血压偏低',
    advice: '建议适量增加饮水，避免突然起身。如感到头晕，可适当补充淡盐水。',
    priority: 'medium',
    tags: ['低血压'],
  },
  
  // 运动相关
  {
    category: '运动建议',
    condition: '步数偏低',
    advice: '建议每天进行30分钟轻度运动，如散步、太极拳。可以分多次完成，每次10-15分钟。',
    priority: 'low',
    tags: [],
  },
  {
    category: '运动建议',
    condition: '步数骤降',
    advice: '活动量突然减少可能提示身体不适，建议询问老人是否有疼痛或疲劳感，必要时安排体检。',
    priority: 'medium',
    tags: [],
  },
  {
    category: '运动建议',
    condition: '卡路里消耗低',
    advice: '建议增加日常活动量，如做家务、散步。适当运动有助于控制血糖和心血管健康。',
    priority: 'low',
    tags: ['糖尿病'],
  },
  
  // 睡眠相关
  {
    category: '睡眠改善',
    condition: '睡眠不足',
    advice: '建议提前入睡时间，睡前避免看手机或电视。可以尝试睡前泡脚、听轻音乐放松。',
    priority: 'high',
    tags: ['失眠', '高血压'],
  },
  {
    category: '睡眠改善',
    condition: '睡眠质量差',
    advice: '建议保持规律作息，睡前2小时避免进食。卧室保持安静、黑暗、适宜温度。',
    priority: 'medium',
    tags: ['失眠'],
  },
  
  // 季节性建议
  {
    category: '季节提醒',
    condition: '冬季',
    advice: '冬季注意保暖，外出时戴好帽子、围巾。室内注意通风，预防感冒。适当增加蛋白质摄入。',
    priority: 'low',
    tags: [],
  },
  {
    category: '季节提醒',
    condition: '夏季',
    advice: '夏季注意防暑降温，避免在高温时段外出。多喝水，预防中暑。',
    priority: 'low',
    tags: [],
  },
  
  // 慢性病相关
  {
    category: '慢性病管理',
    condition: '糖尿病日常',
    advice: '建议控制碳水化合物摄入，定期监测血糖。餐后适当散步有助于控制血糖。',
    priority: 'high',
    tags: ['糖尿病'],
  },
  {
    category: '慢性病管理',
    condition: '关节炎护理',
    advice: '建议注意关节保暖，避免长时间保持同一姿势。适度活动关节，可进行温水浴缓解。',
    priority: 'medium',
    tags: ['关节炎'],
  },
  {
    category: '慢性病管理',
    condition: '高血压管理',
    advice: '建议每日定时服药，不可擅自停药。定期监测血压，保持心情平和，避免情绪波动。',
    priority: 'high',
    tags: ['高血压'],
  },
  
  // 生活方式
  {
    category: '生活方式',
    condition: '久坐提醒',
    advice: '建议每隔1小时起身活动5-10分钟，做做伸展运动，预防腰背疼痛。',
    priority: 'low',
    tags: [],
  },
  {
    category: '生活方式',
    condition: '用药提醒',
    advice: '建议使用药盒分装每日药品，设置闹钟提醒。定期检查药品有效期。',
    priority: 'high',
    tags: [],
  },
];

/**
 * 获取用户异常趋势预警
 * GET /api/v1/health-warning/trend/:userId
 */
router.get('/trend/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const supabase = getSupabaseClient();

    // 获取用户信息（包含健康标签）
    const { data: userData } = await supabase
      .from('users')
      .select('id, name, health_conditions')
      .eq('id', parseInt(userId))
      .single();

    // 获取最近14天的健康趋势数据
    const { data: trendData } = await supabase
      .from('health_trend')
      .select('*')
      .eq('user_id', parseInt(userId))
      .order('date', { ascending: false })
      .limit(14);

    if (!trendData || trendData.length === 0) {
      return res.json({
        success: true,
        warnings: [],
        message: '暂无足够的健康数据进行分析',
      });
    }

    // 执行预警规则检测
    const warnings: any[] = [];

    for (const rule of WARNING_RULES) {
      const warning = await checkWarningRule(rule, trendData, userData);
      if (warning) {
        warnings.push(warning);
      }
    }

    // 按严重程度排序
    warnings.sort((a, b) => {
      const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    console.log(`[健康预警] 用户 ${userId} 检测到 ${warnings.length} 条预警`);

    res.json({
      success: true,
      warnings,
      summary: {
        total: warnings.length,
        high: warnings.filter(w => w.severity === 'high').length,
        medium: warnings.filter(w => w.severity === 'medium').length,
        low: warnings.filter(w => w.severity === 'low').length,
      },
    });
  } catch (error: any) {
    console.error('获取趋势预警失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 检测预警规则是否触发
 */
async function checkWarningRule(rule: WarningRule, trendData: any[], userData: any): Promise<any | null> {
  const recentDays = trendData.slice(0, rule.days);
  
  if (recentDays.length < rule.days) {
    return null; // 数据不足
  }

  let triggered = false;
  let detail = '';

  switch (rule.condition) {
    case 'increase': {
      // 比较最近N天与前N天的平均值变化
      const recentAvg = calculateAverage(recentDays, rule.metric);
      const previousDays = trendData.slice(rule.days, rule.days * 2);
      if (previousDays.length >= rule.days) {
        const previousAvg = calculateAverage(previousDays, rule.metric);
        const changePercent = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
        if (changePercent > rule.threshold) {
          triggered = true;
          detail = `最近${rule.days}天平均${getMetricName(rule.metric)}为${recentAvg.toFixed(1)}，较前一周上升${changePercent.toFixed(1)}%`;
        }
      }
      break;
    }
    case 'decrease': {
      const recentAvg = calculateAverage(recentDays, rule.metric);
      const previousDays = trendData.slice(rule.days, rule.days * 2);
      if (previousDays.length >= rule.days) {
        const previousAvg = calculateAverage(previousDays, rule.metric);
        const changePercent = previousAvg > 0 ? ((previousAvg - recentAvg) / previousAvg) * 100 : 0;
        if (changePercent > rule.threshold) {
          triggered = true;
          detail = `最近${rule.days}天平均${getMetricName(rule.metric)}为${recentAvg.toFixed(1)}，较前一周下降${changePercent.toFixed(1)}%`;
        }
      }
      break;
    }
    case 'above': {
      const values = extractValues(recentDays, rule.metric);
      const allAbove = values.every(v => v > rule.threshold);
      if (allAbove && values.length > 0) {
        triggered = true;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        detail = `连续${rule.days}天${getMetricName(rule.metric)}均值为${avg.toFixed(1)}，超过${rule.threshold}${getMetricUnit(rule.metric)}`;
      }
      break;
    }
    case 'below': {
      const values = extractValues(recentDays, rule.metric);
      const allBelow = values.every(v => v < rule.threshold && v > 0);
      if (allBelow && values.length > 0) {
        triggered = true;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        detail = `连续${rule.days}天${getMetricName(rule.metric)}均值为${avg.toFixed(1)}，低于${rule.threshold}${getMetricUnit(rule.metric)}`;
      }
      break;
    }
  }

  if (triggered) {
    return {
      ruleId: rule.id,
      name: rule.name,
      severity: rule.severity,
      description: rule.description,
      detail,
      suggestion: rule.suggestion,
      metric: rule.metric,
      triggeredAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * 计算平均值
 */
function calculateAverage(data: any[], metric: string): number {
  const values = extractValues(data, metric);
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * 从趋势数据中提取指定指标的值
 */
function extractValues(data: any[], metric: string): number[] {
  const values: number[] = [];
  
  for (const item of data) {
    const itemData = item.data || {};
    const metricData = itemData[metric] || [];
    
    // 取当天的最后一个值（或平均值）
    if (Array.isArray(metricData) && metricData.length > 0) {
      const validValues = metricData.filter((v: any) => typeof v === 'number' && v > 0);
      if (validValues.length > 0) {
        const avg = validValues.reduce((a: number, b: number) => a + b, 0) / validValues.length;
        values.push(avg);
      }
    }
  }
  
  return values;
}

/**
 * 获取指标名称
 */
function getMetricName(metric: string): string {
  const names: Record<string, string> = {
    heartRate: '心率',
    steps: '步数',
    bloodPressure: '血压',
    bloodOxygen: '血氧',
    sleep: '睡眠时长',
  };
  return names[metric] || metric;
}

/**
 * 获取指标单位
 */
function getMetricUnit(metric: string): string {
  const units: Record<string, string> = {
    heartRate: 'bpm',
    steps: '步',
    bloodPressure: 'mmHg',
    bloodOxygen: '%',
    sleep: '小时',
  };
  return units[metric] || '';
}

/**
 * 获取个性化健康建议
 * GET /api/v1/health-warning/advice/:userId
 */
router.get('/advice/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const supabase = getSupabaseClient();

    // 获取用户信息
    const { data: userData } = await supabase
      .from('users')
      .select('id, name, health_conditions, living_conditions')
      .eq('id', parseInt(userId))
      .single();

    if (!userData) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    // 获取最新健康数据
    const { data: latestData } = await supabase
      .from('health_trend')
      .select('*')
      .eq('user_id', parseInt(userId))
      .order('date', { ascending: false })
      .limit(1);

    // 获取当前季节
    const currentMonth = new Date().getMonth();
    const season = currentMonth >= 2 && currentMonth <= 4 ? 'spring' :
                   currentMonth >= 5 && currentMonth <= 7 ? 'summer' :
                   currentMonth >= 8 && currentMonth <= 10 ? 'autumn' : 'winter';

    // 匹配健康建议
    const advice: any[] = [];
    const healthConditions = userData.health_conditions || [];

    // 1. 根据健康标签匹配建议
    for (const adviceItem of HEALTH_ADVICE_LIBRARY) {
      // 检查标签匹配
      const hasMatchingTag = adviceItem.tags.some(tag => healthConditions.includes(tag));
      
      if (hasMatchingTag) {
        advice.push({
          category: adviceItem.category,
          condition: adviceItem.condition,
          advice: adviceItem.advice,
          priority: adviceItem.priority,
          source: '健康标签',
        });
      }
    }

    // 2. 根据健康数据匹配建议
    if (latestData && latestData.length > 0) {
      const trendData = latestData[0].data || {};
      
      // 心率建议
      const heartRate = trendData.heartRate || [];
      const avgHeartRate = heartRate.filter((v: number) => v > 0).reduce((a: number, b: number) => a + b, 0) / heartRate.filter((v: number) => v > 0).length || 0;
      
      if (avgHeartRate > 100) {
        advice.push({
          category: '心血管健康',
          condition: '心率偏高',
          advice: '近期心率偏快，建议减少咖啡、浓茶摄入，保持情绪平稳。如持续偏高，建议就医检查。',
          priority: 'medium',
          source: '数据分析',
        });
      } else if (avgHeartRate < 50 && avgHeartRate > 0) {
        advice.push({
          category: '心血管健康',
          condition: '心率偏低',
          advice: '近期心率偏慢，如感到头晕或乏力，建议咨询医生。注意避免突然起身。',
          priority: 'medium',
          source: '数据分析',
        });
      }

      // 步数建议
      const steps = trendData.steps || [];
      const totalSteps = steps[steps.length - 1] || 0;
      
      if (totalSteps < 2000) {
        advice.push({
          category: '运动建议',
          condition: '活动量偏低',
          advice: '今日活动量较少，建议适当增加散步或做家务等轻度运动，有助于身心健康。',
          priority: 'low',
          source: '数据分析',
        });
      }
    }

    // 3. 添加季节性建议
    const seasonAdvice = HEALTH_ADVICE_LIBRARY.find(
      item => item.category === '季节提醒' && item.condition === (season === 'winter' ? '冬季' : '夏季')
    );
    if (seasonAdvice) {
      advice.push({
        category: seasonAdvice.category,
        condition: seasonAdvice.condition,
        advice: seasonAdvice.advice,
        priority: seasonAdvice.priority,
        source: '季节提醒',
      });
    }

    // 4. 添加通用建议（用药提醒）
    const medicationAdvice = HEALTH_ADVICE_LIBRARY.find(item => item.condition === '用药提醒');
    if (medicationAdvice) {
      advice.push({
        category: medicationAdvice.category,
        condition: medicationAdvice.condition,
        advice: medicationAdvice.advice,
        priority: medicationAdvice.priority,
        source: '日常提醒',
      });
    }

    // 按优先级排序并去重
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    advice.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // 去重（基于condition）
    const uniqueAdvice = advice.filter((item, index, self) =>
      index === self.findIndex(t => t.condition === item.condition)
    );

    console.log(`[健康建议] 用户 ${userId} 生成 ${uniqueAdvice.length} 条建议`);

    res.json({
      success: true,
      advice: uniqueAdvice.slice(0, 6), // 最多返回6条建议
      healthConditions,
      season: season === 'spring' ? '春季' : season === 'summer' ? '夏季' : season === 'autumn' ? '秋季' : '冬季',
    });
  } catch (error: any) {
    console.error('获取健康建议失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 创建预警记录并推送通知
 * POST /api/v1/health-warning/create
 * Body: { user_id, warning_data }
 */
router.post('/create', async (req, res) => {
  try {
    const { user_id, warning_data } = req.body;

    if (!user_id || !warning_data) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }

    const supabase = getSupabaseClient();

    // 存储预警记录
    const { data, error } = await supabase
      .from('health_warnings')
      .insert({
        user_id: parseInt(user_id),
        warning_type: warning_data.ruleId || 'custom',
        severity: warning_data.severity || 'medium',
        title: warning_data.name || '健康预警',
        detail: warning_data.detail || '',
        suggestion: warning_data.suggestion || '',
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // 获取绑定关系
    const { data: binding } = await supabase
      .from('bindings')
      .select('guardian_id')
      .eq('elderly_id', parseInt(user_id))
      .single();

    // 推送通知给监护人
    if (binding) {
      // 这里可以集成SSE推送或通知系统
      console.log(`[健康预警] 推送预警给监护人 ${binding.guardian_id}`);
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('创建预警失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取预警历史
 * GET /api/v1/health-warning/history/:userId
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;

    const supabase = getSupabaseClient();

    let query = supabase
      .from('health_warnings')
      .select('*')
      .eq('user_id', parseInt(userId))
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(parseInt(limit as string));
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('获取预警历史失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 标记预警已读
 * PUT /api/v1/health-warning/read/:warningId
 */
router.put('/read/:warningId', async (req, res) => {
  try {
    const { warningId } = req.params;

    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('health_warnings')
      .update({ is_read: true })
      .eq('id', parseInt(warningId));

    if (error) {
      throw error;
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('标记已读失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
