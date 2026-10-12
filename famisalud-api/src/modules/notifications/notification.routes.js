import { Router } from 'express';
import { devIdentity } from '../../middlewares/devIdentity.js';
import { validateResource } from '../../middlewares/validateResource.js';
import * as controller from './notification.controller.js';
import { listQuerySchema, resourceParamsSchema } from './notification.schemas.js';

const router = Router();
router.use(devIdentity);

router.get('/notifications', validateResource({ query: listQuerySchema }), controller.list);
router.patch('/notifications/read-all', controller.markAllAsRead);
router.get('/notifications/:notificationId', validateResource({ params: resourceParamsSchema }), controller.getById);
router.patch('/notifications/:notificationId/read', validateResource({ params: resourceParamsSchema }), controller.markAsRead);

export default router;
