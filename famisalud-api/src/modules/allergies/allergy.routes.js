import { Router } from 'express';
import { devIdentity } from '../../middlewares/devIdentity.js';
import { validateResource } from '../../middlewares/validateResource.js';
import * as controller from './allergy.controller.js';
import { createSchema, updateSchema, paramsSchema, resourceParamsSchema } from './allergy.schemas.js';

const router = Router();
router.use(devIdentity);

router.get('/members/:memberId/allergies', validateResource({ params: paramsSchema }), controller.list);
router.post('/members/:memberId/allergies', validateResource({ params: paramsSchema, body: createSchema }), controller.create);
router.get('/members/:memberId/allergies/:allergyId', validateResource({ params: resourceParamsSchema }), controller.getById);
router.patch('/members/:memberId/allergies/:allergyId', validateResource({ params: resourceParamsSchema, body: updateSchema }), controller.update);
router.delete('/members/:memberId/allergies/:allergyId', validateResource({ params: resourceParamsSchema }), controller.remove);

export default router;
