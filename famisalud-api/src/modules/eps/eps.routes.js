import { Router } from 'express';
import { devIdentity } from '../../middlewares/devIdentity.js';
import { validateResource } from '../../middlewares/validateResource.js';
import * as controller from './eps.controller.js';
import {
  epsParamsSchema,
  insuranceParamsSchema,
  memberParamsSchema,
  createInsuranceSchema,
  updateInsuranceSchema
} from './eps.schemas.js';

const router = Router();
router.use(devIdentity);

router.get('/eps-companies', controller.listCompanies);
router.get('/eps-companies/:epsId', validateResource({ params: epsParamsSchema }), controller.getCompany);

router.get('/members/:memberId/insurance-plans', validateResource({ params: memberParamsSchema }), controller.listPlans);
router.post('/members/:memberId/insurance-plans', validateResource({ params: memberParamsSchema, body: createInsuranceSchema }), controller.createPlan);
router.get('/members/:memberId/insurance-plans/:insurancePlanId', validateResource({ params: insuranceParamsSchema }), controller.getPlan);
router.patch('/members/:memberId/insurance-plans/:insurancePlanId', validateResource({ params: insuranceParamsSchema, body: updateInsuranceSchema }), controller.updatePlan);
router.delete('/members/:memberId/insurance-plans/:insurancePlanId', validateResource({ params: insuranceParamsSchema }), controller.removePlan);

export default router;
