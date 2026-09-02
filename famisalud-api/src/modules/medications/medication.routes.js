import { Router } from 'express';
import { devIdentity } from '../../middlewares/devIdentity.js';
import { validateResource } from '../../middlewares/validateResource.js';
import * as controller from './medication.controller.js';
import {
  createMedicationLogSchema,
  createMedicationSchema,
  createScheduleSchema,
  historyQuerySchema,
  logQuerySchema,
  medicationParamsSchema,
  medicationResourceParamsSchema,
  logResourceParamsSchema,
  scheduleResourceParamsSchema,
  updateMedicationLogSchema,
  updateMedicationSchema,
  updateScheduleSchema
} from './medication.schemas.js';

const router = Router();

router.use(devIdentity);

router.get(
  '/members/:memberId/medications',
  validateResource({ params: medicationParamsSchema }),
  controller.list
);
router.post(
  '/members/:memberId/medications',
  validateResource({ params: medicationParamsSchema, body: createMedicationSchema }),
  controller.create
);
router.get(
  '/members/:memberId/medications/:medicationId',
  validateResource({ params: medicationResourceParamsSchema }),
  controller.getById
);
router.patch(
  '/members/:memberId/medications/:medicationId',
  validateResource({ params: medicationResourceParamsSchema, body: updateMedicationSchema }),
  controller.update
);
router.delete(
  '/members/:memberId/medications/:medicationId',
  validateResource({ params: medicationResourceParamsSchema }),
  controller.remove
);
router.get(
  '/members/:memberId/medications/:medicationId/history',
  validateResource({ params: medicationResourceParamsSchema, query: historyQuerySchema }),
  controller.history
);

router.get(
  '/members/:memberId/medications/:medicationId/schedules',
  validateResource({ params: medicationResourceParamsSchema }),
  controller.listSchedules
);
router.post(
  '/members/:memberId/medications/:medicationId/schedules',
  validateResource({ params: medicationResourceParamsSchema, body: createScheduleSchema }),
  controller.createSchedule
);
router.get(
  '/members/:memberId/medications/:medicationId/schedules/:scheduleId',
  validateResource({ params: scheduleResourceParamsSchema }),
  controller.getSchedule
);
router.patch(
  '/members/:memberId/medications/:medicationId/schedules/:scheduleId',
  validateResource({ params: scheduleResourceParamsSchema, body: updateScheduleSchema }),
  controller.updateSchedule
);
router.delete(
  '/members/:memberId/medications/:medicationId/schedules/:scheduleId',
  validateResource({ params: scheduleResourceParamsSchema }),
  controller.removeSchedule
);

router.get(
  '/members/:memberId/medications/:medicationId/logs',
  validateResource({ params: medicationResourceParamsSchema, query: logQuerySchema }),
  controller.listLogs
);
router.post(
  '/members/:memberId/medications/:medicationId/logs',
  validateResource({ params: medicationResourceParamsSchema, body: createMedicationLogSchema }),
  controller.createLog
);
router.get(
  '/members/:memberId/medications/:medicationId/logs/:logId',
  validateResource({ params: logResourceParamsSchema }),
  controller.getLog
);
router.patch(
  '/members/:memberId/medications/:medicationId/logs/:logId',
  validateResource({ params: logResourceParamsSchema, body: updateMedicationLogSchema }),
  controller.updateLog
);

export default router;
