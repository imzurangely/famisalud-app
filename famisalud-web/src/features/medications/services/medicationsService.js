import { apiFetch } from '../../../shared/services/apiClient.js';
import { readApiList, unwrapApiData } from '../../../shared/utils/apiResponse.js';

const memberMedicationsPath = (memberId) => `/members/${memberId}/medications`;
const medicationPath = (memberId, medicationId) => `${memberMedicationsPath(memberId)}/${medicationId}`;
const processPath = (memberId, medicationId) => `${medicationPath(memberId, medicationId)}/processes`;
const authorizationPath = (memberId, medicationId) => `${medicationPath(memberId, medicationId)}/authorizations`;
const deliveryPath = (memberId, medicationId) => `${medicationPath(memberId, medicationId)}/deliveries`;

function jsonOptions(method, payload) {
  return { method, body: JSON.stringify(payload) };
}

export function listMedications(memberId) {
  return apiFetch(memberMedicationsPath(memberId)).then((response) => readApiList(response, ['medications', 'items']));
}

export function createMedication(memberId, payload) {
  return apiFetch(memberMedicationsPath(memberId), jsonOptions('POST', payload)).then(unwrapApiData);
}

export function updateMedication(memberId, medicationId, payload) {
  return apiFetch(medicationPath(memberId, medicationId), jsonOptions('PATCH', payload)).then(unwrapApiData);
}

export function deleteMedication(memberId, medicationId) {
  return apiFetch(medicationPath(memberId, medicationId), { method: 'DELETE' }).then(unwrapApiData);
}

export function listSchedules(memberId, medicationId) {
  return apiFetch(`${medicationPath(memberId, medicationId)}/schedules`).then((response) => readApiList(response, ['schedules', 'items']));
}

export function createSchedule(memberId, medicationId, payload) {
  return apiFetch(`${medicationPath(memberId, medicationId)}/schedules`, jsonOptions('POST', payload)).then(unwrapApiData);
}

export function updateSchedule(memberId, medicationId, scheduleId, payload) {
  return apiFetch(`${medicationPath(memberId, medicationId)}/schedules/${scheduleId}`, jsonOptions('PATCH', payload)).then(unwrapApiData);
}

export function deleteSchedule(memberId, medicationId, scheduleId) {
  return apiFetch(`${medicationPath(memberId, medicationId)}/schedules/${scheduleId}`, { method: 'DELETE' }).then(unwrapApiData);
}

export function listMedicationLogs(memberId, medicationId, limit = 50, filters = {}) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  if (filters.status) query.set('status', filters.status);
  return apiFetch(`${medicationPath(memberId, medicationId)}/logs?${query.toString()}`).then((response) => readApiList(response, ['logs', 'items']));
}

export function createMedicationLog(memberId, medicationId, payload) {
  return apiFetch(`${medicationPath(memberId, medicationId)}/logs`, jsonOptions('POST', payload)).then(unwrapApiData);
}

export function updateMedicationLog(memberId, medicationId, logId, payload) {
  return apiFetch(`${medicationPath(memberId, medicationId)}/logs/${logId}`, jsonOptions('PATCH', payload)).then(unwrapApiData);
}

export function getMedicationProcessSummary(memberId, medicationId) {
  return apiFetch(processPath(memberId, medicationId)).then(unwrapApiData);
}

export function requestMedicationAuthorization(memberId, medicationId, payload = {}) {
  return apiFetch(`${processPath(memberId, medicationId)}/authorization-request`, jsonOptions('POST', payload)).then(unwrapApiData);
}

export function listEpsCompanies() {
  return apiFetch('/eps-companies').then((response) => readApiList(response, ['companies', 'epsCompanies', 'items']));
}

export function createAuthorization(memberId, medicationId, payload) {
  return apiFetch(authorizationPath(memberId, medicationId), jsonOptions('POST', payload)).then(unwrapApiData);
}

export function updateAuthorization(memberId, medicationId, authorizationId, payload) {
  return apiFetch(`${authorizationPath(memberId, medicationId)}/${authorizationId}`, jsonOptions('PATCH', payload)).then(unwrapApiData);
}

export function renewAuthorization(memberId, medicationId, payload) {
  return apiFetch(`${medicationPath(memberId, medicationId)}/renewals`, jsonOptions('POST', payload)).then(unwrapApiData);
}

export function cancelAuthorization(memberId, medicationId, authorizationId, payload = {}) {
  return apiFetch(`${authorizationPath(memberId, medicationId)}/${authorizationId}/cancel`, jsonOptions('POST', payload)).then(unwrapApiData);
}

export function markDeliveryPendingPharmacy(memberId, medicationId, deliveryId) {
  return apiFetch(`${deliveryPath(memberId, medicationId)}/${deliveryId}/mark-pending-pharmacy`, { method: 'POST' }).then(unwrapApiData);
}

export function confirmDeliveryRenewalManaged(memberId, medicationId, deliveryId) {
  return apiFetch(`${deliveryPath(memberId, medicationId)}/${deliveryId}/confirm-renewal-managed`, { method: 'POST' }).then(unwrapApiData);
}

export function collectMedicationDelivery(memberId, medicationId, deliveryId, payload) {
  return apiFetch(`${deliveryPath(memberId, medicationId)}/${deliveryId}/collect`, jsonOptions('POST', payload)).then(unwrapApiData);
}


const reminderRecipientsPath = (memberId, medicationId) =>
  `${medicationPath(memberId, medicationId)}/reminder-recipients`;

export function listMedicationReminderRecipients(memberId, medicationId) {
  return apiFetch(reminderRecipientsPath(memberId, medicationId))
    .then((response) => readApiList(response, ['recipients', 'items']));
}

export function addMedicationReminderRecipient(memberId, medicationId, userId) {
  return apiFetch(
    reminderRecipientsPath(memberId, medicationId),
    jsonOptions('POST', { userId }),
  ).then(unwrapApiData);
}

export function removeMedicationReminderRecipient(memberId, medicationId, userId) {
  return apiFetch(
    `${reminderRecipientsPath(memberId, medicationId)}/${userId}`,
    { method: 'DELETE' },
  ).then(unwrapApiData);
}
