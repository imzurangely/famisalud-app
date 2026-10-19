import { Router } from 'express';
import { devIdentity } from '../../middlewares/devIdentity.js';
import { validateResource } from '../../middlewares/validateResource.js';
import * as controller from './family.controller.js';
import {
  auditLogQuerySchema,
  createFamilySchema,
  createMemberSchema,
  familyIdParamsSchema,
  familyMemberLinkSchema,
  memberIdParamsSchema,
  transferAdministratorSchema,
  updateMemberSchema
} from './family.schemas.js';

const router = Router();

router.use(devIdentity);

router.get('/families', controller.listFamilies);
router.post(
  '/families',
  validateResource({ body: createFamilySchema }),
  controller.createFamily
);
router.patch(
  '/families/:familyId/administrator',
  validateResource({ params: familyIdParamsSchema, body: transferAdministratorSchema }),
  controller.transferAdministrator
);
router.post(
  '/families/:familyId/leave',
  validateResource({ params: familyIdParamsSchema }),
  controller.leaveFamily
);
router.get(
  '/families/:familyId/audit-logs',
  validateResource({ params: familyIdParamsSchema, query: auditLogQuerySchema }),
  controller.listAuditLogs
);
router.post(
  '/families/:familyId/members/:memberId/link-account',
  validateResource({ params: familyIdParamsSchema.merge(memberIdParamsSchema), body: familyMemberLinkSchema }),
  controller.linkAccount
);

router.get(
  '/families/:familyId/members',
  validateResource({ params: familyIdParamsSchema }),
  controller.listMembers
);

router.post(
  '/families/:familyId/members',
  validateResource({ params: familyIdParamsSchema, body: createMemberSchema }),
  controller.createMember
);

router.get(
  '/members/:memberId',
  validateResource({ params: memberIdParamsSchema }),
  controller.getMember
);

router.patch(
  '/members/:memberId',
  validateResource({ params: memberIdParamsSchema, body: updateMemberSchema }),
  controller.updateMember
);

router.delete(
  '/members/:memberId',
  validateResource({ params: memberIdParamsSchema }),
  controller.deleteMember
);

export default router;
