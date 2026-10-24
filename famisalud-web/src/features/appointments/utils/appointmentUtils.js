import { friendlyErrorMessage } from "../../../shared/utils/friendlyErrors.js";

export const APPOINTMENT_TYPES = [
  { value: "CONSULTA_MEDICA", label: "Consulta médica" },
  { value: "EXAMEN", label: "Examen" },
  { value: "PROCEDIMIENTO", label: "Procedimiento" },
  { value: "CIRUGIA", label: "Cirugía" },
  { value: "OTRO", label: "Otro" },
];

export const APPOINTMENT_STATUSES = [
  { value: "PROGRAMADA", label: "Programada" },
  { value: "COMPLETADA", label: "Completada" },
  { value: "NO_ASISTIO", label: "No asistió" },
  { value: "CANCELADA", label: "Cancelada" },
  { value: "REPROGRAMADA", label: "Reprogramada" },
];

const TYPE_LABELS = Object.fromEntries(
  APPOINTMENT_TYPES.map((item) => [item.value, item.label]),
);
const STATUS_LABELS = Object.fromEntries(
  APPOINTMENT_STATUSES.map((item) => [item.value, item.label]),
);

export function valueOf(record, camelKey, snakeKey = camelKey) {
  return record?.[camelKey] ?? record?.[snakeKey] ?? null;
}

export function memberFullName(member) {
  const person = member?.person ?? member;
  return (
    [
      valueOf(person, "firstName", "first_name"),
      valueOf(person, "lastName", "last_name"),
    ]
      .filter(Boolean)
      .join(" ") || "Perfil sin nombre"
  );
}

export function appointmentTypeLabel(appointment) {
  const type = valueOf(appointment, "appointmentType", "appointment_type");
  if (type === "OTRO")
    return valueOf(appointment, "customType", "custom_type") || "Otro";
  return TYPE_LABELS[type] || "Consulta médica";
}

export function appointmentStatusLabel(appointmentOrStatus) {
  const status =
    typeof appointmentOrStatus === "string"
      ? appointmentOrStatus
      : valueOf(appointmentOrStatus, "status");
  return STATUS_LABELS[status] || status || "Sin estado";
}

export function appointmentStatusClass(appointmentOrStatus) {
  const status =
    typeof appointmentOrStatus === "string"
      ? appointmentOrStatus
      : valueOf(appointmentOrStatus, "status");
  const classes = {
    PROGRAMADA: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200",
    COMPLETADA:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200",
    NO_ASISTIO:
      "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200",
    CANCELADA:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    REPROGRAMADA:
      "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200",
  };
  return classes[status] || classes.PROGRAMADA;
}

export function formatAppointmentDate(value) {
  if (!value) return "Fecha por definir";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no válida";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function toApiDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new Error("Ingresa una fecha y hora válida.");
  return date.toISOString();
}

export function toDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function errorMessage(error) {
  return friendlyErrorMessage(error);
}
