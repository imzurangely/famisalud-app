import { Router } from 'express';
import { devIdentity } from '../../middlewares/devIdentity.js';
import { validateResource } from '../../middlewares/validateResource.js';
import * as controller from './familyInvitation.controller.js';
import {
  createFamilyInvitationSchema,
  familyInvitationListQuerySchema,
  familyInvitationParamsSchema,
  invitationMineQuerySchema,
  invitationPreviewQuerySchema,
  invitationParamsSchema,
  invitationTokenSchema
} from './familyInvitation.schemas.js';

const router = Router();
router.use(devIdentity);

router.get(
  '/invitations/preview',
  validateResource({ query: invitationPreviewQuerySchema }),
  controller.preview
);
router.get(
  '/invitations/mine',
  validateResource({ query: invitationMineQuerySchema }),
  controller.listMine
);
router.post(
  '/invitations/accept',
  validateResource({ body: invitationTokenSchema }),
  controller.accept
);
router.post(
  '/invitations/reject',
  validateResource({ body: invitationTokenSchema }),
  controller.reject
);
router.get(
  '/families/:familyId/invitations',
  validateResource({ params: familyInvitationParamsSchema, query: familyInvitationListQuerySchema }),
  controller.listByFamily
);
router.post(
  '/families/:familyId/invitations',
  validateResource({ params: familyInvitationParamsSchema, body: createFamilyInvitationSchema }),
  controller.create
);
router.post(
  '/families/:familyId/invitations/:invitationId/resend',
  validateResource({ params: familyInvitationParamsSchema.merge(invitationParamsSchema) }),
  controller.resend
);

export default router;
