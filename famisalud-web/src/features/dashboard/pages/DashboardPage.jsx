import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileHeart,
  HeartPulse,
  PackageCheck,
  Pill,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TriangleAlert,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth.js';
import { useFamilies } from '../../../shared/hooks/useFamily.js';
import Button from '../../../shared/components/ui/Button.jsx';
import EmptyState from '../../../shared/components/ui/EmptyState.jsx';
import { notify } from '../../../shared/utils/feedback.js';
import { friendlyErrorMessage } from '../../../shared/utils/friendlyErrors.js';
import { createMedicationLog, updateMedicationLog, collectMedicationDelivery } from '../../medications/services/medicationsService.js';
import { updateAppointment } from '../../appointments/services/appointmentsService.js';
import { useNotificationsSummary } from '../../notifications/context/NotificationsContext.jsx';
import { getNotificationDestination, notificationIsUnread } from '../../notifications/utils/notificationUtils.js';
import { loadDashboardData } from '../services/dashboardService.js';
import DashboardActionModal from '../components/DashboardActionModal.jsx';
import {
  appointmentDestination,
  buildDashboardDestinations,
  buildTodayDoseTasks,
  buildWeeklyAdherence,
  fieldValue,
  formatDashboardDate,
  linkedUserId,
  memberName,
  todayDateKey,
} from '../utils/dashboardUtils.js';

const CARD_TONES = {
  teal: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200',
  blue: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-200',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200',
};

function InlineNotice({ tone = 'warning', children }) {
  const classes = tone === 'warning'
    ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200'
    : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-200';
  return <div role="status" className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs leading-relaxed ${classes}`}><TriangleAlert size={16} className="mt-0.5 shrink-0"/><div>{children}</div></div>;
}

function SectionHeading({ eyebrow, title, action, to }) {
  return <div className="mb-4 flex items-end justify-between gap-3"><div>{eyebrow && <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">{eyebrow}</p>}<h2 className="mt-1 font-display text-base font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-lg">{title}</h2></div>{action && <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-brand-700 transition hover:text-brand-900 dark:text-brand-300">{action}<ArrowRight size={14}/></Link>}</div>;
}

function MetricCard({ label, value, note, icon: Icon, tone, to }) {
  const content = <div className="surface-card h-full p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"><div className="flex items-start justify-between gap-3"><span className={`flex size-11 items-center justify-center rounded-2xl ${CARD_TONES[tone]}`}><Icon size={20}/></span>{to && <ArrowUpRight size={15} className="text-slate-300"/>}</div><p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{value}</p><p className="mt-2 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">{note}</p></div>;
  return to ? <Link to={to} className="block">{content}</Link> : content;
}

function LoadingCards() {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="surface-card h-36 animate-pulse bg-slate-100 dark:bg-slate-900"/>)}</div>;
}

function personCanManage(member, selectedFamily, userId) {
  const role = String(selectedFamily?.role || selectedFamily?.my_role || '').toUpperCase();
  return role === 'ADMINISTRADOR' || (linkedUserId(member) && String(linkedUserId(member)) === String(userId));
}

function getDeliveryStatus(delivery) {
  return String(fieldValue(delivery, 'status') || '').toUpperCase();
}

function getAppointmentStatus(appointment) {
  return String(fieldValue(appointment, 'status') || '').toUpperCase();
}

function isDateReached(value) {
  if (!value) return true;
  return String(value).slice(0, 10) <= todayDateKey();
}

function formatHour(value) {
  if (!value) return 'Sin hora';
  const parts = String(value).slice(0, 5).split(':').map(Number);
  if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part))) return String(value).slice(0, 5);
  const date = new Date();
  date.setHours(parts[0], parts[1], 0, 0);
  return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function AppointmentRow({ item, familyId, canManage, onAttendance }) {
  const appointment = item.appointment;
  const start = fieldValue(appointment, 'startsAt', 'starts_at');
  const status = getAppointmentStatus(appointment);
  const isPastPending = new Date(start).getTime() <= Date.now() && ['PROGRAMADA', 'REPROGRAMADA'].includes(status);
  return <article className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800 sm:flex-row sm:items-center"><span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200"><CalendarClock size={17}/></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-100">{fieldValue(appointment, 'title') || 'Cita médica'}</p><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{memberName(item.member)} · {formatDashboardDate(start, { dateStyle: 'medium', timeStyle: 'short' })}</p>{fieldValue(appointment, 'location') && <p className="mt-1 truncate text-[10px] text-slate-400">{fieldValue(appointment, 'location')}</p>}</div><div className="flex flex-wrap gap-2 sm:justify-end"><Link to={appointmentDestination(item.member, familyId, appointment)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"><Stethoscope size={13}/> Gestionar</Link>{canManage && isPastPending && <Button className="min-h-9 px-3 py-2 text-[10px]" onClick={() => onAttendance(item)}><CalendarCheck size={13}/> Registrar asistencia</Button>}</div></article>;
}

function DoseRow({ task, familyId, canManage, onTake }) {
  const medicationPath = buildDashboardDestinations(task.member, familyId, task.medication, { tab: 'horarios', scheduleId: task.schedule.id, recordTake: true });
  return <article className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800 sm:flex-row sm:items-center"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200"><Pill size={17}/></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-100">{fieldValue(task.medication, 'name')}</p><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{memberName(task.member)} · {formatHour(fieldValue(task.schedule, 'hour'))}</p><p className="mt-1 text-[10px] text-slate-400">{task.existingLog ? 'Hay un registro pendiente de completar' : 'Horario de hoy'}</p></div><div className="flex flex-wrap gap-2"><Link to={medicationPath} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">Ver medicamento</Link>{canManage && <Button className="min-h-9 px-3 py-2 text-[10px]" onClick={() => onTake(task)}><CheckCircle2 size={13}/>{task.existingLog ? 'Actualizar toma' : 'Registrar toma'}</Button>}</div></article>;
}

function DeliveryRow({ item, familyId, canManage, onCollect }) {
  const { member, medication, delivery } = item;
  const status = getDeliveryStatus(delivery);
  const scheduledDate = fieldValue(delivery, 'scheduledDate', 'scheduled_date');
  const canCollect = ['LISTO_PARA_RECOGER', 'PENDIENTE_FARMACIA'].includes(status) && isDateReached(scheduledDate);
  const path = buildDashboardDestinations(member, familyId, medication, { tab: 'tramites', deliveryId: delivery.id });
  return <article className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800 sm:flex-row sm:items-center"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${status === 'RENOVACION_PENDIENTE' ? CARD_TONES.amber : CARD_TONES.emerald}`}>{status === 'RENOVACION_PENDIENTE' ? <RefreshCw size={17}/> : <PackageCheck size={17}/>}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-100">{fieldValue(medication, 'name')}</p><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{memberName(member)} · {status === 'RENOVACION_PENDIENTE' ? 'Renovación pendiente' : `Fecha: ${formatDashboardDate(scheduledDate)}`}</p>{fieldValue(delivery, 'pharmacyName', 'pharmacy_name') && <p className="mt-1 truncate text-[10px] text-slate-400">{fieldValue(delivery, 'pharmacyName', 'pharmacy_name')}</p>}</div><div className="flex flex-wrap gap-2"><Link to={path} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">Gestionar trámite</Link>{canManage && canCollect && <Button className="min-h-9 px-3 py-2 text-[10px]" onClick={() => onCollect(item)}><PackageCheck size={13}/> Registrar recogida</Button>}</div></article>;
}

function WeeklyAdherenceChart({ stats }) {
  return <section className="surface-card p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">Seguimiento</p><h2 className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">Tomas de los últimos 7 días</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Solo incluye tomas con un resultado registrado.</p></div><div className="rounded-2xl bg-brand-50 px-3 py-2 text-right dark:bg-brand-950/40"><p className="font-display text-2xl font-extrabold text-brand-700 dark:text-brand-200">{stats.percent === null ? '—' : `${stats.percent}%`}</p><p className="text-[9px] font-bold text-brand-700/70 dark:text-brand-300/70">Cumplimiento</p></div></div>
    {stats.recorded === 0 ? <div className="mt-5 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-slate-800"><Activity className="mx-auto text-slate-300" size={26}/><p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">Aún no hay datos para la gráfica</p><p className="mt-1 text-[11px] text-slate-400">Cuando se registren tomas, verás el seguimiento de la semana aquí.</p></div> : <div className="mt-5 flex h-44 items-end gap-2 sm:gap-3">{stats.days.map((day) => <div key={day.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><div className="flex h-32 w-full items-end justify-center rounded-t-lg bg-slate-50 px-1 dark:bg-slate-900">{day.recorded > 0 && <div className="relative flex w-full max-w-8 items-end justify-center overflow-hidden rounded-t-md bg-brand-100 dark:bg-brand-950" style={{ height: `${Math.max(10, (day.recorded / Math.max(...stats.days.map((entry) => entry.recorded), 1)) * 100)}%` }}><div className="absolute bottom-0 w-full rounded-t-md bg-brand-500 dark:bg-brand-400" style={{ height: `${day.percent}%` }} /></div>}</div><span className="text-[10px] font-semibold capitalize text-slate-500 dark:text-slate-400">{day.label}</span><span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{day.recorded ? `${day.percent}%` : '—'}</span></div>)}</div>}
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-500 dark:text-slate-400"><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-brand-500"/>Tomadas o retrasadas</span><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-brand-100 dark:bg-brand-950"/>Omitidas o no realizadas</span><span className="ml-auto font-semibold">{stats.completed} de {stats.recorded} registradas</span></div>
  </section>;
}

function RecentNotices({ notices, onOpen }) {
  return <section className="surface-card p-5 sm:p-6"><SectionHeading eyebrow="Para tener presente" title="Avisos recientes" action="Ver todas" to="/notificaciones"/>{notices.length === 0 ? <div className="rounded-xl bg-slate-50 px-4 py-6 text-center dark:bg-slate-900"><BellRing className="mx-auto text-slate-300" size={22}/><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">No tienes avisos recientes.</p></div> : <div className="space-y-1">{notices.slice(0, 4).map((notice) => <button type="button" key={notice.id} onClick={() => onOpen(notice)} className="flex w-full items-start gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900"><span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${notificationIsUnread(notice) ? CARD_TONES.teal : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}><BellRing size={15}/></span><span className="min-w-0 flex-1"><span className={`block text-xs leading-relaxed ${notificationIsUnread(notice) ? 'font-extrabold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>{notice.title || 'Aviso de FamiSalud'}</span>{notice.body && <span className="mt-1 line-clamp-2 block text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">{notice.body}</span>}<span className="mt-1.5 block text-[9px] text-slate-400">{formatDashboardDate(notice.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</span></span><ChevronRight size={15} className="mt-1 shrink-0 text-slate-300"/></button>)}</div>}</section>;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { families, selectedFamily, selectedFamilyId, loadingFamilies, familyError } = useFamilies();
  const { markRead } = useNotificationsSummary();
  const [data, setData] = useState({ members: [], notices: [], errors: [] });
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const requestIdRef = useRef(0);
  const selectedFamilyIdRef = useRef(selectedFamilyId);
  selectedFamilyIdRef.current = selectedFamilyId;

  const refreshDashboard = useCallback(async ({ quiet = false } = {}) => {
    const familyId = selectedFamilyIdRef.current;
    const requestId = ++requestIdRef.current;
    if (!familyId) {
      setData({ members: [], notices: [], errors: [] });
      setGlobalError('');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (quiet) setRefreshing(true);
    else {
      setLoading(true);
      setData({ members: [], notices: [], errors: [] });
    }
    setGlobalError('');
    try {
      const result = await loadDashboardData(familyId);
      if (requestId === requestIdRef.current) setData(result);
    } catch (error) {
      if (requestId === requestIdRef.current) setGlobalError(friendlyErrorMessage(error));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    refreshDashboard();
    return () => { requestIdRef.current += 1; };
  }, [selectedFamilyId, refreshDashboard]);

  useEffect(() => { setActiveAction(null); }, [selectedFamilyId]);

  const allAppointments = useMemo(() => data.members.flatMap((item) => item.appointments.map((appointment) => ({ member: item.member, appointment }))), [data.members]);
  const allMedicationDetails = useMemo(() => data.members.flatMap((item) => item.medications.map((detail) => ({ ...detail, member: item.member }))), [data.members]);
  const doseTasks = useMemo(() => buildTodayDoseTasks(data.members), [data.members]);
  const weeklyStats = useMemo(() => buildWeeklyAdherence(data.members), [data.members]);
  const now = Date.now();
  const allUpcomingAppointments = useMemo(() => allAppointments.filter(({ appointment }) => {
    const startsAt = new Date(fieldValue(appointment, 'startsAt', 'starts_at')).getTime();
    return startsAt >= now && ['PROGRAMADA', 'REPROGRAMADA'].includes(getAppointmentStatus(appointment));
  }).sort((a, b) => new Date(fieldValue(a.appointment, 'startsAt', 'starts_at')) - new Date(fieldValue(b.appointment, 'startsAt', 'starts_at'))), [allAppointments, now]);
  const upcomingAppointments = allUpcomingAppointments.slice(0, 5);
  const pendingAttendance = useMemo(() => allAppointments.filter(({ appointment }) => {
    const startsAt = new Date(fieldValue(appointment, 'startsAt', 'starts_at')).getTime();
    return startsAt <= now && startsAt >= now - 14 * 86_400_000 && ['PROGRAMADA', 'REPROGRAMADA'].includes(getAppointmentStatus(appointment));
  }).sort((a, b) => new Date(fieldValue(b.appointment, 'startsAt', 'starts_at')) - new Date(fieldValue(a.appointment, 'startsAt', 'starts_at'))), [allAppointments, now]);

  const deliveryItems = useMemo(() => allMedicationDetails.flatMap((detail) => (fieldValue(detail.processSummary, 'deliveries') || []).map((delivery) => ({ ...detail, delivery }))).filter(({ delivery }) => ['LISTO_PARA_RECOGER', 'PENDIENTE_FARMACIA'].includes(getDeliveryStatus(delivery))).sort((a, b) => String(fieldValue(a.delivery, 'scheduledDate', 'scheduled_date') || '').localeCompare(String(fieldValue(b.delivery, 'scheduledDate', 'scheduled_date') || ''))), [allMedicationDetails]);
  const renewalItems = useMemo(() => {
    const fromDeliveries = allMedicationDetails.flatMap((detail) => (fieldValue(detail.processSummary, 'deliveries') || []).filter((delivery) => getDeliveryStatus(delivery) === 'RENOVACION_PENDIENTE').map((delivery) => ({ ...detail, delivery })));
    const withDeliveryIds = new Set(fromDeliveries.map(({ medication }) => medication.id));
    const fromMedicationStatus = allMedicationDetails.filter(({ medication }) => String(fieldValue(medication, 'managementStatus', 'management_status') || '').toUpperCase() === 'REQUIERE_RENOVACION' && !withDeliveryIds.has(medication.id)).map((detail) => ({ ...detail, delivery: null }));
    return [...fromDeliveries, ...fromMedicationStatus];
  }, [allMedicationDetails]);
  const activeTreatments = allMedicationDetails.filter(({ medication }) => ['ACTIVO', 'OCASIONAL'].includes(String(fieldValue(medication, 'clinicalStatus', 'clinical_status') || '').toUpperCase())).length;
  const recordedToday = allMedicationDetails.flatMap(({ logs }) => logs).filter((log) => localDateForLog(log) === todayDateKey() && String(fieldValue(log, 'status') || '').toUpperCase() !== 'PENDIENTE').length;
  const attentionCount = renewalItems.length + deliveryItems.length + pendingAttendance.length;
  const canManage = (member) => personCanManage(member, selectedFamily, user?.id);

  async function handleNoticeOpen(notice) {
    try {
      if (notificationIsUnread(notice)) await markRead(notice.id);
    } catch { /* La navegación no depende de que el cambio de lectura responda. */ }
    navigate(getNotificationDestination(notice));
  }

  async function handleTake(payload) {
    const target = activeAction?.target;
    if (!target) return;
    setActionBusy(true);
    try {
      const { existingLogId, ...body } = payload;
      if (existingLogId) await updateMedicationLog(target.member.id, target.medication.id, existingLogId, body);
      else await createMedicationLog(target.member.id, target.medication.id, body);
      notify.success('La toma quedó registrada.');
      setActiveAction(null);
      await refreshDashboard({ quiet: true });
    } finally {
      setActionBusy(false);
    }
  }

  async function handlePickup(payload) {
    const target = activeAction?.target;
    if (!target) return;
    setActionBusy(true);
    try {
      await collectMedicationDelivery(target.member.id, target.medication.id, target.delivery.id, payload);
      notify.success('La recogida quedó registrada. El siguiente ciclo se actualizará con la fecha real.');
      setActiveAction(null);
      await refreshDashboard({ quiet: true });
    } finally {
      setActionBusy(false);
    }
  }

  async function handleAttendance(payload) {
    const target = activeAction?.target;
    if (!target) return;
    setActionBusy(true);
    try {
      await updateAppointment(target.member.id, target.appointment.id, { status: payload.status });
      notify.success(payload.status === 'COMPLETADA' ? 'La asistencia quedó registrada.' : 'La cita quedó marcada como no asistida.');
      setActiveAction(null);
      await refreshDashboard({ quiet: true });
    } finally {
      setActionBusy(false);
    }
  }

  if (loadingFamilies && families.length === 0) return <div className="space-y-5"><div className="surface-card h-48 animate-pulse"/><LoadingCards/></div>;
  if (families.length === 0 && !loadingFamilies) return <EmptyState icon={UsersRound} title="Tu espacio familiar comienza aquí" description="Crea una familia o acepta una invitación para empezar a organizar citas, medicamentos y seguimientos." action={<Link to="/familia" className="primary-button">Ir a Mi familia</Link>}/>;

  const firstName = user?.firstName || user?.first_name || user?.person?.firstName || user?.person?.first_name || '';
  const todayText = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className="space-y-6 pb-10 sm:space-y-7">
      <header className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-[#218C9A] via-[#2596A6] to-[#347A9E] px-5 py-6 text-white shadow-xl shadow-brand-900/10 sm:px-8 sm:py-8 lg:px-9">
        <div className="absolute -right-16 -top-20 size-64 rounded-full border-38 border-white/[0.07]"/><div className="absolute -bottom-24 right-[25%] size-48 rounded-full border-28 border-white/6"/>
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold tracking-wide text-white/90"><Sparkles size={13}/> CUIDADO QUE NOS UNE</span><h1 className="mt-4 font-display text-[27px] font-extrabold leading-tight tracking-tight sm:text-[34px]">{firstName ? `Hola, ${firstName}.` : 'La salud de tu familia,'}<br className="hidden sm:block"/> {firstName ? 'Tu familia, al día.' : 'en un solo lugar.'}</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80">Un resumen claro de las citas, medicamentos y trámites que necesitan tu atención. {selectedFamily?.name ? `Espacio: ${selectedFamily.name}.` : ''}</p><p className="mt-2 text-[11px] font-semibold capitalize text-white/75">{todayText}</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" className="border-white/30! bg-white/10! text-white! hover:bg-white/20!" onClick={() => refreshDashboard()} disabled={loading || refreshing}><RefreshCw size={14} className={refreshing || loading ? 'animate-spin' : ''}/> Actualizar datos</Button><Link to="/familia" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-brand-800 shadow-sm transition hover:bg-brand-50">Mi familia <ArrowRight size={14}/></Link></div></div>
        <div className="relative z-10 mt-6 flex flex-wrap gap-2"><span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold"><ShieldCheck size={13}/> Información según tus permisos</span><span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold"><UsersRound size={13}/>{data.members.length} {data.members.length === 1 ? 'perfil familiar' : 'perfiles familiares'}</span></div>
      </header>

      {familyError && <InlineNotice>{familyError}</InlineNotice>}
      {globalError && <InlineNotice tone="error">{globalError} <button type="button" onClick={() => refreshDashboard()} className="ml-1 font-bold underline">Reintentar</button></InlineNotice>}
      {data.errors.length > 0 && !globalError && <InlineNotice>Algunos datos no se pudieron actualizar. El resto del panel sigue disponible. Pulsa «Actualizar datos» para intentarlo de nuevo.</InlineNotice>}

      {loading ? <LoadingCards/> : <section><div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">Resumen de hoy</p><h2 className="mt-1 text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">Lo importante, de un vistazo</h2></div><span className="text-[10px] text-slate-400">Datos de {selectedFamily?.name || 'tu familia'}</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Citas próximas" value={allUpcomingAppointments.length} note="Próximas 6 semanas" icon={CalendarCheck} tone="violet" to="/citas"/><MetricCard label="Tratamientos activos" value={activeTreatments} note="Incluye tratamientos de uso ocasional" icon={Pill} tone="teal" to="/medicamentos"/><MetricCard label="Tomas registradas hoy" value={recordedToday} note={`${weeklyStats.recorded} registros con resultado esta semana`} icon={CheckCircle2} tone="emerald" to="/medicamentos?tab=horarios"/><MetricCard label="Pendientes de atención" value={attentionCount} note={`${renewalItems.length} renovaciones · ${deliveryItems.length} entregas · ${pendingAttendance.length} asistencias`} icon={attentionCount ? TriangleAlert : ShieldCheck} tone={attentionCount ? 'amber' : 'blue'} to="/medicamentos?tab=tramites"/></div></section>}

      <section><SectionHeading eyebrow="Hazlo sin perder tiempo" title="Accesos rápidos"/><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Link to="/citas" className="surface-card group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md dark:hover:border-brand-900"><span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${CARD_TONES.violet}`}><CalendarClock size={20}/></span><span className="min-w-0 flex-1"><span className="block text-xs font-extrabold text-slate-800 dark:text-slate-100">Gestionar citas</span><span className="mt-1 block text-[10px] text-slate-400">Programar o revisar una consulta</span></span><ChevronRight size={15} className="text-slate-300 group-hover:text-brand-600"/></Link><Link to="/medicamentos?tab=horarios" className="surface-card group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md dark:hover:border-brand-900"><span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${CARD_TONES.teal}`}><Pill size={20}/></span><span className="min-w-0 flex-1"><span className="block text-xs font-extrabold text-slate-800 dark:text-slate-100">Registrar una toma</span><span className="mt-1 block text-[10px] text-slate-400">Actualizar el seguimiento</span></span><ChevronRight size={15} className="text-slate-300 group-hover:text-brand-600"/></Link><Link to="/medicamentos?tab=tramites" className="surface-card group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md dark:hover:border-brand-900"><span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${CARD_TONES.emerald}`}><PackageCheck size={20}/></span><span className="min-w-0 flex-1"><span className="block text-xs font-extrabold text-slate-800 dark:text-slate-100">Ver entregas</span><span className="mt-1 block text-[10px] text-slate-400">Consultar fechas y recogidas</span></span><ChevronRight size={15} className="text-slate-300 group-hover:text-brand-600"/></Link><Link to="/historia-clinica" className="surface-card group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md dark:hover:border-brand-900"><span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${CARD_TONES.rose}`}><HeartPulse size={20}/></span><span className="min-w-0 flex-1"><span className="block text-xs font-extrabold text-slate-800 dark:text-slate-100">Historia clínica</span><span className="mt-1 block text-[10px] text-slate-400">Consultar datos importantes</span></span><ChevronRight size={15} className="text-slate-300 group-hover:text-brand-600"/></Link></div></section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-card p-5 sm:p-6"><SectionHeading eyebrow="En la agenda" title="Próximas citas" action="Ver todas" to="/citas"/><div className="space-y-3">{upcomingAppointments.map((item) => <AppointmentRow key={item.appointment.id} item={item} familyId={selectedFamilyId} canManage={canManage(item.member)} onAttendance={(target) => setActiveAction({ type: 'attendance', target })}/>)}{!loading && upcomingAppointments.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center dark:border-slate-800"><CalendarCheck className="mx-auto text-slate-300" size={24}/><p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">No hay citas próximas</p><p className="mt-1 text-[11px] text-slate-400">Las nuevas citas aparecerán aquí cuando las registres.</p><Link to="/citas" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-700 dark:text-brand-300">Organizar una cita <ArrowRight size={13}/></Link></div>}</div></section>
        <section className="surface-card p-5 sm:p-6"><SectionHeading eyebrow="Plan de hoy" title="Tomas programadas" action="Gestionar horarios" to="/medicamentos?tab=horarios"/><div className="space-y-3">{doseTasks.slice(0, 6).map((task) => <DoseRow key={task.id} task={task} familyId={selectedFamilyId} canManage={canManage(task.member)} onTake={(target) => setActiveAction({ type: 'take', target })}/>)}{!loading && doseTasks.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center dark:border-slate-800"><Pill className="mx-auto text-slate-300" size={24}/><p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">No hay tomas pendientes para hoy</p><p className="mt-1 text-[11px] text-slate-400">Si hay tratamientos activos con horarios para hoy, se mostrarán aquí.</p><Link to="/medicamentos" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-700 dark:text-brand-300">Ver medicamentos <ArrowRight size={13}/></Link></div>}</div>{doseTasks.length > 6 && <Link to="/medicamentos?tab=horarios" className="mt-4 flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900">Ver las {doseTasks.length} tomas <ArrowRight size={13}/></Link>}</section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2"><WeeklyAdherenceChart stats={weeklyStats}/><RecentNotices notices={data.notices} onOpen={handleNoticeOpen}/></div>

      {(pendingAttendance.length > 0 || deliveryItems.length > 0 || renewalItems.length > 0) && <section className="surface-card p-5 sm:p-6"><SectionHeading eyebrow="Prioridades" title="Pendientes que puedes resolver"/><div className="space-y-3">{pendingAttendance.slice(0, 3).map((item) => <AppointmentRow key={`attendance-${item.appointment.id}`} item={item} familyId={selectedFamilyId} canManage={canManage(item.member)} onAttendance={(target) => setActiveAction({ type: 'attendance', target })}/>)}{renewalItems.slice(0, 3).map((item, index) => <article key={`renewal-${item.medication.id}-${item.delivery?.id || index}`} className="flex flex-col gap-3 rounded-2xl border border-amber-100 bg-amber-50/40 p-3.5 dark:border-amber-950 dark:bg-amber-950/10 sm:flex-row sm:items-center"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${CARD_TONES.amber}`}><RefreshCw size={17}/></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-100">Renovar {fieldValue(item.medication, 'name')}</p><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Tratamiento de {memberName(item.member)}. Revisa el trámite para mantener las próximas entregas al día.</p></div><Link to={buildDashboardDestinations(item.member, selectedFamilyId, item.medication, { tab: 'tramites', deliveryId: item.delivery?.id })} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] font-bold text-amber-800 hover:bg-amber-50 dark:border-amber-900 dark:bg-slate-950 dark:text-amber-200"><RefreshCw size={13}/> Gestionar renovación</Link></article>)}{deliveryItems.slice(0, 4).map((item) => <DeliveryRow key={`${item.medication.id}-${item.delivery.id}`} item={item} familyId={selectedFamilyId} canManage={canManage(item.member)} onCollect={(target) => setActiveAction({ type: 'pickup', target })}/>)}</div></section>}

      <section className="surface-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><ShieldCheck size={21}/></span><div><p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Tu información, organizada y bajo control</p><p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">El panel reúne información accesible de los perfiles de la familia seleccionada. Usa «Gestionar» para editar los detalles en el módulo correspondiente.</p></div></div><Link to="/documentos" className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 sm:self-auto"><FileHeart size={14}/> Documentos</Link></section>

      {activeAction && <DashboardActionModal key={`${activeAction.type}-${activeAction.target?.appointment?.id || activeAction.target?.delivery?.id || activeAction.target?.schedule?.id}`} type={activeAction.type} target={activeAction.target} busy={actionBusy} onClose={() => { if (!actionBusy) setActiveAction(null); }} onConfirm={activeAction.type === 'take' ? handleTake : activeAction.type === 'pickup' ? handlePickup : handleAttendance}/>}
    </div>
  );
}

function localDateForLog(log) {
  const value = fieldValue(log, 'scheduledAt', 'scheduled_at');
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
