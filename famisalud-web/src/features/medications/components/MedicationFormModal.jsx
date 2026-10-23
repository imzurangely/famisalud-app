import { useState } from 'react';
import { Save } from 'lucide-react';
import Button from '../../../shared/components/ui/Button.jsx';
import { SelectField, TextField } from '../../../shared/components/ui/FormField.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import { CLINICAL_STATUSES, DOSE_UNITS, fieldValue, toDateInput } from '../utils/medicationUtils.js';

export default function MedicationFormModal({ mode, medication, busy, onClose, onSubmit }) {
  const [formError, setFormError] = useState('');
  const [values, setValues] = useState(() => ({
    name: fieldValue(medication, 'name') || '',
    presentation: fieldValue(medication, 'presentation') || '',
    doseAmount: fieldValue(medication, 'doseAmount') ?? '',
    doseUnit: fieldValue(medication, 'doseUnit') || '',
    instructions: fieldValue(medication, 'instructions') || '',
    startDate: toDateInput(fieldValue(medication, 'startDate')),
    endDate: toDateInput(fieldValue(medication, 'endDate')),
    clinicalStatus: fieldValue(medication, 'clinicalStatus') || 'ACTIVO',
  }));
  const isEdit = mode === 'edit';

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setFormError('');
    try {
      if (values.endDate && values.startDate && values.endDate < values.startDate) {
        throw new Error('La fecha de finalización no puede ser anterior a la fecha de inicio.');
      }
      if (values.doseAmount !== '' && !values.doseUnit) {
        throw new Error('Selecciona la unidad de dosis cuando informes la cantidad.');
      }
      const payload = {
        name: values.name.trim(),
        presentation: values.presentation.trim() || null,
        doseAmount: values.doseAmount === '' ? null : Number(values.doseAmount),
        doseUnit: values.doseUnit || null,
        instructions: values.instructions.trim() || null,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
        clinicalStatus: values.clinicalStatus,
      };
      await onSubmit(payload);
    } catch (error) {
      setFormError(error?.message || 'No fue posible guardar el medicamento.');
    }
  }

  return (
    <Modal
      title={isEdit ? 'Editar medicamento' : 'Nuevo medicamento'}
      description="Registra el tratamiento como fue indicado. Los trámites de autorización se administran por separado."
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="medication-name" label="Nombre del medicamento" value={values.name} onChange={(event) => update('name', event.target.value)} required maxLength={150} placeholder="Ej. Losartán" />
          <TextField id="medication-presentation" label="Presentación" value={values.presentation} onChange={(event) => update('presentation', event.target.value)} maxLength={80} placeholder="Ej. Caja por 30 tabletas" />
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <TextField id="medication-dose" label="Dosis" type="number" value={values.doseAmount} onChange={(event) => update('doseAmount', event.target.value)} min="0.01" placeholder="Ej. 50" />
            <SelectField id="medication-unit" label="Unidad" value={values.doseUnit} onChange={(event) => update('doseUnit', event.target.value)} options={ [['', 'Seleccionar'], ...DOSE_UNITS] } />
          </div>
          <SelectField id="medication-status" label="Estado del tratamiento" value={values.clinicalStatus} onChange={(event) => update('clinicalStatus', event.target.value)} options={CLINICAL_STATUSES} required />
          <TextField id="medication-start" label="Fecha de inicio" type="date" value={values.startDate} onChange={(event) => update('startDate', event.target.value)} />
          <TextField id="medication-end" label="Fecha de finalización" type="date" value={values.endDate} onChange={(event) => update('endDate', event.target.value)} min={values.startDate || undefined} />
        </div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor="medication-instructions">
          Indicaciones y observaciones
          <textarea id="medication-instructions" className="form-input mt-2 min-h-24 resize-y" value={values.instructions} onChange={(event) => update('instructions', event.target.value)} maxLength={2000} placeholder="Ej. Tomar con agua después del desayuno…" />
        </label>
        {formError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{formError}</p>}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" loading={busy}><Save size={16} /> {busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear medicamento'}</Button>
        </div>
      </form>
    </Modal>
  );
}
