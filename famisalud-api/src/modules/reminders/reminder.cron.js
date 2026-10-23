import crypto from 'node:crypto';
import { pool } from '../../config/database.js';
import * as medicationRepository from '../medication-process/medicationProcess.repository.js';

const TIME_ZONE = 'America/Bogota';
const APPOINTMENT_REMINDER_WINDOW_HOURS = 24;

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
            m.member_id, p.first_name AS member_first_name,
            p.last_name AS member_last_name, member_user.id AS linked_user_id
     FROM medication_schedules ms
     JOIN medications m ON m.id = ms.medication_id
     JOIN family_members fm ON fm.id = m.member_id
     JOIN persons p ON p.id = fm.person_id
     LEFT JOIN users member_user ON member_user.person_id = p.id
       AND member_user.is_active = TRUE
       AND member_user.deleted_at IS NULL
     WHERE ms.is_active = TRUE
       AND m.deleted_at IS NULL
       AND EXISTS (
         SELECT 1
         FROM family_members active_profile
         WHERE active_profile.person_id = fm.person_id
           AND active_profile.deleted_at IS NULL
       )
       AND m.clinical_status = 'ACTIVO'
       AND ms.start_date <= $1::date
       AND (ms.end_date IS NULL OR ms.end_date >= $1::date)
       AND ms.schedule_type <> 'SI_ES_NECESARIO'`,
    [local.date]
  );
  return result.rows;
}

async function listMedicationRecipients(client, medicationId, linkedUserId) {
  const configured = await medicationRepository.listReminderRecipients(client, medicationId);
  // El titular de un tratamiento con cuenta recibe sus propios recordatorios
  // de forma predeterminada. Los miembros configurados se agregan como copias.
  return [...new Set([...configured, ...(linkedUserId ? [linkedUserId] : [])])];
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

function buildNotificationTitle(title, subjectName) {
  const fullTitle = String(title ?? 'Notificación de FamiSalud');
  if (fullTitle.length <= 150) return fullTitle;

  // No cortar el nombre del medicamento o de la cita si el contexto hace
  // que el título supere el límite de notifications.title.
  const subject = String(subjectName ?? '').trim();
  if (subject && subject.length <= 150) return subject;
  return fullTitle.slice(0, 150);
}

async function insertNotification(client, data) {
  await client.query(
    `INSERT INTO notifications (
      user_id, notification_type, title, body, entity_type, entity_id
    ) VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      data.userId,
      data.notificationType,
      buildNotificationTitle(data.title, data.subjectName),
      data.body ?? null,
      data.entityType,
      data.entityId
    ]
  );
}

async function processMedicationReminders(client, now) {
  const schedules = await listDueMedicationSchedules(client, now);
  let dueSchedules = 0;
  let configuredRecipients = 0;
  let created = 0;

  for (const schedule of schedules) {
    const occurrence = scheduleIsDue(schedule, now);
    if (!occurrence) continue;
    dueSchedules += 1;

    const entityId = occurrenceId(`medication-schedule:${schedule.id}:${occurrence}`);
    const recipients = await listMedicationRecipients(client, schedule.medication_id, schedule.linked_user_id);
    configuredRecipients += recipients.length;

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
        : `Medicamento ${schedule.medication_name} para ${memberName}`;
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
        subjectName: schedule.medication_name,
        body,
        entityType: 'MEDICATION_SCHEDULE_OCCURRENCE',
        entityId
      });
      created += 1;
    }
  }

  return {
    schedules: schedules.length,
    dueSchedules,
    recipientsConsidered: configuredRecipients,
    created
  };
}

async function countUpcomingAppointments(client, now) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM appointments a
     JOIN family_members fm ON fm.id = a.member_id AND fm.deleted_at IS NULL
     WHERE a.deleted_at IS NULL
       AND a.status IN ('PROGRAMADA', 'REPROGRAMADA')
       AND a.starts_at > $1`,
    [now]
  );
  return result.rows[0]?.count ?? 0;
}

async function listDueAppointmentReminders(client, now) {
  // Se procesa cualquier cita futura que ya esté dentro de sus últimas 24 h.
  // No se usa una ventana de un minuto alrededor de now + 24 h, porque los
  // milisegundos del cron hacían que una cita con hora exacta quedara fuera.
  const targetTo = new Date(now.getTime() + APPOINTMENT_REMINDER_WINDOW_HOURS * 60 * 60_000);

  const result = await client.query(
    `SELECT a.id, a.member_id, a.title, a.doctor_name, a.location,
            a.starts_at, fm.family_id, fm.person_id,
            member_user.id AS linked_user_id, a.created_by_user_id,
            p.first_name AS member_first_name, p.last_name AS member_last_name
     FROM appointments a
     JOIN family_members fm ON fm.id = a.member_id
     JOIN persons p ON p.id = fm.person_id
     LEFT JOIN users member_user ON member_user.person_id = p.id
       AND member_user.is_active = TRUE
       AND member_user.deleted_at IS NULL
     WHERE a.deleted_at IS NULL
       AND a.status IN ('PROGRAMADA', 'REPROGRAMADA')
       AND fm.deleted_at IS NULL
       AND a.starts_at > $1
       AND a.starts_at <= $2`,
    [now, targetTo]
  );

  return result.rows;
}

async function listAppointmentRecipients(client, { personId, linkedUserId, createdByUserId }) {
  // El historial de citas es global para la persona. Por eso reciben la
  // notificación los administradores activos de todas las familias que tengan
  // un perfil activo de esa misma persona, no solo los de la familia del
  // perfil que originalmente quedó asociado a la cita.
  const adminsResult = await client.query(
    `SELECT DISTINCT fu.user_id
     FROM family_members family_profile
     JOIN family_users fu ON fu.family_id = family_profile.family_id
     JOIN users u ON u.id = fu.user_id
     WHERE family_profile.person_id = $1
       AND family_profile.deleted_at IS NULL
       AND fu.role = 'ADMINISTRADOR'::family_role_enum
       AND fu.left_at IS NULL
       AND u.is_active = TRUE
       AND u.deleted_at IS NULL`,
    [personId]
  );

  const recipients = new Set(adminsResult.rows.map((row) => row.user_id));

  // Conserva la entrega al usuario vinculado; si el miembro no tiene cuenta,
  // conserva también el comportamiento anterior de notificar al creador.
  // Set evita una segunda fila si esa persona ya es administrador.
  const primaryRecipientId = linkedUserId ?? createdByUserId;
  if (primaryRecipientId) {
    const userResult = await client.query(
      `SELECT id FROM users
       WHERE id = $1 AND is_active = TRUE AND deleted_at IS NULL`,
      [primaryRecipientId]
    );
    if (userResult.rows.length > 0) recipients.add(primaryRecipientId);
  }

  return [...recipients];
}

async function processAppointmentReminders(client, now) {
  const [upcoming, appointments] = await Promise.all([
    countUpcomingAppointments(client, now),
    listDueAppointmentReminders(client, now)
  ]);
  let created = 0;
  let recipientsConsidered = 0;

  for (const appointment of appointments) {
    const recipients = await listAppointmentRecipients(client, {
      personId: appointment.person_id,
      linkedUserId: appointment.linked_user_id,
      createdByUserId: appointment.created_by_user_id
    });
    recipientsConsidered += recipients.length;
    if (recipients.length === 0) continue;

    const memberName = `${appointment.member_first_name} ${appointment.member_last_name}`.trim();
    const date = new Intl.DateTimeFormat('es-CO', {
      timeZone: TIME_ZONE,
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(appointment.starts_at));

    for (const userId of recipients) {
      const exists = await existsNotificationForOccurrence(client, {
        userId,
        notificationType: 'RECORDATORIO_CITA',
        entityId: appointment.id
      });
      if (exists) continue;

      const isRecipientTheAppointmentOwner = appointment.linked_user_id === userId;
      await insertNotification(client, {
        userId,
        notificationType: 'RECORDATORIO_CITA',
        title: isRecipientTheAppointmentOwner
          ? `Tienes una cita próxima: ${appointment.title}`
          : `Cita: ${appointment.title} · ${memberName}`,
        subjectName: appointment.title,
        body: isRecipientTheAppointmentOwner
          ? `Tu cita está programada para ${date}.`
          : `La cita de ${memberName} está programada para ${date}.`,
        entityType: 'APPOINTMENT',
        entityId: appointment.id
      });
      created += 1;
    }
  }

  return {
    upcoming,
    inReminderWindow: appointments.length,
    recipientsConsidered,
    created
  };
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
