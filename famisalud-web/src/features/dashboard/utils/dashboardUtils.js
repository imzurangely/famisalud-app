export function fieldValue(record, camelName, snakeName) {
  if (!record) return null;
  const snake = snakeName || camelName.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  return record[camelName] ?? record[snake] ?? null;
}

export function memberName(member) {
  const person = member?.person ?? member;
  return [fieldValue(person, 'firstName', 'first_name'), fieldValue(person, 'lastName', 'last_name')]
    .filter(Boolean)
    .join(' ')
    || 'Perfil sin nombre';
}

export function memberPersonId(member) {
  return fieldValue(member, 'personId', 'person_id') || '';
}

export function linkedUserId(member) {
  return fieldValue(member, 'linkedUserId', 'linked_user_id')
    ?? fieldValue(member?.person, 'userId', 'user_id')
    ?? null;
}

export function formatDashboardDate(value, options = { dateStyle: 'medium' }) {
  if (!value) return 'Sin fecha';
  // A YYYY-MM-DD from PostgreSQL is a calendar date, not a UTC instant.
  // Parse it locally so it doesn't display as the previous day in Colombia.
  const dateOnlyMatch = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CO', options).format(date);
}

export function localDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayDateKey() {
  return localDateKey(new Date());
}

export function toLocalDateTimeInput(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function toApiDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Ingresa una fecha y hora válida.');
  return date.toISOString();
}

function parseHour(value) {
  if (!value) return null;
  const [hour, minute] = String(value).split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function dateFromMinutes(dayDate, minutes) {
  const result = new Date(dayDate);
  result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
}

function scheduleIsActiveToday(schedule, medication, dayKey, dayDate) {
  const status = String(fieldValue(medication, 'clinicalStatus', 'clinical_status') || '').toUpperCase();
  if (status !== 'ACTIVO') return false;
  const scheduleStart = String(fieldValue(schedule, 'startDate', 'start_date') || '').slice(0, 10);
  const scheduleEnd = String(fieldValue(schedule, 'endDate', 'end_date') || '').slice(0, 10);
  if (scheduleStart && scheduleStart > dayKey) return false;
  if (scheduleEnd && scheduleEnd < dayKey) return false;
  const active = fieldValue(schedule, 'isActive', 'is_active');
  if (active === false || active === 'false') return false;

  const type = String(fieldValue(schedule, 'scheduleType', 'schedule_type') || '').toUpperCase();
  if (type === 'DIAS_SEMANA') {
    const weekdays = fieldValue(schedule, 'daysOfWeek', 'days_of_week') || [];
    const isoDay = dayDate.getDay() === 0 ? 7 : dayDate.getDay();
    return Array.from(weekdays, Number).includes(isoDay);
  }
  if (type === 'MENSUAL') {
    return Number(fieldValue(schedule, 'dayOfMonth', 'day_of_month')) === dayDate.getDate();
  }
  return type !== 'SI_ES_NECESARIO';
}

function buildScheduledTimes(schedule, today) {
  const type = String(fieldValue(schedule, 'scheduleType', 'schedule_type') || '').toUpperCase();
  const baseMinutes = parseHour(fieldValue(schedule, 'hour'));
  if (baseMinutes === null) return [];
  if (type !== 'INTERVALO_HORAS') return [dateFromMinutes(today, baseMinutes)];
  const intervalHours = Number(fieldValue(schedule, 'intervalHours', 'interval_hours'));
  if (!Number.isFinite(intervalHours) || intervalHours < 1) return [dateFromMinutes(today, baseMinutes)];
  const values = [];
  for (let minutes = baseMinutes; minutes < 1440; minutes += intervalHours * 60) {
    values.push(dateFromMinutes(today, minutes));
    if (values.length > 24) break;
  }
  return values;
}

/** Construye horarios de hoy que se pueden registrar sin crear una segunda toma para la misma ocurrencia. */
export function buildTodayDoseTasks(memberRecords, referenceDate = new Date()) {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const dayKey = localDateKey(today);
  const tasks = [];

  for (const { member, medications } of memberRecords) {
    for (const detail of medications) {
      const { medication, schedules, logs } = detail;
      for (const schedule of schedules) {
        if (!scheduleIsActiveToday(schedule, medication, dayKey, today)) continue;
        for (const scheduledDate of buildScheduledTimes(schedule, today)) {
          const matchingLog = logs.find((log) => {
            const logScheduleId = fieldValue(log, 'medicationScheduleId', 'medication_schedule_id') || fieldValue(log, 'scheduleId', 'schedule_id');
            const logTime = fieldValue(log, 'scheduledAt', 'scheduled_at');
            return String(logScheduleId || '') === String(schedule.id)
              && localDateKey(logTime) === dayKey
              && new Date(logTime).getHours() === scheduledDate.getHours()
              && new Date(logTime).getMinutes() === scheduledDate.getMinutes();
          });
          const logStatus = String(fieldValue(matchingLog, 'status') || '').toUpperCase();
          if (matchingLog && ['TOMADO', 'RETRASADO', 'OLVIDADO', 'OMITIDO'].includes(logStatus)) continue;

          tasks.push({
            id: `${member.id}-${medication.id}-${schedule.id}-${scheduledDate.toISOString()}`,
            member,
            medication,
            schedule,
            scheduledAt: scheduledDate.toISOString(),
            existingLog: matchingLog || null,
          });
        }
      }
    }
  }

  return tasks.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
}

export function buildWeeklyAdherence(memberRecords, referenceDate = new Date()) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const days = [];

  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const key = localDateKey(date);
    const logs = memberRecords.flatMap(({ medications }) => medications.flatMap(({ logs: entries }) => entries))
      .filter((log) => localDateKey(fieldValue(log, 'scheduledAt', 'scheduled_at')) === key);
    const outcomes = logs.filter((log) => String(fieldValue(log, 'status') || '').toUpperCase() !== 'PENDIENTE');
    const completed = outcomes.filter((log) => ['TOMADO', 'RETRASADO'].includes(String(fieldValue(log, 'status') || '').toUpperCase())).length;
    days.push({
      key,
      label: new Intl.DateTimeFormat('es-CO', { weekday: 'short' }).format(date).replace('.', ''),
      day: date.getDate(),
      recorded: outcomes.length,
      completed,
      percent: outcomes.length ? Math.round((completed / outcomes.length) * 100) : 0,
    });
  }

  const totals = days.reduce((total, day) => ({ recorded: total.recorded + day.recorded, completed: total.completed + day.completed }), { recorded: 0, completed: 0 });
  return { days, ...totals, percent: totals.recorded ? Math.round((totals.completed / totals.recorded) * 100) : null };
}

export function buildDashboardDestinations(member, familyId, medication, options = {}) {
  const query = new URLSearchParams();
  if (member?.id) query.set('memberId', String(member.id));
  if (memberPersonId(member)) query.set('personId', String(memberPersonId(member)));
  if (familyId) query.set('familyId', String(familyId));
  if (medication?.id) query.set('medicationId', String(medication.id));
  if (options.tab) query.set('tab', options.tab);
  if (options.deliveryId) query.set('deliveryId', String(options.deliveryId));
  if (options.scheduleId) query.set('scheduleId', String(options.scheduleId));
  if (options.recordTake) query.set('recordTake', '1');
  return `/medicamentos${query.size ? `?${query.toString()}` : ''}`;
}

export function appointmentDestination(member, familyId, appointment) {
  const query = new URLSearchParams();
  if (member?.id) query.set('memberId', String(member.id));
  if (memberPersonId(member)) query.set('personId', String(memberPersonId(member)));
  if (familyId) query.set('familyId', String(familyId));
  if (appointment?.id) query.set('appointmentId', String(appointment.id));
  return `/citas${query.size ? `?${query.toString()}` : ''}`;
}
