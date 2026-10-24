import { apiFetch } from '../../../shared/services/apiClient.js';
import { readApiList, unwrapApiData } from '../../../shared/utils/apiResponse.js';

export function updateOwnProfile(payload) {
  return apiFetch('/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) }).then(unwrapApiData);
}

export function updatePreferences(payload) {
  return apiFetch('/auth/preferences', { method: 'PATCH', body: JSON.stringify(payload) }).then(unwrapApiData);
}

export function changePassword(payload) {
  return apiFetch('/auth/password', { method: 'PATCH', body: JSON.stringify(payload) }).then(unwrapApiData);
}

export function listSessions() {
  return apiFetch('/auth/sessions').then((response) => readApiList(response, ['sessions', 'items']));
}

export function revokeSession(sessionId) {
  return apiFetch(`/auth/sessions/${sessionId}`, { method: 'DELETE' }).then(unwrapApiData);
}

export function revokeAllSessions() {
  return apiFetch('/auth/sessions/revoke-all', { method: 'POST' }).then(unwrapApiData);
}

export function leaveFamily(familyId) {
  return apiFetch(`/families/${familyId}/leave`, { method: 'POST' }).then(unwrapApiData);
}

export function transferFamilyAdministrator(familyId, newAdminUserId) {
  return apiFetch(`/families/${familyId}/administrator`, {
    method: 'PATCH',
    body: JSON.stringify({ newAdminUserId }),
  }).then(unwrapApiData);
}

export function listProfileFamilyMembers(familyId) {
  return apiFetch(`/families/${familyId}/members`).then((response) => readApiList(response, ['members']));
}

export function listEPSCompanies() {
  return apiFetch('/eps-companies').then((response) => readApiList(response, ['companies', 'items']));
}

export function listInsurancePlans(memberId) {
  return apiFetch(`/members/${memberId}/insurance-plans`).then((response) => readApiList(response, ['plans', 'items']));
}

export function createInsurancePlan(memberId, payload) {
  return apiFetch(`/members/${memberId}/insurance-plans`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(unwrapApiData);
}

export function updateInsurancePlan(memberId, planId, payload) {
  return apiFetch(`/members/${memberId}/insurance-plans/${planId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then(unwrapApiData);
}

export function deleteInsurancePlan(memberId, planId) {
  return apiFetch(`/members/${memberId}/insurance-plans/${planId}`, { method: 'DELETE' }).then(unwrapApiData);
}


export function uploadOwnAvatar(file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/auth/profile/avatar', { method: 'POST', body: formData }).then(unwrapApiData);
}
