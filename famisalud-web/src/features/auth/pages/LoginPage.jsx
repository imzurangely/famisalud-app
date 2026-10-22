import { useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout, { BrandMark } from "../components/AuthLayout.jsx";
import { useAuthAction } from "../hooks/useAuthAction.js";
import { AuthInput, PasswordInput } from "../components/AuthField.jsx";
import { formatApiError } from "../utils/authUtils.js";

export default function LoginPage() {
  const {
    execute: login,
    loading: submitting,
    error: requestError,
  } = useAuthAction("login");
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      const result = await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      const from = location.state?.from;
      const returnTo = from
        ? `${from.pathname || "/"}${from.search || ""}${from.hash || ""}`
        : "/";
      const isInvite =
        from?.pathname === "/invitations/accept" &&
        new URLSearchParams(from.search || "").has("token");
      const destination =
        result.familySetupRequired && !isInvite
          ? "/configurar-familia"
          : returnTo;
      navigate(destination, { replace: true });
    } catch {
      // useAuthAction conserva el error y el estado loading para renderizarlos.
    }
  }

  const error = requestError ? formatApiError(requestError) : "";

  return (
    <AuthLayout>
      <BrandMark />
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        Inicia sesión
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        Accede a tu espacio y mantén tu información de salud organizada.
      </p>
      {location.state?.message && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          {location.state.message}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          {error}
        </div>
      )}
      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <AuthInput
          id="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="Ingresa tu correo electrónico"
          value={form.email}
          onChange={(event) =>
            setForm((current) => ({ ...current, email: event.target.value }))
          }
          required
        />
        <PasswordInput
          id="password"
          label="Contraseña"
          value={form.password}
          placeholder="Ingresa tu contraseña"
          onChange={(event) =>
            setForm((current) => ({ ...current, password: event.target.value }))
          }
          required
        />
        <div className="-mt-1 flex justify-end">
          <Link
            to="/recuperar-contrasena"
            className="text-xs font-semibold text-brand-700 transition hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="primary-button w-full"
        >
          {submitting ? "Ingresando…" : "Ingresar a FamiSalud"}{" "}
          {!submitting && <ArrowRight size={17} />}
        </button>
      </form>
      <div className="my-7 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Nuevo por aquí
        </span>
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>
      <Link
        to="/registro"
        state={location.state}
        className="secondary-button w-full"
      >
        Crear una cuenta
      </Link>
    </AuthLayout>
  );
}
