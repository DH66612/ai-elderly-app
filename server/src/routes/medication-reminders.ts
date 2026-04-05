/**
 * 用药提醒API路由
 */
import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { sseManager } from './realtime';

const router = express.Router();

/**
 * 获取老人的用药提醒列表
 * GET /api/v1/medication-reminders/elder/:elderId
 */
router.get('/elder/:elderId', async (req, res) => {
  try {
    const { elderId } = req.params;
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('medication_reminders')
      .select('*')
      .eq('elder_id', parseInt(elderId))
      .order('reminder_time', { ascending: true });

    if (error) throw error;

    const formattedData = (data || []).map(item => ({
      id: item.id,
      medicineName: item.medicine_name,
      dosage: item.dosage,
      time: item.reminder_time,
      frequency: item.frequency,
      days: item.days,
      notes: item.notes,
      isActive: item.is_active,
      lastTriggeredAt: item.last_triggered_at,
      createdAt: item.created_at,
    }));

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error('[用药提醒] 获取失败:', error);
    res.status(500).json({ success: false, error: '获取用药提醒失败' });
  }
});

/**
 * 获取监护人为老人设置的用药提醒
 * GET /api/v1/medication-reminders/guardian/:guardianId
 */
router.get('/guardian/:guardianId', async (req, res) => {
  try {
    const { guardianId } = req.params;
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('medication_reminders')
      .select('*')
      .eq('guardian_id', parseInt(guardianId))
      .order('reminder_time', { ascending: true });

    if (error) throw error;

    const formattedData = (data || []).map(item => ({
      id: item.id,
      elderId: item.elder_id,
      medicineName: item.medicine_name,
      dosage: item.dosage,
      time: item.reminder_time,
      frequency: item.frequency,
      days: item.days,
      notes: item.notes,
      isActive: item.is_active,
      lastTriggeredAt: item.last_triggered_at,
      createdAt: item.created_at,
    }));

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error('[用药提醒] 获取失败:', error);
    res.status(500).json({ success: false, error: '获取用药提醒失败' });
  }
});

/**
 * 创建用药提醒
 * POST /api/v1/medication-reminders
 * Body: { elderId, guardianId, medicineName, dosage, time, frequency, days?, notes? }
 */
router.post('/', async (req, res) => {
  try {
    const { elderId, guardianId, medicineName, dosage, time, frequency, days, notes } = req.body;

    if (!elderId || !guardianId || !medicineName || !dosage || !time) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const client = getSupabaseClient();

    const { data, error } = await client
      .from('medication_reminders')
      .insert({
        elder_id: elderId,
        guardian_id: guardianId,
        medicine_name: medicineName,
        dosage,
        reminder_time: time,
        frequency: frequency || 'daily',
        days: days || null,
        notes: notes || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // 实时推送给老人端
    sseManager.broadcast(elderId, 'medication_reminder_added', {
      id: data.id,
      medicineName: data.medicine_name,
      dosage: data.dosage,
      time: data.reminder_time,
      frequency: data.frequency,
    });

    res.json({ 
      success: true, 
      data: {
        id: data.id,
        medicineName: data.medicine_name,
        dosage: data.dosage,
        time: data.reminder_time,
        frequency: data.frequency,
        days: data.days,
        notes: data.notes,
        isActive: data.is_active,
      }
    });
  } catch (error) {
    console.error('[用药提醒] 创建失败:', error);
    res.status(500).json({ success: false, error: '创建用药提醒失败' });
  }
});

/**
 * 更新用药提醒
 * PUT /api/v1/medication-reminders/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { medicineName, dosage, time, frequency, days, notes, isActive } = req.body;

    const client = getSupabaseClient();

    const updateData: any = { updated_at: new Date().toISOString() };
    if (medicineName !== undefined) updateData.medicine_name = medicineName;
    if (dosage !== undefined) updateData.dosage = dosage;
    if (time !== undefined) updateData.reminder_time = time;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (days !== undefined) updateData.days = days;
    if (notes !== undefined) updateData.notes = notes;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data, error } = await client
      .from('medication_reminders')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) throw error;

    // 推送更新给老人端
    sseManager.broadcast(data.elder_id, 'medication_reminder_updated', {
      id: data.id,
      medicineName: data.medicine_name,
      isActive: data.is_active,
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('[用药提醒] 更新失败:', error);
    res.status(500).json({ success: false, error: '更新用药提醒失败' });
  }
});

/**
 * 删除用药提醒
 * DELETE /api/v1/medication-reminders/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    // 先获取提醒信息（用于推送）
    const { data: reminder } = await client
      .from('medication_reminders')
      .select('elder_id')
      .eq('id', parseInt(id))
      .single();

    const { error } = await client
      .from('medication_reminders')
      .delete()
      .eq('id', parseInt(id));

    if (error) throw error;

    // 推送删除通知给老人端
    if (reminder) {
      sseManager.broadcast(reminder.elder_id, 'medication_reminder_deleted', { id: parseInt(id) });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[用药提醒] 删除失败:', error);
    res.status(500).json({ success: false, error: '删除用药提醒失败' });
  }
});

/**
 * 触发用药提醒（定时任务调用）
 * POST /api/v1/medication-reminders/trigger
 * Body: { elderId, reminderId }
 */
router.post('/trigger', async (req, res) => {
  try {
    const { elderId, reminderId } = req.body;
    const client = getSupabaseClient();

    // 获取提醒详情
    const { data: reminder, error } = await client
      .from('medication_reminders')
      .select('*')
      .eq('id', reminderId)
      .eq('elder_id', elderId)
      .eq('is_active', true)
      .single();

    if (error || !reminder) {
      return res.status(404).json({ success: false, error: '提醒不存在或已禁用' });
    }

    // 更新最后触发时间
    await client
      .from('medication_reminders')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', reminderId);

    // 推送全屏提醒给老人端
    const pushed = sseManager.broadcast(elderId, 'medication_reminder_trigger', {
      id: reminder.id,
      medicineName: reminder.medicine_name,
      dosage: reminder.dosage,
      time: reminder.reminder_time,
      notes: reminder.notes,
      message: `该服用${reminder.medicine_name}了，剂量：${reminder.dosage}`,
    });

    console.log(`[用药提醒] 触发提醒: 老人${elderId} 药品${reminder.medicine_name} 推送${pushed ? '成功' : '失败'}`);

    res.json({ success: true, pushed });
  } catch (error) {
    console.error('[用药提醒] 触发失败:', error);
    res.status(500).json({ success: false, error: '触发提醒失败' });
  }
});

/**
 * 检查当前时间需要触发的提醒（定时任务调用）
 * GET /api/v1/medication-reminders/check
 */
router.get('/check', async (req, res) => {
  try {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = now.getDay();

    const client = getSupabaseClient();

    // 查询当前时间且启用的提醒
    const { data: reminders, error } = await client
      .from('medication_reminders')
      .select('*')
      .eq('reminder_time', currentTime)
      .eq('is_active', true);

    if (error) throw error;

    // 过滤出需要今天触发的提醒
    const toTrigger = (reminders || []).filter(r => {
      if (r.frequency === 'daily') return true;
      if (r.frequency === 'weekly' && r.days) {
        return r.days.includes(currentDay);
      }
      return false;
    });

    res.json({ 
      success: true, 
      data: toTrigger,
      currentTime,
      currentDay,
    });
  } catch (error) {
    console.error('[用药提醒] 检查失败:', error);
    res.status(500).json({ success: false, error: '检查提醒失败' });
  }
});

export default router;
