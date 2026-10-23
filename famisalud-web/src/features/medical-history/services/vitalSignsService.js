import { apiFetch } from '../../../shared/services/apiClient.js';
import { readApiList, unwrapApiData } from '../../../shared/utils/apiResponse.js';

const basePath = (memberId) => `/members/${memberId}/vital-signs`;

export function listVitalSigns(memberId) {
  return apiFetch(basePath(memberId)).then((response) => readApiList(response, ['vitalSigns', 'vital_signs', 'items']));
}

export function createVitalSign(memberId, payload) {
  return apiFetch(basePath(memberId), { method: 'POST', body: JSON.stringify(payload) }).then(unwrapApiData);
}

export function updateVitalSign(memberId, vitalSignId, payload) {
  return apiFetch(`${basePath(memberId)}/${vitalSignId}`, { method: 'PATCH', body: JSON.stringify(payload) }).then(unwrapApiData);
}

export function deleteVitalSign(memberId, vitalSignId) {
  return apiFetch(`${basePath(memberId)}/${vitalSignId}`, { method: 'DELETE' }).then(unwrapApiData);
}
