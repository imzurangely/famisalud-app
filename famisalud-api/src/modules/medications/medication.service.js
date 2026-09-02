import { withTransaction } from '../../config/database.js';
import { AppError } from '../../shared/utils/AppError.js';
import {
  assertCanManageMember,
  assertCanViewMember
} from '../../shared/authorization/familyAccess.js';
import { writeAuditLog } from '../../shared/utils/auditLog.js';
import * as repository from './medication.repository.js';

const MEDICATION_ENTITY = 'medications';
const SCHEDULE_ENTITY = 'medication_schedules';
const LOG_ENTITY = 'medication_logs';

function assertMedicationDates(data, medication = null) {
  const startDate = data.startDate !== undefined ? data.startDate : medication?.start_date;
  const endDate = data.endDate !== undefined ? data.endDate : medication?.end_date;

  if (startDate && endDate && endDate < startDate) {
    throw new AppError('La fecha de finalización no puede ser anterior a la fecha de inicio.', 422);
  }
}

function assertDoseConsistency(data, medication = null) {
  const doseAmount = data.doseAmount !== undefined ? data.doseAmount : medication?.dose_amount;
  const doseUnit = data.doseUnit !== undefined ? data.doseUnit : medication?.dose_unit;

  if (doseAmount !== null && doseAmount !== undefined && !doseUnit) {
    throw new AppError('La unidad de dosis es obligatoria cuando se informa la dosis.', 422);
  }
}

function toCalendarDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function assertScheduleDates(data, medication) {
  const scheduleStartDate = toCalendarDate(data.startDate);
  const scheduleEndDate = toCalendarDate(data.endDate);
  const medicationStartDate = toCalendarDate(medication.start_date);
  const medicationEndDate = toCalendarDate(medication.end_date);

  if (scheduleEndDate && scheduleStartDate && scheduleEndDate < scheduleStartDate) {
    throw new AppError('La fecha de finalización no puede ser anterior a la fecha de inicio.', 422);
  }

  if (medicationStartDate && scheduleStartDate && scheduleStartDate < medicationStartDate) {
    throw new AppError('El horario no puede iniciar antes que el medicamento.', 422);
  }

  if (medicationEndDate && scheduleStartDate && scheduleStartDate > medicationEndDate) {
    throw new AppError('El horario no puede iniciar después de la finalización del medicamento.', 422);
  }

  if (medicationEndDate && scheduleEndDate && scheduleEndDate > medicationEndDate) {
    throw new AppError('El horario no puede finalizar después del medicamento.', 422);
  }
}

async function getMedicationOrFail(client, medicationId, memberId) {
  const medication = await repository.findMedicationById(client, medicationId, memberId);
  if (!medication) throw new AppError('Medicamento no encontrado.', 404);
  return medication;
}

async function getScheduleOrFail(client, scheduleId, medicationId) {
  const schedule = await repository.findScheduleById(client, scheduleId, medicationId);
  if (!schedule) throw new AppError('Horario no encontrado.', 404);
  return schedule;
}

async function getLogOrFail(client, logId, medicationId) {
  const log = await repository.findLogById(client, logId, medicationId);
  if (!log) throw new AppError('Toma no encontrada.', 404);
  return log;
}

export async function list(memberId, userId) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    return repository.listMedications(client, memberId);
  });
}

export async function getById(memberId, medicationId, userId) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    return getMedicationOrFail(client, medicationId, memberId);
  });
}

export async function create(memberId, userId, data) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);
    assertMedicationDates(data);
    assertDoseConsistency(data);

    const medication = await repository.createMedication(client, memberId, userId, data);

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'CREATE',
      entity: MEDICATION_ENTITY,
      entityId: medication.id,
      changes: { new: medication }
    });

    return medication;
  });
}

export async function update(memberId, medicationId, userId, data) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);
    const before = await getMedicationOrFail(client, medicationId, memberId);

    assertMedicationDates(data, before);
    assertDoseConsistency(data, before);

    const medication = await repository.updateMedication(client, medicationId, memberId, data);
    if (!medication) throw new AppError('Medicamento no encontrado.', 404);

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'UPDATE',
      entity: MEDICATION_ENTITY,
      entityId: medicationId,
      changes: { old: before, new: medication }
    });

    return medication;
  });
}

export async function remove(memberId, medicationId, userId) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);
    await getMedicationOrFail(client, medicationId, memberId);

    const deleted = await repository.softDeleteMedication(client, medicationId, memberId);
    if (!deleted) throw new AppError('Medicamento no encontrado.', 404);

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'DELETE',
      entity: MEDICATION_ENTITY,
      entityId: medicationId,
      changes: { deletedAt: deleted.deleted_at }
    });

    return deleted;
  });
}

export async function listSchedules(memberId, medicationId, userId) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    await getMedicationOrFail(client, medicationId, memberId);
    return repository.listSchedules(client, medicationId);
  });
}

export async function getSchedule(memberId, medicationId, scheduleId, userId) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    await getMedicationOrFail(client, medicationId, memberId);
    return getScheduleOrFail(client, scheduleId, medicationId);
  });
}

export async function createSchedule(memberId, medicationId, userId, data) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);
    const medication = await getMedicationOrFail(client, medicationId, memberId);
    assertScheduleDates(data, medication);

    const schedule = await repository.createSchedule(client, medicationId, data);

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'CREATE',
      entity: SCHEDULE_ENTITY,
      entityId: schedule.id,
      changes: { new: schedule, medicationId }
    });

    return schedule;
  });
}

export async function updateSchedule(memberId, medicationId, scheduleId, userId, data) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);
    const medication = await getMedicationOrFail(client, medicationId, memberId);
    const before = await getScheduleOrFail(client, scheduleId, medicationId);

    const effectiveStartDate = data.startDate ?? before.start_date;
    const effectiveEndDate = data.endDate !== undefined ? data.endDate : before.end_date;
    const effectiveScheduleType = data.scheduleType ?? before.schedule_type;
    const effectiveHour = data.hour !== undefined ? data.hour : before.hour;
    const effectiveDaysOfWeek = data.daysOfWeek !== undefined ? data.daysOfWeek : before.days_of_week;
    const effectiveIntervalHours = data.intervalHours !== undefined ? data.intervalHours : before.interval_hours;
    const effectiveDayOfMonth = data.dayOfMonth !== undefined ? data.dayOfMonth : before.day_of_month;

    if (effectiveScheduleType !== 'SI_ES_NECESARIO' && !effectiveHour) {
      throw new AppError('La hora es obligatoria para este tipo de horario.', 422);
    }
    if (effectiveScheduleType === 'DIAS_SEMANA' && (!effectiveDaysOfWeek || effectiveDaysOfWeek.length === 0)) {
      throw new AppError('Debe indicar al menos un día de la semana.', 422);
    }
    if (effectiveScheduleType === 'INTERVALO_HORAS' && !effectiveIntervalHours) {
      throw new AppError('Debe indicar el intervalo en horas.', 422);
    }
    if (effectiveScheduleType === 'MENSUAL' && !effectiveDayOfMonth) {
      throw new AppError('Debe indicar el día del mes.', 422);
    }

    assertScheduleDates({
      ...data,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate
    }, medication);

    const updateData = { ...data };

    if (data.scheduleType !== undefined) {
      if (effectiveScheduleType !== 'DIAS_SEMANA') updateData.daysOfWeek = null;
      if (effectiveScheduleType !== 'INTERVALO_HORAS') updateData.intervalHours = null;
      if (effectiveScheduleType !== 'MENSUAL') updateData.dayOfMonth = null;
      if (effectiveScheduleType === 'SI_ES_NECESARIO') updateData.hour = null;
    }

    const schedule = await repository.updateSchedule(client, scheduleId, medicationId, updateData);
    if (!schedule) throw new AppError('Horario no encontrado.', 404);

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'UPDATE',
      entity: SCHEDULE_ENTITY,
      entityId: scheduleId,
      changes: { old: before, new: schedule, medicationId }
    });

    return schedule;
  });
}

export async function removeSchedule(memberId, medicationId, scheduleId, userId) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);
    await getMedicationOrFail(client, medicationId, memberId);
    const before = await getScheduleOrFail(client, scheduleId, medicationId);

    const schedule = await repository.deactivateSchedule(client, scheduleId, medicationId);
    if (!schedule) throw new AppError('El horario ya estaba inactivo o no existe.', 404);

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'DELETE',
      entity: SCHEDULE_ENTITY,
      entityId: scheduleId,
      changes: { old: before, new: schedule, medicationId }
    });

    return schedule;
  });
}

export async function listLogs(memberId, medicationId, userId, filters) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    await getMedicationOrFail(client, medicationId, memberId);
    return repository.listLogs(client, medicationId, filters);
  });
}

export async function getLog(memberId, medicationId, logId, userId) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    await getMedicationOrFail(client, medicationId, memberId);
    return getLogOrFail(client, logId, medicationId);
  });
}

export async function createLog(memberId, medicationId, userId, data) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);
    await getMedicationOrFail(client, medicationId, memberId);

    if (data.scheduleId) {
      const schedule = await repository.findScheduleById(client, data.scheduleId, medicationId);
      if (!schedule) throw new AppError('El horario indicado no existe, no pertenece al medicamento o está inactivo.', 422);
    }

    const log = await repository.createLog(client, medicationId, userId, data);

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'CREATE',
      entity: LOG_ENTITY,
      entityId: log.id,
      changes: { new: log, medicationId }
    });

    return log;
  });
}

export async function updateLog(memberId, medicationId, logId, userId, data) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);
    await getMedicationOrFail(client, medicationId, memberId);
    const before = await getLogOrFail(client, logId, medicationId);

    if (data.scheduleId) {
      const schedule = await repository.findScheduleById(client, data.scheduleId, medicationId);
      if (!schedule) throw new AppError('El horario indicado no existe, no pertenece al medicamento o está inactivo.', 422);
    }

    const effectiveStatus = data.status ?? before.status;
    const effectiveTakenAt = data.takenAt !== undefined ? data.takenAt : before.taken_at;

    if ((effectiveStatus === 'TOMADO' || effectiveStatus === 'RETRASADO') && !effectiveTakenAt) {
      throw new AppError('takenAt es obligatorio cuando la toma fue realizada.', 422);
    }

    if ((effectiveStatus === 'PENDIENTE' || effectiveStatus === 'OLVIDADO' || effectiveStatus === 'OMITIDO') && effectiveTakenAt) {
      throw new AppError('takenAt debe ser null para este estado.', 422);
    }

    const log = await repository.updateLog(client, logId, medicationId, data);
    if (!log) throw new AppError('Toma no encontrada.', 404);

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'UPDATE',
      entity: LOG_ENTITY,
      entityId: logId,
      changes: { old: before, new: log, medicationId }
    });

    return log;
  });
}

export async function history(memberId, medicationId, userId, limit) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    await getMedicationOrFail(client, medicationId, memberId);
    return repository.getMedicationHistory(client, medicationId, limit);
  });
}
