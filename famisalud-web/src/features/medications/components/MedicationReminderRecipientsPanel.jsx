import { useEffect, useMemo, useState } from 'react';
import { BellRing, Info, LoaderCircle, Plus, RefreshCw, Trash2, UserRound } from 'lucide-react';
import Button from '../../../shared/components/ui/Button.jsx';
import { confirmAction, notify } from '../../../shared/utils/feedback.js';
import { errorMessage, fieldValue, linkedUserId, memberFullName } from '../utils/medicationUtils.js';
import {
  addMedicationReminderRecipient,
  listMedicationReminderRecipients,
  removeMedicationReminderRecipient,
} from '../services/medicationsService.js';

export default function MedicationReminderRecipientsPanel({ memberId, medication, members = [], canManage }) {
  const medicationId = medication?.id;
  const selectedMember = members.find((member) => String(member.id) === String(memberId)) || null;
  const ownerUserId = linkedUserId(selectedMember);
  const [recipients, setRecipients] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setRecipients([]);
    if (!memberId || !medicationId) {
      setLoading(false);
      return () => { active = false; };
    }
    listMedicationReminderRecipients(memberId, medicationId)
      .then((items) => { if (active) setRecipients(items); })
      .catch((requestError) => { if (active) setError(errorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [memberId, medicationId]);

  const currentRecipientIds = useMemo(
    () => new Set(recipients.map((recipient) => String(fieldValue(recipient, 'userId') || fieldValue(recipient, 'user_id')))),
    [recipients],
  );
  const eligibleMembers = useMemo(() => members.filter((member) => {
    const userId = linkedUserId(member);
    return Boolean(userId)
      && String(userId) !== String(ownerUserId || '')
      && !currentRecipientIds.has(String(userId));
  }), [members, ownerUserId, currentRecipientIds]);

  useEffect(() => {
    setSelectedUserId((current) => eligibleMembers.some((member) => String(linkedUserId(member)) === String(current))
      ? current
      : String(linkedUserId(eligibleMembers[0]) || ''));
  }, [eligibleMembers]);

  async function reload() {
    if (!memberId || !medicationId) return;
    setLoading(true);
    setError('');
    try {
      setRecipients(await listMedicationReminderRecipients(memberId, medicationId));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!selectedUserId) return;
    setBusy('add');
    setError('');
    try {
      await addMedicationReminderRecipient(memberId, medicationId, selectedUserId);
      await reload();
      notify.success('Miembro agregado a los avisos de este medicamento.');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy('');
    }
  }

  async function handleRemove(recipient) {
    const userId = fieldValue(recipient, 'userId') || fieldValue(recipient, 'user_id');
    const name = [fieldValue(recipient, 'firstName') || fieldValue(recipient, 'first_name'), fieldValue(recipient, 'lastName') || fieldValue(recipient, 'last_name')]
      .filter(Boolean).join(' ') || 'este miembro';
    const confirmation = await confirmAction({
      title: 'Retirar destinatario',
      text: `¿Quieres dejar de enviarle avisos de ${fieldValue(medication, 'name') || 'este medicamento'} a ${name}?`,
      confirmButtonText: 'Retirar',
      icon: 'warning',
    });
    if (!confirmation.isConfirmed || !userId) return;
    setBusy(userId);
    setError('');
    try {
      await removeMedicationReminderRecipient(memberId, medicationId, userId);
      await reload();
      notify.success('Destinatario retirado.');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy('');
    }
  }

  if (!medicationId || !memberId) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/50 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200"><BellRing size={20} /></span>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Avisos de este medicamento</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Configura qué cuentas de la familia reciben recordatorios de tomas, renovaciones y entregas. Solo pueden recibirlos los miembros con una cuenta activa.</p>
          </div>
        </div>
        <Button variant="secondary" onClick={reload} disabled={loading || Boolean(busy)}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar</Button>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/25 dark:text-sky-200">
        <Info size={15} className="mt-0.5 shrink-0" />
        <p>{ownerUserId ? `La cuenta vinculada a ${memberFullName(selectedMember)} recibirá sus propios avisos automáticamente.` : `${memberFullName(selectedMember)} no tiene una cuenta vinculada; selecciona al menos un destinatario con cuenta para que alguien reciba los avisos.`} Los destinatarios adicionales recibirán también los avisos asociados a {fieldValue(medication, 'name') || 'este medicamento'}.</p>
      </div>

      {error && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}

      <div className="mt-5 space-y-3">
        <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Destinatarios adicionales</h4>
        {loading ? (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400"><LoaderCircle size={15} className="animate-spin" /> Cargando destinatarios…</div>
        ) : recipients.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">No has agregado otros destinatarios. El titular con cuenta sigue recibiendo sus propios recordatorios automáticamente.</p>
        ) : (
          <ul className="space-y-2">
            {recipients.map((recipient) => {
              const userId = fieldValue(recipient, 'userId') || fieldValue(recipient, 'user_id');
              const name = [fieldValue(recipient, 'firstName') || fieldValue(recipient, 'first_name'), fieldValue(recipient, 'lastName') || fieldValue(recipient, 'last_name')].filter(Boolean).join(' ') || 'Miembro de la familia';
              return <li key={recipient.id || userId} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200"><UserRound size={16} /></span><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{name}</p><p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{fieldValue(recipient, 'email') || 'Cuenta familiar vinculada'}</p></div></div>{canManage && <Button variant="danger" className="min-h-9! px-3! py-2! sm:self-auto" disabled={Boolean(busy)} onClick={() => handleRemove(recipient)}><Trash2 size={13} /> {busy === userId ? 'Retirando…' : 'Retirar'}</Button>}</li>;
            })}
          </ul>
        )}
      </div>

      {canManage && <form className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800" onSubmit={(event) => { event.preventDefault(); handleAdd(); }}>
        <label htmlFor="medication-reminder-recipient" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">Notificar también a</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select id="medication-reminder-recipient" className="form-input min-h-11 flex-1" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} disabled={loading || Boolean(busy) || eligibleMembers.length === 0}>
            <option value="">{eligibleMembers.length ? 'Selecciona un miembro con cuenta' : 'No hay más cuentas disponibles'}</option>
            {eligibleMembers.map((member) => <option key={linkedUserId(member)} value={linkedUserId(member)}>{memberFullName(member)}{linkedUserId(member) ? '' : ' (sin cuenta)'}</option>)}
          </select>
          <Button type="submit" disabled={!canManage || !selectedUserId || loading || Boolean(busy)} loading={busy === 'add'}><Plus size={15} /> Agregar destinatario</Button>
        </div>
        {!canManage && <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Necesitas permisos para administrar este perfil para cambiar los destinatarios.</p>}
        {canManage && eligibleMembers.length === 0 && <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Todos los miembros que tienen una cuenta ya reciben los avisos o están incluidos como destinatarios.</p>}
      </form>}
    </section>
  );
}
