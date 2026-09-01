import { Router } from 'express';

import { devIdentity } from '../../middlewares/devIdentity.js';
import { validateResource } from '../../middlewares/validateResource.js';
import * as controller from './vitalSigns.controller.js';
import {
  createVitalSignSchema,
  memberIdParamsSchema,
  resourceParamsSchema,
  updateVitalSignSchema
} from './vitalSigns.schemas.js';

const router = Router();

router.use(devIdentity);

router.get(
  '/members/:memberId/vital-signs',
  validateResource({ params: memberIdParamsSchema }),
  controller.list
);

router.post(
  '/members/:memberId/vital-signs',
  validateResource({ params: memberIdParamsSchema, body: createVitalSignSchema }),
  controller.create
);

router.get(
  '/members/:memberId/vital-signs/:vitalSignId',
  validateResource({ params: resourceParamsSchema }),
  controller.getById
);

router.patch(
  '/members/:memberId/vital-signs/:vitalSignId',
  validateResource({ params: resourceParamsSchema, body: updateVitalSignSchema }),
  controller.update
);

router.delete(
  '/members/:memberId/vital-signs/:vitalSignId',
  validateResource({ params: resourceParamsSchema }),
  controller.remove
);

export default router;
