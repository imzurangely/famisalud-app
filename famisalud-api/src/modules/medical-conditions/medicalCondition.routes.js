import { Router } from 'express';
import { devIdentity } from '../../middlewares/devIdentity.js';
import { validateResource } from '../../middlewares/validateResource.js';
import * as controller from './medicalCondition.controller.js';
import { createSchema, updateSchema, paramsSchema, resourceParamsSchema } from './medicalCondition.schemas.js';

const router = Router();
router.use(devIdentity);

router.get('/members/:memberId/conditions', validateResource({ params: paramsSchema }), controller.list);
router.post('/members/:memberId/conditions', validateResource({ params: paramsSchema, body: createSchema }), controller.create);
router.get('/members/:memberId/conditions/:conditionId', validateResource({ params: resourceParamsSchema }), controller.getById);
router.patch('/members/:memberId/conditions/:conditionId', validateResource({ params: resourceParamsSchema, body: updateSchema }), controller.update);
router.delete('/members/:memberId/conditions/:conditionId', validateResource({ params: resourceParamsSchema }), controller.remove);

export default router;
