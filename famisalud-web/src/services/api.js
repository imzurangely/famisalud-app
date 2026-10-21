const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(/\/$/, '');

let accessToken = null;

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

export async function apiFetch(path, options = {}) {
  if (typeof path !== 'string' || !path.trim()) {
    throw new TypeError('apiFetch requiere una ruta relativa no vacía.');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;
  const headers = new Headers(options.headers || {});
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (options.body !== undefined && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: options.credentials || 'include',
    });
  } catch (error) {
    throw new ApiError('No fue posible conectar con FamiSalud. Comprueba que la API esté encendida.', {
      status: 0,
      data: { cause: error instanceof Error ? error.message : 'Error de red' },
    });
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    const text = await response.text();
    data = text ? { message: text } : null;
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `La API respondió con el estado ${response.status}.`;
    throw new ApiError(message, { status: response.status, data });
  }

  return data;
}

export { API_BASE_URL };
