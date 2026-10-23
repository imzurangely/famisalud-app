import {
  Bell,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  Pill,
  RefreshCw,
  UsersRound,
} from 'lucide-react';

const TYPE_PRESENTATION = {
  INVITACION_FAMILIA: {
    label: 'Invitación familiar',
    icon: UsersRound,
    tone: 'violet',
    destination: '/familia',
  },
  RECORDATORIO_MEDICAMENTO: {
    label: 'Recordatorio de medicamento',
    icon: Pill,
    tone: 'brand',
    destination: '/medicamentos',
  },
  RECORDATORIO_CITA: {
    label: 'Recordatorio de cita',
    icon: CalendarClock,
    tone: 'blue',
    destination: '/citas',
  },
  ESTADO_CITA: {
    label: 'Actualización de cita',
    icon: CalendarDays,
    tone: 'blue',
    destination: '/citas',
  },
  RENOVACION_MEDICAMENTO: {
    label: 'Renovación de medicamento',
    icon: RefreshCw,
    tone: 'amber',
    destination: '/medicamentos',
  },
  ENTREGA_MEDICAMENTO: {
    label: 'Entrega de medicamento',
    icon: FileCheck2,
    tone: 'emerald',
    destination: '/medicamentos',
  },
  SISTEMA: {
    label: 'Aviso del sistema',
    icon: Bell,
    tone: 'slate',
    destination: '/',
  },
};

const TONE_CLASSES = {
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300',
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300',
  blue: 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function getNotificationPresentation(notificationType) {
  return TYPE_PRESENTATION[notificationType] || TYPE_PRESENTATION.SISTEMA;
}

export function getNotificationIconClass(notificationType) {
  const presentation = getNotificationPresentation(notificationType);
  return TONE_CLASSES[presentation.tone] || TONE_CLASSES.slate;
}

export function getNotificationDestination(notification) {
  const entityType = String(notification?.entity_type || '').toLowerCase();
  if (entityType.includes('appointment') || entityType.includes('cita')) return '/citas';
  if (entityType.includes('medication') || entityType.includes('delivery') || entityType.includes('schedule')) return '/medicamentos';
  if (entityType.includes('invitation') || entityType.includes('family')) return '/familia';
  return getNotificationPresentation(notification?.notification_type).destination;
}

export function formatNotificationDate(value) {
  if (!value) return 'Fecha no disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function notificationIsUnread(notification) {
  return notification?.is_read === false || notification?.is_read === 'false';
}

export function isNotificationTypeKnown(notificationType) {
  return Object.prototype.hasOwnProperty.call(TYPE_PRESENTATION, notificationType);
}

export const ReadNotificationIcon = CheckCircle2;
