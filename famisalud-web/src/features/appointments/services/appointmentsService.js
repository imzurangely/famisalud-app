import { apiFetch } from "../../../shared/services/apiClient.js";
import {
  readApiList,
  unwrapApiData,
} from "../../../shared/utils/apiResponse.js";

const memberAppointmentsPath = (memberId) =>
  `/members/${memberId}/appointments`;

export function listAppointments(memberId, filters = {}) {
  const query = new URLSearchParams();
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (filters.status) query.set("status", filters.status);
  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : "";
  return apiFetch(`${memberAppointmentsPath(memberId)}${suffix}`).then(
    (response) => readApiList(response, ["appointments", "items"]),
  );
}

export function getAppointment(memberId, appointmentId) {
  return apiFetch(`${memberAppointmentsPath(memberId)}/${appointmentId}`).then(
    unwrapApiData,
  );
}

export function createAppointment(memberId, payload) {
  return apiFetch(memberAppointmentsPath(memberId), {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(unwrapApiData);
}

export function updateAppointment(memberId, appointmentId, payload) {
  return apiFetch(`${memberAppointmentsPath(memberId)}/${appointmentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }).then(unwrapApiData);
}

export function deleteAppointment(memberId, appointmentId) {
  return apiFetch(`${memberAppointmentsPath(memberId)}/${appointmentId}`, {
    method: "DELETE",
  }).then(unwrapApiData);
}
