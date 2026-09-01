import { Router } from 'express';
import { devIdentity } from '../../middlewares/devIdentity.js';
import { validateResource } from '../../middlewares/validateResource.js';
import * as controller from './emergencyContact.controller.js';
import { createSchema, updateSchema, paramsSchema, resourceParamsSchema } from './emergencyContact.schemas.js';

const router = Router();
router.use(devIdentity);

router.get('/members/:memberId/emergency-contacts', validateResource({ params: paramsSchema }), controller.list);
router.post('/members/:memberId/emergency-contacts', validateResource({ params: paramsSchema, body: createSchema }), controller.create);
router.get('/members/:memberId/emergency-contacts/:contactId', validateResource({ params: resourceParamsSchema }), controller.getById);
router.patch('/members/:memberId/emergency-contacts/:contactId', validateResource({ params: resourceParamsSchema, body: updateSchema }), controller.update);
router.delete('/members/:memberId/emergency-contacts/:contactId', validateResource({ params: resourceParamsSchema }), controller.remove);

export default router;
