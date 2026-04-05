import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = express.Router();

/**
 * 通过手机号搜索用户（用于绑定）
 * GET /api/v1/users/search?phone=xxx&role=xxx
 * 注意：必须放在 /:id 之前，否则会被 /:id 路由拦截
 */
router.get('/search', async (req, res) => {
  try {
    const { phone, role } = req.query;

    if (!phone) {
      return res.status(400).json({ error: '手机号不能为空' });
    }

    const client = getSupabaseClient();

    const query = client
      .from('users')
      .select('*')
      .eq('phone', phone);

    if (role) {
      query.eq('role', role);
    }

    const { data: users, error } = await query;

    if (error) {
      throw error;
    }

    // 字段名转换：数据库字段（下划线）→ 前端字段（驼峰）
    const transformedUsers = (users || []).map((user: any) => ({
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      boundUserId: user.bound_user_id,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    res.json({ users: transformedUsers });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: '搜索用户失败' });
  }
});

/**
 * 发送绑定请求
 * POST /api/v1/users/binding-requests
 * Body: { requester_id: number, target_id: number }
 */
router.post('/binding-requests', async (req, res) => {
  try {
    const { requester_id, target_id } = req.body;

    if (!requester_id || !target_id) {
      return res.status(400).json({ error: '请求者ID和目标用户ID不能为空' });
    }

    if (requester_id === target_id) {
      return res.status(400).json({ error: '不能绑定自己' });
    }

    const client = getSupabaseClient();

    // 检查请求者是否已经绑定
    const { data: requester } = await client
      .from('users')
      .select('bound_user_id, name, role')
      .eq('id', requester_id)
      .single();

    if (requester?.bound_user_id) {
      return res.status(400).json({ error: '您已经绑定了用户' });
    }

    // 检查目标用户是否已经绑定
    const { data: target } = await client
      .from('users')
      .select('bound_user_id, name, role')
      .eq('id', target_id)
      .single();

    if (target?.bound_user_id) {
      return res.status(400).json({ error: '对方已经绑定了其他用户' });
    }

    // 检查是否已经存在待处理的请求
    const { data: existingRequest } = await client
      .from('binding_requests')
      .select('*')
      .or(`requester_id.eq.${requester_id},target_id.eq.${requester_id}`)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return res.status(400).json({ error: '已经存在待处理的绑定请求' });
    }

    // 创建绑定请求
    const { data: request, error } = await client
      .from('binding_requests')
      .insert({
        requester_id: requester_id,
        target_id,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !request) {
      throw error;
    }

    res.json({ request });
  } catch (error) {
    console.error('Send binding request error:', error);
    res.status(500).json({ error: '发送绑定请求失败' });
  }
});

/**
 * 获取绑定请求列表
 * GET /api/v1/users/binding-requests
 * Query: user_id?: number, status?: 'pending' | 'accepted' | 'rejected'
 */
router.get('/binding-requests', async (req, res) => {
  try {
    const { user_id, status } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: '用户ID不能为空' });
    }

    const client = getSupabaseClient();

    // 查询所有与当前用户相关的绑定请求
    let query = client
      .from('binding_requests')
      .select('*')
      .or(`requester_id.eq.${user_id},target_id.eq.${user_id}`)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status as string);
    }

    const { data: requests, error } = await query;

    if (error) {
      throw error;
    }

    // 补充用户信息
    const enrichedRequests = await Promise.all(
      (requests || []).map(async (req: any) => {
        const { data: requester } = await client
          .from('users')
          .select('*')
          .eq('id', req.requester_id)
          .single();

        const { data: target } = await client
          .from('users')
          .select('*')
          .eq('id', req.target_id)
          .single();

        return {
          ...req,
          requesterName: requester?.name,
          requesterRole: requester?.role,
          targetName: target?.name,
          targetRole: target?.role,
        };
      })
    );

    res.json({ requests: enrichedRequests || [] });
  } catch (error) {
    console.error('Get binding requests error:', error);
    res.status(500).json({ error: '获取绑定请求失败' });
  }
});

/**
 * 接受绑定请求
 * POST /api/v1/users/binding-requests/:id/accept
 * Body: { user_id: number }
 */
router.post('/binding-requests/:id/accept', async (req, res) => {
  try {
    const { user_id } = req.body;
    const { id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: '用户ID不能为空' });
    }

    const client = getSupabaseClient();

    // 获取绑定请求
    const { data: request, error: fetchError } = await client
      .from('binding_requests')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ error: '绑定请求不存在' });
    }

    // 验证权限（只有目标用户可以接受）
    if (request.target_id !== user_id) {
      return res.status(403).json({ error: '无权操作此绑定请求' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: '绑定请求已被处理' });
    }

    // 检查双方是否已经绑定
    const { data: requester } = await client
      .from('users')
      .select('bound_user_id')
      .eq('id', request.requester_id)
      .single();

    const { data: target } = await client
      .from('users')
      .select('bound_user_id')
      .eq('id', user_id)
      .single();

    if (requester?.bound_user_id || target?.bound_user_id) {
      return res.status(400).json({ error: '双方已经绑定了其他用户' });
    }

    // 更新绑定请求状态
    const { error: updateRequestError } = await client
      .from('binding_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', request.id);

    if (updateRequestError) {
      throw updateRequestError;
    }

    // 双向绑定：互相设置对方的ID
    const { error: updateRequesterError } = await client
      .from('users')
      .update({
        bound_user_id: user_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.requester_id);

    const { error: updateTargetError } = await client
      .from('users')
      .update({
        bound_user_id: request.requester_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (updateRequesterError || updateTargetError) {
      throw updateRequesterError || updateTargetError;
    }

    // 创建绑定关系记录
    await client
      .from('bindings')
      .insert({
        elder_id: request.requester_role === 'elderly' ? request.requester_id : request.target_id,
        guardian_id: request.requester_role === 'guardian' ? request.requester_id : request.target_id,
        status: 'active',
      });

    res.json({ success: true, message: '绑定成功' });
  } catch (error) {
    console.error('Accept binding request error:', error);
    res.status(500).json({ error: '接受绑定请求失败' });
  }
});

/**
 * 拒绝绑定请求
 * POST /api/v1/users/binding-requests/:id/reject
 * Body: { user_id: number }
 */
router.post('/binding-requests/:id/reject', async (req, res) => {
  try {
    const { user_id } = req.body;
    const { id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: '用户ID不能为空' });
    }

    const client = getSupabaseClient();

    // 获取绑定请求
    const { data: request, error: fetchError } = await client
      .from('binding_requests')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ error: '绑定请求不存在' });
    }

    // 验证权限（只有目标用户可以拒绝）
    if (request.target_id !== user_id) {
      return res.status(403).json({ error: '无权操作此绑定请求' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: '绑定请求已被处理' });
    }

    // 更新绑定请求状态
    const { error } = await client
      .from('binding_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', request.id);

    if (error) {
      throw error;
    }

    res.json({ success: true, message: '已拒绝绑定请求' });
  } catch (error) {
    console.error('Reject binding request error:', error);
    res.status(500).json({ error: '拒绝绑定请求失败' });
  }
});

/**
 * 解除绑定（单方解除，无需对方同意）
 * POST /api/v1/users/unbind
 * Body: { user_id: number }
 */
router.post('/unbind', async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: '用户ID不能为空' });
    }

    const client = getSupabaseClient();

    // 获取当前用户信息
    const { data: currentUser, error: userError } = await client
      .from('users')
      .select('bound_user_id, role')
      .eq('id', user_id)
      .single();

    if (userError || !currentUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (!currentUser.bound_user_id) {
      return res.status(400).json({ error: '您还未绑定任何用户' });
    }

    // 解除当前用户的绑定
    const { error: updateCurrentUserError } = await client
      .from('users')
      .update({
        bound_user_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (updateCurrentUserError) {
      throw updateCurrentUserError;
    }

    // 解除对方的绑定（双向解除）
    const { error: updateBoundUserError } = await client
      .from('users')
      .update({
        bound_user_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUser.bound_user_id);

    if (updateBoundUserError) {
      throw updateBoundUserError;
    }

    // 更新绑定关系表状态
    if (currentUser.role === 'elderly') {
      await client
        .from('bindings')
        .update({ status: 'inactive' })
        .eq('elder_id', user_id)
        .eq('guardian_id', currentUser.bound_user_id);
    } else {
      await client
        .from('bindings')
        .update({ status: 'inactive' })
        .eq('guardian_id', user_id)
        .eq('elder_id', currentUser.bound_user_id);
    }

    res.json({ success: true, message: '已解除绑定' });
  } catch (error) {
    console.error('Unbind error:', error);
    res.status(500).json({ error: '解除绑定失败' });
  }
});

/**
 * 获取用户信息
 * GET /api/v1/users/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (error || !user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 获取绑定用户详细信息
    let boundUser = null;
    if (user.bound_user_id) {
      const { data: bound } = await client
        .from('users')
        .select('id, name, phone, role, home_address, community_phone, contact_phone, created_at')
        .eq('id', user.bound_user_id)
        .single();
      
      if (bound) {
        boundUser = {
          id: bound.id,
          name: bound.name,
          phone: bound.phone,
          role: bound.role,
          homeAddress: bound.home_address,
          communityPhone: bound.community_phone,
          contactPhone: bound.contact_phone,
          createdAt: bound.created_at,
        };
      }
    }

    // 字段名转换：数据库字段（下划线）→ 前端字段（驼峰）
    res.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        boundUserId: user.bound_user_id,
        boundUserName: boundUser?.name || null,
        boundUser, // 完整的绑定用户信息
        homeAddress: user.home_address,
        homeLocation: user.home_location,
        address: user.home_address, // 别名，方便前端使用
        communityPhone: user.community_phone,
        contactPhone: user.contact_phone,
        healthConditions: user.health_conditions || [],
        livingConditions: user.living_conditions || [],
        // 老人专属字段
        health_condition: user.health_condition,
        health_notes: user.health_notes,
        living_environment: user.living_environment,
        emergencyContact: user.emergency_contact,
        emergencyPhone: user.emergency_phone,
        // 监护人专属字段
        father_name: user.father_name,
        father_phone: user.father_phone,
        mother_name: user.mother_name,
        mother_phone: user.mother_phone,
        backup_contact_name: user.backup_contact_name,
        backup_contact_phone: user.backup_contact_phone,
        backup_contact_relation: user.backup_contact_relation,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

/**
 * 更新用户信息
 * PUT /api/v1/users/:id
 * Body: { 
 *   name?: string, 
 *   bound_user_id?: number,
 *   home_address?: string,
 *   home_location?: string,
 *   community_phone?: string,
 *   contact_phone?: string,
 *   health_conditions?: string[],
 *   living_conditions?: string[],
 *   health_condition?: string,
 *   health_notes?: string,
 *   living_environment?: string,
 *   emergency_contact?: string,
 *   emergency_phone?: string
 * }
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      bound_user_id,
      home_address,
      home_location,
      community_phone,
      contact_phone,
      health_conditions,
      living_conditions,
      health_condition,
      health_notes,
      living_environment,
      emergency_contact,
      emergency_phone
    } = req.body;
    const client = getSupabaseClient();

    const updateData: any = {};
    if (name) updateData.name = name;
    if (bound_user_id !== undefined) updateData.bound_user_id = bound_user_id;
    if (home_address !== undefined) updateData.home_address = home_address;
    if (home_location !== undefined) updateData.home_location = home_location;
    if (community_phone !== undefined) updateData.community_phone = community_phone;
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone;
    if (health_conditions !== undefined) updateData.health_conditions = health_conditions;
    if (living_conditions !== undefined) updateData.living_conditions = living_conditions;
    if (health_condition !== undefined) updateData.health_condition = health_condition;
    if (health_notes !== undefined) updateData.health_notes = health_notes;
    if (living_environment !== undefined) updateData.living_environment = living_environment;
    if (emergency_contact !== undefined) updateData.emergency_contact = emergency_contact;
    if (emergency_phone !== undefined) updateData.emergency_phone = emergency_phone;
    updateData.updated_at = new Date().toISOString();

    const { data: user, error } = await client
      .from('users')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error || !user) {
      return res.status(404).json({ error: '用户不存在或更新失败' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: '更新用户信息失败' });
  }
});

// 同时支持PATCH方法
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      bound_user_id,
      home_address,
      home_location,
      community_phone,
      contact_phone,
      health_conditions,
      living_conditions,
      health_condition,
      health_notes,
      living_environment,
      emergency_contact,
      emergency_phone,
      // 监护人专属字段
      father_name,
      father_phone,
      mother_name,
      mother_phone,
      backup_contact_name,
      backup_contact_phone,
      backup_contact_relation,
    } = req.body;
    const client = getSupabaseClient();

    const updateData: any = {};
    if (name) updateData.name = name;
    if (bound_user_id !== undefined) updateData.bound_user_id = bound_user_id;
    if (home_address !== undefined) updateData.home_address = home_address;
    if (home_location !== undefined) updateData.home_location = home_location;
    if (community_phone !== undefined) updateData.community_phone = community_phone;
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone;
    if (health_conditions !== undefined) updateData.health_conditions = health_conditions;
    if (living_conditions !== undefined) updateData.living_conditions = living_conditions;
    if (health_condition !== undefined) updateData.health_condition = health_condition;
    if (health_notes !== undefined) updateData.health_notes = health_notes;
    if (living_environment !== undefined) updateData.living_environment = living_environment;
    if (emergency_contact !== undefined) updateData.emergency_contact = emergency_contact;
    if (emergency_phone !== undefined) updateData.emergency_phone = emergency_phone;
    // 监护人专属字段
    if (father_name !== undefined) updateData.father_name = father_name;
    if (father_phone !== undefined) updateData.father_phone = father_phone;
    if (mother_name !== undefined) updateData.mother_name = mother_name;
    if (mother_phone !== undefined) updateData.mother_phone = mother_phone;
    if (backup_contact_name !== undefined) updateData.backup_contact_name = backup_contact_name;
    if (backup_contact_phone !== undefined) updateData.backup_contact_phone = backup_contact_phone;
    if (backup_contact_relation !== undefined) updateData.backup_contact_relation = backup_contact_relation;
    updateData.updated_at = new Date().toISOString();

    const { data: user, error } = await client
      .from('users')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error || !user) {
      return res.status(404).json({ error: '用户不存在或更新失败' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: '更新用户信息失败' });
  }
});

/**
 * 获取用户通知设置
 * GET /api/v1/users/:id/notification-settings
 */
router.get('/:id/notification-settings', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    // 查询通知设置
    const { data: settings, error } = await client
      .from('notification_settings')
      .select('*')
      .eq('user_id', parseInt(id))
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 表示没有找到记录
      throw error;
    }

    // 如果没有设置记录，返回默认值
    if (!settings) {
      return res.json({
        success: true,
        settings: {
          healthReminder: true,
          emergencyAlert: true,
          systemNotice: false,
          dailyReport: true,
          medicationReminder: true,
          weatherNotice: true,
        },
      });
    }

    // 字段名转换
    res.json({
      success: true,
      settings: {
        healthReminder: settings.health_reminder,
        emergencyAlert: settings.emergency_alert,
        systemNotice: settings.system_notice,
        dailyReport: settings.daily_report,
        medicationReminder: settings.medication_reminder,
        weatherNotice: settings.weather_notice,
      },
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ error: '获取通知设置失败' });
  }
});

/**
 * 更新用户通知设置
 * PUT /api/v1/users/:id/notification-settings
 * Body: {
 *   healthReminder?: boolean,
 *   emergencyAlert?: boolean,
 *   systemNotice?: boolean,
 *   dailyReport?: boolean,
 *   medicationReminder?: boolean,
 *   weatherNotice?: boolean,
 * }
 */
router.put('/:id/notification-settings', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      healthReminder,
      emergencyAlert,
      systemNotice,
      dailyReport,
      medicationReminder,
      weatherNotice,
    } = req.body;
    const client = getSupabaseClient();

    // 构建更新数据
    const updateData: any = {
      user_id: parseInt(id),
      updated_at: new Date().toISOString(),
    };
    if (healthReminder !== undefined) updateData.health_reminder = healthReminder;
    if (emergencyAlert !== undefined) updateData.emergency_alert = emergencyAlert;
    if (systemNotice !== undefined) updateData.system_notice = systemNotice;
    if (dailyReport !== undefined) updateData.daily_report = dailyReport;
    if (medicationReminder !== undefined) updateData.medication_reminder = medicationReminder;
    if (weatherNotice !== undefined) updateData.weather_notice = weatherNotice;

    // 使用 upsert 插入或更新
    const { data: settings, error } = await client
      .from('notification_settings')
      .upsert(updateData, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      settings: {
        healthReminder: settings.health_reminder,
        emergencyAlert: settings.emergency_alert,
        systemNotice: settings.system_notice,
        dailyReport: settings.daily_report,
        medicationReminder: settings.medication_reminder,
        weatherNotice: settings.weather_notice,
      },
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ error: '更新通知设置失败' });
  }
});

export default router;
