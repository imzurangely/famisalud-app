import { Router } from 'express';
import { devIdentity } from '../../middlewares/devIdentity.js';
import { validateResource } from '../../middlewares/validateResource.js';
import * as controller from './document.controller.js';
import {
  appointmentDocumentsParamsSchema,
  createSchema,
  listQuerySchema,
  paramsSchema,
  resourceParamsSchema,
  updateSchema
} from './document.schemas.js';
import { handleDocumentUpload } from './document.upload.js';

const router = Router();

router.use(devIdentity);

router.get(
  '/members/:memberId/documents',
  validateResource({ params: paramsSchema, query: listQuerySchema }),
  controller.list
);

router.get(
  '/members/:memberId/appointments/:appointmentId/documents',
  validateResource({ params: appointmentDocumentsParamsSchema }),
  controller.listByAppointment
);

router.post(
  '/members/:memberId/documents',
  handleDocumentUpload,
  validateResource({ params: paramsSchema, body: createSchema }),
  controller.create
);

router.get(
  '/members/:memberId/documents/:documentId',
  validateResource({ params: resourceParamsSchema }),
  controller.getById
);

router.patch(
  '/members/:memberId/documents/:documentId',
  handleDocumentUpload,
  validateResource({ params: resourceParamsSchema, body: updateSchema }),
  controller.update
);

router.delete(
  '/members/:memberId/documents/:documentId',
  validateResource({ params: resourceParamsSchema }),
  controller.remove
);

export default router;
