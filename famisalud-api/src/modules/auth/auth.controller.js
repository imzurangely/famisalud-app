import { env } from '../../config/env.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as service from './auth.service.js';

function refreshCookieName() {
  return env.REFRESH_COOKIE_NAME;
}

function refreshCookiePath() {
  const prefix = env.API_PREFIX.replace(/\/$/, '');
  return `${prefix}/auth` || '/api/auth';
}

function setRefreshCookie(res, token) {
  const maxAge = env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000;
  const secure = env.NODE_ENV === 'production' ? '; Secure' : '';
  const sameSite = env.NODE_ENV === 'production' ? 'None' : 'Lax';
  res.setHeader('Set-Cookie', `${refreshCookieName()}=${encodeURIComponent(token)}; HttpOnly; SameSite=${sameSite}; Path=${refreshCookiePath()}; Max-Age=${Math.floor(maxAge / 1000)}${secure}`);
}

export function clearRefreshCookie(res) {
  const secure = env.NODE_ENV === 'production' ? '; Secure' : '';
  const sameSite = env.NODE_ENV === 'production' ? 'None' : 'Lax';
  res.setHeader('Set-Cookie', `${refreshCookieName()}=; HttpOnly; SameSite=${sameSite}; Path=${refreshCookiePath()}; Max-Age=0${secure}`);
}

export function readRefreshCookie(req) {
  const cookieHeader = req.headers.cookie ?? '';
  const prefix = `${refreshCookieName()}=`;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      try { return decodeURIComponent(trimmed.slice(prefix.length)); }
      catch { return null; }
    }
  }
  return null;
}

export const register = asyncHandler(async (req, res) => {
  const result = await service.register(req.validated.body, req);
  setRefreshCookie(res, result.refreshToken);
  const { refreshToken, ...data } = result;
  res.status(201).json({ success: true, data });
});

export const login = asyncHandler(async (req, res) => {
  const result = await service.login(req.validated.body, req);
  setRefreshCookie(res, result.refreshToken);
  const { refreshToken, ...data } = result;
  res.status(200).json({ success: true, data });
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await service.refresh(readRefreshCookie(req), req);
  setRefreshCookie(res, result.refreshToken);
  const { refreshToken, ...data } = result;
  res.status(200).json({ success: true, data });
});

export const logout = asyncHandler(async (req, res) => {
  await service.logout(readRefreshCookie(req));
  clearRefreshCookie(res);
  res.status(200).json({ success: true, message: 'Sesión cerrada correctamente.' });
});

export const me = asyncHandler(async (req, res) => {
  const data = await service.getMe(req.user.id);
  res.status(200).json({ success: true, data });
});

export const listSessions = asyncHandler(async (req, res) => {
  const data = await service.listSessions(req.user.id, req.user.sessionId ?? null);
  res.status(200).json({ success: true, data });
});

export const revokeSession = asyncHandler(async (req, res) => {
  await service.revokeSession(req.user.id, req.validated.params.sessionId);
  if (req.user.sessionId === req.validated.params.sessionId) clearRefreshCookie(res);
  res.status(200).json({ success: true, message: 'Sesión revocada correctamente.' });
});

export const revokeAllSessions = asyncHandler(async (req, res) => {
  const revokedCount = await service.revokeAllSessions(req.user.id);
  clearRefreshCookie(res);
  res.status(200).json({ success: true, data: { revokedCount }, message: 'Todas las sesiones fueron revocadas.' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const data = await service.forgotPassword(req.validated.body.email);
  res.status(200).json({ success: true, data });
});

export const verifyResetCode = asyncHandler(async (req, res) => {
  const data = await service.verifyResetCode(req.validated.body);
  res.status(200).json({ success: true, data });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const data = await service.resetPassword(req.validated.body);
  res.status(200).json({ success: true, data });
});
