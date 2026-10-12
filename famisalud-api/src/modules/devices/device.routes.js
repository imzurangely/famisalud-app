import { Router } from 'express';
import { devIdentity } from '../../middlewares/devIdentity.js';
import { validateResource } from '../../middlewares/validateResource.js';
import * as controller from './device.controller.js';
import { createSchema, deviceParamsSchema, updateSchema } from './device.schemas.js';

const router = Router();
router.use(devIdentity);

router.get('/devices', controller.list);
router.post('/devices', validateResource({ body: createSchema }), controller.register);
router.patch('/devices/:deviceId', validateResource({ params: deviceParamsSchema, body: updateSchema }), controller.update);
router.delete('/devices/:deviceId', validateResource({ params: deviceParamsSchema }), controller.deactivate);

export default router;
