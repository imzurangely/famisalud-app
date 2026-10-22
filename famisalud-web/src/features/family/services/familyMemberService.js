import { apiFetch } from '../../../shared/services/apiClient.js';
import { unwrapApiData, readApiList } from '../../../shared/utils/apiResponse.js';

export function listFamilyMembers(familyId) {
  return apiFetch(`/families/${familyId}/members`).then((response) => readApiList(response, ['members']));
}

export function createFamilyMember(familyId, payload) {
  return apiFetch(`/families/${familyId}/members`, { method: 'POST', body: JSON.stringify(payload) }).then(unwrapApiData);
}

export function updateFamilyMember(memberId, payload) {
  return apiFetch(`/members/${memberId}`, { method: 'PATCH', body: JSON.stringify(payload) }).then(unwrapApiData);
}

export function deleteFamilyMember(memberId) {
  return apiFetch(`/members/${memberId}`, { method: 'DELETE' }).then(unwrapApiData);
}
