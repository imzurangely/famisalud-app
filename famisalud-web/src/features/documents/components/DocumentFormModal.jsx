import Select from "../../../shared/components/ui/Select.jsx";
import { useState } from "react";
import { FileUp, Save } from "lucide-react";
import Button from "../../../shared/components/ui/Button.jsx";
import Modal from "../../../shared/components/ui/Modal.jsx";
import { DOCUMENT_CATEGORIES, valueOf } from "../utils/documentUtils.js";
import {
  formatAppointmentDate,
  valueOf as appointmentValueOf,
} from "../../appointments/utils/appointmentUtils.js";

function initialValues(document) {
  const date = valueOf(document, "documentDate", "document_date");
  return {
    title: valueOf(document, "title") || "",
    category: valueOf(document, "category") || "HISTORIA_CLINICA",
    customCategory:
      valueOf(document, "customCategory", "custom_category") || "",
    documentDate: date ? String(date).slice(0, 10) : "",
    appointmentId: valueOf(document, "appointmentId", "appointment_id") || "",
    file: null,
  };
}

export default function DocumentFormModal({
  mode,
  document,
  appointments,
  busy,
  loadingAppointments,
  onClose,
  onSubmit,
}) {
  const [values, setValues] = useState(() => initialValues(document));
  const [validationError, setValidationError] = useState("");
  const isEdit = mode === "edit";
  const currentAppointmentId = valueOf(
    document,
    "appointmentId",
    "appointment_id",
  );

  function updateField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setValidationError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      if (!values.title.trim())
        throw new Error("El título del documento es obligatorio.");
      if (!isEdit && !values.file)
        throw new Error("Selecciona el archivo que deseas subir.");
      const existingDocumentDate = valueOf(
        document,
        "documentDate",
        "document_date",
      );
      if (isEdit && existingDocumentDate && !values.documentDate) {
        throw new Error(
          "La API actual no permite quitar una fecha ya registrada; selecciona una fecha válida.",
        );
      }
      if (values.category === "OTRO" && !values.customCategory.trim())
        throw new Error("Describe la categoría cuando seleccionas “Otro”.");
      if (values.file) {
        const allowedTypes = new Set([
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/webp",
        ]);
        if (!allowedTypes.has(values.file.type))
          throw new Error("Solo se permiten archivos PDF, JPG, PNG o WEBP.");
        if (values.file.size > 10 * 1024 * 1024)
          throw new Error("El archivo no puede superar los 10 MB.");
      }
      setValidationError("");
    } catch (error) {
      setValidationError(
        error?.message || "Revisa la información del formulario.",
      );
      return;
    }
    try {
      await onSubmit(values);
    } catch {
      // La página muestra la notificación de error de la petición.
    }
  }

  const inputClass = "form-input";
  return (
    <Modal
      title={isEdit ? "Editar documento" : "Subir documento"}
      description="Se aceptan archivos PDF, JPG, PNG y WEBP de hasta 10 MB."
      onClose={onClose}
      wide
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Título del documento *
            </span>
            <input
              className={inputClass}
              value={values.title}
              onChange={(event) => updateField("title", event.target.value)}
              required
              maxLength={150}
              placeholder="Ej. Resultado de laboratorio de octubre"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Categoría *
            </span>
            <Select
              className={inputClass}
              value={values.category}
              onChange={(event) => updateField("category", event.target.value)}
              required
            >
              {DOCUMENT_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </label>
          {values.category === "OTRO" && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
                Categoría personalizada *
              </span>
              <input
                className={inputClass}
                value={values.customCategory}
                onChange={(event) =>
                  updateField("customCategory", event.target.value)
                }
                maxLength={100}
                required
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Fecha del documento
            </span>
            <input
              className={inputClass}
              type="date"
              value={values.documentDate}
              onChange={(event) =>
                updateField("documentDate", event.target.value)
              }
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Asociar a una cita (opcional)
            </span>
            <Select
              className={inputClass}
              value={values.appointmentId}
              onChange={(event) =>
                updateField("appointmentId", event.target.value)
              }
              disabled={loadingAppointments}
            >
              <option
                value=""
                disabled={Boolean(isEdit && currentAppointmentId)}
              >
                Sin cita asociada
              </option>
              {appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  {appointment.title || "Cita"} ·{" "}
                  {formatAppointmentDate(
                    appointmentValueOf(appointment, "startsAt", "starts_at"),
                  )}
                </option>
              ))}
            </Select>
            {isEdit && currentAppointmentId && (
              <span className="mt-1.5 block text-[10px] text-slate-400">
                La API permite cambiar la cita asociada, pero no quitar la
                asociación directamente desde la edición.
              </span>
            )}
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Archivo {isEdit ? "(opcional para reemplazarlo)" : "*"}
            </span>
            <span className="flex min-h-12 items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <FileUp size={18} className="shrink-0 text-brand-600" />
              <input
                className="min-w-0 flex-1 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-2 file:text-[11px] file:font-bold file:text-brand-800 dark:file:bg-brand-950 dark:file:text-brand-200"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  updateField("file", event.target.files?.[0] || null)
                }
                required={!isEdit}
              />
            </span>
            {isEdit && (
              <span className="mt-1.5 block text-[11px] text-slate-400">
                Deja el selector vacío para conservar el archivo actual.
              </span>
            )}
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
            {busy
              ? "Guardando…"
              : isEdit
                ? "Guardar cambios"
                : "Subir documento"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
