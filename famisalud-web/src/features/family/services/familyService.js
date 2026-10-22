import { apiFetch } from '../../../shared/services/apiClient.js';
import { readApiList, unwrapApiData } from '../../../shared/utils/apiResponse.js';

export function listFamilies() {
  return apiFetch('/families').then((response) => readApiList(response, ['families']));
}

export function createFamily(payload) {
  return apiFetch('/families', { method: 'POST', body: JSON.stringify(payload) }).then(unwrapApiData);
}
