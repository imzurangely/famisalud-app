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


export const createFamily = asyncHandler(async (req, res) => {
  const data = await service.createFamily(req.user.id, req.validated.body);
  res.status(HTTP_STATUS.CREATED).json({ success: true, data });
});

export const listFamilies = asyncHandler(async (req, res) => {
  const data = await service.listFamilies(req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const linkAccount = asyncHandler(async (req, res) => {
  const data = await service.linkAccount(
    req.validated.params.familyId,
    req.validated.params.memberId,
    req.user.id,
    req.validated.body
  );
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const transferAdministrator = asyncHandler(async (req, res) => {
  const data = await service.transferAdministrator(
    req.validated.params.familyId,
    req.user.id,
    req.validated.body
  );
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const leaveFamily = asyncHandler(async (req, res) => {
  const data = await service.leaveFamily(req.validated.params.familyId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const data = await service.listFamilyAuditLogs(
    req.validated.params.familyId,
    req.user.id,
    req.validated.query.limit
  );
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});
