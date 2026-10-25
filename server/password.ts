import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(storedPassword: string | undefined, attemptedPassword: unknown): boolean {
  if (!storedPassword || typeof attemptedPassword !== 'string') return false;

  const [algorithm, salt, storedHash] = storedPassword.split('$');
  if (algorithm !== 'scrypt' || !salt || !storedHash) {
    return storedPassword === attemptedPassword;
  }

  const attemptedHash = scryptSync(attemptedPassword, salt, KEY_LENGTH);
  const expectedHash = Buffer.from(storedHash, 'hex');
  return attemptedHash.length === expectedHash.length && timingSafeEqual(attemptedHash, expectedHash);
}

export function isPasswordHashed(password: string | undefined): boolean {
  return Boolean(password?.startsWith('scrypt$'));
}
