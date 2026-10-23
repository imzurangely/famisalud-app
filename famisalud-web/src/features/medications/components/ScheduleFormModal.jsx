import { useState } from 'react';
import { Save } from 'lucide-react';
import Button from '../../../shared/components/ui/Button.jsx';
import { SelectField, TextField } from '../../../shared/components/ui/FormField.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import { SCHEDULE_TYPES, WEEKDAYS, fieldValue, todayDateInput, toDateInput } from '../utils/medicationUtils.js';

export default function ScheduleFormModal({ mode, schedule, medication, busy, onClose, onSubmit }) {
  const [formError, setFormError] = useState('');
  const [values, setValues] = useState(() => ({
    scheduleType: fieldValue(schedule, 'scheduleType') || 'DIARIO',
    startDate: toDateInput(fieldValue(schedule, 'startDate') || fieldValue(medication, 'startDate')) || todayDateInput(),
    endDate: toDateInput(fieldValue(schedule, 'endDate')),
    hour: String(fieldValue(schedule, 'hour') || '').slice(0, 5),
    daysOfWeek: (fieldValue(schedule, 'daysOfWeek') || []).map(Number),
    intervalHours: fieldValue(schedule, 'intervalHours') ?? '8',
    dayOfMonth: fieldValue(schedule, 'dayOfMonth') ?? '1',
  }));
  const isEdit = mode === 'edit';
  const update = (name, value) => setValues((current) => ({ ...current, [name]: value }));
  const isAsNeeded = values.scheduleType === 'SI_ES_NECESARIO';

  function toggleDay(day) {
    update('daysOfWeek', values.daysOfWeek.includes(day)
      ? values.daysOfWeek.filter((value) => value !== day)
      : [...values.daysOfWeek, day].sort((a, b) => a - b));
  }

  async function submit(event) {
    event.preventDefault();
    setFormError('');
    try {
      if (values.endDate && values.endDate < values.startDate) throw new Error('La fecha de finalización no puede ser anterior a la fecha de inicio.');
      if (!isAsNeeded && !values.hour) throw new Error('Indica la hora del medicamento.');
      if (values.scheduleType === 'DIAS_SEMANA' && !values.daysOfWeek.length) throw new Error('Selecciona al menos un día de la semana.');
      const payload = {
        scheduleType: values.scheduleType,
        startDate: values.startDate,
        endDate: values.endDate || null,
        hour: isAsNeeded ? null : values.hour,
        daysOfWeek: values.scheduleType === 'DIAS_SEMANA' ? values.daysOfWeek : null,
        intervalHours: values.scheduleType === 'INTERVALO_HORAS' ? Number(values.intervalHours) : null,
        dayOfMonth: values.scheduleType === 'MENSUAL' ? Number(values.dayOfMonth) : null,
        isActive: true,
      };
      await onSubmit(payload);
    } catch (error) {
      setFormError(error?.message || 'No fue posible guardar el horario.');
    }
  }

  return (
    <Modal title={isEdit ? 'Editar horario' : 'Nuevo horario'} description="Configura cuándo corresponde tomar el medicamento. Desactivar un horario no elimina el historial de tomas." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <SelectField id="schedule-type" label="Frecuencia" value={values.scheduleType} onChange={(event) => update('scheduleType', event.target.value)} options={SCHEDULE_TYPES} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="schedule-start" label="Desde" type="date" value={values.startDate} onChange={(event) => update('startDate', event.target.value)} required min={toDateInput(fieldValue(medication, 'startDate')) || undefined} max={toDateInput(fieldValue(medication, 'endDate')) || undefined} />
          <TextField id="schedule-end" label="Hasta (opcional)" type="date" value={values.endDate} onChange={(event) => update('endDate', event.target.value)} min={values.startDate} max={toDateInput(fieldValue(medication, 'endDate')) || undefined} />
        </div>
        {!isAsNeeded && <TextField id="schedule-hour" label="Hora de la toma" type="time" value={values.hour} onChange={(event) => update('hour', event.target.value)} required />}
        {values.scheduleType === 'DIAS_SEMANA' && (
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Días de la semana</legend>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {WEEKDAYS.map(([day, label]) => (
                <button key={day} type="button" aria-pressed={values.daysOfWeek.includes(day)} onClick={() => toggleDay(day)} className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition ${values.daysOfWeek.includes(day) ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {values.scheduleType === 'INTERVALO_HORAS' && <TextField id="schedule-interval" label="Cada cuántas horas" type="number" value={values.intervalHours} onChange={(event) => update('intervalHours', event.target.value)} min="1" max="168" required hint="Por ejemplo, 8 para una toma cada ocho horas." />}
        {values.scheduleType === 'MENSUAL' && <TextField id="schedule-day" label="Día del mes" type="number" value={values.dayOfMonth} onChange={(event) => update('dayOfMonth', event.target.value)} min="1" max="31" required />}
        {isAsNeeded && <p className="rounded-xl bg-sky-50 p-3 text-xs leading-relaxed text-sky-800 dark:bg-sky-950/40 dark:text-sky-200">Este medicamento se usa según necesidad; no se programará una hora fija.</p>}
        {formError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{formError}</p>}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" loading={busy}><Save size={16} /> {busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear horario'}</Button>
        </div>
      </form>
    </Modal>
  );
}
