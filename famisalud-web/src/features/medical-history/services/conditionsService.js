import { apiFetch } from '../../../shared/services/apiClient.js';
import { readApiList, unwrapApiData } from '../../../shared/utils/apiResponse.js';

const basePath = (memberId) => `/members/${memberId}/conditions`;

export function listConditions(memberId) {
  return apiFetch(basePath(memberId)).then((response) => readApiList(response, ['conditions', 'medicalConditions', 'items']));
}

export function createCondition(memberId, payload) {
  return apiFetch(basePath(memberId), { method: 'POST', body: JSON.stringify(payload) }).then(unwrapApiData);
}

export function updateCondition(memberId, conditionId, payload) {
  return apiFetch(`${basePath(memberId)}/${conditionId}`, { method: 'PATCH', body: JSON.stringify(payload) }).then(unwrapApiData);
}

export function deleteCondition(memberId, conditionId) {
  return apiFetch(`${basePath(memberId)}/${conditionId}`, { method: 'DELETE' }).then(unwrapApiData);
}
