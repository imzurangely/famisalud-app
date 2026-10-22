import { useState } from 'react';
import { ArrowRight, Heart, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthLayout, { BrandMark } from '../components/AuthLayout.jsx';
import { useAuth } from '../../../shared/hooks/useAuth.js';
import { useCreateFamily } from '../../family/hooks/useCreateFamily.js';
import { AuthInput } from '../components/AuthField.jsx';
import { formatApiError } from '../utils/authUtils.js';

export default function FamilySetupPage() {
  const { user, markFamilySetupComplete } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('family');
  const [name, setName] = useState('');
  const [validationError, setValidationError] = useState('');
  const { createFamily, loading: submitting, error: requestError } = useCreateFamily();

  async function handleSubmit(event) {
    event.preventDefault();
    setValidationError('');
    const familyName = mode === 'personal' ? 'Mi espacio personal' : name.trim();
    if (!familyName) {
      setValidationError('Escribe un nombre para tu familia.');
      return;
    }
    try {
      await createFamily({ name: familyName, isPersonal: mode === 'personal' });
      markFamilySetupComplete();
      navigate('/', { replace: true });
    } catch {
      // useCreateFamily conserva el error de la API.
    }
  }

  const error = validationError || (requestError ? formatApiError(requestError) : '');

  return (
    <AuthLayout eyebrow="Configura tu espacio">
      <BrandMark />
      <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-brand-700 dark:text-brand-300">Un primer paso sencillo</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">¡Hola, {user?.firstName || 'bienvenido'}!</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Elige cómo quieres empezar. Podrás organizar la información y gestionar invitaciones después.</p>
      {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}
      <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
        <button type="button" onClick={() => setMode('family')} className={`w-full rounded-2xl border p-4 text-left transition ${mode === 'family' ? 'border-brand-400 bg-brand-50/80 ring-4 ring-brand-50 dark:border-brand-700 dark:bg-brand-950/40 dark:ring-brand-950/40' : 'border-slate-200 hover:border-brand-200 dark:border-slate-800 dark:hover:border-slate-700'}`} aria-pressed={mode === 'family'}>
          <span className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300"><UsersRound size={21} /></span><span className="flex-1"><span className="block text-sm font-bold text-slate-800 dark:text-white">Crear una familia</span><span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">Organiza la salud de varias personas y administra sus accesos.</span></span><span className={`mt-1 size-4 rounded-full border ${mode === 'family' ? 'border-[5px] border-brand-500 bg-white' : 'border-slate-300 dark:border-slate-600'}`} /></span>
        </button>
        <button type="button" onClick={() => setMode('personal')} className={`w-full rounded-2xl border p-4 text-left transition ${mode === 'personal' ? 'border-brand-400 bg-brand-50/80 ring-4 ring-brand-50 dark:border-brand-700 dark:bg-brand-950/40 dark:ring-brand-950/40' : 'border-slate-200 hover:border-brand-200 dark:border-slate-800 dark:hover:border-slate-700'}`} aria-pressed={mode === 'personal'}>
          <span className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm dark:bg-slate-900 dark:text-violet-300"><Heart size={21} /></span><span className="flex-1"><span className="block text-sm font-bold text-slate-800 dark:text-white">Crear un espacio personal</span><span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">Empieza gestionando únicamente tu propia información de salud.</span></span><span className={`mt-1 size-4 rounded-full border ${mode === 'personal' ? 'border-[5px] border-brand-500 bg-white' : 'border-slate-300 dark:border-slate-600'}`} /></span>
        </button>
        {mode === 'family' && <AuthInput id="familyName" label="Nombre de la familia" placeholder="Ej. Familia Ríos" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />}
        {mode === 'personal' && <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">Se creará el espacio con el nombre <strong className="text-slate-700 dark:text-slate-200">Mi espacio personal</strong>.</div>}
        <button type="submit" disabled={submitting} className="primary-button w-full">{submitting ? 'Creando espacio…' : 'Continuar'} {!submitting && <ArrowRight size={17} />}</button>
      </form>
    </AuthLayout>
  );
}
