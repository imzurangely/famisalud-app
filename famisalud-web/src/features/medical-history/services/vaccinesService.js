import { apiFetch } from '../../../shared/services/apiClient.js';
import { readApiList, unwrapApiData } from '../../../shared/utils/apiResponse.js';

const basePath = (memberId) => `/members/${memberId}/vaccines`;

export function listVaccines(memberId) {
  return apiFetch(basePath(memberId)).then((response) => readApiList(response, ['vaccines', 'items']));
}

export function createVaccine(memberId, payload) {
  return apiFetch(basePath(memberId), { method: 'POST', body: JSON.stringify(payload) }).then(unwrapApiData);
}

export function updateVaccine(memberId, vaccineId, payload) {
  return apiFetch(`${basePath(memberId)}/${vaccineId}`, { method: 'PATCH', body: JSON.stringify(payload) }).then(unwrapApiData);
}

export function deleteVaccine(memberId, vaccineId) {
  return apiFetch(`${basePath(memberId)}/${vaccineId}`, { method: 'DELETE' }).then(unwrapApiData);
}
