import Select from "../../../shared/components/ui/Select.jsx";
import { useState } from "react";
import { Save } from "lucide-react";
import Button from "../../../shared/components/ui/Button.jsx";
import Modal from "../../../shared/components/ui/Modal.jsx";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  toDateTimeInput,
  valueOf,
} from "../utils/appointmentUtils.js";

function initialValues(record) {
  return {
    title: valueOf(record, "title") || "",
    appointmentType:
      valueOf(record, "appointmentType", "appointment_type") ||
      "CONSULTA_MEDICA",
    customType: valueOf(record, "customType", "custom_type") || "",
    doctorName: valueOf(record, "doctorName", "doctor_name") || "",
    location: valueOf(record, "location") || "",
    startsAt: toDateTimeInput(valueOf(record, "startsAt", "starts_at")),
    endsAt: toDateTimeInput(valueOf(record, "endsAt", "ends_at")),
    notes: valueOf(record, "notes") || "",
    status: valueOf(record, "status") || "PROGRAMADA",
  };
}

export default function AppointmentFormModal({
  mode,
  appointment,
  busy,
  onClose,
  onSubmit,
}) {
  const [values, setValues] = useState(() => initialValues(appointment));
  const [validationError, setValidationError] = useState("");
  const isEdit = mode === "edit";

  function updateField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setValidationError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    let payload;
    try {
      if (!values.title.trim())
        throw new Error("El título de la cita es obligatorio.");
      if (!values.startsAt)
        throw new Error("Selecciona la fecha y hora de inicio.");
      if (
        values.endsAt &&
        new Date(values.endsAt) <= new Date(values.startsAt)
      ) {
        throw new Error(
          "La fecha de finalización debe ser posterior al inicio.",
        );
      }
      if (values.appointmentType === "OTRO" && !values.customType.trim()) {
        throw new Error("Describe el tipo de cita cuando seleccionas “Otro”.");
      }

      payload = {
        title: values.title.trim(),
        appointmentType: values.appointmentType,
        doctorName: values.doctorName.trim() || null,
        location: values.location.trim() || null,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : null,
        notes: values.notes.trim() || null,
        status: values.status,
      };
      if (values.appointmentType === "OTRO")
        payload.customType = values.customType.trim();
      setValidationError("");
    } catch (error) {
      setValidationError(
        error?.message || "Revisa la información del formulario.",
      );
      return;
    }
    try {
      await onSubmit(payload);
    } catch {
      // La página muestra la notificación de error de la petición.
    }
  }

  const inputClass = "form-input";
  return (
    <Modal
      title={isEdit ? "Editar cita médica" : "Programar cita médica"}
      description="Registra la información de la cita. Los horarios se guardan con su zona horaria y se validan en el servidor."
      onClose={onClose}
      wide
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Título de la cita *
            </span>
            <input
              className={inputClass}
              value={values.title}
              onChange={(event) => updateField("title", event.target.value)}
              required
              maxLength={150}
              placeholder="Ej. Control de medicina general"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Tipo de cita *
            </span>
            <Select
              className={inputClass}
              value={values.appointmentType}
              onChange={(event) =>
                updateField("appointmentType", event.target.value)
              }
              required
            >
              {APPOINTMENT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </label>
          {values.appointmentType === "OTRO" && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
                Describe el tipo *
              </span>
              <input
                className={inputClass}
                value={values.customType}
                onChange={(event) =>
                  updateField("customType", event.target.value)
                }
                maxLength={100}
                required
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Profesional de salud
            </span>
            <input
              className={inputClass}
              value={values.doctorName}
              onChange={(event) =>
                updateField("doctorName", event.target.value)
              }
              maxLength={150}
              placeholder="Nombre del profesional"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Lugar
            </span>
            <input
              className={inputClass}
              value={values.location}
              onChange={(event) => updateField("location", event.target.value)}
              maxLength={1000}
              placeholder="Clínica, IPS o dirección"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Fecha y hora de inicio *
            </span>
            <input
              className={inputClass}
              type="datetime-local"
              value={values.startsAt}
              onChange={(event) => updateField("startsAt", event.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Fecha y hora de finalización
            </span>
            <input
              className={inputClass}
              type="datetime-local"
              value={values.endsAt}
              min={values.startsAt || undefined}
              onChange={(event) => updateField("endsAt", event.target.value)}
            />
          </label>
          {isEdit && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
                Estado
              </span>
              <Select
                className={inputClass}
                value={values.status}
                onChange={(event) => updateField("status", event.target.value)}
              >
                {APPOINTMENT_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Notas
            </span>
            <textarea
              className={`${inputClass} min-h-24 resize-y`}
              rows={3}
              value={values.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              maxLength={2000}
              placeholder="Preparación, recomendaciones o información adicional"
            />
          </label>
        </div>
        {validationError && (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {validationError}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            <Save size={16} />{" "}
            {busy ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear cita"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
