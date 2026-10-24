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

function readMetadata(notification) {
  const value = notification?.metadata ?? notification?.context ?? {};
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return {};
}

function withQuery(path, values) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && String(value).trim()) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function getNotificationActionLabel(notification) {
  const metadata = readMetadata(notification);
  const entityType = String(notification?.entity_type || '').toLowerCase();
  if (metadata.module === 'documents' || entityType.includes('document')) return 'Ver documento';
  if (metadata.module === 'appointments' || entityType.includes('appointment') || entityType.includes('cita')) return 'Ver cita';
  if (metadata.module === 'family' || entityType.includes('invitation') || entityType.includes('family')) return 'Ver invitación';
  if (metadata.module === 'medications' || entityType.includes('medication') || entityType.includes('delivery') || entityType.includes('schedule')) {
    const tab = metadata.destinationTab || (notification?.notification_type === 'RECORDATORIO_MEDICAMENTO' ? 'horarios' : 'tramites');
    return tab === 'horarios' ? 'Ver horario' : 'Ver medicamento y trámite';
  }
  return 'Abrir aviso';
}

export function getNotificationDestination(notification) {
  const metadata = readMetadata(notification);
  const entityType = String(notification?.entity_type || '').toLowerCase();
  const entityId = notification?.entity_id || '';
  const type = String(notification?.notification_type || '');

  if (metadata.module === 'medications' || entityType.includes('medication') || entityType.includes('delivery') || entityType.includes('schedule')) {
    const medicationId = metadata.medicationId || metadata.medication_id || '';
    const deliveryId = metadata.deliveryId || metadata.delivery_id || (entityType.includes('deliver') ? entityId : '');
    const scheduleId = metadata.scheduleId || metadata.schedule_id || '';
    return withQuery('/medicamentos', {
      memberId: metadata.memberId || metadata.member_id,
      personId: metadata.personId || metadata.person_id,
      familyId: metadata.familyId || metadata.family_id,
      medicationId,
      deliveryId,
      scheduleId,
      tab: metadata.destinationTab || (type === 'RECORDATORIO_MEDICAMENTO' ? 'horarios' : 'tramites'),
    });
  }

  if (metadata.module === 'appointments' || entityType.includes('appointment') || entityType.includes('cita')) {
    return withQuery('/citas', {
      memberId: metadata.memberId || metadata.member_id,
      personId: metadata.personId || metadata.person_id,
      familyId: metadata.familyId || metadata.family_id,
      appointmentId: metadata.appointmentId || metadata.appointment_id || entityId,
    });
  }

  if (metadata.module === 'documents' || entityType.includes('document')) {
    return withQuery('/documentos', {
      memberId: metadata.memberId || metadata.member_id,
      personId: metadata.personId || metadata.person_id,
      familyId: metadata.familyId || metadata.family_id,
      documentId: metadata.documentId || metadata.document_id || entityId,
      appointmentId: metadata.appointmentId || metadata.appointment_id,
    });
  }

  if (metadata.module === 'family' || entityType.includes('invitation') || entityType.includes('family')) {
    const invitationId = metadata.invitationId || metadata.invitation_id || entityId;
    const destinationTab = metadata.destinationTab || (type === 'INVITACION_FAMILIA' ? 'received' : 'sent');
    return withQuery('/familia', {
      tab: destinationTab,
      invitationId,
      familyId: metadata.familyId || metadata.family_id,
    });
  }

  // Compatibilidad con avisos históricos sin contexto enriquecido.
  const destination = getNotificationPresentation(type).destination;
  const safeInternalPath = typeof metadata.path === 'string' && metadata.path.startsWith('/') && !metadata.path.startsWith('//')
    ? metadata.path
    : destination;
  return safeInternalPath || '/';
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
