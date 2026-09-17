import { HTTP_STATUS } from '../../shared/constants/http.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as service from './document.service.js';

export const list = asyncHandler(async (req, res) => {
  const { memberId } = req.validated.params;
  const data = await service.list(memberId, req.user.id, req.validated.query);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const listByAppointment = asyncHandler(async (req, res) => {
  const { memberId, appointmentId } = req.validated.params;
  const data = await service.listByAppointment(memberId, appointmentId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const getById = asyncHandler(async (req, res) => {
  const { memberId, documentId } = req.validated.params;
  const data = await service.getById(memberId, documentId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const create = asyncHandler(async (req, res) => {
  const data = await service.create(
    req.validated.params.memberId,
    req.user.id,
    req.validated.body,
    req.file
  );

  res.status(HTTP_STATUS.CREATED).json({ success: true, data });
});

export const update = asyncHandler(async (req, res) => {
  const { memberId, documentId } = req.validated.params;
  const data = await service.update(memberId, documentId, req.user.id, req.validated.body, req.file);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const remove = asyncHandler(async (req, res) => {
  const { memberId, documentId } = req.validated.params;
  await service.remove(memberId, documentId, req.user.id);
  res.status(HTTP_STATUS.NO_CONTENT).send();
});
