import { apiFetch } from '../../../shared/services/apiClient.js';
import { readApiList, unwrapApiData } from '../../../shared/utils/apiResponse.js';

const memberDocumentsPath = (memberId) => `/members/${memberId}/documents`;

export function listDocuments(memberId, filters = {}) {
  const query = new URLSearchParams();
  if (filters.category) query.set('category', filters.category);
  if (filters.appointmentId) query.set('appointmentId', filters.appointmentId);
  if (filters.search?.trim()) query.set('search', filters.search.trim());
  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : '';
  return apiFetch(`${memberDocumentsPath(memberId)}${suffix}`).then((response) =>
    readApiList(response, ['documents', 'items']),
  );
}

export function listDocumentsByAppointment(memberId, appointmentId) {
  return apiFetch(`/members/${memberId}/appointments/${appointmentId}/documents`).then((response) =>
    readApiList(response, ['documents', 'items']),
  );
}

export function getDocument(memberId, documentId) {
  return apiFetch(`${memberDocumentsPath(memberId)}/${documentId}`).then(unwrapApiData);
}

export function createDocument(memberId, formData) {
  return apiFetch(memberDocumentsPath(memberId), { method: 'POST', body: formData }).then(unwrapApiData);
}

export function updateDocument(memberId, documentId, formData) {
  return apiFetch(`${memberDocumentsPath(memberId)}/${documentId}`, { method: 'PATCH', body: formData }).then(unwrapApiData);
}

export function deleteDocument(memberId, documentId) {
  return apiFetch(`${memberDocumentsPath(memberId)}/${documentId}`, { method: 'DELETE' }).then(unwrapApiData);
}
