import { todayDateKey } from "../utils/dashboardUtils.js";

const TONES = {
  success: {
    gradient: "linear-gradient(to top, #10b981, #6ee7b7)",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "#10b981",
  },
  warning: {
    gradient: "linear-gradient(to top, #f59e0b, #fcd34d)",
    text: "text-amber-700 dark:text-amber-300",
    ring: "#f59e0b",
  },
  danger: {
    gradient: "linear-gradient(to top, #f43f5e, #fda4af)",
    text: "text-rose-700 dark:text-rose-300",
    ring: "#f43f5e",
  },
  neutral: {
    gradient: "linear-gradient(to top, #cbd5e1, #e2e8f0)",
    text: "text-slate-400",
    ring: "#94a3b8",
  },
};

function toneFor(percent) {
  if (percent === null || percent === undefined) return "neutral";
  if (percent >= 85) return "success";
  if (percent >= 60) return "warning";
  return "danger";
}

function StatusCount({ children, tone = "neutral" }) {
  const tones = {
    success:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200",
    warning:
      "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
    danger: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200",
    neutral:
      "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${tones[tone] || tones.neutral}`}
    >
      {children}
    </span>
  );
}

function PercentRing({ percent }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const value = percent ?? 0;
  const tone = TONES[toneFor(percent)];
  return (
    <div className="relative shrink-0" style={{ width: 72, height: 72 }}>
      <svg viewBox="0 0 64 64" width="72" height="72" className="-rotate-90" aria-hidden="true">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="6"
          className="stroke-slate-100 dark:stroke-slate-800"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          stroke={tone.ring}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-extrabold leading-none text-slate-900 dark:text-white">
          {percent === null ? "—" : `${percent}%`}
        </span>
        <span className="mt-0.5 font-bold uppercase tracking-wide text-slate-400" style={{ fontSize: 8 }}>
          a tiempo
        </span>
      </div>
    </div>
  );
}

function DayBar({ day, isToday }) {
  const tone = TONES[toneFor(day.percent)];
  const hasData = day.percent !== null;
  const height = hasData ? Math.max(day.percent, 6) : 8;
  const detail = hasData
    ? `${day.onTime} de ${day.due} a tiempo`
    : day.pendingUpcoming
      ? "Tomas próximas"
      : "Sin horarios vencidos";
  const extras = [
    day.delayed > 0 && `Retrasadas ${day.delayed}`,
    day.missed > 0 && `Omitidas ${day.missed}`,
    day.unrecorded > 0 && `Sin registrar ${day.unrecorded}`,
    day.pendingDue > 0 && `Pendientes vencidas ${day.pendingDue}`,
    day.pendingUpcoming > 0 && `Próximas ${day.pendingUpcoming}`,
  ].filter(Boolean);

  return (
    <div
      className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
      role="img"
      aria-label={`${day.label} ${day.day}: ${hasData ? `${day.percent}%` : "sin datos"}, ${[detail, ...extras].join(", ")}`}
      tabIndex={0}
    >
      <span
        className={`mb-1 text-[10px] font-extrabold ${tone.text} transition-transform group-hover:-translate-y-0.5`}
      >
        {hasData ? `${day.percent}%` : "—"}
      </span>
      <div
        className="w-full max-w-9 rounded-t-lg rounded-b-sm transition-all duration-500 ease-out group-hover:brightness-105 group-focus-visible:brightness-105"
        style={{
          height: `${height}%`,
          background: tone.gradient,
          opacity: hasData ? 1 : 0.55,
        }}
      />
      <div className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-lg group-hover:block group-focus-visible:block dark:bg-slate-700">
        <p>{detail}</p>
        {extras.map((line) => (
          <p key={line} className="font-medium text-slate-300">{line}</p>
        ))}
      </div>
      <span
        className={`mt-2 text-[10px] font-extrabold capitalize ${isToday ? "text-brand-700 dark:text-brand-300" : "text-slate-500 dark:text-slate-400"}`}
      >
        {day.label}
      </span>
      <span
        className={`mt-0.5 flex size-5 items-center justify-center rounded-full text-[9px] font-bold ${isToday ? "bg-brand-600 text-white" : "text-slate-400"}`}
      >
        {day.day}
      </span>
    </div>
  );
}

export default function WeeklyAdherenceChart({ stats, scopeLabel }) {
  const today = todayDateKey();

  return (
    <section className="surface-card flex h-full min-h-105 flex-col overflow-hidden p-5 sm:p-6 xl:h-115 xl:min-h-115">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
            Seguimiento
          </p>
          <h2 className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">
            Cumplimiento de tomas
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Últimos 7 días · {scopeLabel}
          </p>
        </div>
        <PercentRing percent={stats.percent} />
      </div>

      {/* Gráfica de barras */}
      <div className="relative mt-4 min-h-40 flex-1 rounded-2xl bg-slate-50/70 px-3 pb-3 pt-4 dark:bg-slate-900/40">
        <div className="pointer-events-none absolute inset-x-3 top-4 bottom-15 flex flex-col justify-between">
          {[100, 50, 0].map((mark) => (
            <div key={mark} className="flex items-center gap-2">
              <span className="w-6 text-right font-semibold text-slate-300 dark:text-slate-600" style={{ fontSize: 8 }}>
                {mark}%
              </span>
              <span className="h-px flex-1 border-t border-dashed border-slate-200 dark:border-slate-800" />
            </div>
          ))}
        </div>
        <div className="relative z-10 ml-8 flex h-full items-end gap-1.5 sm:gap-2.5">
          {stats.days.map((day) => (
            <DayBar key={day.key} day={day} isToday={day.key === today} />
          ))}
        </div>
      </div>

      <div
        className="mt-3 flex shrink-0 flex-wrap gap-1.5"
        aria-label="Resumen de resultados de la semana"
      >
        <StatusCount tone="success">A tiempo: {stats.onTime}</StatusCount>
        <StatusCount tone="warning">Retrasadas: {stats.delayed}</StatusCount>
        <StatusCount tone="danger">Omitidas / olvidadas: {stats.missed}</StatusCount>
        <StatusCount tone="danger">Sin registrar: {stats.unrecorded}</StatusCount>
        <StatusCount tone="neutral">Pendientes vencidas: {stats.pendingDue}</StatusCount>
        <StatusCount tone="neutral">Próximas: {stats.pendingUpcoming}</StatusCount>
      </div>

      <p className="mt-3 shrink-0 border-t border-slate-100 pt-2 text-[10px] leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
        {stats.due > 0
          ? `${stats.onTime} de ${stats.due} tomas que ya debían realizarse fueron registradas a tiempo. Las dosis vencidas sin registro también cuentan; las futuras no reducen el cumplimiento.`
          : stats.pendingUpcoming > 0
            ? `Hay ${stats.pendingUpcoming} tomas futuras; no reducen el cumplimiento hasta que llegue la hora programada.`
            : "No hay horarios vencidos para calcular el cumplimiento de este período."}
      </p>
    </section>
  );
}