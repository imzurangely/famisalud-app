import { HTTP_STATUS } from '../../shared/constants/http.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as service from './vaccine.service.js';

export const list = asyncHandler(async (req, res) => {
  const data = await service.list(req.validated.params.memberId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const getById = asyncHandler(async (req, res) => {
  const { memberId, vaccineId } = req.validated.params;
  const data = await service.getById(memberId, vaccineId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const create = asyncHandler(async (req, res) => {
  const data = await service.create(req.validated.params.memberId, req.user.id, req.validated.body);
  res.status(HTTP_STATUS.CREATED).json({ success: true, data });
});

export const update = asyncHandler(async (req, res) => {
  const { memberId, vaccineId } = req.validated.params;
  const data = await service.update(memberId, vaccineId, req.user.id, req.validated.body);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const remove = asyncHandler(async (req, res) => {
  const { memberId, vaccineId } = req.validated.params;
  await service.remove(memberId, vaccineId, req.user.id);
  res.status(HTTP_STATUS.NO_CONTENT).send();
});
