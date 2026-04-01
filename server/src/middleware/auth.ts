/**
 * 认证中间件
 * 验证请求中的token并注入用户信息
 */
import type { Request, Response, NextFunction } from 'express';
import { validateToken } from '../utils/session';
import { getSupabaseClient } from '../storage/database/supabase-client';

// 扩展Request类型
declare global {
  namespace Express {
    interface Request {
      userId?: number;
      user?: any;
    }
  }
}

// 从请求头中提取token
function extractToken(req: Request): string | null {
  // 优先从Authorization头获取
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 其次从cookie获取（Web端）
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'auth_token' && value) {
        return value;
      }
    }
  }

  return null;
}

// 认证中间件（可选）
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (token) {
    try {
      const userId = await validateToken(token);
      if (userId) {
        req.userId = userId;

        // 获取用户信息
        const client = getSupabaseClient();
        const { data: user } = await client
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (user) {
          req.user = user;
        }
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
    }
  }

  next();
}

// 认证中间件（必须登录）
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: '请先登录', code: 'UNAUTHORIZED' });
  }

  try {
    const userId = await validateToken(token);

    if (!userId) {
      return res.status(401).json({ error: '登录已过期，请重新登录', code: 'TOKEN_EXPIRED' });
    }

    req.userId = userId;

    // 获取用户信息
    const client = getSupabaseClient();
    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: '用户不存在', code: 'USER_NOT_FOUND' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: '认证失败' });
  }
}

// 检查是否为老人端用户
export function requireElderly(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'elderly') {
    return res.status(403).json({ error: '仅限老人端用户访问' });
  }
  next();
}

// 检查是否为监护人端用户
export function requireGuardian(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'guardian') {
    return res.status(403).json({ error: '仅限监护人端用户访问' });
  }
  next();
}
