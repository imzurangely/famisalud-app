import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import Button from '../../../shared/components/ui/Button.jsx';
import { SelectField, TextField } from '../../../shared/components/ui/FormField.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import { fieldValue, todayDateInput, toDateInput } from '../utils/medicationUtils.js';

const PERIODICITIES = [
  ['MENSUAL', 'Mensual'], ['BIMENSUAL', 'Bimensual (cada 2 meses)'], ['TRIMESTRAL', 'Trimestral (cada 3 meses)'],
];

function addMonths(value, months) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function monthDistance(from, to) {
  if (!from || !to) return null;
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);
  let months = (toYear - fromYear) * 12 + (toMonth - fromMonth);
  if (months > 0 && to < addMonths(from, months)) months -= 1;
  return months;
}

function expectedDeliveryCount(from, to, periodicity) {
  const months = monthDistance(from, to);
  const periodicityMonths = { MENSUAL: 1, BIMENSUAL: 2, TRIMESTRAL: 3 }[periodicity] || 1;
  if (!Number.isFinite(months) || months < 0 || months % periodicityMonths !== 0) return null;
  return months / periodicityMonths + 1;
}

export default function AuthorizationFormModal({ mode, authorization, medication, epsCompanies, busy, onClose, onSubmit }) {
  const initialPeriodicity = fieldValue(authorization, 'renewalPeriodicity') || 'MENSUAL';
  const periodicityMonths = { MENSUAL: 1, BIMENSUAL: 2, TRIMESTRAL: 3 }[initialPeriodicity] || 1;
  const today = todayDateInput();
  const medicationStart = toDateInput(fieldValue(medication, 'startDate'));
  const defaultStart = medicationStart && medicationStart > today ? medicationStart : today;
  const initialFrom = mode === 'edit'
    ? toDateInput(fieldValue(authorization, 'validFrom')) || defaultStart
    : defaultStart;
  const initialTo = mode === 'edit'
    ? toDateInput(fieldValue(authorization, 'validTo')) || addMonths(initialFrom, periodicityMonths)
    : addMonths(initialFrom, periodicityMonths);
  const initialQuantity = mode === 'edit'
    ? fieldValue(authorization, 'totalAuthorizedQuantity') ?? expectedDeliveryCount(initialFrom, initialTo, initialPeriodicity) ?? 1
    : expectedDeliveryCount(initialFrom, initialTo, initialPeriodicity) ?? 1;
  const [values, setValues] = useState(() => ({
    epsId: fieldValue(authorization, 'epsId') || '',
    authorizationNumber: fieldValue(authorization, 'authorizationNumber') || '',
    authorizationDate: mode === 'renewal' ? today : toDateInput(fieldValue(authorization, 'authorizationDate')),
    validFrom: initialFrom,
    validTo: mode === 'edit' ? initialTo : (mode === 'renewal' ? addMonths(initialFrom, periodicityMonths) : initialTo),
    totalAuthorizedQuantity: String(initialQuantity),
    isHighCost: Boolean(fieldValue(authorization, 'isHighCost')),
    renewalDaysBefore: fieldValue(authorization, 'renewalDaysBefore') ?? 5,
    renewalPeriodicity: initialPeriodicity,
    renewalPhone: fieldValue(authorization, 'renewalPhone') || '',
    renewalWebsite: fieldValue(authorization, 'renewalWebsite') || '',
    renewalChannel: fieldValue(authorization, 'renewalChannel') || '',
    pharmacyName: fieldValue(authorization, 'pharmacyName') || '',
    pharmacyAddress: fieldValue(authorization, 'pharmacyAddress') || '',
    pharmacyPhone: fieldValue(authorization, 'pharmacyPhone') || '',
    pharmacyWebsite: fieldValue(authorization, 'pharmacyWebsite') || '',
    notes: fieldValue(authorization, 'notes') || '',
  }));
  const [formError, setFormError] = useState('');
  const isEdit = mode === 'edit';
  const isRenewal = mode === 'renewal';
  const update = (name, value) => setValues((current) => ({ ...current, [name]: value }));
  const expectedQuantity = useMemo(
    () => expectedDeliveryCount(values.validFrom, values.validTo, values.renewalPeriodicity),
    [values.validFrom, values.validTo, values.renewalPeriodicity],
  );

  function makeOptionalUrl(value, label) {
    const clean = value.trim();
    if (!clean) return null;
    try {
      const url = new URL(clean);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      return clean;
    } catch {
      throw new Error(`${label} debe ser una URL válida que comience por https:// o http://.`);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setFormError('');
    try {
      if (!values.validFrom || !values.validTo || values.validTo < values.validFrom) throw new Error('Revisa las fechas de vigencia de la autorización.');
      if (values.authorizationDate && values.authorizationDate > values.validFrom) throw new Error('La fecha de autorización no puede ser posterior al inicio de vigencia.');
      if (expectedQuantity === null) throw new Error('El período debe contener una cantidad exacta de meses compatible con la periodicidad seleccionada.');
      if (Number(values.totalAuthorizedQuantity) !== expectedQuantity) throw new Error(`Para este período y periodicidad deben registrarse ${expectedQuantity} entrega(s).`);
      const payload = {
        epsId: values.epsId || null,
        authorizationNumber: values.authorizationNumber.trim() || null,
        authorizationDate: values.authorizationDate || null,
        validFrom: values.validFrom,
        validTo: values.validTo,
        totalAuthorizedQuantity: Number(values.totalAuthorizedQuantity),
        isHighCost: values.isHighCost,
        renewalDaysBefore: values.renewalDaysBefore === '' ? null : Number(values.renewalDaysBefore),
        renewalPeriodicity: values.renewalPeriodicity,
        renewalPhone: values.renewalPhone.trim() || null,
        renewalWebsite: makeOptionalUrl(values.renewalWebsite, 'El sitio web de renovación'),
        renewalChannel: values.renewalChannel.trim() || null,
        pharmacyName: values.pharmacyName.trim() || null,
        pharmacyAddress: values.pharmacyAddress.trim() || null,
        pharmacyPhone: values.pharmacyPhone.trim() || null,
        pharmacyWebsite: makeOptionalUrl(values.pharmacyWebsite, 'El sitio web de la farmacia'),
        notes: values.notes.trim() || null,
      };
      await onSubmit(payload);
    } catch (error) {
      setFormError(error?.message || 'No fue posible guardar la autorización.');
    }
  }

  const title = isEdit ? 'Editar autorización' : isRenewal ? 'Registrar renovación' : 'Registrar autorización';
  return (
    <Modal title={title} description="La primera entrega se genera automáticamente al guardar la autorización. Las siguientes fechas se calculan desde la recogida real." onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-5">
        <section className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-brand-700 dark:text-brand-300">Vigencia y autorización</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField id="authorization-eps" label="EPS" value={values.epsId} onChange={(event) => update('epsId', event.target.value)} options={ [['', 'Usar EPS registrada / heredada'], ...epsCompanies.map((eps) => [eps.id, eps.name])] } />
            <TextField id="authorization-number" label="Número de autorización (opcional)" value={values.authorizationNumber} onChange={(event) => update('authorizationNumber', event.target.value)} maxLength={100} placeholder="Se genera automáticamente si queda vacío" />
            <TextField id="authorization-date" label="Fecha de autorización" type="date" value={values.authorizationDate} onChange={(event) => update('authorizationDate', event.target.value)} max={values.validFrom || undefined} />
            <SelectField id="authorization-periodicity" label="Periodicidad de entrega" value={values.renewalPeriodicity} onChange={(event) => {
              const periodicity = event.target.value;
              const months = { MENSUAL: 1, BIMENSUAL: 2, TRIMESTRAL: 3 }[periodicity];
              const nextValidTo = values.validFrom ? addMonths(values.validFrom, months) : values.validTo;
              const nextQuantity = expectedDeliveryCount(values.validFrom, nextValidTo, periodicity);
              setValues((current) => ({
                ...current,
                renewalPeriodicity: periodicity,
                validTo: nextValidTo,
                totalAuthorizedQuantity: nextQuantity === null ? '' : String(nextQuantity),
              }));
            }} options={PERIODICITIES} required />
            <TextField id="authorization-from" label="Vigente desde" type="date" value={values.validFrom} onChange={(event) => {
              const validFrom = event.target.value;
              const quantity = expectedDeliveryCount(validFrom, values.validTo, values.renewalPeriodicity);
              setValues((current) => ({ ...current, validFrom, totalAuthorizedQuantity: quantity === null ? '' : String(quantity) }));
            }} min={toDateInput(fieldValue(medication, 'startDate')) || undefined} max={values.validTo || undefined} required />
            <TextField id="authorization-to" label="Vigente hasta" type="date" value={values.validTo} onChange={(event) => {
              const validTo = event.target.value;
              const quantity = expectedDeliveryCount(values.validFrom, validTo, values.renewalPeriodicity);
              setValues((current) => ({ ...current, validTo, totalAuthorizedQuantity: quantity === null ? '' : String(quantity) }));
            }} min={values.validFrom} max={toDateInput(fieldValue(medication, 'endDate')) || undefined} required />
            <TextField id="authorization-quantity" label="Entregas autorizadas" type="number" value={values.totalAuthorizedQuantity} onChange={(event) => update('totalAuthorizedQuantity', event.target.value)} min="1" required hint={expectedQuantity === null ? 'Revisa el período y la periodicidad.' : `El período corresponde a ${expectedQuantity} entrega(s).`} />
            <TextField id="authorization-renewal-days" label="Avisar renovación con (días)" type="number" value={values.renewalDaysBefore} onChange={(event) => update('renewalDaysBefore', event.target.value)} min="0" />
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">
            <input type="checkbox" checked={values.isHighCost} onChange={(event) => update('isHighCost', event.target.checked)} className="size-4 accent-brand-600" /> Medicamento de alto costo
          </label>
        </section>
        <section className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-brand-700 dark:text-brand-300">Gestión de renovación</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="authorization-renewal-phone" label="Teléfono para renovar" value={values.renewalPhone} onChange={(event) => update('renewalPhone', event.target.value)} maxLength={30} />
            <TextField id="authorization-renewal-website" label="Sitio web de renovación" type="url" value={values.renewalWebsite} onChange={(event) => update('renewalWebsite', event.target.value)} placeholder="https://…" />
            <TextField id="authorization-renewal-channel" label="Canal de renovación" value={values.renewalChannel} onChange={(event) => update('renewalChannel', event.target.value)} maxLength={50} placeholder="Ej. Portal web, teléfono…" />
          </div>
        </section>
        <section className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-brand-700 dark:text-brand-300">Farmacia asignada</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="authorization-pharmacy-name" label="Nombre de la farmacia" value={values.pharmacyName} onChange={(event) => update('pharmacyName', event.target.value)} maxLength={150} />
            <TextField id="authorization-pharmacy-phone" label="Teléfono de la farmacia" value={values.pharmacyPhone} onChange={(event) => update('pharmacyPhone', event.target.value)} maxLength={30} />
            <TextField id="authorization-pharmacy-website" label="Sitio web de la farmacia" type="url" value={values.pharmacyWebsite} onChange={(event) => update('pharmacyWebsite', event.target.value)} placeholder="https://…" />
            <label htmlFor="authorization-pharmacy-address" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Dirección de la farmacia <textarea id="authorization-pharmacy-address" className="form-input mt-2 min-h-12 resize-y" value={values.pharmacyAddress} onChange={(event) => update('pharmacyAddress', event.target.value)} maxLength={1000} /></label>
          </div>
        </section>
        <label htmlFor="authorization-notes" className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Notas <textarea id="authorization-notes" className="form-input mt-2 min-h-20 resize-y" value={values.notes} onChange={(event) => update('notes', event.target.value)} maxLength={2000} placeholder="Datos útiles para la gestión del trámite" /></label>
        {!isEdit && !isRenewal && <p className="rounded-xl bg-sky-50 p-3 text-xs leading-relaxed text-sky-800 dark:bg-sky-950/40 dark:text-sky-200">Si el perfil ya tiene una EPS activa, se usará esa afiliación. Si todavía no tiene una, selecciónala aquí para asociarla al perfil.</p>}
        {formError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{formError}</p>}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" loading={busy}><Save size={16} /> {busy ? 'Guardando…' : title}</Button>
        </div>
      </form>
    </Modal>
  );
}
