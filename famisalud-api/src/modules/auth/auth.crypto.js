import {
  createHmac,
  createHash,
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual
} from 'node:crypto';
import { promisify } from 'node:util';
import { env } from '../../config/env.js';

const scrypt = promisify(scryptCallback);
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024
  });

  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64url')}$${Buffer.from(derivedKey).toString('base64url')}`;
}

export async function verifyPassword(password, storedHash) {
  try {
    const [algorithm, nText, rText, pText, saltText, keyText] = String(storedHash).split('$');
    if (algorithm !== 'scrypt' || !nText || !rText || !pText || !saltText || !keyText) return false;

    const expected = Buffer.from(keyText, 'base64url');
    const actual = Buffer.from(await scrypt(password, Buffer.from(saltText, 'base64url'), expected.length, {
      N: Number(nText),
      r: Number(rText),
      p: Number(pText),
      maxmem: 64 * 1024 * 1024
    }));

    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function hashRefreshToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function createRefreshToken() {
  return randomBytes(48).toString('base64url');
}

export function createPasswordResetCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashPasswordResetCode(userId, code) {
  return createHmac('sha256', env.JWT_SECRET).update(`${userId}:${code}`).digest('hex');
}

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function createAccessToken(userId, sessionId) {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: 'HS256', typ: 'JWT' });
  const payload = encodeJson({
    iss: 'famisalud-api',
    aud: 'famisalud-client',
    sub: userId,
    sid: sessionId,
    typ: 'access',
    iat: now,
    exp: now + env.ACCESS_TOKEN_MINUTES * 60
  });
  const input = `${header}.${payload}`;
  const signature = createHmac('sha256', env.JWT_SECRET).update(input).digest('base64url');
  return `${input}.${signature}`;
}

export function verifyAccessToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('JWT inválido.');

  const input = `${parts[0]}.${parts[1]}`;
  const expected = createHmac('sha256', env.JWT_SECRET).update(input).digest();
  const actual = Buffer.from(parts[2], 'base64url');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error('Firma JWT inválida.');
  }

  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);

  if (header.alg !== 'HS256' || header.typ !== 'JWT') throw new Error('Encabezado JWT inválido.');
  if (payload.iss !== 'famisalud-api' || payload.aud !== 'famisalud-client' || payload.typ !== 'access') {
    throw new Error('JWT no válido para esta API.');
  }
  if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') throw new Error('JWT incompleto.');
  if (!Number.isInteger(payload.exp) || payload.exp <= now) throw new Error('JWT expirado.');
  if (payload.iat && payload.iat > now + 60) throw new Error('JWT emitido en el futuro.');

  return payload;
}
