import { apiFetch } from '../../../shared/services/apiClient.js';
import { readApiList, unwrapApiData } from '../../../shared/utils/apiResponse.js';

export const NOTIFICATION_TYPES = [
  { value: 'INVITACION_FAMILIA', label: 'Invitaciones familiares' },
  { value: 'RECORDATORIO_MEDICAMENTO', label: 'Recordatorios de medicamentos' },
  { value: 'RECORDATORIO_CITA', label: 'Recordatorios de citas' },
  { value: 'ESTADO_CITA', label: 'Cambios en citas' },
  { value: 'RENOVACION_MEDICAMENTO', label: 'Renovaciones de medicamentos' },
  { value: 'ENTREGA_MEDICAMENTO', label: 'Entregas de medicamentos' },
  { value: 'SISTEMA', label: 'Avisos del sistema' },
];

function buildQuery({ unreadOnly = false, notificationType = '', limit = 50 } = {}) {
  const params = new URLSearchParams();
  params.set('unreadOnly', String(Boolean(unreadOnly)));
  params.set('limit', String(Math.min(100, Math.max(1, Number(limit) || 50))));
  if (notificationType) params.set('notificationType', notificationType);
  return params.toString();
}

export async function listNotifications(filters = {}) {
  const response = await apiFetch(`/notifications?${buildQuery(filters)}`);
  const data = unwrapApiData(response) || {};
  return {
    items: readApiList(data, ['items', 'notifications']),
    unreadCount: Number(data.unreadCount) || 0,
  };
}

export async function getNotification(notificationId) {
  return unwrapApiData(await apiFetch(`/notifications/${notificationId}`));
}

export async function markNotificationAsRead(notificationId) {
  return unwrapApiData(await apiFetch(`/notifications/${notificationId}/read`, { method: 'PATCH' }));
}

export async function markAllNotificationsAsRead() {
  return unwrapApiData(await apiFetch('/notifications/read-all', { method: 'PATCH' }));
}
