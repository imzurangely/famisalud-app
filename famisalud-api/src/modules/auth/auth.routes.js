import { Router } from 'express';
import { devIdentity } from '../../middlewares/devIdentity.js';
import { handleAvatarUpload } from './auth.upload.js';
import { validateResource } from '../../middlewares/validateResource.js';
import * as controller from './auth.controller.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyResetCodeSchema,
  sessionParamsSchema,
  ownProfileSchema,
  preferencesSchema
} from './auth.schemas.js';

const router = Router();

router.post('/auth/register', validateResource({ body: registerSchema }), controller.register);
router.post('/auth/login', validateResource({ body: loginSchema }), controller.login);
router.post('/auth/refresh', controller.refresh);
router.post('/auth/logout', controller.logout);
router.post('/auth/forgot-password', validateResource({ body: forgotPasswordSchema }), controller.forgotPassword);
router.post('/auth/verify-reset-code', validateResource({ body: verifyResetCodeSchema }), controller.verifyResetCode);
router.post('/auth/reset-password', validateResource({ body: resetPasswordSchema }), controller.resetPassword);

router.get('/auth/me', devIdentity, controller.me);
router.patch('/auth/profile', devIdentity, validateResource({ body: ownProfileSchema }), controller.updateOwnProfile);
router.patch('/auth/preferences', devIdentity, validateResource({ body: preferencesSchema }), controller.updatePreferences);
router.post('/auth/profile/avatar', devIdentity, handleAvatarUpload, controller.uploadAvatar);
router.get('/auth/sessions', devIdentity, controller.listSessions);
router.delete('/auth/sessions/:sessionId', devIdentity, validateResource({ params: sessionParamsSchema }), controller.revokeSession);
router.post('/auth/sessions/revoke-all', devIdentity, controller.revokeAllSessions);

export default router;
