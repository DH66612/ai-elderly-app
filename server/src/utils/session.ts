/**
 * 会话管理工具
 * 生成、验证、刷新会话token
 */
import { randomBytes } from 'crypto';
import { getSupabaseClient } from '../storage/database/supabase-client';

// 会话配置
export const SESSION_CONFIG = {
  // token有效期（天）
  expiresDays: 30,
  // token长度（字节）
  tokenLength: 32,
};

// 生成随机token
export function generateToken(length: number = SESSION_CONFIG.tokenLength): string {
  return randomBytes(length).toString('hex');
}

// 计算过期时间
export function calculateExpiresAt(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_CONFIG.expiresDays);
  return expiresAt;
}

// 创建会话
export async function createSession(
  userId: number,
  deviceInfo?: string,
  ipAddress?: string
): Promise<{ token: string; expiresAt: Date }> {
  const client = getSupabaseClient();
  const token = generateToken();
  const expiresAt = calculateExpiresAt();

  const { error } = await client
    .from('sessions')
    .insert({
      user_id: userId,
      token,
      device_info: deviceInfo || null,
      ip_address: ipAddress || null,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.error('Create session error:', error);
    throw new Error('创建会话失败');
  }

  return { token, expiresAt };
}

// 验证token并返回用户ID
export async function validateToken(token: string): Promise<number | null> {
  if (!token) return null;

  const client = getSupabaseClient();
  const now = new Date().toISOString();

  const { data: session, error } = await client
    .from('sessions')
    .select('user_id, expires_at')
    .eq('token', token)
    .single();

  if (error || !session) {
    return null;
  }

  // 检查是否过期
  if (new Date(session.expires_at) < new Date()) {
    // 删除过期会话
    await client.from('sessions').delete().eq('token', token);
    return null;
  }

  // 更新最后活跃时间
  await client
    .from('sessions')
    .update({ last_active_at: now })
    .eq('token', token);

  return session.user_id;
}

// 删除会话（登出）
export async function deleteSession(token: string): Promise<void> {
  const client = getSupabaseClient();
  await client.from('sessions').delete().eq('token', token);
}

// 删除用户的所有会话
export async function deleteUserSessions(userId: number): Promise<void> {
  const client = getSupabaseClient();
  await client.from('sessions').delete().eq('user_id', userId);
}

// 清理过期会话
export async function cleanExpiredSessions(): Promise<number> {
  const client = getSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await client
    .from('sessions')
    .delete()
    .lt('expires_at', now)
    .select('id');

  if (error) {
    console.error('Clean expired sessions error:', error);
    return 0;
  }

  return data?.length || 0;
}

// 获取用户的所有活跃会话
export async function getUserSessions(userId: number) {
  const client = getSupabaseClient();
  const now = new Date().toISOString();

  const { data: sessions, error } = await client
    .from('sessions')
    .select('id, device_info, ip_address, created_at, last_active_at, expires_at')
    .eq('user_id', userId)
    .gte('expires_at', now)
    .order('last_active_at', { ascending: false });

  if (error) {
    console.error('Get user sessions error:', error);
    return [];
  }

  return sessions || [];
}
