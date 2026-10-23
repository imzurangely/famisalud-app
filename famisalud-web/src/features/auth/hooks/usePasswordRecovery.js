import { useCallback } from 'react';
import {
  requestPasswordReset,
  resetPasswordRequest,
  verifyPasswordResetCode,
} from '../services/passwordRecoveryService.js';
import { useActionState } from './useActionState.js';

export function usePasswordRecovery() {
  const requestAction = useActionState(requestPasswordReset);
  const verifyAction = useActionState(verifyPasswordResetCode);
  const resetAction = useActionState(resetPasswordRequest);

  const requestCode = useCallback((email) => requestAction.execute(email), [requestAction.execute]);
  const verifyCode = useCallback((payload) => verifyAction.execute(payload), [verifyAction.execute]);
  const resetPassword = useCallback((payload) => resetAction.execute(payload), [resetAction.execute]);

  return {
    requestCode,
    verifyCode,
    resetPassword,
    requestData: requestAction.data,
    requestLoading: requestAction.loading,
    requestError: requestAction.error,
    verifyData: verifyAction.data,
    verifyLoading: verifyAction.loading,
    verifyError: verifyAction.error,
    resetData: resetAction.data,
    resetLoading: resetAction.loading,
    resetError: resetAction.error,
    clearRequest: requestAction.reset,
    clearVerify: verifyAction.reset,
    clearReset: resetAction.reset,
  };
}
