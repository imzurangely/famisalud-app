import { useState } from 'react';
import { Save } from 'lucide-react';
import Button from '../../../shared/components/ui/Button.jsx';
import { SelectField, TextField } from '../../../shared/components/ui/FormField.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import { LOG_STATUSES, fieldValue, nowDateTimeInput, toApiDateTime, toDateTimeInput } from '../utils/medicationUtils.js';

export default function MedicationLogModal({ mode, log, schedules, busy, onClose, onSubmit }) {
  const existingStatus = fieldValue(log, 'status') || 'TOMADO';
  const [values, setValues] = useState(() => ({
    scheduledAt: toDateTimeInput(fieldValue(log, 'scheduledAt')) || nowDateTimeInput(),
    takenAt: toDateTimeInput(fieldValue(log, 'takenAt')) || (['TOMADO', 'RETRASADO'].includes(existingStatus) ? nowDateTimeInput() : ''),
    status: existingStatus,
    scheduleId: fieldValue(log, 'medicationScheduleId') || fieldValue(log, 'scheduleId') || '',
    notes: fieldValue(log, 'notes') || '',
  }));
  const [formError, setFormError] = useState('');
  const update = (name, value) => setValues((current) => ({ ...current, [name]: value }));

  async function submit(event) {
    event.preventDefault();
    setFormError('');
    try {
      if (!values.scheduledAt) throw new Error('Indica la fecha y hora programada.');
      const isTaken = ['TOMADO', 'RETRASADO'].includes(values.status);
      if (isTaken && !values.takenAt) throw new Error('Indica cuándo se tomó el medicamento.');
      await onSubmit({
        scheduledAt: toApiDateTime(values.scheduledAt),
        takenAt: isTaken ? toApiDateTime(values.takenAt) : null,
        status: values.status,
        scheduleId: values.scheduleId || null,
        notes: values.notes.trim() || null,
      });
    } catch (error) {
      setFormError(error?.message || 'No fue posible registrar la toma.');
    }
  }

  return (
    <Modal title={mode === 'edit' ? 'Editar registro de toma' : 'Registrar toma'} description="El registro queda asociado al historial del medicamento." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <TextField id="log-scheduled-at" label="Fecha y hora programada" type="datetime-local" value={values.scheduledAt} onChange={(event) => update('scheduledAt', event.target.value)} required />
        <SelectField id="log-status" label="Resultado de la toma" value={values.status} onChange={(event) => {
          const status = event.target.value;
          setValues((current) => ({ ...current, status, takenAt: ['TOMADO', 'RETRASADO'].includes(status) ? (current.takenAt || nowDateTimeInput()) : '' }));
        }} options={LOG_STATUSES} required />
        {['TOMADO', 'RETRASADO'].includes(values.status) && <TextField id="log-taken-at" label="Fecha y hora en que se tomó" type="datetime-local" value={values.takenAt} onChange={(event) => update('takenAt', event.target.value)} required />}
        <SelectField id="log-schedule" label="Horario relacionado (opcional)" value={values.scheduleId} onChange={(event) => update('scheduleId', event.target.value)} options={ [['', 'Sin horario específico'], ...schedules.map((schedule) => [schedule.id, `${String(fieldValue(schedule, 'hour') || 'A demanda').slice(0, 5)} · ${fieldValue(schedule, 'scheduleType') || 'Horario'}`])] } />
        <label htmlFor="log-notes" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Notas <textarea id="log-notes" className="form-input mt-2 min-h-20 resize-y" value={values.notes} onChange={(event) => update('notes', event.target.value)} maxLength={2000} placeholder="Opcional" /></label>
        {formError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{formError}</p>}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" loading={busy}><Save size={16} /> {busy ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Registrar toma'}</Button>
        </div>
      </form>
    </Modal>
  );
}
