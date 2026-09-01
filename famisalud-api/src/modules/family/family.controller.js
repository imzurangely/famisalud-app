import { HTTP_STATUS } from '../../shared/constants/http.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as service from './family.service.js';

export const listMembers = asyncHandler(async (req, res) => {
  const data = await service.listMembers(req.validated.params.familyId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const createMember = asyncHandler(async (req, res) => {
  const data = await service.createMember(req.validated.params.familyId, req.user.id, req.validated.body);
  res.status(HTTP_STATUS.CREATED).json({ success: true, data });
});

export const getMember = asyncHandler(async (req, res) => {
  const data = await service.getMember(req.validated.params.memberId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const updateMember = asyncHandler(async (req, res) => {
  const data = await service.updateMember(req.validated.params.memberId, req.user.id, req.validated.body);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const deleteMember = asyncHandler(async (req, res) => {
  await service.deleteMember(req.validated.params.memberId, req.user.id);
  res.status(HTTP_STATUS.NO_CONTENT).send();
});
