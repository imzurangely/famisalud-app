import { useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AuthLayout, { BrandMark } from "../components/AuthLayout.jsx";
import { PasswordInput } from "../components/AuthField.jsx";
import { usePasswordRecovery } from "../hooks/usePasswordRecovery.js";
import { formatApiError, isValidPassword } from "../utils/authUtils.js";
import { notify } from "../../../shared/utils/feedback.js";

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "";
  const code = location.state?.code || "";
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [validationError, setValidationError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const {
    resetPassword,
    resetLoading: submitting,
    resetError,
    clearReset,
  } = usePasswordRecovery();

  if (!email || !/^\d{6}$/.test(code))
    return <Navigate to="/recuperar-contrasena" replace />;

  function change(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setValidationError("");
    clearReset();
    if (!isValidPassword(form.newPassword)) {
      setValidationError(
        "La contraseña debe tener entre 8 y 128 caracteres e incluir una minúscula, una mayúscula y un número.",
      );
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setValidationError("Las contraseñas no coinciden.");
      return;
    }
    try {
      await resetPassword({ email, code, ...form });
      setShowSuccess(true);
      notify.success(
        "Tu contraseña fue actualizada. Inicia sesión con la nueva contraseña.",
      );
      navigate("/login", {
        replace: true,
        state: {
          message:
            "Tu contraseña fue actualizada. Inicia sesión con tu nueva contraseña.",
        },
      });
    } catch {
      // usePasswordRecovery conserva el error y el estado de carga.
    }
  }

  const error =
    validationError || (resetError ? formatApiError(resetError) : "");

  return (
    <AuthLayout eyebrow="Nueva contraseña">
      <BrandMark />
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200">
        <KeyRound size={23} />
      </span>
      <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        Crea una nueva contraseña
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        Código verificado para{" "}
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {email}
        </span>
        . Elige una contraseña que no hayas utilizado antes.
      </p>
      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          {error}
        </div>
      )}
      {showSuccess && (
        <div
          role="status"
          className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          Contraseña actualizada.
        </div>
      )}
      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <PasswordInput
          id="newPassword"
          label="Nueva contraseña"
          value={form.newPassword}
          onChange={(event) => change("newPassword", event.target.value)}
          autoComplete="new-password"
          hint="Entre 8 y 128 caracteres, con mayúscula, minúscula y número."
        />
        <PasswordInput
          id="confirmPassword"
          label="Confirma la nueva contraseña"
          value={form.confirmPassword}
          onChange={(event) => change("confirmPassword", event.target.value)}
          autoComplete="new-password"
        />
        <button
          type="submit"
          disabled={submitting || showSuccess}
          className="primary-button w-full"
        >
          {submitting ? "Actualizando…" : "Guardar nueva contraseña"}
        </button>
      </form>
      <Link
        to="/recuperar-contrasena"
        className="mt-7 inline-flex w-full items-center justify-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300"
      >
        <ArrowLeft size={15} /> Solicitar otro código
      </Link>
    </AuthLayout>
  );
}
