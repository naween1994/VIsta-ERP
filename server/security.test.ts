import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { hashPassword, verifyPassword } from './password.ts';
import { getSessionUserId, setSessionCookie } from './session.ts';

test('password hashes verify only the matching password', () => {
  const hash = hashPassword('correct horse battery staple');
  assert.match(hash, /^scrypt\$/);
  assert.equal(verifyPassword(hash, 'correct horse battery staple'), true);
  assert.equal(verifyPassword(hash, 'incorrect password'), false);
  assert.equal(verifyPassword(hash, undefined), false);
});

test('legacy plain-text passwords can be verified for migration', () => {
  assert.equal(verifyPassword('legacy-password', 'legacy-password'), true);
  assert.equal(verifyPassword('legacy-password', 'different-password'), false);
});

test('sessions are signed and reject tampered payloads', () => {
  const originalSecret = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = 'test-session-secret-with-more-than-32-characters';

  try {
    let cookieHeader = '';
    const response = {
      setHeader: (_name: string, value: string) => {
        cookieHeader = value;
      },
    } as unknown as Response;
    setSessionCookie(response, 'user-123');

    const cookie = cookieHeader.split(';')[0];
    const request = { headers: { cookie } } as unknown as Request;
    assert.equal(getSessionUserId(request), 'user-123');

    const signature = cookie.split('=')[1].split('.')[1];
    const tamperedPayload = Buffer.from(JSON.stringify({ sub: 'admin', exp: 9999999999 })).toString('base64url');
    const tamperedRequest = {
      headers: { cookie: `vista_erp_session=${tamperedPayload}.${signature}` },
    } as unknown as Request;
    assert.equal(getSessionUserId(tamperedRequest), null);
  } finally {
    if (originalSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalSecret;
  }
});
