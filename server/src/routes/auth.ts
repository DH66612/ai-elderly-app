import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { createSession, deleteSession } from '../utils/session';

const router = express.Router();

/**
 * 用户登录
 * POST /api/v1/auth/login
 * Body: { phone: string, role: string }
 */
router.post('/login', async (req, res) => {
  try {
    const { phone, role } = req.body;

    if (!phone || !role) {
      return res.status(400).json({ error: '手机号和角色不能为空' });
    }

    const client = getSupabaseClient();

    // 查询用户
    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('phone', phone)
      .eq('role', role)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 创建会话token
    const deviceInfo = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const { token, expiresAt } = await createSession(user.id, deviceInfo, ipAddress);

    // 检查是否已有欢迎消息，没有则添加
    const { data: existingWelcome } = await client
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'system')
      .like('title', '%欢迎使用%')
      .single();

    if (!existingWelcome) {
      const welcomeTitle = user.role === 'elderly' ? '🎉 欢迎使用AI助老应用' : '👋 欢迎使用AI助老应用';
      const welcomeContent = user.role === 'elderly' 
        ? `亲爱的${user.name}，欢迎使用AI助老应用！我们致力于为您提供便捷、贴心的服务。如有任何问题，请随时联系您的监护人或在设置中查看帮助。`
        : `尊敬的${user.name}，欢迎使用AI助老应用！您已成功登录监护人账户，可以随时关注您家人的健康状况。如有疑问，请在设置中查看帮助。`;

      await client
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'system',
          title: welcomeTitle,
          content: welcomeContent,
          is_read: false,
        });
    }

    // 获取绑定用户信息
    let boundUser = null;
    if (user.bound_user_id) {
      const { data: bound } = await client
        .from('users')
        .select('*')
        .eq('id', user.bound_user_id)
        .single();
      boundUser = bound;
    }

    // 字段名转换：数据库字段（下划线）→ 前端字段（驼峰）
    res.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        boundUserId: user.bound_user_id,
        boundUserName: boundUser?.name,
        // 老人端字段
        homeAddress: user.home_address,
        homeLocation: user.home_location, // 家庭地址坐标
        communityPhone: user.community_phone,
        contactPhone: user.contact_phone,
        healthConditions: user.health_conditions || [],
        livingConditions: user.living_conditions || [],
        // 监护人端字段
        father_name: user.father_name,
        father_phone: user.father_phone,
        mother_name: user.mother_name,
        mother_phone: user.mother_phone,
        backup_contact_name: user.backup_contact_name,
        backup_contact_phone: user.backup_contact_phone,
        backup_contact_relation: user.backup_contact_relation,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        // 绑定用户详细信息（驼峰格式）
        boundUser: boundUser ? {
          id: boundUser.id,
          name: boundUser.name,
          phone: boundUser.phone,
          role: boundUser.role,
          homeAddress: boundUser.home_address,
          homeLocation: boundUser.home_location, // 关键：包含经纬度
          communityPhone: boundUser.community_phone,
          contactPhone: boundUser.contact_phone,
          healthConditions: boundUser.health_conditions || [],
          livingConditions: boundUser.living_conditions || [],
          createdAt: boundUser.created_at,
        } : null,
      },
      token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

/**
 * 用户注册
 * POST /api/v1/auth/register
 * Body: { 
 *   name: string, 
 *   phone: string, 
 *   role: string,
 *   // 老人端字段
 *   homeAddress?: string, 
 *   communityPhone?: string,
 *   contactPhone?: string,
 *   healthConditions?: string[],
 *   livingConditions?: string[],
 *   // 监护人端字段
 *   father_name?: string,
 *   father_phone?: string,
 *   mother_name?: string,
 *   mother_phone?: string,
 *   backup_contact_name?: string,
 *   backup_contact_phone?: string,
 *   backup_contact_relation?: string
 * }
 */
router.post('/register', async (req, res) => {
  try {
    const { 
      name, 
      phone, 
      role, 
      // 老人端字段
      homeAddress, 
      communityPhone, 
      contactPhone,
      healthConditions,
      livingConditions,
      // 监护人端字段
      father_name,
      father_phone,
      mother_name,
      mother_phone,
      backup_contact_name,
      backup_contact_phone,
      backup_contact_relation,
    } = req.body;

    if (!name || !phone || !role) {
      return res.status(400).json({ error: '姓名、手机号和角色不能为空' });
    }

    if (!['elderly', 'guardian'].includes(role)) {
      return res.status(400).json({ error: '角色必须是 elderly 或 guardian' });
    }

    // 老人端必须填写扩展信息
    if (role === 'elderly') {
      if (!homeAddress) {
        return res.status(400).json({ error: '请填写家庭地址' });
      }
      if (!contactPhone) {
        return res.status(400).json({ error: '请填写家人电话' });
      }
    }

    const client = getSupabaseClient();

    // 检查手机号是否已注册
    const { data: existingUser } = await client
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: '该手机号已注册' });
    }

    // 构建用户数据
    const userData: any = {
      name,
      phone,
      role,
    };

    // 老人端添加扩展信息
    if (role === 'elderly') {
      if (homeAddress) userData.home_address = homeAddress;
      if (contactPhone) userData.contact_phone = contactPhone;
      if (communityPhone) userData.community_phone = communityPhone;
      if (healthConditions && Array.isArray(healthConditions)) {
        userData.health_conditions = healthConditions;
      }
      if (livingConditions && Array.isArray(livingConditions)) {
        userData.living_conditions = livingConditions;
      }
    }

    // 监护人端添加扩展信息（全部选填）
    if (role === 'guardian') {
      if (father_name) userData.father_name = father_name;
      if (father_phone) userData.father_phone = father_phone;
      if (mother_name) userData.mother_name = mother_name;
      if (mother_phone) userData.mother_phone = mother_phone;
      if (backup_contact_name) userData.backup_contact_name = backup_contact_name;
      if (backup_contact_phone) userData.backup_contact_phone = backup_contact_phone;
      if (backup_contact_relation) userData.backup_contact_relation = backup_contact_relation;
    }

    // 创建用户
    const { data: user, error } = await client
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      console.error('Insert user error:', error);
      throw error;
    }

    // 创建会话token
    const deviceInfo = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const { token, expiresAt } = await createSession(user.id, deviceInfo, ipAddress);

    // 创建欢迎通知消息
    const welcomeTitle = role === 'elderly' ? '🎉 欢迎使用AI助老应用' : '👋 欢迎使用AI助老应用';
    const welcomeContent = role === 'elderly' 
      ? `亲爱的${name}，欢迎使用AI助老应用！我们致力于为您提供便捷、贴心的服务。如有任何问题，请随时联系您的监护人或在设置中查看帮助。`
      : `尊敬的${name}，欢迎使用AI助老应用！您已成功注册监护人账户，可以随时关注您家人的健康状况。如有疑问，请在设置中查看帮助。`;

    await client
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'system',
        title: welcomeTitle,
        content: welcomeContent,
        is_read: false,
      });

    res.json({ 
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        // 老人端字段
        homeAddress: user.home_address,
        communityPhone: user.community_phone,
        contactPhone: user.contact_phone,
        healthConditions: user.health_conditions || [],
        livingConditions: user.living_conditions || [],
        // 监护人端字段
        father_name: user.father_name,
        father_phone: user.father_phone,
        mother_name: user.mother_name,
        mother_phone: user.mother_phone,
        backup_contact_name: user.backup_contact_name,
        backup_contact_phone: user.backup_contact_phone,
        backup_contact_relation: user.backup_contact_relation,
        createdAt: user.created_at,
      },
      token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

/**
 * 用户登出
 * POST /api/v1/auth/logout
 * Headers: Authorization: Bearer <token>
 */
router.post('/logout', async (req, res) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (token) {
      await deleteSession(token);
    }

    res.json({ success: true, message: '已退出登录' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: '退出失败' });
  }
});

/**
 * 验证token有效性
 * GET /api/v1/auth/verify
 * Headers: Authorization: Bearer <token>
 */
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return res.status(401).json({ valid: false, error: '未提供token' });
    }

    const { validateToken } = await import('../utils/session');
    const userId = await validateToken(token);

    if (!userId) {
      return res.status(401).json({ valid: false, error: 'token无效或已过期' });
    }

    // 获取用户信息
    const client = getSupabaseClient();
    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ valid: false, error: '用户不存在' });
    }

    // 获取绑定用户信息
    let boundUser = null;
    if (user.bound_user_id) {
      const { data: bound } = await client
        .from('users')
        .select('*')
        .eq('id', user.bound_user_id)
        .single();
      boundUser = bound;
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        boundUserId: user.bound_user_id,
        boundUserName: boundUser?.name,
        homeAddress: user.home_address,
        homeLocation: user.home_location, // 家庭地址坐标
        communityPhone: user.community_phone,
        contactPhone: user.contact_phone,
        healthConditions: user.health_conditions || [],
        livingConditions: user.living_conditions || [],
        father_name: user.father_name,
        father_phone: user.father_phone,
        mother_name: user.mother_name,
        mother_phone: user.mother_phone,
        backup_contact_name: user.backup_contact_name,
        backup_contact_phone: user.backup_contact_phone,
        backup_contact_relation: user.backup_contact_relation,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        // 绑定用户详细信息（驼峰格式）
        boundUser: boundUser ? {
          id: boundUser.id,
          name: boundUser.name,
          phone: boundUser.phone,
          role: boundUser.role,
          homeAddress: boundUser.home_address,
          homeLocation: boundUser.home_location, // 关键：包含经纬度
          communityPhone: boundUser.community_phone,
          contactPhone: boundUser.contact_phone,
          healthConditions: boundUser.health_conditions || [],
          livingConditions: boundUser.living_conditions || [],
          createdAt: boundUser.created_at,
        } : null,
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ valid: false, error: '验证失败' });
  }
});

export default router;
