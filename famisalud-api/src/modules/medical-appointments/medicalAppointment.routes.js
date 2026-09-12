import { Router } from 'express';
import { devIdentity } from '../../middlewares/devIdentity.js';
import { validateResource } from '../../middlewares/validateResource.js';
import * as controller from './medicalAppointment.controller.js';
import {
  createAppointmentSchema,
  memberIdParamsSchema,
  resourceParamsSchema,
  updateAppointmentSchema
} from './medicalAppointment.schemas.js';
import { z } from 'zod';

const router = Router();
router.use(devIdentity);

const listQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  status: z.enum([
    'PROGRAMADA',
    'COMPLETADA',
    'NO_ASISTIO',
    'CANCELADA',
    'REPROGRAMADA'
  ]).optional()
}).strict();

router.get(
  '/members/:memberId/appointments',
  validateResource({ params: memberIdParamsSchema, query: listQuerySchema }),
  controller.list
);

router.post(
  '/members/:memberId/appointments',
  validateResource({ params: memberIdParamsSchema, body: createAppointmentSchema }),
  controller.create
);

router.get(
  '/members/:memberId/appointments/:appointmentId',
  validateResource({ params: resourceParamsSchema }),
  controller.getById
);

router.patch(
  '/members/:memberId/appointments/:appointmentId',
  validateResource({ params: resourceParamsSchema, body: updateAppointmentSchema }),
  controller.update
);

router.delete(
  '/members/:memberId/appointments/:appointmentId',
  validateResource({ params: resourceParamsSchema }),
  controller.remove
);

export default router;
