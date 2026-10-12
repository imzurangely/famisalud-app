import crypto from 'node:crypto';
import { pool } from '../../config/database.js';
import * as medicationRepository from '../medication-process/medicationProcess.repository.js';

const TIME_ZONE = 'America/Bogota';
const POLL_MINUTES = 1;
const APPOINTMENT_REMINDER_MINUTES_BEFORE = 24 * 60;

function getLocalParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    isoMinute: `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:00`
  };
}

function formatBogotaDateTime(date = new Date()) {
  const local = getLocalParts(date);
  const millisecond = String(date.getMilliseconds()).padStart(3, '0');
  return `${local.date}T${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}:${String(local.second).padStart(2, '0')}.${millisecond}-05:00`;
}

function localWeekday(date = new Date()) {
  const [year, month, day] = getLocalParts(date).date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7;
}

function buildLocalDateTime(dateString, timeString) {
  const normalizedTime = String(timeString).slice(0, 5);
  return new Date(`${dateString}T${normalizedTime}:00Z`);
}

function occurrenceId(seed) {
  const digest = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32);
  const hex = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20)}`;
  return hex;
}

function scheduleIsDue(schedule, now = new Date()) {
  const local = getLocalParts(now);
  const currentMinutes = local.hour * 60 + local.minute;
  const hourString = schedule.hour ? String(schedule.hour).slice(0, 5) : null;

  if (!hourString || schedule.schedule_type === 'SI_ES_NECESARIO') return null;

  if (schedule.schedule_type === 'DIARIO') {
    const target = hourString.split(':').map(Number);
    if (currentMinutes !== target[0] * 60 + target[1]) return null;
    return `${local.date}T${hourString}:00`;
  }

  if (schedule.schedule_type === 'DIAS_SEMANA') {
    const weekday = localWeekday(now);
    if (!schedule.days_of_week?.includes(weekday)) return null;
    const target = hourString.split(':').map(Number);
    if (currentMinutes !== target[0] * 60 + target[1]) return null;
    return `${local.date}T${hourString}:00`;
  }

  if (schedule.schedule_type === 'MENSUAL') {
    if (local.date.slice(8, 10) !== String(schedule.day_of_month).padStart(2, '0')) return null;
    const target = hourString.split(':').map(Number);
    if (currentMinutes !== target[0] * 60 + target[1]) return null;
    return `${local.date}T${hourString}:00`;
  }

  if (schedule.schedule_type === 'INTERVALO_HORAS') {
    const start = buildLocalDateTime(schedule.start_date, hourString);
    const current = buildLocalDateTime(local.date, `${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}`);
    const diffMinutes = Math.floor((current.getTime() - start.getTime()) / 60000);
    const intervalMinutes = Number(schedule.interval_hours) * 60;

    if (diffMinutes < 0 || diffMinutes % intervalMinutes !== 0) return null;
    return `${local.date}T${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}:00`;
  }

  return null;
}

async function listDueMedicationSchedules(client, now) {
  const local = getLocalParts(now);
  const result = await client.query(
    `SELECT ms.id, ms.medication_id, ms.schedule_type, ms.start_date, ms.end_date,
            ms.hour, ms.days_of_week, ms.interval_hours, ms.day_of_month,
            m.name AS medication_name, m.presentation, m.instructions,
            m.member_id, fm.first_name AS member_first_name,
            fm.last_name AS member_last_name, fm.linked_user_id
     FROM medication_schedules ms
     JOIN medications m ON m.id = ms.medication_id
     JOIN family_members fm ON fm.id = m.member_id
     WHERE ms.is_active = TRUE
       AND m.deleted_at IS NULL
       AND fm.deleted_at IS NULL
       AND m.clinical_status = 'ACTIVO'
       AND ms.start_date <= $1::date
       AND (ms.end_date IS NULL OR ms.end_date >= $1::date)
       AND ms.schedule_type <> 'SI_ES_NECESARIO'`,
    [local.date]
  );
  return result.rows;
}

async function listMedicationRecipients(client, medicationId) {
  return medicationRepository.listReminderRecipients(client, medicationId);
}

async function existsNotificationForOccurrence(client, { userId, notificationType, entityId }) {
  const result = await client.query(
    `SELECT 1
     FROM notifications
     WHERE user_id = $1
       AND notification_type = $2
       AND entity_id = $3
     LIMIT 1`,
    [userId, notificationType, entityId]
  );
  return Boolean(result.rows[0]);
}

async function insertNotification(client, data) {
  await client.query(
    `INSERT INTO notifications (
      user_id, notification_type, title, body, entity_type, entity_id
    ) VALUES ($1,$2,$3,$4,$5,$6)`,
    [data.userId, data.notificationType, data.title, data.body ?? null, data.entityType, data.entityId]
  );
}

async function processMedicationReminders(client, now) {
  const schedules = await listDueMedicationSchedules(client, now);
  let created = 0;

  for (const schedule of schedules) {
    const occurrence = scheduleIsDue(schedule, now);
    if (!occurrence) continue;

    const entityId = occurrenceId(`medication-schedule:${schedule.id}:${occurrence}`);
    const recipients = await listMedicationRecipients(client, schedule.medication_id);

    for (const userId of recipients) {
      const exists = await existsNotificationForOccurrence(client, {
        userId,
        notificationType: 'RECORDATORIO_MEDICAMENTO',
        entityId
      });
      if (exists) continue;

      const memberName = `${schedule.member_first_name} ${schedule.member_last_name}`.trim();
      const isRecipientTheMedicationOwner = schedule.linked_user_id === userId;
      const title = isRecipientTheMedicationOwner
        ? `Hora de tomar ${schedule.medication_name}`
        : `Medicamento de ${memberName}: ${schedule.medication_name}`;
      const instructionText = schedule.instructions
        ? ` Indicaciones: ${schedule.instructions}`
        : ' Recuerda seguir las indicaciones registradas.';
      const body = isRecipientTheMedicationOwner
        ? `Es hora de tomar ${schedule.medication_name}.${instructionText}`
        : `Es hora de que ${memberName} tome ${schedule.medication_name}.${instructionText}`;

      await insertNotification(client, {
        userId,
        notificationType: 'RECORDATORIO_MEDICAMENTO',
        title,
        body,
        entityType: 'MEDICATION_SCHEDULE_OCCURRENCE',
        entityId
      });
      created += 1;
    }
  }

  return { schedules: schedules.length, created };
}

async function listDueAppointmentReminders(client, now) {
  const targetFrom = new Date(now.getTime() + APPOINTMENT_REMINDER_MINUTES_BEFORE * 60_000);
  const targetTo = new Date(targetFrom.getTime() + POLL_MINUTES * 60_000);

  const result = await client.query(
    `SELECT a.id, a.member_id, a.title, a.doctor_name, a.location,
            a.starts_at, fm.linked_user_id, a.created_by_user_id,
            fm.first_name AS member_first_name, fm.last_name AS member_last_name
     FROM appointments a
     JOIN family_members fm ON fm.id = a.member_id
     WHERE a.deleted_at IS NULL
       AND a.status = 'PROGRAMADA'
       AND a.starts_at >= $1
       AND a.starts_at < $2`,
    [targetFrom, targetTo]
  );

  return result.rows;
}

async function processAppointmentReminders(client, now) {
  const appointments = await listDueAppointmentReminders(client, now);
  let created = 0;

  for (const appointment of appointments) {
    const userId = appointment.linked_user_id ?? appointment.created_by_user_id;
    if (!userId) continue;
    const memberName = `${appointment.member_first_name} ${appointment.member_last_name}`.trim();
    const isRecipientTheAppointmentOwner = appointment.linked_user_id === userId;

    const exists = await existsNotificationForOccurrence(client, {
      userId,
      notificationType: 'RECORDATORIO_CITA',
      entityId: appointment.id
    });
    if (exists) continue;

    const date = new Intl.DateTimeFormat('es-CO', {
      timeZone: TIME_ZONE,
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(appointment.starts_at));

    await insertNotification(client, {
      userId,
      notificationType: 'RECORDATORIO_CITA',
      title: isRecipientTheAppointmentOwner
        ? `Tienes una cita próxima: ${appointment.title}`
        : `Cita médica de ${memberName}: ${appointment.title}`,
      body: isRecipientTheAppointmentOwner
        ? `Tu cita está programada para ${date}.`
        : `La cita de ${memberName} está programada para ${date}.`,
      entityType: 'APPOINTMENT',
      entityId: appointment.id
    });
    created += 1;
  }

  return { appointments: appointments.length, created };
}

export async function runReminderSweep({ referenceDateTime = new Date() } = {}) {
  const now = new Date(referenceDateTime);
  if (Number.isNaN(now.getTime())) {
    throw new Error('referenceDateTime no es una fecha válida.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const medication = await processMedicationReminders(client, now);
    const appointments = await processAppointmentReminders(client, now);
    await client.query('COMMIT');

    const result = {
      referenceDateTime: formatBogotaDateTime(now),
      timeZone: TIME_ZONE,
      medication,
      appointments
    };
    console.log('[reminders.cron] barrido de recordatorios completado:', result);
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
