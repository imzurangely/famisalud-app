import { CalendarClock, FileText, MapPin, Pencil, Trash2, UserRound } from 'lucide-react';
import Button from '../../../shared/components/ui/Button.jsx';
import { appointmentStatusClass, appointmentStatusLabel, appointmentTypeLabel, formatAppointmentDate, valueOf } from '../utils/appointmentUtils.js';

export default function AppointmentCard({ appointment, canManage, onEdit, onDelete, onOpenDocuments }) {
  const start = valueOf(appointment, 'startsAt', 'starts_at');
  const end = valueOf(appointment, 'endsAt', 'ends_at');
  return (
    <article className="surface-card flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"><CalendarClock size={20} /></div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${appointmentStatusClass(appointment)}`}>{appointmentStatusLabel(appointment)}</span>
      </div>
      <h3 className="mt-4 text-base font-extrabold text-slate-900 dark:text-white">{valueOf(appointment, 'title') || 'Cita médica'}</h3>
      <p className="mt-1 text-xs font-semibold text-brand-700 dark:text-brand-300">{appointmentTypeLabel(appointment)}</p>
      <div className="mt-4 space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
        <p className="flex items-start gap-2"><CalendarClock size={15} className="mt-0.5 shrink-0" /><span>{formatAppointmentDate(start)}{end ? ` · Finaliza ${formatAppointmentDate(end)}` : ''}</span></p>
        {valueOf(appointment, 'doctorName', 'doctor_name') && <p className="flex items-start gap-2"><UserRound size={15} className="mt-0.5 shrink-0" /><span>{valueOf(appointment, 'doctorName', 'doctor_name')}</span></p>}
        {valueOf(appointment, 'location') && <p className="flex items-start gap-2"><MapPin size={15} className="mt-0.5 shrink-0" /><span>{valueOf(appointment, 'location')}</span></p>}
        {valueOf(appointment, 'notes') && <p className="whitespace-pre-line border-t border-slate-100 pt-3 leading-relaxed dark:border-slate-800">{valueOf(appointment, 'notes')}</p>}
      </div>
      <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:gap-2.5">
        <Button variant="secondary" className="min-h-9 px-3 py-2 text-[11px]" onClick={onOpenDocuments}><FileText size={14} /> Documentos</Button>
        {canManage && <>
          <Button variant="ghost" className="min-h-9 px-3 py-2" onClick={onEdit} aria-label="Editar cita"><Pencil size={15} /></Button>
          <Button variant="danger" className="min-h-9 px-3 py-2" onClick={onDelete} aria-label="Eliminar cita"><Trash2 size={15} /></Button>
        </>}
      </div>
      {valueOf(appointment, 'status') === 'CANCELADA' && <p className="mt-3 text-[10px] text-slate-400">Esta cita está cancelada.</p>}
    </article>
  );
}
