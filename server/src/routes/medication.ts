/**
 * 用药提醒API路由
 */
import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { sseManager } from './realtime';

const router = express.Router();

/**
 * 获取老人的用药提醒列表
 * GET /api/v1/medication/reminders/:elderId
 */
router.get('/reminders/:elderId', async (req, res) => {
  try {
    const { elderId } = req.params;
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('medication_reminders')
      .select('*')
      .eq('elder_id', parseInt(elderId))
      .order('reminder_time', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[用药提醒] 获取列表失败:', error);
    res.status(500).json({ success: false, error: '获取列表失败' });
  }
});

/**
 * 创建用药提醒
 * POST /api/v1/medication/reminders
 * Body: { elderId, guardianId, medicineName, dosage, reminderTime, frequency, days?, notes? }
 */
router.post('/reminders', async (req, res) => {
  try {
    const { elderId, guardianId, medicineName, dosage, reminderTime, frequency, days, notes } = req.body;

    if (!elderId || !guardianId || !medicineName || !dosage || !reminderTime) {
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
        reminder_time: reminderTime,
        frequency: frequency || 'daily',
        days: days || null,
        notes: notes || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // 通知老人端有新提醒
    sseManager.broadcast(elderId, 'medication_reminder_added', {
      id: data.id,
      medicineName: data.medicine_name,
      reminderTime: data.reminder_time,
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('[用药提醒] 创建失败:', error);
    res.status(500).json({ success: false, error: '创建失败' });
  }
});

/**
 * 更新用药提醒
 * PUT /api/v1/medication/reminders/:id
 */
router.put('/reminders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { medicineName, dosage, reminderTime, frequency, days, notes, isActive } = req.body;

    const client = getSupabaseClient();

    const updateData: any = { updated_at: new Date().toISOString() };
    if (medicineName !== undefined) updateData.medicine_name = medicineName;
    if (dosage !== undefined) updateData.dosage = dosage;
    if (reminderTime !== undefined) updateData.reminder_time = reminderTime;
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

    res.json({ success: true, data });
  } catch (error) {
    console.error('[用药提醒] 更新失败:', error);
    res.status(500).json({ success: false, error: '更新失败' });
  }
});

/**
 * 删除用药提醒
 * DELETE /api/v1/medication/reminders/:id
 */
router.delete('/reminders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { error } = await client
      .from('medication_reminders')
      .delete()
      .eq('id', parseInt(id));

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('[用药提醒] 删除失败:', error);
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

/**
 * 触发用药提醒通知（定时任务调用）
 * POST /api/v1/medication/trigger
 * Body: { currentTime: 'HH:mm' }
 */
router.post('/trigger', async (req, res) => {
  try {
    const { currentTime } = req.body;
    
    if (!currentTime) {
      return res.status(400).json({ success: false, error: '缺少时间参数' });
    }

    const client = getSupabaseClient();

    // 查找当前时间需要触发的提醒
    const { data: reminders, error } = await client
      .from('medication_reminders')
      .select('*')
      .eq('reminder_time', currentTime)
      .eq('is_active', true);

    if (error) throw error;

    let triggeredCount = 0;

    for (const reminder of reminders || []) {
      // 检查频率
      const now = new Date();
      const dayOfWeek = now.getDay();

      if (reminder.frequency === 'weekly') {
        // 每周模式，检查今天是否在指定日期
        if (!reminder.days || !reminder.days.includes(dayOfWeek)) {
          continue;
        }
      }

      // 通过SSE推送通知给老人端
      const notified = sseManager.broadcast(reminder.elder_id, 'medication_reminder', {
        id: reminder.id,
        medicineName: reminder.medicine_name,
        dosage: reminder.dosage,
        time: reminder.reminder_time,
        notes: reminder.notes,
        message: `该吃药了：${reminder.medicine_name} ${reminder.dosage}`,
      });

      if (notified) {
        triggeredCount++;
        
        // 更新上次触发时间
        await client
          .from('medication_reminders')
          .update({ last_triggered_at: now.toISOString() })
          .eq('id', reminder.id);
      }
    }

    res.json({ 
      success: true, 
      triggered: triggeredCount,
      message: `成功触发 ${triggeredCount} 条用药提醒` 
    });
  } catch (error) {
    console.error('[用药提醒] 触发失败:', error);
    res.status(500).json({ success: false, error: '触发失败' });
  }
});

export default router;
