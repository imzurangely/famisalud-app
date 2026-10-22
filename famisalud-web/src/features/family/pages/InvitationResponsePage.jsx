import { CheckCircle2, MailCheck, ShieldCheck, XCircle } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout, { BrandMark } from '../../auth/components/AuthLayout.jsx';
import { confirmAction, notify } from '../../../shared/utils/feedback.js';
import { useInvitationResponse } from '../hooks/useInvitationResponse.js';

export default function InvitationResponsePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const familyNameFromLink = searchParams.get('familyName')?.trim() || '';
  const navigate = useNavigate();
  const {
    resolvedFamilyName, previewDenied, loadingPreview, busy, error, setError,
    result, submitAnswer, familySetupRequired,
  } = useInvitationResponse(token, familyNameFromLink);
  const targetFamilyName = resolvedFamilyName || 'la familia indicada en el correo';

  async function answer(action) {
    if (!token || busy) return;
    const isAccepting = action === 'accept';
    const confirmation = await confirmAction({
      title: isAccepting ? `¿Aceptar la invitación a ${targetFamilyName}?` : `¿Rechazar la invitación a ${targetFamilyName}?`,
      text: isAccepting ? `Al aceptar, te unirás a ${targetFamilyName}.` : `Estás a punto de rechazar la invitación para unirte a ${targetFamilyName}.`,
      confirmButtonText: isAccepting ? 'Sí, unirme' : 'Sí, rechazar',
      cancelButtonText: 'Volver',
      icon: isAccepting ? 'question' : 'warning',
    });
    if (!confirmation.isConfirmed) return;
    try {
      const outcome = await submitAnswer(action);
      if (outcome?.accepted) notify.success(`Te uniste a ${outcome.familyName}.`);
      else if (outcome) notify.success(`Rechazaste la invitación a ${outcome.familyName}.`);
    } catch (requestError) {
      setError(requestError?.message || 'No fue posible procesar la invitación.');
    }
  }

  function continueToApp() {
    if (result?.accepted) navigate('/familia', { replace: true });
    else if (familySetupRequired) navigate('/configurar-familia', { replace: true });
    else navigate('/familia', { replace: true });
  }

  return (
    <AuthLayout eyebrow="Invitación familiar">
      <BrandMark />
      <span className="mt-1 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"><MailCheck size={23} /></span>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.17em] text-brand-700 dark:text-brand-300">Una invitación para compartir</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Invitación a {resolvedFamilyName || 'una familia'}</h1>
      {!token && <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">No encontramos el token en este enlace. Abre el enlace completo del correo de invitación o consulta las invitaciones desde tu cuenta.</p>}
      {token && !result && <>
        <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{resolvedFamilyName ? `Te invitaron a unirte a ${resolvedFamilyName}.` : 'Estamos verificando la invitación y el nombre de la familia.'} Confirma si deseas aceptar o rechazar la invitación. El enlace solo puede utilizarse una vez y debe abrirse con la cuenta del correo invitado.</p>
        {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}
        {loadingPreview && <p className="mt-4 text-xs text-slate-400">Verificando la invitación y la familia…</p>}
        <div className="mt-7 grid gap-3 sm:grid-cols-2"><button className="primary-button w-full" disabled={Boolean(busy) || previewDenied || loadingPreview} onClick={() => answer('accept')}>{busy === 'accept' ? 'Aceptando…' : 'Aceptar invitación'} <CheckCircle2 size={16} /></button><button className="secondary-button w-full" disabled={Boolean(busy) || previewDenied || loadingPreview} onClick={() => answer('reject')}>{busy === 'reject' ? 'Rechazando…' : 'Rechazar'} <XCircle size={16} /></button></div>
        <p className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-slate-400"><ShieldCheck size={14} className="mt-0.5 shrink-0" /> Tu acceso y tus permisos dependen de tu membresía en la familia. Aceptar una invitación no te convierte en administrador.</p>
      </>}
      {result && <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/35"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300" size={20} /><div><p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">{result.accepted ? 'Invitación aceptada' : 'Invitación rechazada'}</p><p className="mt-1 text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">{result.accepted ? `Ya te uniste a ${result.familyName}.` : `Has rechazado la invitación a ${result.familyName}.`}</p></div></div><button className="primary-button mt-4 w-full" onClick={continueToApp}>{result.accepted ? 'Ir a mis familias' : familySetupRequired ? 'Configurar mi espacio' : 'Volver a mis familias'}</button></div>}
      {!token && <Link to="/familia" className="secondary-button mt-6 w-full">Ver mis familias</Link>}
    </AuthLayout>
  );
}
