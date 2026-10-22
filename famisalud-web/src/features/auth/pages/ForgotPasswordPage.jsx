import { useState } from 'react';
import { ArrowLeft, ArrowRight, KeyRound, MailCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout, { BrandMark } from '../components/AuthLayout.jsx';
import { usePasswordRecovery } from '../hooks/usePasswordRecovery.js';
import { AuthInput } from '../components/AuthField.jsx';
import { formatApiError } from '../utils/authUtils.js';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [debugCode, setDebugCode] = useState('');
  const { requestCode, requestLoading: submitting, requestError, clearRequest } = usePasswordRecovery();

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setDebugCode('');
    try {
      const response = await requestCode(email);
      setMessage(response?.message || 'Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.');
      if (response?.debugCode) setDebugCode(response.debugCode);
    } catch {
      // El hook conserva el error.
    }
  }

  function continueToReset() {
    navigate('/restablecer-contrasena', { state: { email: email.trim().toLowerCase(), debugCode: debugCode || undefined } });
  }

  const error = requestError ? formatApiError(requestError) : '';

  return (
    <AuthLayout eyebrow="Recupera el acceso">
      <BrandMark />
      <span className="flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200"><KeyRound size={23} /></span>
      <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Recupera tu contraseña</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Te enviaremos un código de seis dígitos para que puedas crear una nueva contraseña.</p>
      {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}
      {message && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/40"><p className="flex items-start gap-2 text-xs leading-relaxed text-emerald-800 dark:text-emerald-200"><MailCheck size={17} className="mt-0.5 shrink-0" />{message}</p>{debugCode && <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3 dark:border-emerald-900 dark:bg-slate-900"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Código de desarrollo</p><p className="mt-1 font-mono text-xl font-bold tracking-[0.25em] text-slate-900 dark:text-white">{debugCode}</p><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Solo se muestra si la API lo incluye en su respuesta. Vence en 10 minutos.</p></div>}</div>}
      {!message ? (
        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <AuthInput id="email" label="Correo electrónico de tu cuenta" type="email" autoComplete="email" placeholder="nombre@correo.com" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} />
          <button type="submit" disabled={submitting} className="primary-button w-full">{submitting ? 'Solicitando código…' : 'Enviar código'} {!submitting && <ArrowRight size={17} />}</button>
        </form>
      ) : (
        <div className="mt-6 space-y-3"><button type="button" className="primary-button w-full" onClick={continueToReset}>Introducir código y cambiar contraseña <ArrowRight size={17} /></button><button type="button" className="secondary-button w-full" onClick={() => { setMessage(''); setDebugCode(''); clearRequest(); }}>Solicitar otro código</button></div>
      )}
      <Link to="/login" className="mt-7 inline-flex w-full items-center justify-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300"><ArrowLeft size={15} /> Volver a iniciar sesión</Link>
    </AuthLayout>
  );
}
