import { useCallback } from 'react';
import { requestPasswordReset, resetPasswordRequest } from '../services/passwordRecoveryService.js';
import { useActionState } from './useActionState.js';

export function usePasswordRecovery() {
  const forgotAction = useActionState(requestPasswordReset);
  const resetAction = useActionState(resetPasswordRequest);

  const requestCode = useCallback((email) => forgotAction.execute(email), [forgotAction.execute]);
  const resetPassword = useCallback((payload) => resetAction.execute(payload), [resetAction.execute]);

  return {
    requestCode,
    resetPassword,
    requestData: forgotAction.data,
    requestLoading: forgotAction.loading,
    requestError: forgotAction.error,
    resetData: resetAction.data,
    resetLoading: resetAction.loading,
    resetError: resetAction.error,
    clearRequest: forgotAction.reset,
    clearReset: resetAction.reset,
  };
}
