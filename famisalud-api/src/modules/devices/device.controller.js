import { HTTP_STATUS } from '../../shared/constants/http.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as service from './device.service.js';

export const list = asyncHandler(async (req, res) => {
  const data = await service.list(req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const register = asyncHandler(async (req, res) => {
  const data = await service.register(req.user.id, req.validated.body);
  res.status(HTTP_STATUS.CREATED).json({ success: true, data });
});

export const update = asyncHandler(async (req, res) => {
  const data = await service.update(req.validated.params.deviceId, req.user.id, req.validated.body);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const deactivate = asyncHandler(async (req, res) => {
  const data = await service.deactivate(req.validated.params.deviceId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});
