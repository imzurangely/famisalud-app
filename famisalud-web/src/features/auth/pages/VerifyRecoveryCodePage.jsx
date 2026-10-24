import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, MailCheck, RefreshCw } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AuthLayout, { BrandMark } from "../components/AuthLayout.jsx";
import RecoveryCodeInput from "../components/RecoveryCodeInput.jsx";
import { usePasswordRecovery } from "../hooks/usePasswordRecovery.js";
import { useResendCodeCooldown } from "../hooks/useResendCodeCooldown.js";
import { formatApiError } from "../utils/authUtils.js";

export default function VerifyRecoveryCodePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;
  const email = state?.email || "";
  const [codeDigits, setCodeDigits] = useState(() => Array(6).fill(""));
  const code = codeDigits.join("");
  const hasCompleteCode = codeDigits.every(Boolean);
  const [codeError, setCodeError] = useState("");
  const [resendError, setResendError] = useState("");
  const [debugCode, setDebugCode] = useState(state?.debugCode || "");
  const lastAttemptedCode = useRef("");
  const {
    requestCode,
    requestLoading,
    requestError,
    verifyCode,
    verifyLoading,
    clearVerify,
  } = usePasswordRecovery();
  const cooldown = useResendCodeCooldown(state?.retryAfterSeconds ?? 60);

  if (!email) return <Navigate to="/recuperar-contrasena" replace />;

  async function verify(codeToCheck) {
    if (
      !/^\d{6}$/.test(codeToCheck) ||
      lastAttemptedCode.current === codeToCheck
    )
      return;
    lastAttemptedCode.current = codeToCheck;
    setCodeError("");
    clearVerify();
    try {
      await verifyCode({ email, code: codeToCheck });
      navigate("/restablecer-contrasena", {
        replace: true,
        state: { email, code: codeToCheck },
      });
    } catch (error) {
      lastAttemptedCode.current = "";
      setCodeError(
        error?.status === 422
          ? "El código es incorrecto o no es válido. Revisa los seis dígitos. Por seguridad, la recuperación permite un máximo de 3 intentos y el código vence a los 10 minutos."
          : formatApiError(error),
      );
    }
  }

  function handleCodeChange(nextDigits) {
    const cleanedDigits = nextDigits.slice(0, 6).map((digit) =>
      String(digit || "")
        .replace(/\D/g, "")
        .slice(-1),
    );
    setCodeDigits(cleanedDigits);
    setCodeError("");
    setResendError("");
    if (!cleanedDigits.every(Boolean)) lastAttemptedCode.current = "";
    const completeCode = cleanedDigits.join("");
    if (
      cleanedDigits.every(Boolean) &&
      completeCode !== lastAttemptedCode.current
    )
      void verify(completeCode);
  }

  async function handleResend() {
    if (!cooldown.canResend || requestLoading) return;
    setResendError("");
    try {
      const response = await requestCode(email);
      const serverCooldown = Number(response?.retryAfterSeconds || 0);
      cooldown.start(serverCooldown || 60);
      if (serverCooldown > 0) {
        setResendError(
          "Ya se solicitó un código recientemente. Espera a que termine el tiempo indicado para solicitar otro.",
        );
        return;
      }
      setCodeDigits(Array(6).fill(""));
      setCodeError("");
      lastAttemptedCode.current = "";
      setDebugCode(response?.debugCode || "");
    } catch (error) {
      setResendError(formatApiError(error));
      const retryAfter = error?.data?.retryAfterSeconds;
      if (retryAfter) cooldown.start(retryAfter);
    }
  }

  const waitingMessage = verifyLoading
    ? "Verificando código…"
    : "Al completar los seis dígitos, verificaremos el código automáticamente.";

  return (
    <AuthLayout eyebrow="Verifica tu correo">
      <BrandMark />
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200">
        <MailCheck size={23} />
      </span>
      <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        Ingresa tu código
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        Si el correo{" "}
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {email}
        </span>{" "}
        existe, se habrá enviado un código de recuperación. Revisa también la
        carpeta de correo no deseado.
      </p>

      {debugCode && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200">
            Código de desarrollo
          </p>
          <p className="mt-1 font-mono text-lg font-bold tracking-[0.25em] text-amber-900 dark:text-amber-100">
            {debugCode}
          </p>
          <p className="mt-1 text-[10px] text-amber-800/80 dark:text-amber-200/80">
            Solo aparece si la API lo incluye en una respuesta de desarrollo.
          </p>
        </div>
      )}

      <div className="mt-7 space-y-4">
        <RecoveryCodeInput
          value={codeDigits}
          onChange={handleCodeChange}
          disabled={verifyLoading}
          hasError={Boolean(codeError)}
        />
        <p
          aria-live="polite"
          className={`text-xs leading-relaxed ${codeError ? "text-rose-600 dark:text-rose-300" : "text-slate-500 dark:text-slate-400"}`}
        >
          {codeError || waitingMessage}
        </p>
        {resendError && (
          <p
            role="alert"
            className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {resendError}
          </p>
        )}
        {requestError && !resendError && (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-300">
            {formatApiError(requestError)}
          </p>
        )}
        <button
          type="button"
          onClick={() => void verify(code)}
          disabled={verifyLoading || !hasCompleteCode}
          className="primary-button w-full"
        >
          {verifyLoading ? "Verificando…" : "Verificar código"}{" "}
          {!verifyLoading && <ArrowRight size={17} />}
        </button>
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={!cooldown.canResend || requestLoading}
          className="secondary-button w-full"
        >
          <RefreshCw size={15} />
          {requestLoading
            ? "Solicitando nuevo código…"
            : cooldown.canResend
              ? "Reenviar código"
              : `Reenviar código en ${Math.floor(cooldown.secondsRemaining / 60)}:${String(cooldown.secondsRemaining % 60).padStart(2, "0")}`}
        </button>
      </div>

      <Link
        to="/recuperar-contrasena"
        className="mt-7 inline-flex w-full items-center justify-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300"
      >
        <ArrowLeft size={15} /> Cambiar correo electrónico
      </Link>
    </AuthLayout>
  );
}
