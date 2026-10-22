import { apiFetch } from '../../../shared/services/apiClient.js';
import { unwrapApiData } from '../../../shared/utils/apiResponse.js';

export function requestPasswordReset(email) {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
    retryOnAuthFailure: false,
  }).then(unwrapApiData);
}

export function resetPasswordRequest({ email, code, newPassword, confirmPassword }) {
  return apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      code: code.trim(),
      newPassword,
      confirmPassword,
    }),
    retryOnAuthFailure: false,
  }).then(unwrapApiData);
}
