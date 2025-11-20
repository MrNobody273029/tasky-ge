// src/lib/crypto.ts
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(_scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) return false;
  const buf = (await scrypt(password, salt, 64)) as Buffer;
  const hash = Buffer.from(hashHex, 'hex');
  // უსაფრთხო შედარება
  return buf.length === hash.length && timingSafeEqual(buf, hash);
}
