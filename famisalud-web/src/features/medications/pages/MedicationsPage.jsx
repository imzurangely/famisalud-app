import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  BellRing,
  CalendarClock,
  ClipboardList,
  Clock3,
  FileCheck2,
  History,
  Info,
  MapPin,
  PackageCheck,
  Pill,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UsersRound,
} from 'lucide-react';
import { useFamilies } from '../../../shared/hooks/useFamily.js';
import Button from '../../../shared/components/ui/Button.jsx';
import EmptyState from '../../../shared/components/ui/EmptyState.jsx';
import { confirmAction, notify } from '../../../shared/utils/feedback.js';
import { useMedications } from '../hooks/useMedications.js';
import MedicationCard from '../components/MedicationCard.jsx';
import MedicationFormModal from '../components/MedicationFormModal.jsx';
import ScheduleFormModal from '../components/ScheduleFormModal.jsx';
import MedicationLogModal from '../components/MedicationLogModal.jsx';
import AuthorizationFormModal from '../components/AuthorizationFormModal.jsx';
import CollectDeliveryModal from '../components/CollectDeliveryModal.jsx';
import MedicationReminderRecipientsPanel from '../components/MedicationReminderRecipientsPanel.jsx';
import {
  CLINICAL_STATUSES,
  DELIVERY_STATUSES,
  LOG_STATUSES,
  MANAGEMENT_STATUSES,
  SCHEDULE_TYPES,
  doseLabel,
  errorMessage,
  fieldValue,
  formatDate,
  formatDateTime,
  humanizeEventType,
  logStatusTone,
  managementStatusTone,
  medicationStatusTone,
  memberFullName,
  scheduleDescription,
} from '../utils/medicationUtils.js';
import {
  cancelAuthorization,
  collectMedicationDelivery,
  confirmDeliveryRenewalManaged,
  createAuthorization,
  createMedication,
  createMedicationLog,
  createSchedule,
  deleteMedication,
  deleteSchedule,
  markDeliveryPendingPharmacy,
  renewAuthorization,
  requestMedicationAuthorization,
  updateAuthorization,
  updateMedication,
  updateMedicationLog,
  updateSchedule,
} from '../services/medicationsService.js';

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: Pill },
  { id: 'horarios', label: 'Horarios y tomas', icon: Clock3 },
  { id: 'tramites', label: 'Trámites y recogidas', icon: ClipboardList },
  { id: 'historial', label: 'Historial', icon: History },
  { id: 'avisos', label: 'Avisos', icon: BellRing },
];

function InlineError({ message, onClose }) {
  if (!message) return null;
  return <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"><span>{message}</span><button type="button" className="font-bold underline" onClick={onClose}>Cerrar</button></div>;
}

function StatusPill({ status, label, className = '' }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${className}`}>{label || status || 'Sin estado'}</span>;
}

function SectionHeading({ eyebrow, title, description, action }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">{eyebrow}</p>}<h2 className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">{title}</h2>{description && <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>}</div>{action}</div>;
}

function InfoLine({ icon: Icon = Info, label, value }) {
  return <div className="flex items-start gap-2.5"><span className="mt-0.5 text-brand-600 dark:text-brand-300"><Icon size={15} /></span><div className="min-w-0"><p className="text-[10px] font-semibold text-slate-400">{label}</p><p className="mt-0.5 break-words text-xs font-semibold text-slate-700 dark:text-slate-200">{value || 'Sin información'}</p></div></div>;
}

function MedicationLogRow({ log, canManage, onEdit }) {
  const status = fieldValue(log, 'status');
  return <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/50 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200"><Clock3 size={15} /></span><div className="min-w-0"><p className="text-xs font-bold text-slate-800 dark:text-slate-100">{formatDateTime(fieldValue(log, 'scheduledAt'))}</p><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{fieldValue(log, 'takenAt') ? `Tomada: ${formatDateTime(fieldValue(log, 'takenAt'))}` : fieldValue(log, 'notes') || 'Sin nota adicional'}</p></div></div><div className="flex items-center gap-2 self-end sm:self-auto"><StatusPill status={status} label={LOG_STATUSES.find(([key]) => key === status)?.[1] || status} className={logStatusTone(status)} />{canManage && <button type="button" className="rounded-lg px-2.5 py-2 text-[10px] font-bold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/50" onClick={onEdit}>Editar</button>}</div></div>;
}

function ScheduleCard({ schedule, canManage, onEdit, onDelete, target = false }) {
  const hour = String(fieldValue(schedule, 'hour') || '').slice(0, 5);
  return <article id={`schedule-${schedule.id}`} className={`rounded-2xl border bg-white p-4 transition dark:bg-slate-950/50 ${target ? 'border-brand-400 ring-2 ring-brand-200 dark:border-brand-500 dark:ring-brand-900' : 'border-slate-200 dark:border-slate-800'}`}><div className="flex items-start justify-between gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200"><CalendarClock size={18} /></span>{hour && <span className="rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-extrabold text-brand-700 dark:bg-brand-950/50 dark:text-brand-200">{hour}</span>}</div><h3 className="mt-3 text-sm font-extrabold text-slate-900 dark:text-white">{SCHEDULE_TYPES.find(([key]) => key === fieldValue(schedule, 'scheduleType'))?.[1] || 'Horario'}</h3><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{scheduleDescription(schedule)}</p><div className="mt-3 space-y-1 text-[11px] text-slate-500 dark:text-slate-400"><p>Desde {formatDate(fieldValue(schedule, 'startDate'))}</p><p>Hasta {fieldValue(schedule, 'endDate') ? formatDate(fieldValue(schedule, 'endDate')) : 'Sin fecha de finalización'}</p></div>{canManage && <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800"><button type="button" onClick={onEdit} className="rounded-lg px-3 py-2 text-[11px] font-bold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/50">Editar</button><button type="button" onClick={onDelete} className="rounded-lg px-3 py-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40">Desactivar</button></div>}</article>;
}

function DeliveryCard({ delivery, canManage, busy, onPendingPharmacy, onConfirmRenewal, onCollect, target = false }) {
  const status = fieldValue(delivery, 'status');
  const canCollect = ['LISTO_PARA_RECOGER', 'PENDIENTE_FARMACIA'].includes(status);
  const needsRenewalAction = status === 'RENOVACION_PENDIENTE';
  const statusColor = {
    PROGRAMADA: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    RENOVACION_PENDIENTE: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200',
    LISTO_PARA_RECOGER: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200',
    PENDIENTE_FARMACIA: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200',
    RECOGIDO: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200',
    PERDIDA: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  }[status] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  return <article id={`delivery-${delivery.id}`} className={`rounded-2xl border bg-white p-4 transition dark:bg-slate-950/50 ${target ? 'border-brand-400 ring-2 ring-brand-200 dark:border-brand-500 dark:ring-brand-900' : 'border-slate-200 dark:border-slate-800'}`}><div className="flex items-start justify-between gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200"><PackageCheck size={18} /></span><StatusPill status={status} label={DELIVERY_STATUSES[status] || status} className={statusColor} /></div><div className="mt-3 flex items-start justify-between gap-2"><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Entrega #{fieldValue(delivery, 'deliveryNumber') ?? '—'}</h3><span className="text-[10px] font-semibold text-slate-400">{fieldValue(delivery, 'authorizationNumber') || 'Autorización'}</span></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><InfoLine icon={CalendarClock} label="Fecha programada" value={formatDate(fieldValue(delivery, 'scheduledDate'))} /><InfoLine icon={Clock3} label="Fecha límite" value={formatDate(fieldValue(delivery, 'pickupDeadline'))} /></div>{fieldValue(delivery, 'pickedUpDate') && <p className="mt-3 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Recogida confirmada: {formatDate(fieldValue(delivery, 'pickedUpDate'))}</p>}{fieldValue(delivery, 'pharmacyName') && <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400"><MapPin size={13} className="mt-0.5 shrink-0" />{fieldValue(delivery, 'pharmacyName')}{fieldValue(delivery, 'pharmacyAddress') ? ` · ${fieldValue(delivery, 'pharmacyAddress')}` : ''}</p>}{canManage && (canCollect || needsRenewalAction) && <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">{canCollect && <Button onClick={onCollect} disabled={busy} className="flex-1">{status === 'PENDIENTE_FARMACIA' ? 'Confirmar recogida' : 'Marcar como recogida'}</Button>}{status === 'LISTO_PARA_RECOGER' && <Button variant="secondary" onClick={onPendingPharmacy} disabled={busy}>Sin existencias</Button>}{needsRenewalAction && <Button onClick={onConfirmRenewal} disabled={busy} className="w-full">Ya gestioné la renovación</Button>}</div>}</article>;
}

function AuthorizationPanel({ summary, canManage, busy, onRequest, onCreate, onEdit, onRenew, onCancel }) {
  const medicationStatus = summary?.medication?.managementStatus || summary?.medication?.management_status;
  const authorization = summary?.currentAuthorization;
  const alert = authorization?.alert;
  const remaining = fieldValue(authorization, 'remainingQuantity');
  const canceled = Boolean(fieldValue(authorization, 'canceledAt'));
  const canRenew = Boolean(authorization && (canceled || Number(remaining ?? 0) <= 0));
  return <div className="space-y-4">
    {!authorization ? (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5 dark:border-slate-700 dark:bg-slate-950/40"><div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200"><FileCheck2 size={20} /></span><div><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Aún no hay una autorización registrada</h3><p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Puedes dejar constancia de que la solicitaste y registrar la autorización aprobada cuando la EPS la entregue. La primera autorización no necesita una renovación previa.</p><div className="mt-4 flex flex-wrap gap-2">{canManage && medicationStatus !== 'AUTORIZACION_EN_PROCESO' && <Button onClick={onRequest} disabled={busy}><FileCheck2 size={15} /> Solicitar autorización</Button>}{canManage && <Button variant="secondary" onClick={onCreate} disabled={busy}><Plus size={15} /> Registrar autorización aprobada</Button>}</div>{medicationStatus === 'AUTORIZACION_EN_PROCESO' && <p className="mt-3 text-[11px] font-semibold text-amber-700 dark:text-amber-300">La solicitud está marcada como en proceso.</p>}</div></div></section>
    ) : (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/50 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200"><ShieldCheck size={20} /></span><div><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Autorización {fieldValue(authorization, 'authorizationNumber') || 'registrada'}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{fieldValue(authorization, 'epsName') || 'EPS asociada'}{fieldValue(authorization, 'epsCode') ? ` · ${fieldValue(authorization, 'epsCode')}` : ''}</p></div></div><div className="flex flex-wrap gap-2">{canManage && !canceled && Number(remaining ?? 0) > 0 && <Button variant="secondary" onClick={onEdit} disabled={busy}>Editar datos</Button>}{canManage && !canceled && <Button variant="danger" onClick={onCancel} disabled={busy}><Trash2 size={14} /> Anular</Button>}{canManage && canRenew && <Button onClick={onRenew} disabled={busy}><RefreshCw size={14} /> Registrar renovación</Button>}</div></div>
          {alert?.message && <p className={`mt-4 rounded-xl p-3 text-xs leading-relaxed ${alert.status === 'ANULADA' || alert.status === 'AUTORIZACION_AGOTADA' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'}`}>{alert.message}</p>}
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><InfoLine icon={CalendarClock} label="Vigencia" value={`${formatDate(fieldValue(authorization, 'validFrom'))} — ${formatDate(fieldValue(authorization, 'validTo'))}`} /><InfoLine icon={PackageCheck} label="Entregas restantes" value={`${remaining ?? 'Sin dato'} de ${fieldValue(authorization, 'totalAuthorizedQuantity') ?? '—'}`} /><InfoLine icon={RefreshCw} label="Periodicidad" value={{ MENSUAL: 'Mensual', BIMENSUAL: 'Cada 2 meses', TRIMESTRAL: 'Cada 3 meses' }[fieldValue(authorization, 'renewalPeriodicity')] || fieldValue(authorization, 'renewalPeriodicity')} /><InfoLine icon={FileCheck2} label="Configuración" value={fieldValue(authorization, 'configurationStatus') === 'CONFIGURADA' ? 'Renovación y farmacia configuradas' : 'Faltan datos de contacto o farmacia'} /><InfoLine icon={MapPin} label="Farmacia" value={fieldValue(authorization, 'pharmacyName')} /><InfoLine icon={Clock3} label="Gestión de renovación" value={fieldValue(authorization, 'renewalChannel') || fieldValue(authorization, 'renewalPhone') || (fieldValue(authorization, 'renewalWebsite') ? 'Sitio web registrado' : null)} /></div>
        </section>
    )}
    {summary?.authorizations?.length > 1 && <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/50"><h3 className="text-xs font-extrabold text-slate-800 dark:text-white">Autorizaciones anteriores</h3><div className="mt-3 space-y-2">{summary.authorizations.slice(1).map((item) => <div key={item.id} className="flex flex-col gap-1 rounded-xl bg-slate-50 p-3 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"><span className="text-xs font-bold text-slate-700 dark:text-slate-200">{fieldValue(item, 'authorizationNumber') || 'Autorización sin número'}</span><span className="text-[11px] text-slate-500 dark:text-slate-400">{formatDate(fieldValue(item, 'validFrom'))} — {formatDate(fieldValue(item, 'validTo'))} · {fieldValue(item, 'remainingQuantity') ?? 0} restantes</span></div>)}</div></section>}
  </div>;
}

export default function MedicationsPage() {
  const { families: availableFamilies, selectedFamilyId: activeFamilyId, selectFamily } = useFamilies();
  const [searchParams] = useSearchParams();
  const targetMemberId = searchParams.get('memberId') || '';
  const targetPersonId = searchParams.get('personId') || '';
  const targetMedicationId = searchParams.get('medicationId') || '';
  const targetDeliveryId = searchParams.get('deliveryId') || '';
  const targetScheduleId = searchParams.get('scheduleId') || '';
  const targetTab = searchParams.get('tab') || 'resumen';
  const targetFamilyId = searchParams.get('familyId') || '';
  useEffect(() => {
    if (targetFamilyId && availableFamilies.some((family) => String(family.id) === String(targetFamilyId)) && String(activeFamilyId) !== String(targetFamilyId)) {
      selectFamily(targetFamilyId);
    }
  }, [targetFamilyId, availableFamilies, activeFamilyId, selectFamily]);

  const {
    families, selectedFamily, loadingFamilies, members, selectedMember, selectedMemberId, setSelectedMemberId,
    medications, selectedMedication, selectedMedicationId, setSelectedMedicationId, schedules, logs, processSummary,
    epsCompanies, loadingMembers, loadingMedications, loadingDetails, refreshing, error, clearError,
    canManageSelected, reloadMedications, reloadDetails, reloadEverything,
  } = useMedications({ initialMemberId: targetMemberId, initialPersonId: targetPersonId, initialMedicationId: targetMedicationId });
  const [activeTab, setActiveTab] = useState(() => TABS.some((tab) => tab.id === targetTab) ? targetTab : 'resumen');
  useEffect(() => {
    setActiveTab(TABS.some((tab) => tab.id === targetTab) ? targetTab : 'resumen');
  }, [targetTab]);
  const [actionBusy, setActionBusy] = useState('');
  const [medicationModalMode, setMedicationModalMode] = useState(null);
  const [scheduleModalMode, setScheduleModalMode] = useState(null);
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [logModalMode, setLogModalMode] = useState(null);
  const [currentLog, setCurrentLog] = useState(null);
  const [authorizationModalMode, setAuthorizationModalMode] = useState(null);
  const [currentAuthorization, setCurrentAuthorization] = useState(null);
  const [collectingDelivery, setCollectingDelivery] = useState(null);

  const activeSchedules = useMemo(() => schedules.filter((schedule) => fieldValue(schedule, 'isActive') !== false), [schedules]);
  const activeTreatments = medications.filter((medication) => fieldValue(medication, 'clinicalStatus') === 'ACTIVO').length;
  const needsAttention = medications.filter((medication) => ['REQUIERE_RENOVACION', 'AUTORIZACION_EN_PROCESO', 'SIN_AUTORIZACION_VIGENTE'].includes(fieldValue(medication, 'managementStatus'))).length;
  const readyForPickup = medications.filter((medication) => fieldValue(medication, 'managementStatus') === 'LISTO_PARA_RECOGER').length;
  const medicationStatus = fieldValue(selectedMedication, 'clinicalStatus') || 'ACTIVO';
  const managementStatus = fieldValue(selectedMedication, 'managementStatus') || 'SIN_TRAMITE';
  const sortedLogs = [...logs].sort((a, b) => new Date(fieldValue(b, 'scheduledAt') || 0) - new Date(fieldValue(a, 'scheduledAt') || 0));
  const deliveries = [...(processSummary?.deliveries || [])].sort((a, b) => new Date(fieldValue(b, 'scheduledDate') || 0) - new Date(fieldValue(a, 'scheduledDate') || 0));
  const processHistory = processSummary?.history || [];

  useEffect(() => {
    if (loadingDetails || !selectedMedicationId || activeTab !== targetTab) return;
    const targetId = targetDeliveryId ? `delivery-${targetDeliveryId}` : targetScheduleId ? `schedule-${targetScheduleId}` : '';
    if (!targetId) return;
    const element = document.getElementById(targetId);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [loadingDetails, selectedMedicationId, activeTab, targetTab, targetDeliveryId, targetScheduleId, deliveries, schedules]);

  function openMedicationForm(mode, medication = null) {
    setSelectedMedicationId(medication?.id || selectedMedicationId);
    setMedicationModalMode(mode);
  }
  function openScheduleForm(mode, schedule = null) {
    setCurrentSchedule(schedule);
    setScheduleModalMode(mode);
  }
  function openLogForm(mode, log = null) {
    setCurrentLog(log);
    setLogModalMode(mode);
  }
  function openAuthorizationForm(mode, authorization = null) {
    setCurrentAuthorization(authorization);
    setAuthorizationModalMode(mode);
  }

  async function handleMedicationSave(payload) {
    try {
      setActionBusy('medication-save');
      const saved = medicationModalMode === 'edit'
        ? await updateMedication(selectedMemberId, selectedMedication?.id, payload)
        : await createMedication(selectedMemberId, payload);
      setMedicationModalMode(null);
      notify.success(medicationModalMode === 'edit' ? 'Medicamento actualizado.' : 'Medicamento creado.');
      await reloadEverything(saved?.id || selectedMedicationId);
    } catch (requestError) {
      notify.error(errorMessage(requestError));
      throw requestError;
    } finally {
      setActionBusy('');
    }
  }

  async function handleMedicationDelete(medication) {
    const confirmation = await confirmAction({
      title: '¿Eliminar este medicamento?',
      text: `Se ocultará “${fieldValue(medication, 'name')}” de la lista activa. El backend conserva el registro mediante eliminación lógica.`,
      confirmButtonText: 'Eliminar medicamento', cancelButtonText: 'Conservar', icon: 'warning',
    });
    if (!confirmation.isConfirmed) return;
    setActionBusy('medication-delete');
    try {
      await deleteMedication(selectedMemberId, medication.id);
      notify.success('Medicamento eliminado de la lista.');
      await reloadEverything(selectedMedicationId === medication.id ? '' : selectedMedicationId);
    } catch (requestError) {
      notify.error(errorMessage(requestError));
    } finally {
      setActionBusy('');
    }
  }

  async function handleScheduleSave(payload) {
    try {
      setActionBusy('schedule-save');
      if (scheduleModalMode === 'edit') await updateSchedule(selectedMemberId, selectedMedicationId, currentSchedule.id, payload);
      else await createSchedule(selectedMemberId, selectedMedicationId, payload);
      setScheduleModalMode(null);
      setCurrentSchedule(null);
      notify.success(scheduleModalMode === 'edit' ? 'Horario actualizado.' : 'Horario creado.');
      await reloadDetails(selectedMedicationId);
    } catch (requestError) {
      notify.error(errorMessage(requestError));
      throw requestError;
    } finally {
      setActionBusy('');
    }
  }

  async function handleScheduleDelete(schedule) {
    const confirmation = await confirmAction({ title: '¿Desactivar este horario?', text: 'Las tomas registradas se conservan en el historial.', confirmButtonText: 'Desactivar horario', cancelButtonText: 'Cancelar', icon: 'warning' });
    if (!confirmation.isConfirmed) return;
    setActionBusy(`schedule-${schedule.id}`);
    try {
      await deleteSchedule(selectedMemberId, selectedMedicationId, schedule.id);
      notify.success('Horario desactivado.');
      await reloadDetails(selectedMedicationId);
    } catch (requestError) {
      notify.error(errorMessage(requestError));
    } finally {
      setActionBusy('');
    }
  }

  async function handleLogSave(payload) {
    try {
      setActionBusy('log-save');
      if (logModalMode === 'edit') await updateMedicationLog(selectedMemberId, selectedMedicationId, currentLog.id, payload);
      else await createMedicationLog(selectedMemberId, selectedMedicationId, payload);
      setLogModalMode(null);
      setCurrentLog(null);
      notify.success(logModalMode === 'edit' ? 'Registro de toma actualizado.' : 'Toma registrada en el historial.');
      await reloadDetails(selectedMedicationId);
    } catch (requestError) {
      notify.error(errorMessage(requestError));
      throw requestError;
    } finally {
      setActionBusy('');
    }
  }

  async function runProcessAction(actionKey, request, successMessage) {
    setActionBusy(actionKey);
    try {
      await request();
      notify.success(successMessage);
      await reloadEverything(selectedMedicationId);
    } catch (requestError) {
      notify.error(errorMessage(requestError));
    } finally {
      setActionBusy('');
    }
  }

  async function handleAuthorizationSave(payload) {
    try {
      setActionBusy('authorization-save');
      if (authorizationModalMode === 'edit') {
        await updateAuthorization(selectedMemberId, selectedMedicationId, currentAuthorization.id, payload);
      } else if (authorizationModalMode === 'renewal') {
        await renewAuthorization(selectedMemberId, selectedMedicationId, payload);
      } else {
        await createAuthorization(selectedMemberId, selectedMedicationId, payload);
      }
      const savedMode = authorizationModalMode;
      setAuthorizationModalMode(null);
      setCurrentAuthorization(null);
      notify.success(savedMode === 'edit' ? 'Autorización actualizada.' : savedMode === 'renewal' ? 'Renovación registrada y entrega generada.' : 'Autorización registrada y primera entrega generada.');
      await reloadEverything(selectedMedicationId);
    } catch (requestError) {
      notify.error(errorMessage(requestError));
      throw requestError;
    } finally {
      setActionBusy('');
    }
  }

  async function handleAuthorizationCancel() {
    const authorization = processSummary?.currentAuthorization;
    if (!authorization) return;
    const confirmation = await confirmAction({ title: '¿Anular esta autorización?', text: 'Se anulará la autorización y, si existe, su entrega abierta. Esta operación quedará en el historial.', confirmButtonText: 'Anular autorización', cancelButtonText: 'Conservar', icon: 'warning' });
    if (!confirmation.isConfirmed) return;
    const reason = window.prompt('Motivo de la anulación (opcional):');
    if (reason === null) return;
    await runProcessAction('authorization-cancel', () => cancelAuthorization(selectedMemberId, selectedMedicationId, authorization.id, { reason: reason.trim() || null }), 'Autorización anulada.');
  }

  async function handleCollectDelivery(payload) {
    try {
      setActionBusy('delivery-collect');
      await collectMedicationDelivery(selectedMemberId, selectedMedicationId, collectingDelivery.id, payload);
      setCollectingDelivery(null);
      notify.success('Recogida registrada. El siguiente ciclo se calculó desde la fecha real de recogida.');
      await reloadEverything(selectedMedicationId);
    } catch (requestError) {
      notify.error(errorMessage(requestError));
      throw requestError;
    } finally {
      setActionBusy('');
    }
  }

  if (loadingFamilies && families.length === 0) return <div className="surface-card h-64 animate-pulse" aria-label="Cargando familias" />;
  if (families.length === 0 && !loadingFamilies) return <EmptyState icon={UsersRound} title="Primero crea o únete a una familia" description="Los medicamentos se administran dentro de un espacio personal o familiar. Puedes crear tu espacio desde Mi familia." action={<Link to="/familia" className="primary-button">Ir a Mi familia</Link>} />;

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">Tratamientos y acceso a medicamentos</p><h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Medicamentos y trámites</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">Organiza tratamientos, registra las tomas y sigue autorizaciones, renovaciones y recogidas desde el mismo lugar.</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => reloadEverything(selectedMedicationId).catch(() => {})} disabled={refreshing || !selectedMemberId}><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Actualizar</Button>{canManageSelected && <Button onClick={() => openMedicationForm('create')} disabled={!selectedMemberId}><Plus size={16} /> Nuevo medicamento</Button>}</div>
    </header>

    <section className="surface-card grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
      <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Familia o espacio</span><div className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><UsersRound size={16} className="text-brand-600" />{selectedFamily?.name || 'Selecciona una familia'}</div></label>
      <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Perfil clínico</span><select className="form-input" value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)} disabled={loadingMembers || members.length === 0}><option value="">{loadingMembers ? 'Cargando perfiles…' : 'No hay perfiles activos'}</option>{members.map((member) => <option key={member.id} value={member.id}>{memberFullName(member)}</option>)}</select></label>
    </section>

    {selectedMember && <section className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 p-4 dark:border-brand-900/70 dark:bg-brand-950/25 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-200"><ShieldCheck size={19} /></span><div><p className="text-sm font-bold text-slate-900 dark:text-white">Tratamientos de {memberFullName(selectedMember)}</p><p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{canManageSelected ? 'Puedes gestionar la información de este perfil según tus permisos.' : 'Tienes permiso de consulta para este perfil.'}</p></div></div>{!canManageSelected && <span className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">Solo lectura</span>}</section>}

    <InlineError message={error} onClose={clearError} />

    <section className="grid gap-3 sm:grid-cols-3">
      <div className="surface-card flex items-center gap-3 p-4"><span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200"><Pill size={18} /></span><div><p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Medicamentos activos</p><p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{activeTreatments}<span className="ml-1 text-xs font-semibold text-slate-400">/ {medications.length}</span></p></div></div>
      <div className="surface-card flex items-center gap-3 p-4"><span className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200"><RefreshCw size={18} /></span><div><p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Requieren atención</p><p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{needsAttention}</p></div></div>
      <div className="surface-card flex items-center gap-3 p-4"><span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"><PackageCheck size={18} /></span><div><p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Listos para recoger</p><p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{readyForPickup}</p></div></div>
    </section>

    <section className="space-y-4">
      <SectionHeading eyebrow="Tu lista de tratamientos" title="Medicamentos" description="Selecciona un medicamento para consultar sus horarios, tomas y proceso de entrega." action={medications.length > 0 && canManageSelected ? <Button onClick={() => openMedicationForm('create')}><Plus size={15} /> Agregar</Button> : null} />
      {loadingMembers || loadingMedications ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="surface-card h-48 animate-pulse" />)}</div> : medications.length === 0 ? <EmptyState icon={Pill} title="Todavía no hay medicamentos" description={canManageSelected ? 'Agrega el primer medicamento para comenzar a organizar el tratamiento y sus horarios.' : 'Cuando se registren medicamentos para este perfil, aparecerán aquí.'} action={canManageSelected ? <Button onClick={() => openMedicationForm('create')}><Plus size={16} /> Registrar medicamento</Button> : null} /> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{medications.map((medication) => <MedicationCard key={medication.id} medication={medication} selected={String(medication.id) === String(selectedMedicationId)} canManage={canManageSelected} onSelect={() => { setSelectedMedicationId(medication.id); setActiveTab('resumen'); }} onEdit={() => openMedicationForm('edit', medication)} onDelete={() => handleMedicationDelete(medication)} />)}</div>}
    </section>

    {selectedMedication && <section className="space-y-4">
      <div className="surface-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between sm:p-5"><div className="flex items-start gap-3"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm shadow-brand-500/20"><Pill size={22} /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-700 dark:text-brand-300">Medicamento seleccionado</p><h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{fieldValue(selectedMedication, 'name')}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{doseLabel(selectedMedication)}{fieldValue(selectedMedication, 'presentation') ? ` · ${fieldValue(selectedMedication, 'presentation')}` : ''}</p></div></div><div className="flex flex-wrap gap-2"><StatusPill status={medicationStatus} label={CLINICAL_STATUSES.find(([key]) => key === medicationStatus)?.[1] || medicationStatus} className={medicationStatusTone(medicationStatus)} /><StatusPill status={managementStatus} label={MANAGEMENT_STATUSES[managementStatus] || managementStatus} className={managementStatusTone(managementStatus)} /></div></div>
        <div className="flex gap-1 overflow-x-auto px-3 pt-3 sm:px-5">{TABS.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-t-xl border-b-2 px-3 py-3 text-xs font-bold transition sm:px-4 ${activeTab === id ? 'border-brand-500 bg-brand-50/70 text-brand-700 dark:bg-brand-950/30 dark:text-brand-200' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'}`}><Icon size={15} />{label}</button>)}</div>
        <div className="p-4 sm:p-5">
          {activeTab === 'resumen' && <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Indicaciones del tratamiento</h3>{canManageSelected && <button type="button" onClick={() => openMedicationForm('edit', selectedMedication)} className="text-[11px] font-bold text-brand-700 hover:underline dark:text-brand-300">Editar datos</button>}</div><p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-300">{fieldValue(selectedMedication, 'instructions') || 'Todavía no se han agregado indicaciones.'}</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><InfoLine icon={CalendarClock} label="Inicio del tratamiento" value={formatDate(fieldValue(selectedMedication, 'startDate'))} /><InfoLine icon={Clock3} label="Finalización" value={formatDate(fieldValue(selectedMedication, 'endDate'), 'Sin fecha definida')} /><InfoLine icon={Pill} label="Presentación" value={fieldValue(selectedMedication, 'presentation')} /><InfoLine icon={Sparkles} label="Tipo de tratamiento" value={medicationStatus === 'OCASIONAL' ? 'Uso ocasional' : medicationStatus === 'PAUSADO' ? 'Pausado temporalmente' : medicationStatus === 'FINALIZADO' ? 'Tratamiento finalizado' : 'Tratamiento activo'} /></div></section>
            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Horarios configurados</h3><button type="button" onClick={() => setActiveTab('horarios')} className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:underline dark:text-brand-300">Ver horarios <ArrowUpRight size={13} /></button></div>{loadingDetails ? <div className="mt-4 h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" /> : activeSchedules.length === 0 ? <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-900 dark:text-slate-400">No hay horarios activos. {canManageSelected ? 'Puedes crear uno para organizar las tomas.' : ''}</p> : <div className="mt-3 space-y-2">{activeSchedules.slice(0, 3).map((schedule) => <div key={schedule.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><span className="flex size-9 items-center justify-center rounded-lg bg-white text-brand-700 dark:bg-slate-800 dark:text-brand-200"><Clock3 size={15} /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-800 dark:text-slate-100">{scheduleDescription(schedule)}</p><p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{String(fieldValue(schedule, 'hour') || 'Sin hora fija').slice(0, 5)}</p></div></div>)}</div>}{canManageSelected && <Button className="mt-3 w-full" variant="secondary" onClick={() => openScheduleForm('create')}><Plus size={14} /> Añadir horario</Button>}</section>
            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 xl:col-span-2"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Últimas tomas</h3><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Los registros ayudan a llevar seguimiento del tratamiento.</p></div>{canManageSelected && <Button onClick={() => openLogForm('create')}><Plus size={14} /> Registrar toma</Button>}</div><div className="mt-3 space-y-2">{sortedLogs.slice(0, 3).map((log) => <MedicationLogRow key={log.id} log={log} canManage={canManageSelected} onEdit={() => openLogForm('edit', log)} />)}{sortedLogs.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">No hay tomas registradas todavía.</p>}</div>{sortedLogs.length > 3 && <button type="button" onClick={() => setActiveTab('horarios')} className="mt-3 text-[11px] font-bold text-brand-700 hover:underline dark:text-brand-300">Ver todo el historial de tomas</button>}</section>
            </div>}

          {activeTab === 'horarios' && <div className="space-y-6">
            <SectionHeading title="Horarios del medicamento" description="Puedes configurar horarios diarios, por días de la semana, por intervalo, mensuales o según necesidad." action={canManageSelected ? <Button onClick={() => openScheduleForm('create')}><Plus size={15} /> Nuevo horario</Button> : null} />
            {loadingDetails ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="surface-card h-48 animate-pulse" />)}</div> : activeSchedules.length === 0 ? <EmptyState icon={CalendarClock} title="No hay horarios activos" description={canManageSelected ? 'Crea un horario para mantener organizadas las tomas de este medicamento.' : 'Este medicamento todavía no tiene horarios registrados.'} action={canManageSelected ? <Button onClick={() => openScheduleForm('create')}><Plus size={15} /> Crear horario</Button> : null} /> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{activeSchedules.map((schedule) => <ScheduleCard key={schedule.id} schedule={schedule} target={String(schedule.id) === String(targetScheduleId)} canManage={canManageSelected} onEdit={() => openScheduleForm('edit', schedule)} onDelete={() => handleScheduleDelete(schedule)} />)}</div>}
            <div className="border-t border-slate-100 pt-5 dark:border-slate-800"><SectionHeading title="Registro de tomas" description="Registra si la dosis fue tomada, olvidada, omitida o tomada con retraso." action={canManageSelected ? <Button onClick={() => openLogForm('create')}><Plus size={15} /> Registrar toma</Button> : null} /><div className="mt-3 space-y-2">{sortedLogs.map((log) => <MedicationLogRow key={log.id} log={log} canManage={canManageSelected} onEdit={() => openLogForm('edit', log)} />)}{sortedLogs.length === 0 && <EmptyState icon={Clock3} title="Sin tomas registradas" description="Aquí aparecerán los registros de seguimiento de este medicamento." action={canManageSelected ? <Button onClick={() => openLogForm('create')}><Plus size={15} /> Registrar primera toma</Button> : null} />}</div></div>
          </div>}

          {activeTab === 'tramites' && <div className="space-y-6">
            <SectionHeading eyebrow="Autorizaciones y renovaciones" title="Estado del trámite" description="La autorización genera la primera entrega. Después, el sistema calcula los ciclos según la periodicidad y la fecha real de recogida." />
            {loadingDetails ? <div className="surface-card h-48 animate-pulse" /> : <AuthorizationPanel summary={processSummary} canManage={canManageSelected} busy={Boolean(actionBusy)} onRequest={() => runProcessAction('authorization-request', () => requestMedicationAuthorization(selectedMemberId, selectedMedicationId, {}), 'Solicitud de autorización registrada.')} onCreate={() => openAuthorizationForm('create')} onEdit={() => openAuthorizationForm('edit', processSummary?.currentAuthorization)} onRenew={() => openAuthorizationForm('renewal', processSummary?.currentAuthorization)} onCancel={handleAuthorizationCancel} />}
            <div className="border-t border-slate-100 pt-5 dark:border-slate-800"><SectionHeading title="Entregas y recogidas" description="Marca cuando la farmacia no tenga existencias, cuando hayas gestionado la renovación o cuando realmente recojas el medicamento." /><div className="mt-4 grid gap-3 xl:grid-cols-2">{deliveries.map((delivery) => <DeliveryCard key={delivery.id} delivery={delivery} target={String(delivery.id) === String(targetDeliveryId)} canManage={canManageSelected} busy={Boolean(actionBusy)} onPendingPharmacy={() => runProcessAction(`delivery-pending-${delivery.id}`, () => markDeliveryPendingPharmacy(selectedMemberId, selectedMedicationId, delivery.id), 'Entrega marcada como pendiente por disponibilidad de farmacia.')} onConfirmRenewal={() => runProcessAction(`delivery-renewal-${delivery.id}`, () => confirmDeliveryRenewalManaged(selectedMemberId, selectedMedicationId, delivery.id), 'Renovación confirmada. La entrega quedó lista para recoger.')} onCollect={() => setCollectingDelivery(delivery)} />)}{deliveries.length === 0 && <div className="xl:col-span-2"><EmptyState icon={PackageCheck} title="Aún no hay entregas" description="Al registrar la autorización aprobada, la primera entrega aparecerá aquí automáticamente." /></div>}</div></div>
          </div>}

          {activeTab === 'historial' && <div className="space-y-6">
            <SectionHeading title="Historial de tomas" description="Eventos registrados para el tratamiento y las fechas en que se realizaron las tomas." />
            <div className="space-y-2">{sortedLogs.map((log) => <MedicationLogRow key={log.id} log={log} canManage={canManageSelected} onEdit={() => openLogForm('edit', log)} />)}{sortedLogs.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">No hay tomas registradas.</p>}</div>
            <div className="border-t border-slate-100 pt-5 dark:border-slate-800"><SectionHeading title="Historial de trámites" description="Solicitudes, autorizaciones, renovaciones y cambios de entrega generados por el backend." /><div className="mt-3 space-y-2">{processHistory.map((event, index) => <div key={event.id || `${fieldValue(event, 'eventType')}-${index}`} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/50"><span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200"><History size={15} /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-800 dark:text-slate-100">{humanizeEventType(fieldValue(event, 'eventType'))}</p>{fieldValue(event, 'notes') && <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{fieldValue(event, 'notes')}</p>}<p className="mt-1 text-[10px] text-slate-400">{formatDateTime(fieldValue(event, 'createdAt'))}</p></div></div>)}{processHistory.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">Aún no hay eventos del trámite.</p>}</div></div>
          </div>}

          {activeTab === 'avisos' && <div className="space-y-4">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-brand-700 dark:text-brand-300">Recordatorios personalizados</p><h3 className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">¿Quién debe recibir los avisos?</h3><p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Elige a los miembros con cuenta que también deben recibir notificaciones de tomas, renovaciones y entregas de este tratamiento.</p></div>
            <MedicationReminderRecipientsPanel memberId={selectedMemberId} medication={selectedMedication} members={members} canManage={canManageSelected} />
          </div>}
        </div>
      </div>
    </section>}

    {medicationModalMode && <MedicationFormModal key={`${medicationModalMode}-${selectedMedication?.id || 'new'}`} mode={medicationModalMode} medication={medicationModalMode === 'edit' ? selectedMedication : null} busy={actionBusy === 'medication-save'} onClose={() => { if (actionBusy !== 'medication-save') setMedicationModalMode(null); }} onSubmit={handleMedicationSave} />}
    {scheduleModalMode && <ScheduleFormModal key={`${scheduleModalMode}-${currentSchedule?.id || 'new'}`} mode={scheduleModalMode} schedule={currentSchedule} medication={selectedMedication} busy={actionBusy === 'schedule-save'} onClose={() => { if (actionBusy !== 'schedule-save') { setScheduleModalMode(null); setCurrentSchedule(null); } }} onSubmit={handleScheduleSave} />}
    {logModalMode && <MedicationLogModal key={`${logModalMode}-${currentLog?.id || 'new'}`} mode={logModalMode} log={currentLog} schedules={activeSchedules} busy={actionBusy === 'log-save'} onClose={() => { if (actionBusy !== 'log-save') { setLogModalMode(null); setCurrentLog(null); } }} onSubmit={handleLogSave} />}
    {authorizationModalMode && <AuthorizationFormModal key={`${authorizationModalMode}-${currentAuthorization?.id || 'new'}`} mode={authorizationModalMode} authorization={currentAuthorization} medication={selectedMedication} epsCompanies={epsCompanies} busy={actionBusy === 'authorization-save'} onClose={() => { if (actionBusy !== 'authorization-save') { setAuthorizationModalMode(null); setCurrentAuthorization(null); } }} onSubmit={handleAuthorizationSave} />}
    {collectingDelivery && <CollectDeliveryModal key={collectingDelivery.id} delivery={collectingDelivery} busy={actionBusy === 'delivery-collect'} onClose={() => { if (actionBusy !== 'delivery-collect') setCollectingDelivery(null); }} onSubmit={handleCollectDelivery} />}
  </div>;
}
