export function fieldValue(record, camelName) {
  if (!record) return null;
  const snakeName = camelName.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  return record[camelName] ?? record[snakeName] ?? null;
}

export function memberFullName(member) {
  const person = member?.person ?? member;
  return [fieldValue(person, 'firstName'), fieldValue(person, 'lastName')].filter(Boolean).join(' ') || 'Perfil sin nombre';
}

export function linkedUserId(member) {
  return member?.linkedUserId ?? member?.linked_user_id ?? member?.person?.userId ?? member?.person?.user_id ?? null;
}

export function formatDate(value, fallback = 'Sin fecha') {
  if (!value) return fallback;
  const raw = String(value).slice(0, 10);
  const parts = raw.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return fallback;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('es-CO', { dateStyle: 'medium' });
}

export function formatDateTime(value, fallback = 'Sin fecha') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

export function toDateInput(value) {
  return value ? String(value).slice(0, 10) : '';
}

export function toDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
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

export function todayDateInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function nowDateTimeInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export const DOSE_UNITS = [
  ['MG', 'mg'], ['ML', 'ml'], ['G', 'g'], ['MCG', 'mcg'], ['UI', 'UI'],
  ['TABLETA', 'tableta(s)'], ['CAPSULA', 'cápsula(s)'], ['GOTA', 'gota(s)'],
  ['INHALACION', 'inhalación(es)'], ['UNIDAD', 'unidad(es)'],
];

export const CLINICAL_STATUSES = [
  ['ACTIVO', 'Activo'], ['PAUSADO', 'Pausado'], ['FINALIZADO', 'Finalizado'], ['OCASIONAL', 'Ocasional'],
];

export const MANAGEMENT_STATUSES = {
  SIN_TRAMITE: 'Sin trámite',
  SIN_AUTORIZACION_VIGENTE: 'Sin autorización vigente',
  AUTORIZACION_EN_PROCESO: 'Autorización en proceso',
  CONFIGURACION_PENDIENTE: 'Configuración pendiente',
  REQUIERE_RENOVACION: 'Requiere renovación',
  LISTO_PARA_RECOGER: 'Listo para recoger',
};

export const SCHEDULE_TYPES = [
  ['DIARIO', 'Todos los días'],
  ['DIAS_SEMANA', 'Días de la semana'],
  ['INTERVALO_HORAS', 'Cada cierto número de horas'],
  ['MENSUAL', 'Mensual'],
  ['SI_ES_NECESARIO', 'Solo cuando sea necesario'],
];

export const WEEKDAYS = [
  [1, 'Lun'], [2, 'Mar'], [3, 'Mié'], [4, 'Jue'], [5, 'Vie'], [6, 'Sáb'], [7, 'Dom'],
];

export const LOG_STATUSES = [
  ['PENDIENTE', 'Pendiente'], ['TOMADO', 'Tomado'], ['OLVIDADO', 'Olvidado'], ['OMITIDO', 'Omitido'], ['RETRASADO', 'Tomado con retraso'],
];

export const DELIVERY_STATUSES = {
  PROGRAMADA: 'Programada',
  RENOVACION_PENDIENTE: 'Renovación pendiente',
  LISTO_PARA_RECOGER: 'Listo para recoger',
  PENDIENTE_FARMACIA: 'Pendiente por disponibilidad',
  RECOGIDO: 'Recogido',
  PERDIDA: 'No recogida',
};

export function doseLabel(medication) {
  const amount = fieldValue(medication, 'doseAmount');
  const unit = fieldValue(medication, 'doseUnit');
  if (amount === null || amount === undefined || amount === '') return fieldValue(medication, 'presentation') || 'Dosis sin especificar';
  const unitLabel = DOSE_UNITS.find(([value]) => value === unit)?.[1] || String(unit || '').toLowerCase();
  return `${amount} ${unitLabel}`;
}

export function medicationStatusTone(status) {
  const tones = {
    ACTIVO: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200',
    PAUSADO: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200',
    FINALIZADO: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    OCASIONAL: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200',
  };
  return tones[status] || tones.ACTIVO;
}

export function managementStatusTone(status) {
  const tones = {
    AUTORIZACION_EN_PROCESO: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200',
    CONFIGURACION_PENDIENTE: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200',
    REQUIERE_RENOVACION: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200',
    LISTO_PARA_RECOGER: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200',
    SIN_TRAMITE: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    SIN_AUTORIZACION_VIGENTE: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200',
  };
  return tones[status] || tones.SIN_TRAMITE;
}

export function logStatusTone(status) {
  const tones = {
    TOMADO: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200',
    RETRASADO: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200',
    PENDIENTE: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200',
    OLVIDADO: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200',
    OMITIDO: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };
  return tones[status] || tones.PENDIENTE;
}

export function scheduleDescription(schedule) {
  const type = fieldValue(schedule, 'scheduleType');
  if (type === 'DIARIO') return 'Todos los días';
  if (type === 'DIAS_SEMANA') {
    const days = fieldValue(schedule, 'daysOfWeek') || [];
    return WEEKDAYS.filter(([day]) => days.map(Number).includes(day)).map(([, label]) => label).join(', ') || 'Días no especificados';
  }
  if (type === 'INTERVALO_HORAS') return `Cada ${fieldValue(schedule, 'intervalHours')} hora(s)`;
  if (type === 'MENSUAL') return `Día ${fieldValue(schedule, 'dayOfMonth')} de cada mes`;
  return 'Cuando sea necesario';
}

export function humanizeEventType(value) {
  if (!value) return 'Actualización del trámite';
  return String(value).toLowerCase().replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase());
}

export function errorMessage(error) {
  const issues = error?.data?.errors;
  if (Array.isArray(issues) && issues.length) {
    const messages = [...new Set(issues.map((item) => item?.message).filter(Boolean))];
    if (messages.length) return messages.join(' ');
  }
  return error?.message || 'Ocurrió un error inesperado.';
}
