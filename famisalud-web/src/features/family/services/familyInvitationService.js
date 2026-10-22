import { apiFetch } from '../../../shared/services/apiClient.js';
import { unwrapApiData, readApiList } from '../../../shared/utils/apiResponse.js';

export function listFamilyInvitations(familyId) {
  return apiFetch(`/families/${familyId}/invitations?limit=50`).then((response) => readApiList(response, ['invitations']));
}

export function listIncomingInvitations() {
  return apiFetch('/invitations/mine?limit=50').then((response) => readApiList(response, ['invitations']));
}

export function createFamilyInvitation(familyId, payload) {
  return apiFetch(`/families/${familyId}/invitations`, { method: 'POST', body: JSON.stringify(payload) }).then(unwrapApiData);
}

export function resendFamilyInvitation(familyId, invitationId) {
  return apiFetch(`/families/${familyId}/invitations/${invitationId}/resend`, { method: 'POST' }).then(unwrapApiData);
}

export function answerFamilyInvitation(path, token) {
  return apiFetch(path, { method: 'POST', body: JSON.stringify({ token }) }).then(unwrapApiData);
}

export function previewFamilyInvitation(token) {
  const encodedToken = encodeURIComponent(token);
  return apiFetch(`/invitations/preview?token=${encodedToken}`).then(unwrapApiData);
}
