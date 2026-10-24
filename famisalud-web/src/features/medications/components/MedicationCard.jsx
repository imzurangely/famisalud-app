import { CalendarClock, Check, Clock3, Eye, Pencil, Pill, Trash2 } from "lucide-react";
import CardActions from "../../../shared/components/ui/CardActions.jsx";
import {
  doseLabel,
  fieldValue,
  formatDate,
  MANAGEMENT_STATUSES,
  managementStatusTone,
  medicationStatusTone,
} from "../utils/medicationUtils.js";

export default function MedicationCard({
  medication,
  selected,
  canManage,
  onSelect,
  onEdit,
  onDelete,
}) {
  const clinicalStatus = fieldValue(medication, "clinicalStatus") || "ACTIVO";
  const managementStatus =
    fieldValue(medication, "managementStatus") || "SIN_TRAMITE";
  const presentation = fieldValue(medication, "presentation");
  const startDate = fieldValue(medication, "startDate");
  const endDate = fieldValue(medication, "endDate");

  return (
    <article
      className={`rounded-2xl border p-4 transition ${selected ? "border-brand-400 bg-brand-50/70 shadow-sm dark:border-brand-500 dark:bg-brand-950/25" : "border-slate-200 bg-white hover:border-brand-200 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700"}`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${selected ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200"}`}
          >
            <Pill size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-extrabold text-slate-900 dark:text-white">
              {fieldValue(medication, "name") || "Medicamento sin nombre"}
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {doseLabel(medication)}
            </p>
            {presentation && (
              <p className="mt-1 line-clamp-1 text-[11px] text-slate-400">
                {presentation}
              </p>
            )}
          </div>
          {selected && (
            <span className="mt-1 flex size-5 items-center justify-center rounded-full bg-brand-500 text-white">
              <Check size={12} />
            </span>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${medicationStatusTone(clinicalStatus)}`}
          >
            {clinicalStatus.charAt(0) + clinicalStatus.slice(1).toLowerCase()}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${managementStatusTone(managementStatus)}`}
          >
            {MANAGEMENT_STATUSES[managementStatus] || managementStatus}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 mb-3">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock size={13} /> Desde {formatDate(startDate)}
          </span>
          {endDate && (
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={13} /> Hasta {formatDate(endDate)}
            </span>
          )}
        </div>
      </button>
      <CardActions actions={[
        { key: "view", type: "view", label: "Ver medicamento", icon: Eye, onClick: onSelect, showLabel: true },
        { key: "edit", type: "edit", label: "Editar medicamento", icon: Pencil, onClick: onEdit, visible: canManage },
        { key: "delete", type: "delete", label: "Eliminar medicamento", icon: Trash2, onClick: onDelete, visible: canManage },
      ]} />
    </article>
  );
}
