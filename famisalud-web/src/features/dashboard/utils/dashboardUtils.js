export function fieldValue(record, camelName, snakeName) {
  if (!record) return null;
  const snake =
    snakeName ||
    camelName.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  return record[camelName] ?? record[snake] ?? null;
}

export function memberName(member) {
  const person = member?.person ?? member;
  return (
    [
      fieldValue(person, "firstName", "first_name"),
      fieldValue(person, "lastName", "last_name"),
    ]
      .filter(Boolean)
      .join(" ") || "Perfil sin nombre"
  );
}

export function memberPersonId(member) {
  return fieldValue(member, "personId", "person_id") || "";
}

export function linkedUserId(member) {
  return (
    fieldValue(member, "linkedUserId", "linked_user_id") ??
    fieldValue(member?.person, "userId", "user_id") ??
    null
  );
}

export function formatDashboardDate(value, options = { dateStyle: "medium" }) {
  if (!value) return "Sin fecha";
  const dateOnlyMatch =
    typeof value === "string" && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", options).format(date);
}

export function localDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayDateKey() {
  return localDateKey(new Date());
}

export function toLocalDateTimeInput(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function toApiDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new Error("Ingresa una fecha y hora válida.");
  return date.toISOString();
}

function parseHour(value) {
  if (!value) return null;
  const [hour, minute] = String(value).split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function dateFromMinutes(dayDate, minutes) {
  const result = new Date(dayDate);
  result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
}

function scheduleIsActiveToday(schedule, medication, dayKey, dayDate) {
  const status = String(
    fieldValue(medication, "clinicalStatus", "clinical_status") || "",
  ).toUpperCase();
  if (status !== "ACTIVO") return false;
  const scheduleStart = String(
    fieldValue(schedule, "startDate", "start_date") || "",
  ).slice(0, 10);
  const scheduleEnd = String(
    fieldValue(schedule, "endDate", "end_date") || "",
  ).slice(0, 10);
  if (scheduleStart && scheduleStart > dayKey) return false;
  if (scheduleEnd && scheduleEnd < dayKey) return false;
  const active = fieldValue(schedule, "isActive", "is_active");
  if (active === false || active === "false") return false;

  const type = String(
    fieldValue(schedule, "scheduleType", "schedule_type") || "",
  ).toUpperCase();
  if (type === "DIAS_SEMANA") {
    const weekdays = fieldValue(schedule, "daysOfWeek", "days_of_week") || [];
    const isoDay = dayDate.getDay() === 0 ? 7 : dayDate.getDay();
    return Array.from(weekdays, Number).includes(isoDay);
  }
  if (type === "MENSUAL") {
    return (
      Number(fieldValue(schedule, "dayOfMonth", "day_of_month")) ===
      dayDate.getDate()
    );
  }
  return type !== "SI_ES_NECESARIO";
}

function buildScheduledTimes(schedule, today) {
  const type = String(
    fieldValue(schedule, "scheduleType", "schedule_type") || "",
  ).toUpperCase();
  const baseMinutes = parseHour(fieldValue(schedule, "hour"));
  if (baseMinutes === null) return [];
  if (type !== "INTERVALO_HORAS") return [dateFromMinutes(today, baseMinutes)];
  const intervalHours = Number(
    fieldValue(schedule, "intervalHours", "interval_hours"),
  );
  if (!Number.isFinite(intervalHours) || intervalHours < 1)
    return [dateFromMinutes(today, baseMinutes)];
  const values = [];
  for (
    let minutes = baseMinutes;
    minutes < 1440;
    minutes += intervalHours * 60
  ) {
    values.push(dateFromMinutes(today, minutes));
    if (values.length > 24) break;
  }
  return values;
}

export function buildTodayDoseTasks(memberRecords, referenceDate = new Date()) {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const dayKey = localDateKey(today);
  const tasks = [];

  for (const { member, medications } of memberRecords) {
    for (const detail of medications) {
      const { medication, schedules, logs } = detail;
      for (const schedule of schedules) {
        if (!scheduleIsActiveToday(schedule, medication, dayKey, today))
          continue;
        for (const scheduledDate of buildScheduledTimes(schedule, today)) {
          const matchingLog = logs.find((log) => {
            const logScheduleId =
              fieldValue(
                log,
                "medicationScheduleId",
                "medication_schedule_id",
              ) || fieldValue(log, "scheduleId", "schedule_id");
            const logTime = fieldValue(log, "scheduledAt", "scheduled_at");
            return (
              String(logScheduleId || "") === String(schedule.id) &&
              localDateKey(logTime) === dayKey &&
              new Date(logTime).getHours() === scheduledDate.getHours() &&
              new Date(logTime).getMinutes() === scheduledDate.getMinutes()
            );
          });
          const logStatus = String(
            fieldValue(matchingLog, "status") || "",
          ).toUpperCase();
          if (
            matchingLog &&
            ["TOMADO", "RETRASADO", "OLVIDADO", "OMITIDO"].includes(logStatus)
          )
            continue;

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

  return tasks.sort(
    (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt),
  );
}

export function buildWeeklyAdherence(
  memberRecords,
  referenceDate = new Date(),
) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const referenceTime = new Date(referenceDate).getTime();
  const allLogs = memberRecords.flatMap(({ medications = [] }) =>
    medications.flatMap(({ logs = [] }) => logs),
  );

  function occurrenceKey(scheduleId, value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${String(scheduleId || '')}|${localDateKey(date)}|${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function logKey(log) {
    const scheduleId =
      fieldValue(log, 'medicationScheduleId', 'medication_schedule_id') ||
      fieldValue(log, 'scheduleId', 'schedule_id');
    return occurrenceKey(scheduleId, fieldValue(log, 'scheduledAt', 'scheduled_at'));
  }

  function addLogOutcome(counts, log, scheduledAt) {
    const status = String(fieldValue(log, 'status') || '').toUpperCase();
    if (status === 'TOMADO') {
      counts.onTime += 1;
      counts.recorded += 1;
    } else if (status === 'RETRASADO') {
      counts.delayed += 1;
      counts.recorded += 1;
    } else if (['OLVIDADO', 'OMITIDO'].includes(status)) {
      counts.missed += 1;
      counts.recorded += 1;
    } else if (status === 'PENDIENTE') {
      if (new Date(scheduledAt).getTime() <= referenceTime) counts.pendingDue += 1;
      else counts.pendingUpcoming += 1;
    }
  }

  const days = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const key = localDateKey(date);
    const dayLogs = allLogs.filter(
      (log) => localDateKey(fieldValue(log, 'scheduledAt', 'scheduled_at')) === key,
    );
    const counts = {
      onTime: 0,
      delayed: 0,
      missed: 0,
      pendingDue: 0,
      pendingUpcoming: 0,
      unrecorded: 0,
      recorded: 0,
    };
    const matchedLogKeys = new Set();

    // Calcula las tomas que correspondían a horarios activos. Si la hora ya pasó
    // y nunca se creó un registro, se muestra como "Sin registrar" en lugar de
    // ignorarla y producir un porcentaje artificialmente alto.
    for (const { medications = [] } of memberRecords) {
      for (const detail of medications) {
        const { medication, schedules = [] } = detail;
        for (const schedule of schedules) {
          if (!scheduleIsActiveToday(schedule, medication, key, date)) continue;
          for (const scheduledAt of buildScheduledTimes(schedule, date)) {
            const keyForOccurrence = occurrenceKey(schedule.id, scheduledAt);
            const matchingLog = dayLogs.find((log) =>
              logKey(log) === keyForOccurrence && !matchedLogKeys.has(keyForOccurrence),
            );

            if (matchingLog) {
              matchedLogKeys.add(keyForOccurrence);
              addLogOutcome(counts, matchingLog, scheduledAt);
            } else if (scheduledAt.getTime() <= referenceTime) {
              counts.unrecorded += 1;
            } else {
              counts.pendingUpcoming += 1;
            }
          }
        }
      }
    }

    // Conserva en la gráfica los registros históricos cuyos horarios ya no están
    // activos actualmente, sin contarlos dos veces si coincidieron con un horario.
    for (const log of dayLogs) {
      if (matchedLogKeys.has(logKey(log))) continue;
      addLogOutcome(counts, log, fieldValue(log, 'scheduledAt', 'scheduled_at'));
    }

    const due = counts.onTime + counts.delayed + counts.missed + counts.pendingDue + counts.unrecorded;
    days.push({
      key,
      label: new Intl.DateTimeFormat('es-CO', { weekday: 'short' })
        .format(date)
        .replace('.', ''),
      day: date.getDate(),
      ...counts,
      due,
      pending: counts.pendingDue + counts.pendingUpcoming,
      percent: due ? Math.round((counts.onTime / due) * 100) : null,
    });
  }

  const totals = days.reduce((total, day) => ({
    onTime: total.onTime + day.onTime,
    delayed: total.delayed + day.delayed,
    missed: total.missed + day.missed,
    pendingDue: total.pendingDue + day.pendingDue,
    pendingUpcoming: total.pendingUpcoming + day.pendingUpcoming,
    unrecorded: total.unrecorded + day.unrecorded,
    recorded: total.recorded + day.recorded,
    due: total.due + day.due,
  }), {
    onTime: 0, delayed: 0, missed: 0, pendingDue: 0, pendingUpcoming: 0,
    unrecorded: 0, recorded: 0, due: 0,
  });

  return {
    days,
    ...totals,
    completed: totals.onTime,
    pending: totals.pendingDue + totals.pendingUpcoming,
    percent: totals.due ? Math.round((totals.onTime / totals.due) * 100) : null,
  };
}

export function buildDashboardDestinations(
  member,
  familyId,
  medication,
  options = {},
) {
  const query = new URLSearchParams();
  if (member?.id) query.set("memberId", String(member.id));
  if (memberPersonId(member))
    query.set("personId", String(memberPersonId(member)));
  if (familyId) query.set("familyId", String(familyId));
  if (medication?.id) query.set("medicationId", String(medication.id));
  if (options.tab) query.set("tab", options.tab);
  if (options.deliveryId) query.set("deliveryId", String(options.deliveryId));
  if (options.scheduleId) query.set("scheduleId", String(options.scheduleId));
  if (options.recordTake) query.set("recordTake", "1");
  return `/medicamentos${query.size ? `?${query.toString()}` : ""}`;
}

export function appointmentDestination(member, familyId, appointment) {
  const query = new URLSearchParams();
  if (member?.id) query.set("memberId", String(member.id));
  if (memberPersonId(member))
    query.set("personId", String(memberPersonId(member)));
  if (familyId) query.set("familyId", String(familyId));
  if (appointment?.id) query.set("appointmentId", String(appointment.id));
  return `/citas${query.size ? `?${query.toString()}` : ""}`;
}
