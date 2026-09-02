import { HTTP_STATUS } from '../../shared/constants/http.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as service from './medication.service.js';

export const list = asyncHandler(async (req, res) => {
  const data = await service.list(req.validated.params.memberId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const getById = asyncHandler(async (req, res) => {
  const { memberId, medicationId } = req.validated.params;
  const data = await service.getById(memberId, medicationId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const create = asyncHandler(async (req, res) => {
  const data = await service.create(req.validated.params.memberId, req.user.id, req.validated.body);
  res.status(HTTP_STATUS.CREATED).json({ success: true, data });
});

export const update = asyncHandler(async (req, res) => {
  const { memberId, medicationId } = req.validated.params;
  const data = await service.update(memberId, medicationId, req.user.id, req.validated.body);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const remove = asyncHandler(async (req, res) => {
  const { memberId, medicationId } = req.validated.params;
  await service.remove(memberId, medicationId, req.user.id);
  res.status(HTTP_STATUS.NO_CONTENT).send();
});

export const listSchedules = asyncHandler(async (req, res) => {
  const { memberId, medicationId } = req.validated.params;
  const data = await service.listSchedules(memberId, medicationId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const getSchedule = asyncHandler(async (req, res) => {
  const { memberId, medicationId, scheduleId } = req.validated.params;
  const data = await service.getSchedule(memberId, medicationId, scheduleId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const createSchedule = asyncHandler(async (req, res) => {
  const { memberId, medicationId } = req.validated.params;
  const data = await service.createSchedule(memberId, medicationId, req.user.id, req.validated.body);
  res.status(HTTP_STATUS.CREATED).json({ success: true, data });
});

export const updateSchedule = asyncHandler(async (req, res) => {
  const { memberId, medicationId, scheduleId } = req.validated.params;
  const data = await service.updateSchedule(memberId, medicationId, scheduleId, req.user.id, req.validated.body);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const removeSchedule = asyncHandler(async (req, res) => {
  const { memberId, medicationId, scheduleId } = req.validated.params;
  await service.removeSchedule(memberId, medicationId, scheduleId, req.user.id);
  res.status(HTTP_STATUS.NO_CONTENT).send();
});

export const listLogs = asyncHandler(async (req, res) => {
  const { memberId, medicationId } = req.validated.params;
  const data = await service.listLogs(memberId, medicationId, req.user.id, req.validated.query);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const getLog = asyncHandler(async (req, res) => {
  const { memberId, medicationId, logId } = req.validated.params;
  const data = await service.getLog(memberId, medicationId, logId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const createLog = asyncHandler(async (req, res) => {
  const { memberId, medicationId } = req.validated.params;
  const data = await service.createLog(memberId, medicationId, req.user.id, req.validated.body);
  res.status(HTTP_STATUS.CREATED).json({ success: true, data });
});

export const updateLog = asyncHandler(async (req, res) => {
  const { memberId, medicationId, logId } = req.validated.params;
  const data = await service.updateLog(memberId, medicationId, logId, req.user.id, req.validated.body);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const history = asyncHandler(async (req, res) => {
  const { memberId, medicationId } = req.validated.params;
  const data = await service.history(memberId, medicationId, req.user.id, req.validated.query.limit);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});
