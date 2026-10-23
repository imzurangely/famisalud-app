import { apiFetch } from '../../../shared/services/apiClient.js';
import { readApiList, unwrapApiData } from '../../../shared/utils/apiResponse.js';

const basePath = (memberId) => `/members/${memberId}/allergies`;

export function listAllergies(memberId) {
  return apiFetch(basePath(memberId)).then((response) => readApiList(response, ['allergies', 'items']));
}

export function createAllergy(memberId, payload) {
  return apiFetch(basePath(memberId), { method: 'POST', body: JSON.stringify(payload) }).then(unwrapApiData);
}

export function updateAllergy(memberId, allergyId, payload) {
  return apiFetch(`${basePath(memberId)}/${allergyId}`, { method: 'PATCH', body: JSON.stringify(payload) }).then(unwrapApiData);
}

export function deleteAllergy(memberId, allergyId) {
  return apiFetch(`${basePath(memberId)}/${allergyId}`, { method: 'DELETE' }).then(unwrapApiData);
}
