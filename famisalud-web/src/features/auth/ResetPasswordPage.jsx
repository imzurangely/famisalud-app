import { useState } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout, { BrandMark } from '../../components/auth/AuthLayout.jsx';
import { apiFetch } from '../../services/api.js';
import { AuthInput, PasswordInput } from './AuthField.jsx';
import { formatApiError, isValidPassword } from './authUtils.js';

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: location.state?.email || '', code: location.state?.debugCode || '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  function change(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(form.code.trim())) {
      setError('Ingresa el código de seis dígitos que recibiste.');
      return;
    }
    if (!isValidPassword(form.newPassword)) {
      setError('La contraseña debe tener entre 8 y 128 caracteres e incluir una minúscula, una mayúscula y un número.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: form.email.trim().toLowerCase(), code: form.code.trim(), newPassword: form.newPassword, confirmPassword: form.confirmPassword }),
        retryOnAuthFailure: false,
      });
      setShowSuccess(true);
      window.setTimeout(() => navigate('/login', { replace: true, state: { message: 'Tu contraseña fue actualizada. Inicia sesión con tu nueva contraseña.' } }), 1600);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout eyebrow="Nueva contraseña">
      <BrandMark />
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200"><KeyRound size={23} /></span>
      <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Crea una nueva contraseña</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Introduce el correo de tu cuenta, el código de recuperación y tu nueva contraseña.</p>
      {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}
      {showSuccess && <div role="status" className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"><CheckCircle2 size={17} className="mt-0.5 shrink-0" />Contraseña actualizada. Te llevaremos al inicio de sesión…</div>}
      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <AuthInput id="email" label="Correo electrónico" type="email" autoComplete="email" value={form.email} onChange={(event) => change('email', event.target.value)} required maxLength={254} />
        <AuthInput id="code" label="Código de recuperación" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={form.code} onChange={(event) => change('code', event.target.value.replace(/\D/g, '').slice(0, 6))} required maxLength={6} hint="El código vence a los 10 minutos y permite un máximo de 3 intentos." />
        <PasswordInput id="newPassword" label="Nueva contraseña" value={form.newPassword} onChange={(event) => change('newPassword', event.target.value)} autoComplete="new-password" hint="Al menos 8 caracteres, con mayúscula, minúscula y número." />
        <PasswordInput id="confirmPassword" label="Confirma la nueva contraseña" value={form.confirmPassword} onChange={(event) => change('confirmPassword', event.target.value)} autoComplete="new-password" />
        <button type="submit" disabled={submitting || showSuccess} className="primary-button w-full">{submitting ? 'Actualizando…' : 'Guardar nueva contraseña'}</button>
      </form>
      <Link to="/recuperar-contrasena" className="mt-7 inline-flex w-full items-center justify-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300"><ArrowLeft size={15} /> Solicitar otro código</Link>
    </AuthLayout>
  );
}
