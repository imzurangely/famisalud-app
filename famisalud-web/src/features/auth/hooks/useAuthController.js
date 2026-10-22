import { useCallback, useEffect, useMemo, useState } from 'react';
import { clearAccessToken, setAccessToken } from '../../../shared/services/apiClient.js';
import {
  getCurrentUserRequest,
  loginRequest,
  logoutRequest,
  refreshSessionRequest,
  registerRequest,
} from '../services/authService.js';

let sessionRestorationPromise = null;

async function restoreSession() {
  if (!sessionRestorationPromise) {
    sessionRestorationPromise = (async () => {
      const refreshResponse = await refreshSessionRequest();
      const token = refreshResponse?.accessToken;
      if (!token) throw new Error('La API no devolvió un access token.');
      setAccessToken(token);
      const sessionResponse = await getCurrentUserRequest();
      return {
        user: sessionResponse?.user ?? null,
        familySetupRequired: Boolean(sessionResponse?.familySetupRequired),
      };
    })().finally(() => {
      sessionRestorationPromise = null;
    });
  }
  return sessionRestorationPromise;
}

/** Estado y operaciones de autenticación. Los componentes solo usan las acciones expuestas. */
export function useAuthController() {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [familySetupRequired, setFamilySetupRequired] = useState(false);

  const clearAuth = useCallback(() => {
    clearAccessToken();
    setUser(null);
    setFamilySetupRequired(false);
    setStatus('ready');
  }, []);

  const applyAuthPayload = useCallback((payload) => {
    setAccessToken(payload?.accessToken);
    setUser(payload?.user ?? null);
    setFamilySetupRequired(Boolean(payload?.familySetupRequired));
    setStatus('ready');
    return payload;
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => clearAuth();
    window.addEventListener('famisalud:session-expired', handleSessionExpired);
    return () => window.removeEventListener('famisalud:session-expired', handleSessionExpired);
  }, [clearAuth]);

  useEffect(() => {
    let active = true;
    restoreSession()
      .then((session) => {
        if (!active) return;
        setUser(session.user);
        setFamilySetupRequired(session.familySetupRequired);
      })
      .catch(() => {
        if (!active) return;
        clearAccessToken();
        setUser(null);
        setFamilySetupRequired(false);
      })
      .finally(() => {
        if (active) setStatus('ready');
      });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (credentials) => {
    const payload = await loginRequest(credentials);
    return applyAuthPayload(payload);
  }, [applyAuthPayload]);

  const register = useCallback(async (formData) => {
    const payload = await registerRequest(formData);
    return applyAuthPayload(payload);
  }, [applyAuthPayload]);

  const logout = useCallback(async () => {
    try {
      return await logoutRequest();
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const markFamilySetupComplete = useCallback(() => setFamilySetupRequired(false), []);

  return useMemo(() => ({
    status,
    user,
    isAuthenticated: Boolean(user),
    familySetupRequired,
    login,
    register,
    logout,
    clearAuth,
    markFamilySetupComplete,
  }), [status, user, familySetupRequired, login, register, logout, clearAuth, markFamilySetupComplete]);
}
