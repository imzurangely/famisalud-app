import { listAppointments } from '../../appointments/services/appointmentsService.js';
import { listFamilyMembers } from '../../family/services/familyMemberService.js';
import {
  getMedicationProcessSummary,
  listMedicationLogs,
  listMedications,
  listSchedules,
} from '../../medications/services/medicationsService.js';
import { listNotifications } from '../../notifications/services/notificationsService.js';

function startOfLocalDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function shiftDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function loadMemberData(member, windows) {
  const errors = [];
  const [appointmentResult, medicationResult] = await Promise.allSettled([
    listAppointments(member.id, { from: windows.appointmentsFrom, to: windows.appointmentsTo }),
    listMedications(member.id),
  ]);

  const appointments = appointmentResult.status === 'fulfilled' ? appointmentResult.value : [];
  const medications = medicationResult.status === 'fulfilled' ? medicationResult.value : [];

  if (appointmentResult.status === 'rejected') errors.push('No se pudieron cargar algunas citas.');
  if (medicationResult.status === 'rejected') errors.push('No se pudieron cargar algunos medicamentos.');

  const medicationDetails = await Promise.all(medications.map(async (medication) => {
    const [scheduleResult, logsResult, processResult] = await Promise.allSettled([
      listSchedules(member.id, medication.id),
      listMedicationLogs(member.id, medication.id, 100, {
        from: windows.logsFrom,
        to: windows.logsTo,
      }),
      getMedicationProcessSummary(member.id, medication.id),
    ]);

    if (scheduleResult.status === 'rejected' || logsResult.status === 'rejected' || processResult.status === 'rejected') {
      errors.push('No se pudo cargar parte del seguimiento de medicamentos.');
    }

    return {
      medication,
      schedules: scheduleResult.status === 'fulfilled' ? scheduleResult.value : [],
      logs: logsResult.status === 'fulfilled' ? logsResult.value : [],
      processSummary: processResult.status === 'fulfilled' ? processResult.value : null,
    };
  }));

  return { member, appointments, medications: medicationDetails, errors };
}

/** Carga datos reales de la familia activa; los fallos parciales no ocultan los módulos que sí respondieron. */
export async function loadDashboardData(familyId, referenceDate = new Date()) {
  if (!familyId) return { members: [], notices: [], errors: [] };

  const members = await listFamilyMembers(familyId);
  const todayStart = startOfLocalDay(referenceDate);
  const weekStart = shiftDays(todayStart, -6);
  const appointmentFrom = shiftDays(todayStart, -14);
  const appointmentTo = shiftDays(todayStart, 42);
  const tomorrow = shiftDays(todayStart, 1);

  const windows = {
    appointmentsFrom: appointmentFrom.toISOString(),
    appointmentsTo: appointmentTo.toISOString(),
    logsFrom: weekStart.toISOString(),
    logsTo: tomorrow.toISOString(),
  };

  const [memberResults, noticesResult] = await Promise.all([
    Promise.all(members.map((member) => loadMemberData(member, windows))),
    listNotifications({ limit: 5 }).then((result) => result.items).catch(() => null),
  ]);

  const errors = memberResults.flatMap((item) => item.errors);
  if (noticesResult === null) errors.push('No se pudieron cargar los avisos recientes.');

  return {
    members: memberResults,
    notices: noticesResult || [],
    errors: [...new Set(errors)],
  };
}
