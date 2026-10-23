import { useState } from 'react';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout, { BrandMark } from '../components/AuthLayout.jsx';
import { AuthInput } from '../components/AuthField.jsx';
import { usePasswordRecovery } from '../hooks/usePasswordRecovery.js';
import { formatApiError } from '../utils/authUtils.js';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const { requestCode, requestLoading, requestError } = usePasswordRecovery();

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      const response = await requestCode(email);
      navigate('/verificar-codigo-recuperacion', {
        replace: false,
        state: {
          email: email.trim().toLowerCase(),
          debugCode: response?.debugCode || '',
          retryAfterSeconds: response?.retryAfterSeconds ?? 60,
        },
      });
    } catch {
      // El hook conserva el error para mostrarlo sin revelar si el correo existe.
    }
  }

  const error = requestError ? formatApiError(requestError) : '';

  return (
    <AuthLayout eyebrow="Recupera el acceso">
      <BrandMark />
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200"><Mail size={23} /></span>
      <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Recupera tu contraseña</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        Escribe el correo asociado a tu cuenta. Si el correo existe, te enviaremos un código de recuperación.
      </p>
      {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}
      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <AuthInput
          id="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="nombre@correo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          maxLength={254}
        />
        <button type="submit" disabled={requestLoading} className="primary-button w-full">
          {requestLoading ? 'Enviando solicitud…' : 'Enviar código'} {!requestLoading && <ArrowRight size={17} />}
        </button>
      </form>
      <Link to="/login" className="mt-7 inline-flex w-full items-center justify-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300">
        <ArrowLeft size={15} /> Volver a iniciar sesión
      </Link>
    </AuthLayout>
  );
}
