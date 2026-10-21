import { HeartPulse, ChevronDown, Plus, X, Sparkles, UsersRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { mainNavigation } from '../../app/navigation.js';

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <button aria-label="Cerrar menú" className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-69 flex-col border-r border-slate-200/80 bg-white transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-20.5 items-center justify-between border-b border-slate-100 px-6 dark:border-slate-800">
          <NavLink to="/" onClick={onClose} className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/20">
              <HeartPulse size={25} strokeWidth={2.3} />
            </span>
            <span>
              <span className="block font-display text-[21px] font-extrabold tracking-tight text-slate-900 dark:text-white">FamiSalud</span>
              <span className="-mt-0.5 block text-[11px] font-medium tracking-[0.13em] text-slate-400">SALUD EN FAMILIA</span>
            </span>
          </NavLink>
          <button className="icon-button lg:hidden" onClick={onClose} aria-label="Cerrar navegación"><X size={19} /></button>
        </div>

        <div className="px-4 pt-5">
          <button className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-brand-200 hover:bg-brand-50/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-900 dark:hover:bg-slate-900">
            <span className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-brand-100 to-violet-100 text-brand-700 dark:from-brand-950 dark:to-violet-950 dark:text-brand-200">
              <UsersRound size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">Familia seleccionada</span>
              <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">Espacio de demostración</span>
            </span>
            <ChevronDown size={16} className="text-slate-400" />
          </button>
        </div>

        <nav className="soft-scrollbar flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Menú principal</p>
          <div className="space-y-1.5">
            {mainNavigation.map(({ label, to, icon: Icon, end, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold transition ${isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'}`}
              >
                {({ isActive }) => (
                  <>
                    <span className={`flex size-8 items-center justify-center rounded-lg transition ${isActive ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-900 dark:text-brand-300' : 'text-slate-400 group-hover:text-brand-600'}`}><Icon size={18} strokeWidth={1.9} /></span>
                    <span className="min-w-0 flex-1">{label}</span>
                    {badge && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">{badge}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Accesos rápidos</p>
          <NavLink to="/historia-clinica" onClick={onClose} className="group flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100">
            <span className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300"><Plus size={18} /></span>
            Registrar información
          </NavLink>
        </nav>

        <div className="px-4 pb-4">
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-brand-600 to-teal-700 p-4 text-white shadow-lg shadow-brand-900/10">
            <div className="absolute -right-4 -top-5 size-24 rounded-full border-14 border-white/10" />
            <span className="mb-3 flex size-8 items-center justify-center rounded-xl bg-white/15"><Sparkles size={17} /></span>
            <p className="relative text-sm font-bold">Cuidarnos es más fácil juntos</p>
            <p className="relative mt-1.5 text-[11px] leading-relaxed text-white/75">Toda la información familiar, organizada en un solo lugar.</p>
          </div>
          <div className="flex items-center justify-between px-2 pb-1 pt-4 text-[10px] text-slate-400">
            <span>FamiSalud · v0.1</span><span>Hecho para cuidar</span>
          </div>
        </div>
      </aside>
    </>
  );
}
