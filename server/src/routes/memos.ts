import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { z } from 'zod';

const router = express.Router();

// 备忘录分类
export const MEMO_CATEGORIES = {
  general: { name: '日常', color: '#8ab3cf', icon: 'note-sticky' },
  health: { name: '健康', color: '#5a8a7a', icon: 'heart-pulse' },
  important: { name: '重要', color: '#c27878', icon: 'star' },
  todo: { name: '待办', color: '#d4a574', icon: 'list-check' },
} as const;

// 创建备忘录参数校验
const createMemoSchema = z.object({
  binding_id: z.number(),
  creator_id: z.number(),
  title: z.string().max(200).optional(),
  content: z.string().min(1),
  category: z.enum(['general', 'health', 'important', 'todo']).optional().default('general'),
  is_pinned: z.boolean().optional().default(false),
  reminder_time: z.string().optional(),
});

// 更新备忘录参数校验
const updateMemoSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).optional(),
  category: z.enum(['general', 'health', 'important', 'todo']).optional(),
  is_pinned: z.boolean().optional(),
  is_completed: z.boolean().optional(),
  reminder_time: z.string().nullable().optional(),
});

/**
 * 获取分类列表
 * GET /api/v1/memos/categories
 */
router.get('/categories', (req, res) => {
  res.json({
    categories: Object.entries(MEMO_CATEGORIES).map(([key, value]) => ({
      type: key,
      ...value,
    })),
  });
});

/**
 * 获取备忘录列表（根据绑定关系）
 * GET /api/v1/memos
 * Query: binding_id (required), category?, is_pinned?
 */
router.get('/', async (req, res) => {
  try {
    const { binding_id, category, is_pinned } = req.query;

    if (!binding_id) {
      return res.status(400).json({ error: '缺少绑定关系ID' });
    }

    const client = getSupabaseClient();

    let query = client
      .from('memos')
      .select('*')
      .eq('binding_id', binding_id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    if (is_pinned !== undefined) {
      query = query.eq('is_pinned', is_pinned === 'true');
    }

    const { data: memos, error } = await query;

    if (error) {
      throw error;
    }

    // 获取创建者信息
    const client2 = getSupabaseClient();
    const creatorIds = [...new Set((memos || []).map((m: any) => m.creator_id))];
    const { data: creators } = await client2
      .from('users')
      .select('id, name, role')
      .in('id', creatorIds);

    const creatorMap = new Map((creators || []).map((c: any) => [c.id, c]));

    // 转换字段名
    const transformedMemos = (memos || []).map((memo: any) => ({
      id: memo.id,
      bindingId: memo.binding_id,
      creatorId: memo.creator_id,
      creatorName: creatorMap.get(memo.creator_id)?.name || '未知',
      creatorRole: creatorMap.get(memo.creator_id)?.role || 'unknown',
      title: memo.title,
      content: memo.content,
      category: memo.category,
      isPinned: memo.is_pinned,
      isCompleted: memo.is_completed,
      reminderTime: memo.reminder_time,
      createdAt: memo.created_at,
      updatedAt: memo.updated_at,
    }));

    res.json({ memos: transformedMemos });
  } catch (error) {
    console.error('Get memos error:', error);
    res.status(500).json({ error: '获取备忘录失败' });
  }
});

/**
 * 获取单个备忘录
 * GET /api/v1/memos/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { data: memo, error } = await client
      .from('memos')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (error || !memo) {
      return res.status(404).json({ error: '备忘录不存在' });
    }

    // 获取创建者信息
    const { data: creator } = await client
      .from('users')
      .select('id, name, role')
      .eq('id', memo.creator_id)
      .single();

    res.json({
      memo: {
        id: memo.id,
        bindingId: memo.binding_id,
        creatorId: memo.creator_id,
        creatorName: creator?.name || '未知',
        creatorRole: creator?.role || 'unknown',
        title: memo.title,
        content: memo.content,
        category: memo.category,
        isPinned: memo.is_pinned,
        isCompleted: memo.is_completed,
        reminderTime: memo.reminder_time,
        createdAt: memo.created_at,
        updatedAt: memo.updated_at,
      },
    });
  } catch (error) {
    console.error('Get memo error:', error);
    res.status(500).json({ error: '获取备忘录失败' });
  }
});

/**
 * 创建备忘录
 * POST /api/v1/memos
 */
router.post('/', async (req, res) => {
  try {
    const params = createMemoSchema.parse(req.body);
    const client = getSupabaseClient();

    const { data: memo, error } = await client
      .from('memos')
      .insert({
        binding_id: params.binding_id,
        creator_id: params.creator_id,
        title: params.title,
        content: params.content,
        category: params.category,
        is_pinned: params.is_pinned,
        reminder_time: params.reminder_time,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      memo: {
        id: memo.id,
        bindingId: memo.binding_id,
        creatorId: memo.creator_id,
        title: memo.title,
        content: memo.content,
        category: memo.category,
        isPinned: memo.is_pinned,
        createdAt: memo.created_at,
      },
    });
  } catch (error) {
    console.error('Create memo error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(500).json({ error: '创建备忘录失败' });
  }
});

/**
 * 更新备忘录
 * PATCH /api/v1/memos/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const params = updateMemoSchema.parse(req.body);
    const client = getSupabaseClient();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (params.title !== undefined) updateData.title = params.title;
    if (params.content !== undefined) updateData.content = params.content;
    if (params.category !== undefined) updateData.category = params.category;
    if (params.is_pinned !== undefined) updateData.is_pinned = params.is_pinned;
    if (params.is_completed !== undefined) updateData.is_completed = params.is_completed;
    if (params.reminder_time !== undefined) updateData.reminder_time = params.reminder_time;

    const { data: memo, error } = await client
      .from('memos')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error || !memo) {
      return res.status(404).json({ error: '备忘录不存在' });
    }

    res.json({ success: true, memo });
  } catch (error) {
    console.error('Update memo error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(500).json({ error: '更新备忘录失败' });
  }
});

/**
 * 删除备忘录
 * DELETE /api/v1/memos/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { error } = await client
      .from('memos')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      throw error;
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('Delete memo error:', error);
    res.status(500).json({ error: '删除备忘录失败' });
  }
});

/**
 * 切换置顶状态
 * POST /api/v1/memos/:id/toggle-pin
 */
router.post('/:id/toggle-pin', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    // 先获取当前状态
    const { data: memo, error: fetchError } = await client
      .from('memos')
      .select('is_pinned')
      .eq('id', parseInt(id))
      .single();

    if (fetchError || !memo) {
      return res.status(404).json({ error: '备忘录不存在' });
    }

    // 切换状态
    const { error: updateError } = await client
      .from('memos')
      .update({
        is_pinned: !memo.is_pinned,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parseInt(id));

    if (updateError) {
      throw updateError;
    }

    res.json({ success: true, isPinned: !memo.is_pinned });
  } catch (error) {
    console.error('Toggle pin error:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

/**
 * 切换完成状态
 * POST /api/v1/memos/:id/toggle-complete
 */
router.post('/:id/toggle-complete', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    // 先获取当前状态
    const { data: memo, error: fetchError } = await client
      .from('memos')
      .select('is_completed')
      .eq('id', parseInt(id))
      .single();

    if (fetchError || !memo) {
      return res.status(404).json({ error: '备忘录不存在' });
    }

    // 切换状态
    const { error: updateError } = await client
      .from('memos')
      .update({
        is_completed: !memo.is_completed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parseInt(id));

    if (updateError) {
      throw updateError;
    }

    res.json({ success: true, isCompleted: !memo.is_completed });
  } catch (error) {
    console.error('Toggle complete error:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

export default router;
