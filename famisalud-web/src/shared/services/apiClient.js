import { makeFriendlyMessage } from '../utils/friendlyErrors.js';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '');

let accessToken = null;
let refreshPromise = null;

const AUTH_ENDPOINTS_WITHOUT_RETRY = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/verify-reset-code',
  '/auth/reset-password',
]);

export function setAccessToken(token) {
  accessToken = token || null;
}

export function clearAccessToken() {
  accessToken = null;
}

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status ?? 0;
    this.data = data ?? null;
  }
}

async function parseResponse(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  const text = await response.text();
  return text ? { message: text } : null;
}

function dispatchSessionExpired() {
  clearAccessToken();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('famisalud:session-expired'));
  }
}

async function rotateAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      const body = await parseResponse(response);
      const token = body?.data?.accessToken;
      if (!response.ok || !token) {
        dispatchSessionExpired();
        return null;
      }
      setAccessToken(token);
      return token;
    } catch {
      dispatchSessionExpired();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function isAuthEndpoint(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return AUTH_ENDPOINTS_WITHOUT_RETRY.has(normalized);
}

async function performRequest(url, options, initialHeaders) {
  const headers = new Headers(initialHeaders);
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return fetch(url, {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  });
}

export async function apiFetch(path, options = {}) {
  if (typeof path !== 'string' || !path.trim()) {
    throw new TypeError('apiFetch requiere una ruta relativa no vacía.');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;
  const { retryOnAuthFailure = true, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers || {});
  const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;

  if (fetchOptions.body !== undefined && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  let response;
  try {
    response = await performRequest(url, fetchOptions, headers);
  } catch (error) {
    throw new ApiError('No fue posible conectar con FamiSalud. Comprueba que la API esté encendida.', {
      status: 0,
      data: { cause: error instanceof Error ? error.message : 'Error de red' },
    });
  }

  if (
    response.status === 401 &&
    retryOnAuthFailure &&
    accessToken &&
    !isAuthEndpoint(normalizedPath)
  ) {
    const refreshedToken = await rotateAccessToken();
    if (refreshedToken) {
      try {
        response = await performRequest(url, fetchOptions, headers);
      } catch (error) {
        throw new ApiError('No fue posible conectar con FamiSalud. Comprueba que la API esté encendida.', {
          status: 0,
          data: { cause: error instanceof Error ? error.message : 'Error de red' },
        });
      }
    }
  }

  const data = await parseResponse(response);
  if (!response.ok) {
    const rawMessage = data?.message || data?.error || '';
    const message = makeFriendlyMessage(rawMessage, { status: response.status });
    throw new ApiError(message, { status: response.status, data });
  }

  return data;
}

export { API_BASE_URL };


/** Same authenticated/retried request flow as apiFetch, but returns a binary file. */
export async function apiFetchBlob(path, options = {}) {
  if (typeof path !== 'string' || !path.trim()) {
    throw new TypeError('apiFetchBlob requiere una ruta relativa no vacía.');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;
  const { retryOnAuthFailure = true, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers || {});
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  headers.set('Accept', '*/*');

  let response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: fetchOptions.credentials || 'include',
    });
  } catch (error) {
    throw new ApiError('No fue posible conectar con FamiSalud. Comprueba que la API esté encendida.', {
      status: 0,
      data: { cause: error instanceof Error ? error.message : 'Error de red' },
    });
  }

  if (response.status === 401 && retryOnAuthFailure && accessToken && !isAuthEndpoint(normalizedPath)) {
    const refreshedToken = await rotateAccessToken();
    if (refreshedToken) {
      try {
        const retryHeaders = new Headers(fetchOptions.headers || {});
        retryHeaders.set('Authorization', `Bearer ${refreshedToken}`);
        retryHeaders.set('Accept', '*/*');
        response = await fetch(url, {
          ...fetchOptions,
          headers: retryHeaders,
          credentials: fetchOptions.credentials || 'include',
        });
      } catch (error) {
        throw new ApiError('No fue posible conectar con FamiSalud. Comprueba que la API esté encendida.', {
          status: 0,
          data: { cause: error instanceof Error ? error.message : 'Error de red' },
        });
      }
    }
  }

  if (!response.ok) {
    const data = await parseResponse(response);
    const rawMessage = data?.message || data?.error || '';
    throw new ApiError(makeFriendlyMessage(rawMessage, { status: response.status }), {
      status: response.status,
      data,
    });
  }

  return response.blob();
}
