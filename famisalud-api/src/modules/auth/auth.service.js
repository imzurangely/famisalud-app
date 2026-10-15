import { timingSafeEqual } from 'node:crypto';
import { withTransaction, query } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/utils/AppError.js';
import { sendPasswordResetEmail, hasSmtpConfiguration } from '../../config/mailer.js';
import {
  createAccessToken,
  createPasswordResetCode,
  createRefreshToken,
  hashPassword,
  hashPasswordResetCode,
  hashRefreshToken,
  verifyPassword
} from './auth.crypto.js';
import * as repository from './auth.repository.js';

const REFRESH_TTL_MS = env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 10 * 60 * 1000;
const GENERIC_RESET_MESSAGE = 'Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.';

function safeUser(user) {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatar_url,
    timezone: user.timezone,
    locale: user.locale,
    isVerified: user.is_verified,
    isActive: user.is_active,
    createdAt: user.created_at
  };
}

function sessionMetadata(req) {
  return {
    userAgent: req.get('user-agent')?.slice(0, 1000) ?? null,
    ipAddress: req.ip ?? null
  };
}

function expiresFromNow(milliseconds) {
  return new Date(Date.now() + milliseconds);
}

async function createLoginSession(userId, req) {
  const refreshToken = createRefreshToken();
  const session = await withTransaction((client) => repository.createSession(client, {
    userId,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: expiresFromNow(REFRESH_TTL_MS),
    ...sessionMetadata(req)
  }));

  return {
    accessToken: createAccessToken(userId, session.id),
    refreshToken,
    sessionId: session.id,
    refreshExpiresAt: session.expires_at
  };
}

export async function register(data, req) {
  const passwordHash = await hashPassword(data.password);
  const user = await withTransaction(async (client) => repository.createUser(client, data, passwordHash));
  const session = await createLoginSession(user.id, req);
  return {
    user: safeUser(user),
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    sessionId: session.sessionId,
    refreshExpiresAt: session.refreshExpiresAt,
    familySetupRequired: true
  };
}

export async function login(data, req) {
  const user = await withTransaction((client) => repository.findUserByEmail(client, data.email));
  if (!user || !user.is_active) {
    throw new AppError('Correo o contraseña incorrectos.', 401);
  }

  let passwordIsValid = await verifyPassword(data.password, user.password_hash);

  // Compatibilidad con usuarios demo/anteriores creados con pgcrypto crypt(..., gen_salt('bf')).
  // Si el login es correcto, migramos el hash al formato scrypt de la Fase 7.
  if (!passwordIsValid && /^\$2[aby]\$/.test(user.password_hash)) {
    const legacyCheck = await query(
      'SELECT crypt($1, $2) = $2 AS matches',
      [data.password, user.password_hash]
    );
    passwordIsValid = legacyCheck.rows[0]?.matches === true;

    if (passwordIsValid) {
      const upgradedHash = await hashPassword(data.password);
      await withTransaction((client) => repository.updatePasswordHash(client, user.id, upgradedHash));
    }
  }

  if (!passwordIsValid) {
    throw new AppError('Correo o contraseña incorrectos.', 401);
  }

  const session = await createLoginSession(user.id, req);
  const hasFamily = await withTransaction((client) => repository.hasActiveFamily(client, user.id));
  return {
    user: safeUser(user),
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    sessionId: session.sessionId,
    refreshExpiresAt: session.refreshExpiresAt,
    familySetupRequired: !hasFamily
  };
}

export async function refresh(rawRefreshToken, req) {
  if (!rawRefreshToken) throw new AppError('No hay una sesión de renovación activa.', 401);

  const currentHash = hashRefreshToken(rawRefreshToken);
  const replacement = createRefreshToken();
  const replacementHash = hashRefreshToken(replacement);
  const expiresAt = expiresFromNow(REFRESH_TTL_MS);

  const session = await withTransaction(async (client) => {
    const current = await repository.findSessionByRefreshHashForUpdate(client, currentHash);
    if (!current || current.revoked_at || new Date(current.expires_at) <= new Date() || !current.is_active || current.deleted_at) {
      return null;
    }

    return repository.rotateSession(client, current.id, currentHash, replacementHash, expiresAt, sessionMetadata(req));
  });

  if (!session) throw new AppError('La sesión ha expirado o fue revocada. Inicia sesión nuevamente.', 401);

  return {
    accessToken: createAccessToken(session.user_id, session.id),
    refreshToken: replacement,
    sessionId: session.id,
    refreshExpiresAt: session.expires_at
  };
}

export async function logout(rawRefreshToken) {
  if (!rawRefreshToken) return;
  await withTransaction((client) => repository.revokeSessionByRefreshHash(client, hashRefreshToken(rawRefreshToken)));
}

export async function getMe(userId) {
  const user = await withTransaction((client) => repository.findUserById(client, userId));
  if (!user) throw new AppError('Usuario no encontrado o inactivo.', 401);
  const hasFamily = await withTransaction((client) => repository.hasActiveFamily(client, userId));
  return { user: safeUser(user), familySetupRequired: !hasFamily };
}

export async function listSessions(userId, currentSessionId) {
  const sessions = await withTransaction((client) => repository.listSessions(client, userId));
  return sessions.map((session) => ({
    id: session.id,
    createdAt: session.created_at,
    lastUsedAt: session.last_used_at,
    expiresAt: session.expires_at,
    userAgent: session.user_agent,
    ipAddress: session.ip_address,
    isCurrent: session.id === currentSessionId
  }));
}

export async function revokeSession(userId, sessionId) {
  const revoked = await withTransaction((client) => repository.revokeSessionById(client, userId, sessionId));
  if (!revoked) throw new AppError('La sesión no existe o ya fue revocada.', 404);
}

export async function revokeAllSessions(userId) {
  return withTransaction((client) => repository.revokeAllSessions(client, userId));
}

export async function forgotPassword(email) {
  if (env.NODE_ENV === 'production' && !hasSmtpConfiguration()) {
    throw new AppError('El servicio de recuperación de contraseña no está disponible temporalmente.', 503);
  }

  const resetRequest = await withTransaction(async (client) => {
    const user = await repository.findUserByEmail(client, email);
    if (!user || !user.is_active) return { found: false };

    if (await repository.hasRecentResetCode(client, user.id)) return { found: true, cooldown: true };

    await repository.consumeOutstandingResetCodes(client, user.id);
    const code = createPasswordResetCode();
    const resetRow = await repository.createPasswordResetCode(
      client,
      user.id,
      hashPasswordResetCode(user.id, code),
      expiresFromNow(RESET_TTL_MS)
    );
    return { found: true, cooldown: false, user, code, resetId: resetRow.id, expiresAt: resetRow.expires_at };
  });

  if (!resetRequest.found) return { message: GENERIC_RESET_MESSAGE };
  if (resetRequest.cooldown) return { message: GENERIC_RESET_MESSAGE, retryAfterSeconds: 60 };

  if (hasSmtpConfiguration()) {
    try {
      await sendPasswordResetEmail({
        to: resetRequest.user.email,
        firstName: resetRequest.user.first_name,
        code: resetRequest.code
      });
    } catch (error) {
      await withTransaction((client) => repository.markResetCodeUsed(client, resetRequest.resetId));
      throw error;
    }
    return { message: GENERIC_RESET_MESSAGE };
  }

  if (env.NODE_ENV !== 'production') {
    console.warn(`[auth] Código de recuperación de desarrollo para ${resetRequest.user.email}: ${resetRequest.code}`);
    return { message: GENERIC_RESET_MESSAGE, debugCode: resetRequest.code, expiresAt: resetRequest.expiresAt };
  }

  return { message: GENERIC_RESET_MESSAGE };
}

export async function resetPassword(data) {
  const newPasswordHash = await hashPassword(data.newPassword);
  const result = await withTransaction(async (client) => {
    const user = await repository.findUserByEmail(client, data.email);
    if (!user || !user.is_active) return { ok: false };

    const reset = await repository.findLatestResetCodeForUpdate(client, user.id);
    if (!reset || reset.used_at || reset.attempts >= reset.max_attempts || new Date(reset.expires_at) <= new Date()) {
      if (reset && !reset.used_at && new Date(reset.expires_at) <= new Date()) {
        await repository.markResetCodeUsed(client, reset.id);
      }
      return { ok: false };
    }

    const expected = Buffer.from(reset.code_hash, 'hex');
    const actual = Buffer.from(hashPasswordResetCode(user.id, data.code), 'hex');
    const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

    if (!matches) {
      await repository.incrementResetAttempts(client, reset.id);
      return { ok: false };
    }

    await repository.updatePasswordAndRevokeSessions(client, user.id, newPasswordHash);
    await repository.markResetCodeUsed(client, reset.id);
    return { ok: true };
  });

  if (!result.ok) throw new AppError('El código es inválido, expiró o superó el número de intentos permitidos.', 422);
  return { message: 'Tu contraseña fue actualizada. Inicia sesión nuevamente.' };
}

export async function assertSessionActive(sessionId, userId) {
  const result = await query(
    `SELECT 1
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.id = $1 AND rt.user_id = $2
       AND rt.revoked_at IS NULL AND rt.expires_at > CURRENT_TIMESTAMP
       AND u.is_active = TRUE AND u.deleted_at IS NULL
     LIMIT 1`,
    [sessionId, userId]
  );
  return Boolean(result.rows[0]);
}
