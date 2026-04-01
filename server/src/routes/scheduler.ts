/**
 * 消息推送定时任务
 * 
 * 功能：
 * 1. 天气预警推送（每日早晨）
 * 2. 节日提醒推送
 * 3. 健康预警推送（检查趋势预警）
 * 4. 设备告警推送（低电量、离线等）
 * 5. 二十四节气推送
 * 6. 早安/晚安问候推送
 */
import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { sseManager } from './realtime';
import { sendPushToUser } from './push-notifications';

const router = express.Router();

// ================== 通知设置检查工具 ==================

/**
 * 检查用户是否允许某类通知
 * @param userId 用户ID
 * @param notificationType 通知类型: 'health' | 'emergency' | 'system' | 'daily_report' | 'medication' | 'weather'
 * @returns 是否允许推送
 */
async function checkNotificationEnabled(userId: number, notificationType: string): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    
    const { data: settings, error } = await client
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !settings) {
      // 没有设置记录，使用默认值
      // 默认：健康提醒、紧急通知、用药提醒、天气提醒、每日报告都开启
      // 系统通知默认关闭
      if (notificationType === 'system') return false;
      return true;
    }
    
    // 根据通知类型检查对应设置
    switch (notificationType) {
      case 'health':
        return settings.health_reminder ?? true;
      case 'emergency':
        return settings.emergency_alert ?? true;
      case 'system':
        return settings.system_notice ?? false;
      case 'daily_report':
        return settings.daily_report ?? true;
      case 'medication':
        return settings.medication_reminder ?? true;
      case 'weather':
        return settings.weather_notice ?? true;
      default:
        return true;
    }
  } catch (error) {
    console.error('[通知设置] 检查失败:', error);
    return true; // 出错时默认允许推送
  }
}

// ================== 二十四节气配置 ==================

// 二十四节气数据（预置2024-2030年）
// 格式：{ name: 节气名, date: 'YYYY-MM-DD', meaning: 节气含义, tips: 养生提示 }
const SOLAR_TERMS: { name: string; date: string; meaning: string; tips: string }[] = [
  // 2024年
  { name: '立春', date: '2024-02-04', meaning: '春季开始，万物复苏', tips: '宜早睡早起，多吃辛甘发散之品，如韭菜、香菜、洋葱等。' },
  { name: '雨水', date: '2024-02-19', meaning: '降雨开始，雨量渐增', tips: '注意调养脾胃，饮食宜清淡，忌生冷油腻。' },
  { name: '惊蛰', date: '2024-03-05', meaning: '春雷乍动，惊醒蛰伏动物', tips: '宜养肝护脾，多吃梨、百合、银耳等润肺食物。' },
  { name: '春分', date: '2024-03-20', meaning: '昼夜平分', tips: '阴阳平衡，宜调畅情志，适当运动，饮食均衡。' },
  { name: '清明', date: '2024-04-04', meaning: '天气晴朗，草木繁茂', tips: '宜外出踏青，注意防风保暖，预防感冒。' },
  { name: '谷雨', date: '2024-04-19', meaning: '雨生百谷', tips: '宜健脾祛湿，多食山药、薏米、红豆等。' },
  { name: '立夏', date: '2024-05-05', meaning: '夏季开始', tips: '宜养心安神，多吃苦味食物如苦瓜、莲子心。' },
  { name: '小满', date: '2024-05-20', meaning: '麦类等夏熟作物籽粒开始饱满', tips: '注意清热利湿，饮食清淡，避免油腻辛辣。' },
  { name: '芒种', date: '2024-06-05', meaning: '麦类等有芒作物成熟', tips: '宜清热解暑，多喝水，注意防暑降温。' },
  { name: '夏至', date: '2024-06-21', meaning: '炎热将至，白天最长', tips: '宜养心清热，多食苦瓜、西瓜等清热食物。' },
  { name: '小暑', date: '2024-07-06', meaning: '气候开始炎热', tips: '注意防暑降温，多喝水，避免剧烈运动。' },
  { name: '大暑', date: '2024-07-22', meaning: '一年中最热时期', tips: '宜清热补气，多食绿豆、冬瓜、荷叶等。' },
  { name: '立秋', date: '2024-08-07', meaning: '秋季开始', tips: '宜养肺润燥，多吃梨、银耳、百合等。' },
  { name: '处暑', date: '2024-08-22', meaning: '暑天结束', tips: '注意滋阴润肺，饮食宜清淡滋润。' },
  { name: '白露', date: '2024-09-07', meaning: '天气转凉，露水凝白', tips: '宜养阴润燥，多吃白色食物如梨、百合、莲藕。' },
  { name: '秋分', date: '2024-09-22', meaning: '昼夜平分', tips: '阴阳平衡，宜早睡早起，适当进补。' },
  { name: '寒露', date: '2024-10-08', meaning: '露水寒冷，将要结霜', tips: '注意保暖，宜养阴防燥，多食芝麻、蜂蜜。' },
  { name: '霜降', date: '2024-10-23', meaning: '天气渐冷，开始降霜', tips: '宜温补养胃，多吃羊肉、牛肉、栗子等。' },
  { name: '立冬', date: '2024-11-07', meaning: '冬季开始', tips: '宜温补养肾，多吃黑色食物如黑豆、黑芝麻、黑米。' },
  { name: '小雪', date: '2024-11-22', meaning: '开始降雪', tips: '注意保暖，宜温补，多食羊肉、核桃、桂圆。' },
  { name: '大雪', date: '2024-12-06', meaning: '降雪量增多', tips: '宜温补养肾，适当运动，注意保暖。' },
  { name: '冬至', date: '2024-12-21', meaning: '寒冬来临，白天最短', tips: '宜进补养阳，吃饺子/汤圆，早睡晚起。' },
  { name: '小寒', date: '2025-01-05', meaning: '气候开始寒冷', tips: '宜温补养肾，多吃羊肉、牛肉、红枣。' },
  { name: '大寒', date: '2025-01-20', meaning: '一年中最冷时期', tips: '宜温补，注意保暖，预防感冒和心脑血管疾病。' },
  
  // 2025年
  { name: '立春', date: '2025-02-03', meaning: '春季开始，万物复苏', tips: '宜早睡早起，多吃辛甘发散之品，如韭菜、香菜、洋葱等。' },
  { name: '雨水', date: '2025-02-18', meaning: '降雨开始，雨量渐增', tips: '注意调养脾胃，饮食宜清淡，忌生冷油腻。' },
  { name: '惊蛰', date: '2025-03-05', meaning: '春雷乍动，惊醒蛰伏动物', tips: '宜养肝护脾，多吃梨、百合、银耳等润肺食物。' },
  { name: '春分', date: '2025-03-20', meaning: '昼夜平分', tips: '阴阳平衡，宜调畅情志，适当运动，饮食均衡。' },
  { name: '清明', date: '2025-04-04', meaning: '天气晴朗，草木繁茂', tips: '宜外出踏青，注意防风保暖，预防感冒。' },
  { name: '谷雨', date: '2025-04-20', meaning: '雨生百谷', tips: '宜健脾祛湿，多食山药、薏米、红豆等。' },
  { name: '立夏', date: '2025-05-05', meaning: '夏季开始', tips: '宜养心安神，多吃苦味食物如苦瓜、莲子心。' },
  { name: '小满', date: '2025-05-21', meaning: '麦类等夏熟作物籽粒开始饱满', tips: '注意清热利湿，饮食清淡，避免油腻辛辣。' },
  { name: '芒种', date: '2025-06-05', meaning: '麦类等有芒作物成熟', tips: '宜清热解暑，多喝水，注意防暑降温。' },
  { name: '夏至', date: '2025-06-21', meaning: '炎热将至，白天最长', tips: '宜养心清热，多食苦瓜、西瓜等清热食物。' },
  { name: '小暑', date: '2025-07-07', meaning: '气候开始炎热', tips: '注意防暑降温，多喝水，避免剧烈运动。' },
  { name: '大暑', date: '2025-07-22', meaning: '一年中最热时期', tips: '宜清热补气，多食绿豆、冬瓜、荷叶等。' },
  { name: '立秋', date: '2025-08-07', meaning: '秋季开始', tips: '宜养肺润燥，多吃梨、银耳、百合等。' },
  { name: '处暑', date: '2025-08-23', meaning: '暑天结束', tips: '注意滋阴润肺，饮食宜清淡滋润。' },
  { name: '白露', date: '2025-09-07', meaning: '天气转凉，露水凝白', tips: '宜养阴润燥，多吃白色食物如梨、百合、莲藕。' },
  { name: '秋分', date: '2025-09-23', meaning: '昼夜平分', tips: '阴阳平衡，宜早睡早起，适当进补。' },
  { name: '寒露', date: '2025-10-08', meaning: '露水寒冷，将要结霜', tips: '注意保暖，宜养阴防燥，多食芝麻、蜂蜜。' },
  { name: '霜降', date: '2025-10-23', meaning: '天气渐冷，开始降霜', tips: '宜温补养胃，多吃羊肉、牛肉、栗子等。' },
  { name: '立冬', date: '2025-11-07', meaning: '冬季开始', tips: '宜温补养肾，多吃黑色食物如黑豆、黑芝麻、黑米。' },
  { name: '小雪', date: '2025-11-22', meaning: '开始降雪', tips: '注意保暖，宜温补，多食羊肉、核桃、桂圆。' },
  { name: '大雪', date: '2025-12-07', meaning: '降雪量增多', tips: '宜温补养肾，适当运动，注意保暖。' },
  { name: '冬至', date: '2025-12-22', meaning: '寒冬来临，白天最短', tips: '宜进补养阳，吃饺子/汤圆，早睡晚起。' },
  
  // 2026年
  { name: '小寒', date: '2026-01-05', meaning: '气候开始寒冷', tips: '宜温补养肾，多吃羊肉、牛肉、红枣。' },
  { name: '大寒', date: '2026-01-20', meaning: '一年中最冷时期', tips: '宜温补，注意保暖，预防感冒和心脑血管疾病。' },
  { name: '立春', date: '2026-02-04', meaning: '春季开始，万物复苏', tips: '宜早睡早起，多吃辛甘发散之品，如韭菜、香菜、洋葱等。' },
  { name: '雨水', date: '2026-02-18', meaning: '降雨开始，雨量渐增', tips: '注意调养脾胃，饮食宜清淡，忌生冷油腻。' },
  { name: '惊蛰', date: '2026-03-05', meaning: '春雷乍动，惊醒蛰伏动物', tips: '宜养肝护脾，多吃梨、百合、银耳等润肺食物。' },
  { name: '春分', date: '2026-03-20', meaning: '昼夜平分', tips: '阴阳平衡，宜调畅情志，适当运动，饮食均衡。' },
  { name: '清明', date: '2026-04-05', meaning: '天气晴朗，草木繁茂', tips: '宜外出踏青，注意防风保暖，预防感冒。' },
  { name: '谷雨', date: '2026-04-20', meaning: '雨生百谷', tips: '宜健脾祛湿，多食山药、薏米、红豆等。' },
  { name: '立夏', date: '2026-05-05', meaning: '夏季开始', tips: '宜养心安神，多吃苦味食物如苦瓜、莲子心。' },
  { name: '小满', date: '2026-05-21', meaning: '麦类等夏熟作物籽粒开始饱满', tips: '注意清热利湿，饮食清淡，避免油腻辛辣。' },
  { name: '芒种', date: '2026-06-05', meaning: '麦类等有芒作物成熟', tips: '宜清热解暑，多喝水，注意防暑降温。' },
  { name: '夏至', date: '2026-06-21', meaning: '炎热将至，白天最长', tips: '宜养心清热，多食苦瓜、西瓜等清热食物。' },
  { name: '小暑', date: '2026-07-07', meaning: '气候开始炎热', tips: '注意防暑降温，多喝水，避免剧烈运动。' },
  { name: '大暑', date: '2026-07-23', meaning: '一年中最热时期', tips: '宜清热补气，多食绿豆、冬瓜、荷叶等。' },
  { name: '立秋', date: '2026-08-07', meaning: '秋季开始', tips: '宜养肺润燥，多吃梨、银耳、百合等。' },
  { name: '处暑', date: '2026-08-23', meaning: '暑天结束', tips: '注意滋阴润肺，饮食宜清淡滋润。' },
  { name: '白露', date: '2026-09-07', meaning: '天气转凉，露水凝白', tips: '宜养阴润燥，多吃白色食物如梨、百合、莲藕。' },
  { name: '秋分', date: '2026-09-23', meaning: '昼夜平分', tips: '阴阳平衡，宜早睡早起，适当进补。' },
  { name: '寒露', date: '2026-10-08', meaning: '露水寒冷，将要结霜', tips: '注意保暖，宜养阴防燥，多食芝麻、蜂蜜。' },
  { name: '霜降', date: '2026-10-23', meaning: '天气渐冷，开始降霜', tips: '宜温补养胃，多吃羊肉、牛肉、栗子等。' },
  { name: '立冬', date: '2026-11-07', meaning: '冬季开始', tips: '宜温补养肾，多吃黑色食物如黑豆、黑芝麻、黑米。' },
  { name: '小雪', date: '2026-11-22', meaning: '开始降雪', tips: '注意保暖，宜温补，多食羊肉、核桃、桂圆。' },
  { name: '大雪', date: '2026-12-07', meaning: '降雪量增多', tips: '宜温补养肾，适当运动，注意保暖。' },
  { name: '冬至', date: '2026-12-22', meaning: '寒冬来临，白天最短', tips: '宜进补养阳，吃饺子/汤圆，早睡晚起。' },
];

// 早安问候语（随机选择）
const MORNING_GREETINGS = [
  '早安！新的一天，愿您精神饱满，身体健康！记得吃早餐哦~',
  '早上好！阳光正好，微风不燥，祝您今天心情愉快！',
  '早安！美好的一天从微笑开始，愿您今天一切顺利！',
  '早上好！愿清晨的第一缕阳光带给您温暖和力量！',
  '早安！新的一天，新的希望，祝您身体健康，心情舒畅！',
  '早上好！又是元气满满的一天，记得适当运动哦！',
  '早安！愿您今天的每一步都走得稳健，每一刻都过得开心！',
];

// 晚安问候语（随机选择）
const EVENING_GREETINGS = [
  '晚安！一天的疲惫在此刻放下，愿您一夜好眠，明天精神焕发！',
  '夜深了，早点休息吧。愿您做个好梦，明天又是美好的一天！',
  '晚安！睡前记得泡个脚，有助于睡眠质量哦~祝您好梦！',
  '夜已深，星星在为您守候。愿您安心入睡，明天精神百倍！',
  '晚安！愿月光温柔地守护您，让您一夜安眠到天亮！',
  '睡前记得放下手机，深呼吸放松。晚安，祝您美梦相伴！',
  '晚安！愿您在甜美的梦乡中，收获满满的能量！',
];

// ================== 天气预警 ==================

/**
 * 获取天气数据
 */
async function fetchWeatherData(city: string = '北京'): Promise<any> {
  try {
    const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[天气] 获取天气失败:', error);
    return null;
  }
}

/**
 * 推送天气提醒
 * GET /api/v1/scheduler/weather-reminder
 */
router.get('/weather-reminder', async (req, res) => {
  try {
    const client = getSupabaseClient();
    
    // 获取所有绑定关系
    const { data: bindings, error } = await client
      .from('bindings')
      .select('elder_id, guardian_id');

    if (error || !bindings) {
      return res.json({ success: false, error: '获取绑定关系失败' });
    }

    const notifications: any[] = [];

    for (const binding of bindings) {
      const elderlyId = binding.elder_id;
      const guardianId = binding.guardian_id;

      // 获取老人信息
      const { data: elderlyUser } = await client
        .from('users')
        .select('name, home_address')
        .eq('id', elderlyId)
        .single();

      const address = elderlyUser?.home_address || '北京';
      const elderlyName = elderlyUser?.name || '老人';

      // 获取天气数据
      const weatherData = await fetchWeatherData(address);
      if (!weatherData) continue;

      const currentCondition = weatherData.current_condition?.[0];
      const todayForecast = weatherData.weather?.[0];
      
      if (!currentCondition || !todayForecast) continue;

      const temp = currentCondition.temp_C;
      const weatherDesc = currentCondition.weatherDesc?.[0]?.value || '未知';
      const maxTemp = todayForecast.maxtempC;
      const minTemp = todayForecast.mintempC;

      // 检查是否需要推送预警
      let shouldPush = false;
      let title = '';
      let content = '';

      // 降温预警
      const tempDiff = parseInt(maxTemp) - parseInt(minTemp);
      if (tempDiff >= 10) {
        shouldPush = true;
        title = '🌡️ 温差较大提醒';
        content = `${elderlyName}所在地区今日温差达${tempDiff}°C（${minTemp}-${maxTemp}°C），请提醒老人注意适时增减衣物，预防感冒。`;
      }

      // 高温预警
      if (parseInt(maxTemp) >= 35) {
        shouldPush = true;
        title = '🔥 高温预警';
        content = `${elderlyName}所在地区今日最高气温${maxTemp}°C，请提醒老人减少外出、多喝水、注意防暑。`;
      }

      // 低温预警
      if (parseInt(minTemp) <= 0) {
        shouldPush = true;
        title = '❄️ 低温预警';
        content = `${elderlyName}所在地区今日最低气温${minTemp}°C，请提醒老人注意保暖，外出注意防滑。`;
      }

      // 恶劣天气预警
      const badWeatherKeywords = ['雨', '雪', '雷', '雾', '霾', '暴', '台风'];
      if (badWeatherKeywords.some(kw => weatherDesc.includes(kw))) {
        shouldPush = true;
        title = '⚠️ 恶劣天气提醒';
        content = `${elderlyName}所在地区今日天气：${weatherDesc}，建议老人减少外出，注意安全。`;
      }

      // 每日天气概况（早上8点推送）
      const hour = new Date().getHours();
      if (hour >= 7 && hour <= 9) {
        shouldPush = true;
        title = '☀️ 今日天气';
        content = `${elderlyName}所在地区今日${weatherDesc}，气温${minTemp}-${maxTemp}°C。祝老人身体健康！`;
      }

      if (shouldPush) {
        // 检查用户是否开启了天气通知
        const weatherEnabled = await checkNotificationEnabled(guardianId, 'weather');
        if (!weatherEnabled) {
          console.log(`[天气提醒] 用户 ${guardianId} 已关闭天气通知，跳过推送`);
          continue;
        }

        // 保存通知
        const { data: notification } = await client
          .from('notifications')
          .insert({
            user_id: guardianId,
            type: 'weather',
            title,
            content,
            is_read: false,
          })
          .select('id')
          .single();

        // 实时推送（SSE）
        const pushData = {
          id: notification?.id,
          type: 'weather',
          title,
          content,
          timestamp: new Date().toISOString(),
        };

        sseManager.broadcast(elderlyId, 'notification', pushData);

        // 后台推送（Expo Push Notification）
        await sendPushToUser(guardianId, title, content, { 
          type: 'weather', 
          notificationId: notification?.id 
        });

        notifications.push({ elderlyId, guardianId, title });
      }
    }

    res.json({
      success: true,
      pushed: notifications.length,
      notifications,
    });
  } catch (error: any) {
    console.error('[定时任务] 天气提醒失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================== 节日提醒 ==================

// 节日配置（公历）
const FESTIVALS: { month: number; day: number; name: string; greeting: string }[] = [
  { month: 1, day: 1, name: '元旦', greeting: '新年快乐！祝您在新的一年里身体健康，万事如意！' },
  { month: 2, day: 14, name: '情人节', greeting: '情人节快乐！愿爱永远陪伴在您身边。' },
  { month: 3, day: 8, name: '妇女节', greeting: '妇女节快乐！感谢您为家庭的付出与奉献。' },
  { month: 5, day: 1, name: '劳动节', greeting: '劳动节快乐！感谢您一生的辛勤付出。' },
  { month: 5, day: 4, name: '青年节', greeting: '青年节快乐！愿您永远保持年轻的心态。' },
  { month: 6, day: 1, name: '儿童节', greeting: '儿童节快乐！愿您像孩子一样开心快乐。' },
  { month: 7, day: 1, name: '建党节', greeting: '建党节快乐！不忘初心，砥砺前行。' },
  { month: 8, day: 1, name: '建军节', greeting: '建军节快乐！致敬最可爱的人。' },
  { month: 9, day: 10, name: '教师节', greeting: '教师节快乐！桃李满天下，师恩永难忘。' },
  { month: 10, day: 1, name: '国庆节', greeting: '国庆节快乐！祝祖国繁荣昌盛，阖家幸福！' },
  { month: 10, day: 9, name: '重阳节', greeting: '重阳节快乐！九九重阳，健康长久！愿您登高望远，幸福安康！' },
  { month: 12, day: 25, name: '圣诞节', greeting: '圣诞节快乐！愿您在这个温馨的节日里感受爱与温暖。' },
];

// 农历节日（简化处理，只推送公历提醒）
const LUNAR_FESTIVALS = [
  { name: '春节', greeting: '春节快乐！阖家团圆，幸福美满！' },
  { name: '元宵节', greeting: '元宵节快乐！花好月圆，团团圆圆！' },
  { name: '端午节', greeting: '端午节快乐！粽香飘远，平安健康！' },
  { name: '中秋节', greeting: '中秋节快乐！月圆人团圆，阖家幸福！' },
];

/**
 * 推送节日提醒
 * GET /api/v1/scheduler/festival-reminder
 */
router.get('/festival-reminder', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // 检查今天是否有节日
    const todayFestival = FESTIVALS.find(f => f.month === month && f.day === day);
    if (!todayFestival) {
      return res.json({ success: true, pushed: 0, message: '今日无节日' });
    }

    // 获取所有绑定关系
    const { data: bindings } = await client
      .from('bindings')
      .select('elder_id, guardian_id');

    if (!bindings || bindings.length === 0) {
      return res.json({ success: true, pushed: 0, message: '无绑定关系' });
    }

    const notifications: any[] = [];

    for (const binding of bindings) {
      const elderId = binding.elder_id;
      const guardianId = binding.guardian_id;

      // 检查用户是否开启了系统通知（节日属于系统通知）
      const systemEnabled = await checkNotificationEnabled(guardianId, 'system');
      if (!systemEnabled) {
        console.log(`[节日提醒] 用户 ${guardianId} 已关闭系统通知，跳过推送`);
        continue;
      }

      // 检查今天是否已推送过
      const { data: existing } = await client
        .from('notifications')
        .select('id')
        .eq('user_id', guardianId)
        .eq('type', 'festival')
        .eq('title', `🎉 ${todayFestival.name}快乐`)
        .gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
        .single();

      if (existing) continue;

      // 保存通知
      const { data: notification } = await client
        .from('notifications')
        .insert({
          user_id: guardianId,
          type: 'festival',
          title: `🎉 ${todayFestival.name}快乐`,
          content: todayFestival.greeting,
          is_read: false,
        })
        .select('id')
        .single();

      // 实时推送（SSE）
      const pushData = {
        id: notification?.id,
        type: 'festival',
        title: `🎉 ${todayFestival.name}快乐`,
        content: todayFestival.greeting,
        timestamp: now.toISOString(),
      };

      sseManager.broadcast(elderId, 'notification', pushData);

      // 后台推送（Expo Push Notification）
      await sendPushToUser(guardianId, `🎉 ${todayFestival.name}快乐`, todayFestival.greeting, {
        type: 'festival',
        notificationId: notification?.id,
      });

      notifications.push({ guardianId, title: todayFestival.name });
    }

    res.json({
      success: true,
      festival: todayFestival.name,
      pushed: notifications.length,
      notifications,
    });
  } catch (error: any) {
    console.error('[定时任务] 节日提醒失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================== 健康预警推送 ==================

/**
 * 检查并推送健康预警
 * GET /api/v1/scheduler/health-warning
 */
router.get('/health-warning', async (req, res) => {
  try {
    const client = getSupabaseClient();

    // 获取所有绑定关系
    const { data: bindings } = await client
      .from('bindings')
      .select('elder_id, guardian_id');

    if (!bindings || bindings.length === 0) {
      return res.json({ success: true, pushed: 0, message: '无绑定关系' });
    }

    const notifications: any[] = [];

    for (const binding of bindings) {
      const elderlyId = binding.elder_id;
      const guardianId = binding.guardian_id;

      // 检查用户是否开启了健康提醒
      const healthEnabled = await checkNotificationEnabled(guardianId, 'health');
      if (!healthEnabled) {
        console.log(`[健康预警] 用户 ${guardianId} 已关闭健康提醒，跳过推送`);
        continue;
      }

      // 获取老人信息
      const { data: elderlyUser } = await client
        .from('users')
        .select('name')
        .eq('id', elderlyId)
        .single();

      const elderlyName = elderlyUser?.name || '老人';

      // 获取最近14天的健康趋势
      const { data: trendData } = await client
        .from('health_trend')
        .select('*')
        .eq('user_id', elderlyId)
        .order('date', { ascending: false })
        .limit(14);

      if (!trendData || trendData.length < 7) continue;

      // 检查心率趋势
      const recentHeartRates = trendData.slice(0, 7).flatMap((d: any) => d.data?.heartRate || []);
      const previousHeartRates = trendData.slice(7, 14).flatMap((d: any) => d.data?.heartRate || []);

      if (recentHeartRates.length > 0 && previousHeartRates.length > 0) {
        const recentAvg = recentHeartRates.reduce((a: number, b: number) => a + b, 0) / recentHeartRates.length;
        const previousAvg = previousHeartRates.reduce((a: number, b: number) => a + b, 0) / previousHeartRates.length;
        const changePercent = ((recentAvg - previousAvg) / previousAvg) * 100;

        if (changePercent > 10) {
          // 检查今天是否已推送
          const { data: existing } = await client
            .from('notifications')
            .select('id')
            .eq('user_id', guardianId)
            .eq('type', 'emergency')
            .like('title', '%心率持续偏高%')
            .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
            .single();

          if (!existing) {
            const title = '❤️ 心率持续偏高预警';
            const content = `${elderlyName}最近7天平均心率${recentAvg.toFixed(0)}次/分，较前一周上升${changePercent.toFixed(1)}%。建议关注老人身体状况。`;

            const { data: notification } = await client
              .from('notifications')
              .insert({
                user_id: guardianId,
                type: 'emergency',
                title,
                content,
                is_read: false,
              })
              .select('id')
              .single();

            sseManager.broadcast(elderlyId, 'notification', {
              id: notification?.id,
              type: 'emergency',
              title,
              content,
              timestamp: new Date().toISOString(),
            });

            // 后台推送（Expo Push Notification）
            await sendPushToUser(guardianId, title, content, {
              type: 'emergency',
              notificationId: notification?.id,
            });

            notifications.push({ guardianId, title });
          }
        }
      }

      // 检查步数趋势
      const recentSteps = trendData.slice(0, 3).map((d: any) => {
        const steps = d.data?.steps || [];
        return steps[steps.length - 1] || 0;
      });
      const previousSteps = trendData.slice(3, 10).map((d: any) => {
        const steps = d.data?.steps || [];
        return steps[steps.length - 1] || 0;
      });

      if (recentSteps.every(s => s > 0) && previousSteps.every(s => s > 0)) {
        const recentAvg = recentSteps.reduce((a, b) => a + b, 0) / recentSteps.length;
        const previousAvg = previousSteps.reduce((a, b) => a + b, 0) / previousSteps.length;
        const changePercent = ((previousAvg - recentAvg) / previousAvg) * 100;

        if (changePercent > 50 && recentAvg < previousAvg) {
          const { data: existing } = await client
            .from('notifications')
            .select('id')
            .eq('user_id', guardianId)
            .eq('type', 'emergency')
            .like('title', '%步数骤降%')
            .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
            .single();

          if (!existing) {
            const title = '🚶 步数骤降预警';
            const content = `${elderlyName}最近3天平均步数${recentAvg.toFixed(0)}步，较之前下降${changePercent.toFixed(0)}%。活动量骤减可能提示身体不适。`;

            const { data: notification } = await client
              .from('notifications')
              .insert({
                user_id: guardianId,
                type: 'emergency',
                title,
                content,
                is_read: false,
              })
              .select('id')
              .single();

            sseManager.broadcast(elderlyId, 'notification', {
              id: notification?.id,
              type: 'emergency',
              title,
              content,
              timestamp: new Date().toISOString(),
            });

            // 后台推送（Expo Push Notification）
            await sendPushToUser(guardianId, title, content, {
              type: 'emergency',
              notificationId: notification?.id,
            });

            notifications.push({ guardianId, title });
          }
        }
      }
    }

    res.json({
      success: true,
      pushed: notifications.length,
      notifications,
    });
  } catch (error: any) {
    console.error('[定时任务] 健康预警推送失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================== 设备告警推送 ==================

/**
 * 检查并推送设备告警
 * GET /api/v1/scheduler/device-alert
 */
router.get('/device-alert', async (req, res) => {
  try {
    const client = getSupabaseClient();

    // 获取所有绑定关系
    const { data: bindings } = await client
      .from('bindings')
      .select('elder_id, guardian_id');

    if (!bindings || bindings.length === 0) {
      return res.json({ success: true, pushed: 0, message: '无绑定关系' });
    }

    const notifications: any[] = [];

    for (const binding of bindings) {
      const elderlyId = binding.elder_id;
      const guardianId = binding.guardian_id;

      // 检查用户是否开启了紧急通知（设备告警属于紧急通知）
      const emergencyEnabled = await checkNotificationEnabled(guardianId, 'emergency');
      if (!emergencyEnabled) {
        console.log(`[设备告警] 用户 ${guardianId} 已关闭紧急通知，跳过推送`);
        continue;
      }

      // 获取老人信息
      const { data: elderlyUser } = await client
        .from('users')
        .select('name')
        .eq('id', elderlyId)
        .single();

      const elderlyName = elderlyUser?.name || '老人';

      // 获取设备列表
      const { data: devices } = await client
        .from('bluetooth_devices')
        .select('*')
        .eq('user_id', elderlyId);

      if (!devices || devices.length === 0) continue;

      for (const device of devices) {
        // 检查离线超过12小时
        if (device.status === 'disconnected' && device.last_seen) {
          const lastSeen = new Date(device.last_seen);
          const hoursSinceLastSeen = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60);

          if (hoursSinceLastSeen >= 12) {
            const { data: existing } = await client
              .from('notifications')
              .select('id')
              .eq('user_id', guardianId)
              .eq('type', 'emergency')
              .like('title', '%设备离线%')
              .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
              .single();

            if (!existing) {
              const title = '📱 设备离线提醒';
              const content = `${elderlyName}的${device.device_name || '设备'}已离线超过${Math.floor(hoursSinceLastSeen)}小时，请检查设备状态。`;

              const { data: notification } = await client
                .from('notifications')
                .insert({
                  user_id: guardianId,
                  type: 'emergency',
                  title,
                  content,
                  is_read: false,
                })
                .select('id')
                .single();

              sseManager.broadcast(elderlyId, 'notification', {
                id: notification?.id,
                type: 'emergency',
                title,
                content,
                timestamp: new Date().toISOString(),
              });

              // 后台推送（Expo Push Notification）
              await sendPushToUser(guardianId, title, content, {
                type: 'emergency',
                notificationId: notification?.id,
              });

              notifications.push({ guardianId, title, device: device.device_name });
            }
          }
        }

        // 检查低电量
        if (device.battery_level && device.battery_level < 20) {
          const { data: existing } = await client
            .from('notifications')
            .select('id')
            .eq('user_id', guardianId)
            .eq('type', 'reminder')
            .like('title', '%电量低%')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .single();

          if (!existing) {
            const title = '🔋 设备电量低';
            const content = `${elderlyName}的${device.device_name || '设备'}电量仅剩${device.battery_level}%，请提醒及时充电。`;

            const { data: notification } = await client
              .from('notifications')
              .insert({
                user_id: guardianId,
                type: 'reminder',
                title,
                content,
                is_read: false,
              })
              .select('id')
              .single();

            sseManager.broadcast(elderlyId, 'notification', {
              id: notification?.id,
              type: 'reminder',
              title,
              content,
              timestamp: new Date().toISOString(),
            });

            // 后台推送（Expo Push Notification）
            await sendPushToUser(guardianId, title, content, {
              type: 'reminder',
              notificationId: notification?.id,
            });

            notifications.push({ guardianId, title, device: device.device_name });
          }
        }
      }
    }

    res.json({
      success: true,
      pushed: notifications.length,
      notifications,
    });
  } catch (error: any) {
    console.error('[定时任务] 设备告警推送失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================== 运行所有定时任务 ==================

/**
 * 运行所有定时任务
 * GET /api/v1/scheduler/run-all
 */
router.get('/run-all', async (req, res) => {
  try {
    const results: any = {};

    // 运行天气提醒
    try {
      const weatherRes = await fetch(`http://localhost:9091/api/v1/scheduler/weather-reminder`);
      results.weather = await weatherRes.json();
    } catch (e) {
      results.weather = { error: '天气提醒失败' };
    }

    // 运行节日提醒
    try {
      const festivalRes = await fetch(`http://localhost:9091/api/v1/scheduler/festival-reminder`);
      results.festival = await festivalRes.json();
    } catch (e) {
      results.festival = { error: '节日提醒失败' };
    }

    // 运行节气提醒
    try {
      const solarTermRes = await fetch(`http://localhost:9091/api/v1/scheduler/solar-term-reminder`);
      results.solarTerm = await solarTermRes.json();
    } catch (e) {
      results.solarTerm = { error: '节气提醒失败' };
    }

    // 运行早安推送
    try {
      const morningRes = await fetch(`http://localhost:9091/api/v1/scheduler/morning-greeting`);
      results.morning = await morningRes.json();
    } catch (e) {
      results.morning = { error: '早安推送失败' };
    }

    // 运行晚安推送
    try {
      const eveningRes = await fetch(`http://localhost:9091/api/v1/scheduler/evening-greeting`);
      results.evening = await eveningRes.json();
    } catch (e) {
      results.evening = { error: '晚安推送失败' };
    }

    // 运行健康预警
    try {
      const healthRes = await fetch(`http://localhost:9091/api/v1/scheduler/health-warning`);
      results.healthWarning = await healthRes.json();
    } catch (e) {
      results.healthWarning = { error: '健康预警失败' };
    }

    // 运行设备告警
    try {
      const deviceRes = await fetch(`http://localhost:9091/api/v1/scheduler/device-alert`);
      results.deviceAlert = await deviceRes.json();
    } catch (e) {
      results.deviceAlert = { error: '设备告警失败' };
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================== 二十四节气推送 ==================

/**
 * 获取今天的节气
 */
function getTodaySolarTerm(): { name: string; meaning: string; tips: string } | null {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return SOLAR_TERMS.find(term => term.date === today) || null;
}

/**
 * 推送二十四节气提醒
 * GET /api/v1/scheduler/solar-term-reminder
 */
router.get('/solar-term-reminder', async (req, res) => {
  try {
    const todayTerm = getTodaySolarTerm();
    
    if (!todayTerm) {
      return res.json({ success: true, pushed: 0, message: '今日无节气' });
    }

    const client = getSupabaseClient();

    // 获取所有绑定关系
    const { data: bindings } = await client
      .from('bindings')
      .select('elder_id, guardian_id');

    if (!bindings || bindings.length === 0) {
      return res.json({ success: true, pushed: 0, message: '无绑定关系' });
    }

    const notifications: any[] = [];
    const title = `🌸 ${todayTerm.name}`;
    const content = `${todayTerm.name}到了！${todayTerm.meaning}。${todayTerm.tips}`;

    for (const binding of bindings) {
      const elderId = binding.elder_id;
      const guardianId = binding.guardian_id;

      // 检查用户是否开启了天气提醒（节气属于天气提醒类型）
      const weatherEnabled = await checkNotificationEnabled(guardianId, 'weather');
      if (!weatherEnabled) {
        console.log(`[节气提醒] 用户 ${guardianId} 已关闭天气提醒，跳过推送`);
        continue;
      }

      // 检查今天是否已推送过
      const { data: existing } = await client
        .from('notifications')
        .select('id')
        .eq('user_id', guardianId)
        .eq('type', 'festival')
        .eq('title', title)
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .single();

      if (existing) continue;

      // 保存通知
      const { data: notification } = await client
        .from('notifications')
        .insert({
          user_id: guardianId,
          type: 'festival',
          title,
          content,
          is_read: false,
        })
        .select('id')
        .single();

      // SSE推送
      sseManager.broadcast(elderId, 'notification', {
        id: notification?.id,
        type: 'festival',
        title,
        content,
        timestamp: new Date().toISOString(),
      });

      // 后台推送
      await sendPushToUser(guardianId, title, content, {
        type: 'festival',
        notificationId: notification?.id,
      });

      notifications.push({ guardianId, term: todayTerm.name });
    }

    res.json({
      success: true,
      term: todayTerm.name,
      pushed: notifications.length,
      notifications,
    });
  } catch (error: any) {
    console.error('[定时任务] 节气提醒失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================== 早安推送 ==================

/**
 * 推送早安问候
 * GET /api/v1/scheduler/morning-greeting
 */
router.get('/morning-greeting', async (req, res) => {
  try {
    const hour = new Date().getHours();
    
    // 只在早上6-8点推送
    if (hour < 6 || hour > 8) {
      return res.json({ success: true, pushed: 0, message: '非早安推送时间（6-8点）' });
    }

    const client = getSupabaseClient();

    // 获取所有绑定关系
    const { data: bindings } = await client
      .from('bindings')
      .select('elder_id, guardian_id');

    if (!bindings || bindings.length === 0) {
      return res.json({ success: true, pushed: 0, message: '无绑定关系' });
    }

    const notifications: any[] = [];
    const title = '🌅 早安问候';
    const greeting = MORNING_GREETINGS[Math.floor(Math.random() * MORNING_GREETINGS.length)];

    for (const binding of bindings) {
      const elderId = binding.elder_id;
      const guardianId = binding.guardian_id;

      // 检查用户是否开启了系统通知（早晚问候属于系统通知）
      const systemEnabled = await checkNotificationEnabled(guardianId, 'system');
      if (!systemEnabled) {
        console.log(`[早安推送] 用户 ${guardianId} 已关闭系统通知，跳过推送`);
        continue;
      }

      // 检查今天是否已推送过早安
      const { data: existing } = await client
        .from('notifications')
        .select('id')
        .eq('user_id', guardianId)
        .eq('type', 'reminder')
        .eq('title', title)
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .single();

      if (existing) continue;

      // 保存通知
      const { data: notification } = await client
        .from('notifications')
        .insert({
          user_id: guardianId,
          type: 'reminder',
          title,
          content: greeting,
          is_read: false,
        })
        .select('id')
        .single();

      // SSE推送
      sseManager.broadcast(elderId, 'notification', {
        id: notification?.id,
        type: 'reminder',
        title,
        content: greeting,
        timestamp: new Date().toISOString(),
      });

      // 后台推送
      await sendPushToUser(guardianId, title, greeting, {
        type: 'reminder',
        notificationId: notification?.id,
      });

      notifications.push({ guardianId });
    }

    res.json({
      success: true,
      pushed: notifications.length,
      greeting,
      notifications,
    });
  } catch (error: any) {
    console.error('[定时任务] 早安推送失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================== 晚安推送 ==================

/**
 * 推送晚安问候
 * GET /api/v1/scheduler/evening-greeting
 */
router.get('/evening-greeting', async (req, res) => {
  try {
    const hour = new Date().getHours();
    
    // 只在晚上21-23点推送
    if (hour < 21 || hour > 23) {
      return res.json({ success: true, pushed: 0, message: '非晚安推送时间（21-23点）' });
    }

    const client = getSupabaseClient();

    // 获取所有绑定关系
    const { data: bindings } = await client
      .from('bindings')
      .select('elder_id, guardian_id');

    if (!bindings || bindings.length === 0) {
      return res.json({ success: true, pushed: 0, message: '无绑定关系' });
    }

    const notifications: any[] = [];
    const title = '🌙 晚安问候';
    const greeting = EVENING_GREETINGS[Math.floor(Math.random() * EVENING_GREETINGS.length)];

    for (const binding of bindings) {
      const elderId = binding.elder_id;
      const guardianId = binding.guardian_id;

      // 检查用户是否开启了系统通知（早晚问候属于系统通知）
      const systemEnabled = await checkNotificationEnabled(guardianId, 'system');
      if (!systemEnabled) {
        console.log(`[晚安推送] 用户 ${guardianId} 已关闭系统通知，跳过推送`);
        continue;
      }

      // 检查今天是否已推送过晚安
      const { data: existing } = await client
        .from('notifications')
        .select('id')
        .eq('user_id', guardianId)
        .eq('type', 'reminder')
        .eq('title', title)
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .single();

      if (existing) continue;

      // 保存通知
      const { data: notification } = await client
        .from('notifications')
        .insert({
          user_id: guardianId,
          type: 'reminder',
          title,
          content: greeting,
          is_read: false,
        })
        .select('id')
        .single();

      // SSE推送
      sseManager.broadcast(elderId, 'notification', {
        id: notification?.id,
        type: 'reminder',
        title,
        content: greeting,
        timestamp: new Date().toISOString(),
      });

      // 后台推送
      await sendPushToUser(guardianId, title, greeting, {
        type: 'reminder',
        notificationId: notification?.id,
      });

      notifications.push({ guardianId });
    }

    res.json({
      success: true,
      pushed: notifications.length,
      greeting,
      notifications,
    });
  } catch (error: any) {
    console.error('[定时任务] 晚安推送失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
