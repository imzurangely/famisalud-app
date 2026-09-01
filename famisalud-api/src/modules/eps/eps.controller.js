import { HTTP_STATUS } from '../../shared/constants/http.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as service from './eps.service.js';

export const listCompanies = asyncHandler(async (req, res) => {
  const data = await service.listCompanies();
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const getCompany = asyncHandler(async (req, res) => {
  const data = await service.getCompany(req.validated.params.epsId);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const listPlans = asyncHandler(async (req, res) => {
  const data = await service.listPlans(req.validated.params.memberId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const getPlan = asyncHandler(async (req, res) => {
  const { memberId, insurancePlanId } = req.validated.params;
  const data = await service.getPlan(memberId, insurancePlanId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const createPlan = asyncHandler(async (req, res) => {
  const data = await service.createPlan(req.validated.params.memberId, req.user.id, req.validated.body);
  res.status(HTTP_STATUS.CREATED).json({ success: true, data });
});

export const updatePlan = asyncHandler(async (req, res) => {
  const { memberId, insurancePlanId } = req.validated.params;
  const data = await service.updatePlan(memberId, insurancePlanId, req.user.id, req.validated.body);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const removePlan = asyncHandler(async (req, res) => {
  const { memberId, insurancePlanId } = req.validated.params;
  await service.removePlan(memberId, insurancePlanId, req.user.id);
  res.status(HTTP_STATUS.NO_CONTENT).send();
});
