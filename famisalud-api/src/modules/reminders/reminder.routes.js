import { Router } from 'express';
import { devIdentity } from '../../middlewares/devIdentity.js';
import { validateResource } from '../../middlewares/validateResource.js';
import * as controller from './reminder.controller.js';
import { createRecipientSchema, medicationParamsSchema, recipientParamsSchema } from './reminder.schemas.js';

const router = Router();
router.use(devIdentity);

router.get(
  '/members/:memberId/medications/:medicationId/reminder-recipients',
  validateResource({ params: medicationParamsSchema }),
  controller.listRecipients
);

router.post(
  '/members/:memberId/medications/:medicationId/reminder-recipients',
  validateResource({ params: medicationParamsSchema, body: createRecipientSchema }),
  controller.addRecipient
);

router.delete(
  '/members/:memberId/medications/:medicationId/reminder-recipients/:userId',
  validateResource({ params: recipientParamsSchema }),
  controller.removeRecipient
);

export default router;
