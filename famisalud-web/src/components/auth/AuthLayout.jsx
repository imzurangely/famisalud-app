import { HeartPulse, Moon, Sun, ShieldCheck, UsersRound, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.jsx';

export function BrandMark({ compact = false }) {
  return (
    <Link to="/login" className={`inline-flex items-center gap-3 ${compact ? '' : 'mb-8'}`} aria-label="FamiSalud, ir al inicio">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/20">
        <HeartPulse size={25} strokeWidth={2.2} />
      </span>
      <span>
        <span className="block font-display text-[22px] font-extrabold tracking-tight text-slate-900 dark:text-white">FamiSalud</span>
        <span className="-mt-0.5 block text-[10px] font-semibold tracking-[0.16em] text-slate-400">SALUD EN FAMILIA</span>
      </span>
    </Link>
  );
}

export function ThemeButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button className="icon-button absolute right-4 top-4 border border-slate-200/80 bg-white/80 dark:border-slate-700 dark:bg-slate-900/80 sm:right-6 sm:top-6" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export default function AuthLayout({ children, eyebrow = 'Tu salud, en buenas manos' }) {
  return (
    <main className="relative min-h-screen bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-100 lg:grid lg:grid-cols-[minmax(360px,0.9fr)_1.1fr]">
      <ThemeButton />
      <aside className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-[#176d79] via-[#2596a6] to-[#4c82a6] px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-14 xl:py-12">
        <div className="absolute -right-32 -top-24 size-[430px] rounded-full border-[64px] border-white/[0.07]" />
        <div className="absolute -bottom-40 -left-36 size-[520px] rounded-full border-[70px] border-white/[0.07]" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white/90"><Sparkles size={14} /> CUIDADO QUE NOS UNE</div>
          <h1 className="mt-10 max-w-xl font-display text-4xl font-extrabold leading-[1.15] tracking-tight xl:text-[48px]">La salud de tu familia merece un lugar especial.</h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-white/80">Organiza la información médica importante, acompaña tus tratamientos y mantén todo a mano, con permisos claros para cada persona.</p>
        </div>
        <div className="relative z-10 grid gap-3 xl:grid-cols-2">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"><span className="flex size-10 items-center justify-center rounded-xl bg-white/15"><HeartPulse size={20} /></span><p className="mt-4 text-sm font-bold">Historia organizada</p><p className="mt-1 text-xs leading-relaxed text-white/75">Información clínica reunida en un solo lugar.</p></div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"><span className="flex size-10 items-center justify-center rounded-xl bg-white/15"><ShieldCheck size={20} /></span><p className="mt-4 text-sm font-bold">Acceso responsable</p><p className="mt-1 text-xs leading-relaxed text-white/75">Cada persona según sus permisos.</p></div>
        </div>
        <p className="relative z-10 text-[11px] text-white/55">© 2026 FamiSalud · {eyebrow}</p>
      </aside>
      <section className="relative flex min-h-screen items-center justify-center px-5 py-16 sm:px-10 lg:px-12 xl:px-20">
        <div className="w-full max-w-[460px]">
          {children}
          <div className="mt-10 flex items-center justify-center gap-2 text-center text-[11px] text-slate-400"><UsersRound size={14} /> Tu información, tus permisos, tu tranquilidad.</div>
        </div>
      </section>
    </main>
  );
}
