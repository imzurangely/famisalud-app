import { Router } from 'express';
import { devIdentity } from '../../middlewares/devIdentity.js';
import { validateResource } from '../../middlewares/validateResource.js';
import * as controller from './medicationProcess.controller.js';
import {
  authorizationParamsSchema,
  authorizationQuerySchema,
  cancelAuthorizationSchema,
  collectDeliverySchema,
  createAuthorizationSchema,
  deliveryParamsSchema,
  deliveryQuerySchema,
  medicationParamsSchema,
  processHistoryQuerySchema,
  renewalSchema,
  requestAuthorizationSchema,
  updateAuthorizationSchema
} from './medicationProcess.schemas.js';

const router = Router();

router.use(devIdentity);

router.get(
  '/members/:memberId/medications/:medicationId/processes',
  validateResource({ params: medicationParamsSchema }),
  controller.summary
);

router.post(
  '/members/:memberId/medications/:medicationId/processes/authorization-request',
  validateResource({ params: medicationParamsSchema, body: requestAuthorizationSchema }),
  controller.requestAuthorization
);

router.get(
  '/members/:memberId/medications/:medicationId/authorizations',
  validateResource({ params: medicationParamsSchema, query: authorizationQuerySchema }),
  controller.listAuthorizations
);
router.post(
  '/members/:memberId/medications/:medicationId/authorizations',
  validateResource({ params: medicationParamsSchema, body: createAuthorizationSchema }),
  controller.createAuthorization
);
router.get(
  '/members/:memberId/medications/:medicationId/authorizations/:authorizationId',
  validateResource({ params: authorizationParamsSchema }),
  controller.getAuthorization
);
router.patch(
  '/members/:memberId/medications/:medicationId/authorizations/:authorizationId',
  validateResource({ params: authorizationParamsSchema, body: updateAuthorizationSchema }),
  controller.updateAuthorization
);
router.post(
  '/members/:memberId/medications/:medicationId/renewals',
  validateResource({ params: medicationParamsSchema, body: renewalSchema }),
  controller.renewAuthorization
);
router.post(
  '/members/:memberId/medications/:medicationId/authorizations/:authorizationId/cancel',
  validateResource({ params: authorizationParamsSchema, body: cancelAuthorizationSchema }),
  controller.cancelAuthorization
);

// No existe POST ni PATCH sobre /deliveries: las entregas solo las genera
// el service automáticamente (al crear la autorización o al cerrar un ciclo).
router.get(
  '/members/:memberId/medications/:medicationId/deliveries',
  validateResource({ params: medicationParamsSchema, query: deliveryQuerySchema }),
  controller.listDeliveries
);
router.get(
  '/members/:memberId/medications/:medicationId/deliveries/:deliveryId',
  validateResource({ params: deliveryParamsSchema }),
  controller.getDelivery
);
router.post(
  '/members/:memberId/medications/:medicationId/deliveries/:deliveryId/mark-pending-pharmacy',
  validateResource({ params: deliveryParamsSchema }),
  controller.markPendingPharmacy
);
router.post(
  '/members/:memberId/medications/:medicationId/deliveries/:deliveryId/confirm-renewal-managed',
  validateResource({ params: deliveryParamsSchema }),
  controller.confirmRenewalManaged
);
router.post(
  '/members/:memberId/medications/:medicationId/deliveries/:deliveryId/collect',
  validateResource({ params: deliveryParamsSchema, body: collectDeliverySchema }),
  controller.collectDelivery
);

router.get(
  '/members/:memberId/medications/:medicationId/processes/history',
  validateResource({ params: medicationParamsSchema, query: processHistoryQuerySchema }),
  controller.history
);

export default router;
