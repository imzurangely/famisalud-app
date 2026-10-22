import { apiFetch } from '../../../shared/services/apiClient.js';
import { unwrapApiData } from '../../../shared/utils/apiResponse.js';

export function loginRequest(credentials) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
    retryOnAuthFailure: false,
  }).then(unwrapApiData);
}

export function registerRequest(payload) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
    retryOnAuthFailure: false,
  }).then(unwrapApiData);
}

export function refreshSessionRequest() {
  return apiFetch('/auth/refresh', { method: 'POST', retryOnAuthFailure: false }).then(unwrapApiData);
}

export function getCurrentUserRequest() {
  return apiFetch('/auth/me', { retryOnAuthFailure: false }).then(unwrapApiData);
}

export function logoutRequest() {
  return apiFetch('/auth/logout', { method: 'POST', retryOnAuthFailure: false }).then(unwrapApiData);
}
