import { HTTP_STATUS } from '../../shared/constants/http.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as service from './reminder.service.js';

export const listRecipients = asyncHandler(async (req, res) => {
  const { memberId, medicationId } = req.validated.params;
  const data = await service.listRecipients(memberId, medicationId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const addRecipient = asyncHandler(async (req, res) => {
  const { memberId, medicationId } = req.validated.params;
  const data = await service.addRecipient(memberId, medicationId, req.user.id, req.validated.body.userId);
  res.status(HTTP_STATUS.CREATED).json({ success: true, data });
});

export const removeRecipient = asyncHandler(async (req, res) => {
  const { memberId, medicationId, userId } = req.validated.params;
  const data = await service.removeRecipient(memberId, medicationId, req.user.id, userId);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});
