import { useState } from 'react';
import { Save } from 'lucide-react';
import Button from '../../../shared/components/ui/Button.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import { RECORD_INITIAL_VALUES, SECTION_FIELDS } from '../utils/medicalHistoryConfig.js';
import { toFormValues, toRecordPayload } from '../utils/medicalHistoryUtils.js';

export default function MedicalRecordFormModal({ section, record, title, onClose, onSubmit, submitting }) {
  const fields = SECTION_FIELDS[section];
  const [values, setValues] = useState(() => toFormValues(record, fields, RECORD_INITIAL_VALUES[section]));
  const [validationError, setValidationError] = useState('');

  function change(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setValidationError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      const payload = toRecordPayload(section, values, fields);
      await onSubmit(payload);
    } catch (error) {
      setValidationError(error?.message || 'Revisa la información del formulario.');
    }
  }

  return (
    <Modal title={title} description="Completa los campos y guarda los cambios de la historia clínica." onClose={onClose} wide>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <label key={field.name} htmlFor={`record-${field.name}`} className={`block ${field.type === 'textarea' || (section === 'vital-signs' && field.name === 'recordedAt') ? 'sm:col-span-2' : ''}`}>
              <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">{field.label}{field.required ? ' *' : ''}</span>
              {field.type === 'select' ? (
                <select id={`record-${field.name}`} className="form-input" value={values[field.name] ?? ''} onChange={(event) => change(field.name, event.target.value)} required={field.required}>
                  {(field.required ? [] : [{ value: '', label: 'Seleccionar…' }]).concat(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea id={`record-${field.name}`} className="form-input min-h-24 resize-y" rows={3} maxLength={field.maxLength} placeholder={field.placeholder} value={values[field.name] ?? ''} onChange={(event) => change(field.name, event.target.value)} />
              ) : (
                <input id={`record-${field.name}`} className="form-input" type={field.type} min={field.min} max={field.max} step={field.step} maxLength={field.maxLength} placeholder={field.placeholder} value={values[field.name] ?? ''} onChange={(event) => change(field.name, event.target.value)} required={field.required} />
              )}
            </label>
          ))}
        </div>
        {validationError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{validationError}</p>}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={submitting}><Save size={16} /> {submitting ? 'Guardando…' : 'Guardar registro'}</Button>
        </div>
      </form>
    </Modal>
  );
}
