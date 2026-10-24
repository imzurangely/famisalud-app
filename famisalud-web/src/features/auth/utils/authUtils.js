import { friendlyErrorMessage } from '../../../shared/utils/friendlyErrors.js';

export function formatApiError(error) {
  return friendlyErrorMessage(error, 'Ocurrió un problema. Inténtalo de nuevo.');
}

export function isValidPassword(password) {
  return password.length >= 8 && password.length <= 128 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password);
}
