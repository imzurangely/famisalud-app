import { useState } from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout, { BrandMark } from '../../components/auth/AuthLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { AuthInput, PasswordInput } from './AuthField.jsx';
import { formatApiError, isValidPassword } from './authUtils.js';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function change(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!isValidPassword(form.password)) {
      setError('La contraseña debe tener entre 8 y 128 caracteres e incluir una minúscula, una mayúscula y un número.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim().toLowerCase(), password: form.password, confirmPassword: form.confirmPassword };
      if (form.phone.trim()) payload.phone = form.phone.trim();
      const result = await register(payload);
      navigate(result.familySetupRequired ? '/configurar-familia' : '/', { replace: true });
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout eyebrow="Una cuenta para empezar">
      <BrandMark />
      <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-brand-700 dark:text-brand-300">Comienza hoy</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Crea tu cuenta</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Tu espacio personal de salud empieza contigo.</p>
      {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthInput id="firstName" label="Nombre(s)" placeholder="Tu nombre" autoComplete="given-name" value={form.firstName} onChange={(event) => change('firstName', event.target.value)} required maxLength={100} />
          <AuthInput id="lastName" label="Apellido(s)" placeholder="Tus apellidos" autoComplete="family-name" value={form.lastName} onChange={(event) => change('lastName', event.target.value)} required maxLength={100} />
        </div>
        <AuthInput id="email" label="Correo electrónico" type="email" placeholder="nombre@correo.com" autoComplete="email" value={form.email} onChange={(event) => change('email', event.target.value)} required maxLength={254} />
        <AuthInput id="phone" label="Teléfono (opcional)" type="tel" placeholder="300 000 0000" autoComplete="tel" value={form.phone} onChange={(event) => change('phone', event.target.value)} maxLength={30} />
        <PasswordInput id="password" label="Contraseña" value={form.password} onChange={(event) => change('password', event.target.value)} autoComplete="new-password" hint="Mínimo 8 caracteres, con una mayúscula, una minúscula y un número." />
        <PasswordInput id="confirmPassword" label="Confirma la contraseña" value={form.confirmPassword} onChange={(event) => change('confirmPassword', event.target.value)} autoComplete="new-password" />
        <div className="rounded-xl bg-brand-50/80 p-3.5 dark:bg-brand-950/30"><p className="flex items-center gap-2 text-[11px] font-semibold text-brand-800 dark:text-brand-200"><CheckCircle2 size={15} /> ¿Qué pasa después?</p><p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Crearás una familia o un espacio personal. Podrás invitar a otras personas después.</p></div>
        <button type="submit" disabled={submitting} className="primary-button w-full">{submitting ? 'Creando cuenta…' : 'Crear cuenta'} {!submitting && <ArrowRight size={17} />}</button>
      </form>
      <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">¿Ya tienes cuenta? <Link to="/login" className="font-bold text-brand-700 hover:underline dark:text-brand-300">Inicia sesión</Link></p>
      <p className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-400"><ShieldCheck size={14} /> Nunca compartiremos tu contraseña.</p>
    </AuthLayout>
  );
}
