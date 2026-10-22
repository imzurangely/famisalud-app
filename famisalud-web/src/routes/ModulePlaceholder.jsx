import { ArrowRight, Construction, HeartPulse } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ModulePlaceholder({ title, description, icon: Icon = HeartPulse, features = [] }) {
  return (
    <div className="mx-auto max-w-4xl py-4 sm:py-8">
      <div className="surface-card overflow-hidden">
        <div className="border-b border-slate-100 bg-linear-to-r from-brand-50 via-white to-violet-50/70 px-6 py-8 dark:border-slate-800 dark:from-brand-950/40 dark:via-slate-900 dark:to-violet-950/30 sm:px-9 sm:py-10">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300"><Icon size={27} /></span>
          <h2 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <div className="p-6 sm:p-9">
          <div className="flex gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20"><span className="mt-0.5 text-amber-700 dark:text-amber-300"><Construction size={19} /></span><div><p className="text-xs font-bold text-amber-900 dark:text-amber-200">Módulo aún sin conectar</p><p className="mt-1 text-xs leading-relaxed text-amber-900/70 dark:text-amber-200/70">Esta pantalla pertenece a la estructura visual inicial. En la siguiente etapa conectaremos sus datos y acciones a los endpoints existentes de tu backend.</p></div></div>
          {features.length > 0 && <div className="mt-6 grid gap-3 sm:grid-cols-2">{features.map((feature) => <div key={feature} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-3 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300"><span className="size-1.5 rounded-full bg-brand-500" />{feature}</div>)}</div>}
          <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-brand-700">Volver al inicio <ArrowRight size={15} /></Link>
        </div>
      </div>
    </div>
  );
}
