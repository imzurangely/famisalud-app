import { CalendarDays, ClipboardList, Pencil, Trash2 } from 'lucide-react';
import { fieldValue, formatDate, formatDateTime, recordTitle } from '../utils/medicalHistoryUtils.js';
import { STATUS_LABELS } from '../utils/medicalHistoryConfig.js';

function Detail({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 wrap-break-words text-sm text-slate-600 dark:text-slate-300">{value}</p></div>;
}

export default function MedicalRecordCard({ section, record, canManage, onEdit, onDelete, busy }) {
  let details = [];
  if (section === 'allergies') details = [
    ['Severidad', STATUS_LABELS[fieldValue(record, 'severity')] || fieldValue(record, 'severity')],
    ['Reacción', fieldValue(record, 'reaction')],
  ];
  if (section === 'conditions') details = [
    ['Estado', STATUS_LABELS[fieldValue(record, 'status')] || fieldValue(record, 'status')],
    ['Diagnóstico', fieldValue(record, 'diagnosisDate') ? formatDate(fieldValue(record, 'diagnosisDate')) : null],
    ['Notas', fieldValue(record, 'notes')],
  ];
  if (section === 'vaccines') details = [
    ['Dosis', fieldValue(record, 'dose')],
    ['Aplicación', fieldValue(record, 'applicationDate') ? formatDate(fieldValue(record, 'applicationDate')) : null],
    ['Próxima dosis', fieldValue(record, 'nextDose') ? formatDate(fieldValue(record, 'nextDose')) : null],
    ['Proveedor', fieldValue(record, 'provider')],
  ];
  if (section === 'vital-signs') details = [
    ['Presión arterial', (fieldValue(record, 'systolicPressure') || fieldValue(record, 'diastolicPressure')) ? `${fieldValue(record, 'systolicPressure') ?? '—'} / ${fieldValue(record, 'diastolicPressure') ?? '—'} mmHg` : null],
    ['Frecuencia cardíaca', fieldValue(record, 'heartRate') ? `${fieldValue(record, 'heartRate')} lpm` : null],
    ['Frecuencia respiratoria', fieldValue(record, 'respiratoryRate') ? `${fieldValue(record, 'respiratoryRate')} rpm` : null],
    ['Oxígeno', fieldValue(record, 'oxygenSaturation') !== null && fieldValue(record, 'oxygenSaturation') !== undefined ? `${fieldValue(record, 'oxygenSaturation')}%` : null],
    ['Glucosa', fieldValue(record, 'bloodGlucose') !== null && fieldValue(record, 'bloodGlucose') !== undefined ? `${fieldValue(record, 'bloodGlucose')} mg/dL` : null],
    ['Temperatura', fieldValue(record, 'temperature') ? `${fieldValue(record, 'temperature')} °C` : null],
    ['Peso', fieldValue(record, 'weightKg') ? `${fieldValue(record, 'weightKg')} kg` : null],
    ['Fecha', fieldValue(record, 'recordedAt') ? formatDateTime(fieldValue(record, 'recordedAt')) : null],
    ['Notas', fieldValue(record, 'notes')],
  ];

  return (
    <article className="surface-card flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-200"><ClipboardList size={18} /></span>
          <div className="min-w-0">
            <h3 className="wrap-break-words font-display text-base font-extrabold text-slate-900 dark:text-white">{recordTitle(section, record)}</h3>
            {fieldValue(record, 'createdAt') && <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><CalendarDays size={12} /> Registrado {formatDate(fieldValue(record, 'createdAt'))}</p>}
          </div>
        </div>
        {canManage && <div className="flex shrink-0 gap-1">
          <button type="button" onClick={onEdit} className="icon-button" aria-label="Editar registro" title="Editar"><Pencil size={15} /></button>
          <button type="button" onClick={onDelete} disabled={busy} className="icon-button text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40" aria-label="Eliminar registro" title="Eliminar"><Trash2 size={15} /></button>
        </div>}
      </div>
      <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {details.map(([label, value]) => <Detail key={label} label={label} value={value} />)}
      </dl>
    </article>
  );
}
