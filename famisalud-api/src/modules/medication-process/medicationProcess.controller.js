import { HTTP_STATUS } from '../../shared/constants/http.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as service from './medicationProcess.service.js';

export const summary = asyncHandler(async (req, res) => {
  const { memberId, medicationId } = req.validated.params;
  const data = await service.getSummary(memberId, medicationId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const requestAuthorization = asyncHandler(async (req, res) => {
  const { memberId, medicationId } = req.validated.params;
  const data = await service.requestAuthorization(memberId, medicationId, req.user.id, req.validated.body.notes ?? null);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const listAuthorizations = asyncHandler(async (req, res) => {
  const { memberId, medicationId } = req.validated.params;
  const data = await service.listAuthorizations(memberId, medicationId, req.user.id, req.validated.query.limit);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const getAuthorization = asyncHandler(async (req, res) => {
  const { memberId, medicationId, authorizationId } = req.validated.params;
  const data = await service.getAuthorization(memberId, medicationId, authorizationId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const createAuthorization = asyncHandler(async (req, res) => {
  const { memberId, medicationId } = req.validated.params;
  const data = await service.createAuthorization(memberId, medicationId, req.user.id, req.validated.body);
  res.status(HTTP_STATUS.CREATED).json({ success: true, data });
});

export const updateAuthorization = asyncHandler(async (req, res) => {
  const { memberId, medicationId, authorizationId } = req.validated.params;
  const data = await service.updateAuthorization(memberId, medicationId, authorizationId, req.user.id, req.validated.body);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const renewAuthorization = asyncHandler(async (req, res) => {
  const { memberId, medicationId } = req.validated.params;
  const data = await service.renewAuthorization(memberId, medicationId, req.user.id, req.validated.body);
  res.status(HTTP_STATUS.CREATED).json({ success: true, data });
});

export const cancelAuthorization = asyncHandler(async (req, res) => {
  const { memberId, medicationId, authorizationId } = req.validated.params;
  const data = await service.cancelAuthorization(
    memberId,
    medicationId,
    authorizationId,
    req.user.id,
    req.validated.body.reason ?? null
  );
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const listDeliveries = asyncHandler(async (req, res) => {
  const { memberId, medicationId } = req.validated.params;
  const data = await service.listDeliveries(memberId, medicationId, req.user.id, req.validated.query);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const getDelivery = asyncHandler(async (req, res) => {
  const { memberId, medicationId, deliveryId } = req.validated.params;
  const data = await service.getDelivery(memberId, medicationId, deliveryId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const markPendingPharmacy = asyncHandler(async (req, res) => {
  const { memberId, medicationId, deliveryId } = req.validated.params;
  const data = await service.markPendingPharmacy(memberId, medicationId, deliveryId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const confirmRenewalManaged = asyncHandler(async (req, res) => {
  const { memberId, medicationId, deliveryId } = req.validated.params;
  const data = await service.confirmRenewalManaged(memberId, medicationId, deliveryId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const collectDelivery = asyncHandler(async (req, res) => {
  const { memberId, medicationId, deliveryId } = req.validated.params;
  const data = await service.collectDelivery(memberId, medicationId, deliveryId, req.user.id, req.validated.body);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const history = asyncHandler(async (req, res) => {
  const { memberId, medicationId } = req.validated.params;
  const data = await service.listProcessHistory(memberId, medicationId, req.user.id, req.validated.query.limit);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});
