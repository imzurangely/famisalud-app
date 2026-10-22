import { HTTP_STATUS } from '../../shared/constants/http.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as service from './familyInvitation.service.js';

export const create = asyncHandler(async (req, res) => {
  const data = await service.createInvitation(
    req.validated.params.familyId,
    req.user.id,
    req.validated.body
  );
  res.status(HTTP_STATUS.CREATED).json({ success: true, data });
});

export const resend = asyncHandler(async (req, res) => {
  const data = await service.resendInvitation(
    req.validated.params.familyId,
    req.validated.params.invitationId,
    req.user.id
  );
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const listByFamily = asyncHandler(async (req, res) => {
  const data = await service.listFamilyInvitations(
    req.validated.params.familyId,
    req.user.id,
    req.validated.query
  );
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const listMine = asyncHandler(async (req, res) => {
  const data = await service.listMyInvitations(req.user.id, req.validated.query.limit);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const preview = asyncHandler(async (req, res) => {
  const data = await service.getInvitationPreview(req.user.id, req.validated.query.token);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const accept = asyncHandler(async (req, res) => {
  const data = await service.acceptInvitation(req.user.id, req.validated.body);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const reject = asyncHandler(async (req, res) => {
  const data = await service.rejectInvitation(req.user.id, req.validated.body);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});
