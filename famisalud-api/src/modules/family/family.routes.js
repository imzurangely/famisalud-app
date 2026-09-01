import { Router } from 'express';
import { devIdentity } from '../../middlewares/devIdentity.js';
import { validateResource } from '../../middlewares/validateResource.js';
import * as controller from './family.controller.js';
import {
  createMemberSchema,
  familyIdParamsSchema,
  memberIdParamsSchema,
  updateMemberSchema
} from './family.schemas.js';

const router = Router();

router.use(devIdentity);

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
