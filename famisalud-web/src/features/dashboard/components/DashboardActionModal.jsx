import { useState } from 'react';
import { CalendarCheck, CheckCircle2, Clock3, PackageCheck, Pill, XCircle } from 'lucide-react';
import Button from '../../../shared/components/ui/Button.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import { friendlyErrorMessage } from '../../../shared/utils/friendlyErrors.js';
import { fieldValue, formatDashboardDate, localDateKey, toApiDateTime, toLocalDateTimeInput } from '../utils/dashboardUtils.js';

const TAKE_STATUSES = [
  ['TOMADO', 'Tomado'],
  ['RETRASADO', 'Tomado con retraso'],
  ['OLVIDADO', 'No se tomó'],
  ['OMITIDO', 'Se omitió la dosis'],
];

export default function DashboardActionModal({ type, target, busy, onClose, onConfirm }) {
  const [status, setStatus] = useState(() => {
    const previous = fieldValue(target?.existingLog, 'status');
    return TAKE_STATUSES.some(([key]) => key === previous) ? previous : 'TOMADO';
  });
  const [scheduledAt, setScheduledAt] = useState(() => toLocalDateTimeInput(target?.scheduledAt || fieldValue(target?.existingLog, 'scheduledAt', 'scheduled_at')));
  const [takenAt, setTakenAt] = useState(() => toLocalDateTimeInput(new Date()));
  const [pickedUpDate, setPickedUpDate] = useState(() => localDateKey(new Date()));
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const medication = target?.medication;
  const memberName = target?.member ? [fieldValue(target.member, 'firstName', 'first_name'), fieldValue(target.member, 'lastName', 'last_name')].filter(Boolean).join(' ') : '';

  async function submitTake(event) {
    event.preventDefault();
    setFormError('');
    try {
      if (!scheduledAt) throw new Error('Selecciona la fecha y hora de la dosis.');
      const isTaken = ['TOMADO', 'RETRASADO'].includes(status);
      if (isTaken && !takenAt) throw new Error('Indica cuándo se tomó el medicamento.');
      await onConfirm({
        scheduledAt: toApiDateTime(scheduledAt),
        takenAt: isTaken ? toApiDateTime(takenAt) : null,
        status,
        scheduleId: target.schedule.id,
        notes: notes.trim() || null,
        existingLogId: target.existingLog?.id || null,
      });
    } catch (error) {
      setFormError(friendlyErrorMessage(error));
    }
  }

  async function submitPickup(event) {
    event.preventDefault();
    setFormError('');
    try {
      if (!pickedUpDate) throw new Error('Selecciona la fecha en que recogiste el medicamento.');
      await onConfirm({ pickedUpDate, notes: notes.trim() || null });
    } catch (error) {
      setFormError(friendlyErrorMessage(error));
    }
  }

  async function saveAttendance(statusValue) {
    setFormError('');
    try {
      await onConfirm({ status: statusValue });
    } catch (error) {
      setFormError(friendlyErrorMessage(error));
    }
  }

  if (type === 'take') {
    const isTaken = ['TOMADO', 'RETRASADO'].includes(status);
    return (
      <Modal title={target?.existingLog ? 'Actualizar toma' : 'Registrar toma'} description={`${fieldValue(medication, 'name') || 'Medicamento'}${memberName ? ` · ${memberName}` : ''}`} onClose={onClose}>
        <form className="space-y-4" onSubmit={submitTake}>
          <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3 text-brand-800 dark:bg-brand-950/40 dark:text-brand-200">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900"><Pill size={19}/></span>
            <div><p className="text-xs font-bold">{fieldValue(medication, 'name') || 'Medicamento'}</p><p className="mt-1 text-[11px]">Horario: {String(fieldValue(target.schedule, 'hour') || 'A demanda').slice(0, 5)}</p></div>
          </div>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Fecha y hora programada</span><input className="form-input" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">¿Qué ocurrió con esta dosis?</span><select className="form-input" value={status} onChange={(event) => setStatus(event.target.value)}>{TAKE_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {isTaken && <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">¿Cuándo se tomó?</span><input className="form-input" type="datetime-local" value={takenAt} onChange={(event) => setTakenAt(event.target.value)} required /></label>}
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nota (opcional)</span><textarea className="form-input min-h-20 resize-y" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} placeholder="Añade alguna observación…" /></label>
          {formError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{formError}</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button><Button type="submit" loading={busy}><CheckCircle2 size={15}/> Guardar toma</Button></div>
        </form>
      </Modal>
    );
  }

  if (type === 'pickup') {
    return (
      <Modal title="Registrar recogida" description={`${fieldValue(medication, 'name') || 'Medicamento'}${memberName ? ` · ${memberName}` : ''}`} onClose={onClose}>
        <form className="space-y-4" onSubmit={submitPickup}>
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"><span className="flex size-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900"><PackageCheck size={19}/></span><div><p className="text-xs font-bold">Entrega #{fieldValue(target.delivery, 'deliveryNumber', 'delivery_number') ?? '—'}</p><p className="mt-1 text-[11px]">Programada para {formatDashboardDate(fieldValue(target.delivery, 'scheduledDate', 'scheduled_date'))}</p></div></div>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Fecha real de recogida</span><input className="form-input" type="date" value={pickedUpDate} onChange={(event) => setPickedUpDate(event.target.value)} required /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nota (opcional)</span><textarea className="form-input min-h-20 resize-y" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} placeholder="Por ejemplo, quién lo recogió…" /></label>
          {formError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{formError}</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button><Button type="submit" loading={busy}><PackageCheck size={15}/> Confirmar recogida</Button></div>
        </form>
      </Modal>
    );
  }

  return (
    <Modal title="Registrar asistencia" description={`${fieldValue(target?.appointment, 'title') || 'Cita médica'}${memberName ? ` · ${memberName}` : ''}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-sky-50 p-3 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200"><span className="flex size-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900"><CalendarCheck size={19}/></span><div><p className="text-xs font-bold">{fieldValue(target?.appointment, 'title') || 'Cita médica'}</p><p className="mt-1 text-[11px]">{formatDashboardDate(fieldValue(target?.appointment, 'startsAt', 'starts_at'), { dateStyle: 'medium', timeStyle: 'short' })}</p></div></div>
        <p className="text-sm text-slate-600 dark:text-slate-300">¿La persona asistió a esta cita?</p>
        {formError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{formError}</p>}
        <div className="grid gap-2 sm:grid-cols-2"><Button onClick={() => saveAttendance('COMPLETADA')} loading={busy}><CheckCircle2 size={15}/> Sí, asistió</Button><Button variant="danger" onClick={() => saveAttendance('NO_ASISTIO')} disabled={busy}><XCircle size={15}/> No asistió</Button></div>
        <div className="border-t border-slate-100 pt-3 dark:border-slate-800"><Button className="w-full" variant="secondary" onClick={onClose} disabled={busy}><Clock3 size={14}/> Dejar pendiente</Button></div>
      </div>
    </Modal>
  );
}
