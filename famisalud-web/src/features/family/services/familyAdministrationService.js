import { apiFetch } from '../../../shared/services/apiClient.js';
import { unwrapApiData, readApiList } from '../../../shared/utils/apiResponse.js';

export function listFamilyAuditLogs(familyId) {
  return apiFetch(`/families/${familyId}/audit-logs?limit=50`).then((response) => readApiList(response, ['logs', 'items']));
}

export function transferFamilyAdministrator(familyId, newAdminUserId) {
  return apiFetch(`/families/${familyId}/administrator`, {
    method: 'PATCH',
    body: JSON.stringify({ newAdminUserId }),
  }).then(unwrapApiData);
}
