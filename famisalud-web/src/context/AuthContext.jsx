import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, clearAccessToken, setAccessToken } from '../services/api.js';

const AuthContext = createContext(null);
let sessionRestoration = null;

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [familySetupRequired, setFamilySetupRequired] = useState(false);

  const acceptAuthResponse = useCallback((data) => {
    setAccessToken(data?.accessToken);
    setUser(data?.user ?? null);
    setFamilySetupRequired(Boolean(data?.familySetupRequired));
    setStatus('ready');
    return data;
  }, []);

  const clearAuth = useCallback(() => {
    clearAccessToken();
    setUser(null);
    setFamilySetupRequired(false);
    setStatus('ready');
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      clearAuth();
    };
    window.addEventListener('famisalud:session-expired', handleSessionExpired);
    return () => window.removeEventListener('famisalud:session-expired', handleSessionExpired);
  }, [clearAuth]);

  useEffect(() => {
    let active = true;

    if (!sessionRestoration) {
      sessionRestoration = (async () => {
        const refreshResponse = await apiFetch('/auth/refresh', {
          method: 'POST',
          retryOnAuthFailure: false,
        });
        const token = refreshResponse?.data?.accessToken;
        if (!token) throw new Error('La API no devolvió un access token.');
        setAccessToken(token);
        const meResponse = await apiFetch('/auth/me', { retryOnAuthFailure: false });
        return {
          user: meResponse?.data?.user ?? null,
          familySetupRequired: Boolean(meResponse?.data?.familySetupRequired),
        };
      })();
    }

    const pendingRestoration = sessionRestoration;
    pendingRestoration
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
        if (sessionRestoration === pendingRestoration) sessionRestoration = null;
        if (active) setStatus('ready');
      });

    return () => { active = false; };
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      retryOnAuthFailure: false,
    });
    return acceptAuthResponse(response?.data);
  }, [acceptAuthResponse]);

  const register = useCallback(async (formData) => {
    const response = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData),
      retryOnAuthFailure: false,
    });
    return acceptAuthResponse(response?.data);
  }, [acceptAuthResponse]);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST', retryOnAuthFailure: false });
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const markFamilySetupComplete = useCallback(() => {
    setFamilySetupRequired(false);
  }, []);

  const value = useMemo(() => ({
    status,
    user,
    isAuthenticated: Boolean(user),
    familySetupRequired,
    login,
    register,
    logout,
    markFamilySetupComplete,
  }), [status, user, familySetupRequired, login, register, logout, markFamilySetupComplete]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider.');
  return context;
}
