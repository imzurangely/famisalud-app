import { AppError } from '../shared/utils/AppError.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';
import { verifyAccessToken } from '../modules/auth/auth.crypto.js';

export async function devIdentity(req, res, next) {
  const authorization = req.get('authorization');

  if (authorization) {
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return next(new AppError('El encabezado Authorization debe usar Bearer.', 401));
    }

    let payload;
    try {
      payload = verifyAccessToken(match[1]);
    } catch (error) {
      if (env.NODE_ENV !== 'production') {
        console.error('[auth] Error al verificar access token:', error.message);
      }
      return next(new AppError('Token de acceso inválido o expirado.', 401));
    }

    try {
      const sessionResult = await query(
        `SELECT 1
         FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
         WHERE rt.id = $1 AND rt.user_id = $2
           AND rt.revoked_at IS NULL AND rt.expires_at > CURRENT_TIMESTAMP
           AND u.is_active = TRUE AND u.deleted_at IS NULL
         LIMIT 1`,
        [payload.sid, payload.sub]
      );

      if (!sessionResult.rows[0]) {
        return next(new AppError('La sesión ha expirado o fue revocada. Inicia sesión nuevamente.', 401));
      }

      req.user = { id: payload.sub, sessionId: payload.sid };
      return next();
    } catch (error) {
      return next(error);
    }
  }

  if (!env.ENABLE_DEV_AUTH || env.NODE_ENV === 'production') {
    return next(new AppError('Debes iniciar sesión para continuar.', 401));
  }

  const userId = req.header('x-dev-user-id') || env.DEV_USER_ID;
  if (!userId) return next(new AppError('Falta la identidad de desarrollo.', 401));

  req.user = { id: userId, sessionId: null, isDevelopmentIdentity: true };
  next();
}
