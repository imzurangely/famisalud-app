import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import Button from '../../../shared/components/ui/Button.jsx';
import { TextField } from '../../../shared/components/ui/FormField.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import { todayDateInput } from '../utils/medicationUtils.js';

export default function CollectDeliveryModal({ delivery, busy, onClose, onSubmit }) {
  const [pickedUpDate, setPickedUpDate] = useState(todayDateInput());
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setFormError('');
    try {
      if (!pickedUpDate) throw new Error('Indica la fecha real de recogida.');
      if (pickedUpDate > todayDateInput()) throw new Error('La fecha de recogida no puede ser futura.');
      await onSubmit({ pickedUpDate, notes: notes.trim() || null });
    } catch (error) {
      setFormError(error?.message || 'No fue posible confirmar la recogida.');
    }
  }

  return (
    <Modal title="Confirmar recogida" description={`Registra la fecha en la que se recogió la entrega #${delivery?.delivery_number ?? delivery?.deliveryNumber ?? ''}. Esta fecha determina el cálculo del siguiente ciclo.`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <TextField id="delivery-picked-up-date" label="Fecha real de recogida" type="date" value={pickedUpDate} onChange={(event) => setPickedUpDate(event.target.value)} max={todayDateInput()} required />
        <label htmlFor="delivery-notes" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Notas de la recogida <textarea id="delivery-notes" className="form-input mt-2 min-h-20 resize-y" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} placeholder="Opcional" /></label>
        {formError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{formError}</p>}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" loading={busy}><CheckCircle2 size={16} /> {busy ? 'Guardando…' : 'Confirmar recogida'}</Button>
        </div>
      </form>
    </Modal>
  );
}
