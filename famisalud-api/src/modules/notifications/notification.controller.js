import { HTTP_STATUS } from '../../shared/constants/http.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as service from './notification.service.js';

export const list = asyncHandler(async (req, res) => {
  const data = await service.list(req.user.id, req.validated.query);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const getById = asyncHandler(async (req, res) => {
  const { notificationId } = req.validated.params;
  const data = await service.getById(notificationId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.validated.params;
  const data = await service.markAsRead(notificationId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const data = await service.markAllAsRead(req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});
