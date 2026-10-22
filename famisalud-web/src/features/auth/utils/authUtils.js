export function formatApiError(error) {
  const issues = error?.data?.errors;
  if (Array.isArray(issues) && issues.length) {
    const messages = [...new Set(issues.map((issue) => issue?.message).filter(Boolean))];
    if (messages.length) return messages.join(' ');
  }
  return error?.message || 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}

export function isValidPassword(password) {
  return password.length >= 8 && password.length <= 128 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password);
}
