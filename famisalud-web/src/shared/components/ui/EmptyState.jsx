import { UsersRound } from "lucide-react";

/** Presentación reutilizable cuando una lista o sección no contiene registros. */
export default function EmptyState({
  icon: Icon = UsersRound,
  title,
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-white/60 px-5 py-12 text-center dark:border-slate-800 dark:bg-slate-900/30">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
        <Icon size={25} />
      </span>
      <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
