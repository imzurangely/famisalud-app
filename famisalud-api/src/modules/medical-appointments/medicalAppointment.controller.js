import { HTTP_STATUS } from '../../shared/constants/http.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as service from './medicalAppointment.service.js';

export const create = asyncHandler(async (req, res) => {
  const data = await service.create(
    req.validated.params.memberId,
    req.user.id,
    req.validated.body
  );

  res.status(HTTP_STATUS.CREATED).json({ success: true, data });
});

export const list = asyncHandler(async (req, res) => {
  const data = await service.list(
    req.validated.params.memberId,
    req.user.id,
    req.validated.query
  );

  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const getById = asyncHandler(async (req, res) => {
  const data = await service.getById(
    req.validated.params.memberId,
    req.validated.params.appointmentId,
    req.user.id
  );

  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const update = asyncHandler(async (req, res) => {
  const data = await service.update(
    req.validated.params.memberId,
    req.validated.params.appointmentId,
    req.user.id,
    req.validated.body
  );

  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(
    req.validated.params.memberId,
    req.validated.params.appointmentId,
    req.user.id
  );

  res.status(HTTP_STATUS.NO_CONTENT).send();
});
