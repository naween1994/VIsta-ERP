import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';
import { getSessionUserId } from './session.ts';
import type { User } from '../src/types/index.ts';

function isAdmin(user: User): boolean {
  return user.role === 'admin' || user.permissions.includes('admin') || user.permissions.includes('all');
}

function hasPermission(user: User, permission: string): boolean {
  return isAdmin(user) || user.permissions.includes(permission);
}

function requiredPermission(path: string, method: string): string | 'admin' | null {
  if (path === '/state') return 'admin';
  if (path === '/auth/users') return 'admin';
  if (path === '/auth/logout' || path === '/auth/change-password') return null;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null;
  if (path.startsWith('/settings')) return 'admin';
  if (path.startsWith('/auth/')) {
    return 'admin';
  }
  if (path.startsWith('/products')) {
    if (method === 'DELETE' || path.includes('/reset-catalog')) return 'admin';
    return path.includes('/adjust-stock') ? 'stock_adjust' : 'inventory_write';
  }
  if (path.startsWith('/customers')) return 'customer_write';
  if (path.startsWith('/orders')) {
    return method === 'DELETE' ? 'admin' : 'sales_write';
  }
  if (path.startsWith('/accounting')) return 'accounting';
  if (path.startsWith('/reports')) return 'reports';
  if (path.startsWith('/delivery')) return 'admin';
  if (path.startsWith('/notifications')) {
    return path.includes('/payment-reminders') ? 'sales_write' : null;
  }
  return 'admin';
}

export function apiAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/health' || req.path === '/auth/login' || req.path === '/auth/session') {
    const userId = getSessionUserId(req);
    if (userId) res.locals.user = db.getUserById(userId);
    next();
    return;
  }

  const userId = getSessionUserId(req);
  const user = userId ? db.getUserById(userId) : undefined;
  if (!user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }
  res.locals.user = user;

  const permission = requiredPermission(req.path, req.method);
  if (
    permission === 'admin' && !isAdmin(user) ||
    permission !== null && permission !== 'admin' && !hasPermission(user, permission)
  ) {
    res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
    return;
  }
  next();
}
