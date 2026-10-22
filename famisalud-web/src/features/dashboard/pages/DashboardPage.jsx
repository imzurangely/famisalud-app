import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CirclePlus,
  Clock3,
  FileHeart,
  HeartPulse,
  Pill,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const stats = [
  { label: 'Miembros de la familia', value: '04', note: 'Personas en tu espacio', icon: UsersRound, tone: 'teal', trend: 'Todos organizados' },
  { label: 'Citas próximas', value: '02', note: 'En los siguientes días', icon: CalendarCheck, tone: 'violet', trend: '1 esta semana' },
  { label: 'Medicamentos activos', value: '03', note: 'En seguimiento', icon: Pill, tone: 'rose', trend: 'Horarios configurados' },
];

const quickActions = [
  { title: 'Registrar un dato clínico', description: 'Añade información a la historia', icon: HeartPulse, to: '/historia-clinica', tone: 'teal' },
  { title: 'Agregar una cita', description: 'Organiza la próxima consulta', icon: CalendarClock, to: '/citas', tone: 'violet' },
  { title: 'Revisar medicamentos', description: 'Consulta horarios y trámites', icon: Pill, to: '/medicamentos', tone: 'rose' },
  { title: 'Guardar un documento', description: 'Ten tus documentos a mano', icon: FileHeart, to: '/documentos', tone: 'amber' },
];

const members = [
  { initials: 'CR', name: 'Camila Ríos', relation: 'Titular', color: 'bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200' },
  { initials: 'MR', name: 'Mateo Ríos', relation: 'Hijo', color: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200' },
  { initials: 'AR', name: 'Ana Ríos', relation: 'Madre', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' },
  { initials: 'JR', name: 'Julián Ríos', relation: 'Padre', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' },
];

const appointments = [
  { day: '22', month: 'OCT', time: '09:30 a. m.', name: 'Control general', person: 'Camila Ríos', place: 'Consulta externa', tone: 'teal' },
  { day: '25', month: 'OCT', time: '02:00 p. m.', name: 'Control pediátrico', person: 'Mateo Ríos', place: 'Pediatría', tone: 'violet' },
];

const tones = {
  teal: 'bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-200',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/70 dark:text-violet-200',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-200',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-200',
};

function SectionHeading({ eyebrow, title, action, to }) {
  return <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-brand-600 dark:text-brand-300">{eyebrow}</p><h2 className="mt-1 font-display text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg">{title}</h2></div>{action && <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-700 transition hover:text-brand-800 dark:text-brand-300">{action}<ArrowRight size={14} /></Link>}</div>;
}

export default function DashboardPage() {
  return (
    <div className="space-y-7 pb-10">
      <div className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-[#218C9A] via-[#2596A6] to-[#347A9E] px-6 py-7 text-white shadow-xl shadow-brand-900/10 sm:px-8 sm:py-8 lg:px-10">
        <div className="absolute -right-14 -top-20 size-64 rounded-full border-38 border-white/[0.07]" />
        <div className="absolute -bottom-20 right-[28%] size-48 rounded-full border-28 border-white/6" />
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold tracking-wide text-white/90"><Sparkles size={13} /> CUIDADO QUE NOS UNE</span>
          <h2 className="mt-4 max-w-lg font-display text-[27px] font-extrabold leading-[1.18] tracking-tight sm:text-[34px]">La salud de tu familia,<br className="hidden sm:block" /> en un solo lugar.</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/80">Organiza citas, medicamentos y datos importantes para acompañar el bienestar de las personas que más quieres.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/familia" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-50">Ver mi familia <ArrowRight size={15} /></Link>
            <Link to="/historia-clinica" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-xs font-bold text-white transition hover:bg-white/15"><CirclePlus size={15} /> Consultar historia clínica</Link>
          </div>
        </div>
        <div className="absolute bottom-7 right-8 hidden items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm xl:flex">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/15"><ShieldCheck size={22} /></span>
          <div><p className="text-xs font-bold">Tu información, organizada</p><p className="mt-1 text-[10px] text-white/70">Acceso según tus permisos</p></div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 dark:border-violet-900/60 dark:bg-violet-950/30">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-violet-600 dark:bg-slate-900 dark:text-violet-300"><Sparkles size={15} /></span>
        <p className="text-xs leading-relaxed text-violet-900/80 dark:text-violet-200/80"><strong className="font-bold">Vista de diseño:</strong> los nombres, cifras, citas y avisos que ves en esta pantalla son datos ficticios. Conectaremos estos componentes a tu API después de terminar la base visual.</p>
      </div>

      <section>
        <SectionHeading eyebrow="Tu espacio familiar" title="Un vistazo a lo importante" action="Ver familia" to="/familia" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map(({ label, value, note, icon: Icon, tone, trend }, index) => (
            <div key={label} className="surface-card group p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 dark:hover:shadow-black/20 sm:p-6">
              <div className="flex items-start justify-between"><span className={`flex size-11 items-center justify-center rounded-2xl ${tones[tone]}`}><Icon size={21} strokeWidth={1.9} /></span><span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">Vista previa</span></div>
              <div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 font-display text-[32px] font-extrabold leading-none tracking-tight text-slate-900 dark:text-white">{value}</p></div><span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">{index === 1 ? <ArrowUpRight size={14} /> : <CheckCircle2 size={14} />}{trend}</span></div>
              <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">{note}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Empieza por aquí" title="Accesos rápidos" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(({ title, description, icon: Icon, to, tone }) => <Link key={title} to={to} className="surface-card group flex items-center gap-3.5 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md dark:hover:border-brand-900"><span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl transition group-hover:scale-105 ${tones[tone]}`}><Icon size={20} /></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold leading-snug text-slate-800 dark:text-slate-100">{title}</span><span className="mt-1 block text-[10px] leading-relaxed text-slate-400">{description}</span></span><ChevronRight size={16} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" /></Link>)}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.85fr]">
        <section className="surface-card p-5 sm:p-6">
          <SectionHeading eyebrow="Agenda familiar" title="Próximas citas" action="Ver calendario" to="/citas" />
          <div className="space-y-3">
            {appointments.map((appointment) => <div key={appointment.name} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 p-3.5 transition hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-900/70 sm:flex-nowrap sm:p-4"><div className={`flex size-14.5 shrink-0 flex-col items-center justify-center rounded-2xl ${tones[appointment.tone]}`}><span className="font-display text-[21px] font-extrabold leading-none">{appointment.day}</span><span className="mt-1 text-[9px] font-bold tracking-widest">{appointment.month}</span></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{appointment.name}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{appointment.person}</p><p className="mt-1 text-[10px] text-slate-400">{appointment.place}</p></div><div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300"><Clock3 size={13} />{appointment.time}</div></div>)}
          </div>
          <Link to="/citas" className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-700 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-brand-300">Ir a mis citas <ArrowRight size={14} /></Link>
        </section>

        <section className="surface-card p-5 sm:p-6">
          <SectionHeading eyebrow="Personas importantes" title="Miembros de la familia" action="Ver todos" to="/familia" />
          <div className="space-y-1">
            {members.map((member, index) => <div key={member.name} className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-900"><span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${member.color}`}>{member.initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-100">{member.name}</span><span className="mt-1 block text-[10px] text-slate-400">{member.relation}</span></span><span className={`size-2 rounded-full ${index === 1 ? 'bg-amber-400' : 'bg-emerald-400'}`} title={index === 1 ? 'Tiene información por revisar' : 'Estado de demostración'} /></div>)}
          </div>
          <div className="mt-4 rounded-2xl bg-linear-to-br from-violet-50 to-brand-50/70 p-4 dark:from-violet-950/40 dark:to-brand-950/30"><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm dark:bg-slate-900 dark:text-violet-300"><HeartPulse size={18} /></span><div><p className="text-xs font-bold text-slate-800 dark:text-slate-100">Cada historia cuenta</p><p className="mt-1 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">Mantén organizados los datos importantes y consulta la información según tus permisos.</p></div></div></div>
        </section>
      </div>

      <section className="surface-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 size={21} /></span><div><p className="text-sm font-bold text-slate-800 dark:text-slate-100">Un espacio pensado para cuidar</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Información organizada, permisos claros y bienestar familiar.</p></div></div><span className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 sm:self-auto"><CheckCircle2 size={13} /> Diseño base listo</span>
      </section>
    </div>
  );
}
