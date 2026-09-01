import { Router } from 'express';
import { devIdentity } from '../../middlewares/devIdentity.js';
import { validateResource } from '../../middlewares/validateResource.js';
import * as controller from './vaccine.controller.js';
import { createSchema, updateSchema, paramsSchema, resourceParamsSchema } from './vaccine.schemas.js';

const router = Router();
router.use(devIdentity);

router.get('/members/:memberId/vaccines', validateResource({ params: paramsSchema }), controller.list);
router.post('/members/:memberId/vaccines', validateResource({ params: paramsSchema, body: createSchema }), controller.create);
router.get('/members/:memberId/vaccines/:vaccineId', validateResource({ params: resourceParamsSchema }), controller.getById);
router.patch('/members/:memberId/vaccines/:vaccineId', validateResource({ params: resourceParamsSchema, body: updateSchema }), controller.update);
router.delete('/members/:memberId/vaccines/:vaccineId', validateResource({ params: resourceParamsSchema }), controller.remove);

export default router;
