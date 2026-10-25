import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';

const COOKIE_NAME = 'vista_erp_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 8;
const DEVELOPMENT_SECRET = 'local-only-session-key-do-not-use-in-production';

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be configured in production.');
  }
  return DEVELOPMENT_SECRET;
}

function signature(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

export function setSessionCookie(res: Response, userId: string): void {
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  })).toString('base64url');
  const token = `${payload}.${signature(payload)}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DURATION_SECONDS}${secure}`
  );
}

export function clearSessionCookie(res: Response): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}

export function getSessionUserId(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookie = cookieHeader.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return null;

  const token = cookie.slice(COOKIE_NAME.length + 1);
  const separator = token.indexOf('.');
  if (separator < 1) return null;

  const payload = token.slice(0, separator);
  const providedSignature = Buffer.from(token.slice(separator + 1), 'base64url');
  const expectedSignature = Buffer.from(signature(payload), 'base64url');
  if (
    providedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(providedSignature, expectedSignature)
  ) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof session.sub !== 'string' || typeof session.exp !== 'number') return null;
    if (session.exp <= Math.floor(Date.now() / 1000)) return null;
    return session.sub;
  } catch {
    return null;
  }
}
