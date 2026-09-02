const MEDICATION_SELECT = `
  id, member_id, created_by_user_id, name, presentation,
  dose_amount, dose_unit, instructions, start_date, end_date,
  clinical_status, management_status, created_at, updated_at, deleted_at
`;

const SCHEDULE_SELECT = `
  ms.id, ms.medication_id,
  m.name AS medication_name,
  m.dose_amount AS medication_dose_amount,
  m.dose_unit AS medication_dose_unit,
  m.instructions AS medication_instructions,
  ms.schedule_type, ms.start_date, ms.end_date, ms.hour,
  ms.days_of_week, ms.interval_hours, ms.day_of_month,
  ms.is_active, ms.created_at, ms.updated_at
`;

const LOG_SELECT = `
  id, medication_id, medication_schedule_id, registered_by_user_id,
  scheduled_at, taken_at, status, notes, created_at
`;

export async function listMedications(client, memberId) {
  const result = await client.query(
    `SELECT ${MEDICATION_SELECT}
     FROM medications
     WHERE member_id = $1 AND deleted_at IS NULL
     ORDER BY clinical_status = 'ACTIVO' DESC, name ASC, created_at DESC`,
    [memberId]
  );
  return result.rows;
}

export async function findMedicationById(client, medicationId, memberId) {
  const result = await client.query(
    `SELECT ${MEDICATION_SELECT}
     FROM medications
     WHERE id = $1 AND member_id = $2 AND deleted_at IS NULL
     LIMIT 1`,
    [medicationId, memberId]
  );
  return result.rows[0] ?? null;
}

export async function createMedication(client, memberId, userId, data) {
  const result = await client.query(
    `INSERT INTO medications (
      member_id, created_by_user_id, name, presentation, dose_amount, dose_unit,
      instructions, start_date, end_date, clinical_status, management_status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING ${MEDICATION_SELECT}`,
    [
      memberId,
      userId,
      data.name,
      data.presentation ?? null,
      data.doseAmount ?? null,
      data.doseUnit ?? null,
      data.instructions ?? null,
      data.startDate ?? null,
      data.endDate ?? null,
      data.clinicalStatus ?? 'ACTIVO',
      data.managementStatus ?? 'SIN_TRAMITE'
    ]
  );
  return result.rows[0];
}

export async function updateMedication(client, medicationId, memberId, data) {
  const fields = {
    name: 'name',
    presentation: 'presentation',
    doseAmount: 'dose_amount',
    doseUnit: 'dose_unit',
    instructions: 'instructions',
    startDate: 'start_date',
    endDate: 'end_date',
    clinicalStatus: 'clinical_status',
    managementStatus: 'management_status'
  };

  const entries = Object.entries(data).filter(([key, value]) => key in fields && value !== undefined);
  if (!entries.length) return findMedicationById(client, medicationId, memberId);

  const assignments = entries.map(([key], index) => `${fields[key]} = $${index + 3}`);
  const values = entries.map(([, value]) => value ?? null);

  const result = await client.query(
    `UPDATE medications
     SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND member_id = $2 AND deleted_at IS NULL
     RETURNING ${MEDICATION_SELECT}`,
    [medicationId, memberId, ...values]
  );

  return result.rows[0] ?? null;
}

export async function softDeleteMedication(client, medicationId, memberId) {
  const result = await client.query(
    `UPDATE medications
     SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND member_id = $2 AND deleted_at IS NULL
     RETURNING id, member_id, deleted_at`,
    [medicationId, memberId]
  );
  return result.rows[0] ?? null;
}

export async function listSchedules(client, medicationId) {
  const result = await client.query(
    `SELECT ${SCHEDULE_SELECT}
     FROM medication_schedules ms
     JOIN medications m ON m.id = ms.medication_id
     WHERE ms.medication_id = $1
       AND ms.is_active = TRUE
       AND m.deleted_at IS NULL
     ORDER BY ms.start_date DESC, ms.hour ASC NULLS LAST, ms.created_at DESC`,
    [medicationId]
  );
  return result.rows;
}

export async function findScheduleById(client, scheduleId, medicationId) {
  const result = await client.query(
    `SELECT ${SCHEDULE_SELECT}
     FROM medication_schedules ms
     JOIN medications m ON m.id = ms.medication_id
     WHERE ms.id = $1
       AND ms.medication_id = $2
       AND ms.is_active = TRUE
       AND m.deleted_at IS NULL
     LIMIT 1`,
    [scheduleId, medicationId]
  );
  return result.rows[0] ?? null;
}

export async function findScheduleByIdIncludingInactive(client, scheduleId, medicationId) {
  const result = await client.query(
    `SELECT ${SCHEDULE_SELECT}
     FROM medication_schedules ms
     JOIN medications m ON m.id = ms.medication_id
     WHERE ms.id = $1
       AND ms.medication_id = $2
       AND m.deleted_at IS NULL
     LIMIT 1`,
    [scheduleId, medicationId]
  );
  return result.rows[0] ?? null;
}

export async function createSchedule(client, medicationId, data) {
  const result = await client.query(
    `INSERT INTO medication_schedules (
      medication_id, schedule_type, start_date, end_date, hour,
      days_of_week, interval_hours, day_of_month, is_active
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING id, medication_id, schedule_type, start_date, end_date, hour,
      days_of_week, interval_hours, day_of_month, is_active, created_at, updated_at`,
    [
      medicationId,
      data.scheduleType,
      data.startDate,
      data.endDate ?? null,
      data.hour ?? null,
      data.daysOfWeek ?? null,
      data.intervalHours ?? null,
      data.dayOfMonth ?? null,
      data.isActive ?? true
    ]
  );

  const schedule = result.rows[0];
  const enriched = await findScheduleById(client, schedule.id, medicationId);
  return enriched ?? schedule;
}

export async function updateSchedule(client, scheduleId, medicationId, data) {
  const fields = {
    scheduleType: 'schedule_type',
    startDate: 'start_date',
    endDate: 'end_date',
    hour: 'hour',
    daysOfWeek: 'days_of_week',
    intervalHours: 'interval_hours',
    dayOfMonth: 'day_of_month',
    isActive: 'is_active'
  };

  const entries = Object.entries(data).filter(([key, value]) => key in fields && value !== undefined);
  if (!entries.length) return findScheduleById(client, scheduleId, medicationId);

  const assignments = entries.map(([key], index) => `${fields[key]} = $${index + 3}`);
  const values = entries.map(([, value]) => value ?? null);

  const result = await client.query(
    `UPDATE medication_schedules
     SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND medication_id = $2 AND is_active = TRUE
     RETURNING id`,
    [scheduleId, medicationId, ...values]
  );
  if (!result.rows[0]) return null;

  return findScheduleById(client, scheduleId, medicationId);
}

export async function deactivateSchedule(client, scheduleId, medicationId) {
  const result = await client.query(
    `UPDATE medication_schedules
     SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND medication_id = $2 AND is_active = TRUE
     RETURNING id`,
    [scheduleId, medicationId]
  );

  if (!result.rows[0]) return null;
  return findScheduleByIdIncludingInactive(client, scheduleId, medicationId);
}

export async function listLogs(client, medicationId, { from, to, status } = {}) {
  const result = await client.query(
    `SELECT ${LOG_SELECT}
     FROM medication_logs
     WHERE medication_id = $1
       AND ($2::timestamptz IS NULL OR scheduled_at >= $2)
       AND ($3::timestamptz IS NULL OR scheduled_at <= $3)
       AND ($4::medication_log_status_enum IS NULL OR status = $4)
     ORDER BY scheduled_at DESC, created_at DESC
     LIMIT 200`,
    [medicationId, from ?? null, to ?? null, status ?? null]
  );
  return result.rows;
}

export async function findLogById(client, logId, medicationId) {
  const result = await client.query(
    `SELECT ${LOG_SELECT}
     FROM medication_logs
     WHERE id = $1 AND medication_id = $2
     LIMIT 1`,
    [logId, medicationId]
  );
  return result.rows[0] ?? null;
}

export async function createLog(client, medicationId, userId, data) {
  const result = await client.query(
    `INSERT INTO medication_logs (
      medication_id, medication_schedule_id, registered_by_user_id,
      scheduled_at, taken_at, status, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING ${LOG_SELECT}`,
    [
      medicationId,
      data.scheduleId ?? null,
      userId,
      data.scheduledAt,
      data.takenAt ?? null,
      data.status,
      data.notes ?? null
    ]
  );
  return result.rows[0];
}

export async function updateLog(client, logId, medicationId, data) {
  const fields = {
    scheduledAt: 'scheduled_at',
    takenAt: 'taken_at',
    status: 'status',
    notes: 'notes',
    scheduleId: 'medication_schedule_id'
  };

  const entries = Object.entries(data).filter(([key, value]) => key in fields && value !== undefined);
  if (!entries.length) return findLogById(client, logId, medicationId);

  const assignments = entries.map(([key], index) => `${fields[key]} = $${index + 3}`);
  const values = entries.map(([, value]) => value ?? null);

  const result = await client.query(
    `UPDATE medication_logs
     SET ${assignments.join(', ')}
     WHERE id = $1 AND medication_id = $2
     RETURNING ${LOG_SELECT}`,
    [logId, medicationId, ...values]
  );
  return result.rows[0] ?? null;
}

export async function getMedicationHistory(client, medicationId, limit = 50) {
  const result = await client.query(
    `SELECT id, user_id, family_id, action, entity, entity_id, changes, created_at
     FROM audit_logs
     WHERE (entity = 'medications' AND entity_id = $1)
        OR (entity = 'medication_schedules' AND entity_id IN (
          SELECT id FROM medication_schedules WHERE medication_id = $1
        ))
        OR (entity = 'medication_logs' AND entity_id IN (
          SELECT id FROM medication_logs WHERE medication_id = $1
        ))
     ORDER BY created_at DESC
     LIMIT $2`,
    [medicationId, limit]
  );
  return result.rows;
}
