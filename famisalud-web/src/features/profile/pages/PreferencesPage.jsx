import Select from "../../../shared/components/ui/Select.jsx";
import { useEffect, useState } from "react";
import {
  Check,
  Globe2,
  Moon,
  Sun,
  Clock3,
  SlidersHorizontal,
} from "lucide-react";
import Button from "../../../shared/components/ui/Button.jsx";
import { useAuth } from "../../../shared/hooks/useAuth.js";
import { useTheme } from "../../../shared/hooks/useTheme.js";
import { notify } from "../../../shared/utils/feedback.js";
import { updatePreferences } from "../services/profileService.js";

const TIMEZONES = [
  ["America/Bogota", "Colombia (America/Bogota)"],
  ["America/Mexico_City", "México (America/Mexico_City)"],
  ["America/Lima", "Perú (America/Lima)"],
  ["America/Santiago", "Chile (America/Santiago)"],
  [
    "America/Argentina/Buenos_Aires",
    "Argentina (America/Argentina/Buenos_Aires)",
  ],
  ["America/New_York", "Este de Estados Unidos (America/New_York)"],
  ["Europe/Madrid", "España (Europe/Madrid)"],
  ["UTC", "UTC"],
];
const LOCALES = [
  ["es-CO", "Español (Colombia)"],
  ["es", "Español"],
  ["en-US", "English (United States)"],
  ["en", "English"],
];

export default function PreferencesPage() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [values, setValues] = useState({
    timezone: user?.timezone || "America/Bogota",
    locale: user?.locale || "es-CO",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValues({
      timezone: user?.timezone || "America/Bogota",
      locale: user?.locale || "es-CO",
    });
  }, [user?.timezone, user?.locale]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await updatePreferences(values);
      if (response?.user) updateUser(response.user);
      notify.success("Tus preferencias se guardaron correctamente.");
    } catch (requestError) {
      const message =
        requestError?.message || "No fue posible guardar las preferencias.";
      setError(message);
      notify.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="relative overflow-hidden rounded-3xl module-header-dark p-6 text-white shadow-lg shadow-slate-950/20 sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full border-42 border-white/[0.08]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-24 size-48 rounded-full border-28 border-white/[0.07]" />
        <div className="relative z-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">
            Tu experiencia
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white">
            Preferencias
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
            Configura cómo se muestran las fechas y el idioma de tu cuenta. El
            tema visual se guarda en este navegador.
          </p>
        </div>
      </header>

      <section className="surface-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200">
            <SlidersHorizontal size={21} />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Preferencias de cuenta
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Estas opciones se guardan en la API y se aplican a la cuenta, no
              solo a esta familia.
            </p>
          </div>
        </div>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <Clock3 size={15} /> Zona horaria
            </span>
            <Select
              className="form-input mt-2"
              value={values.timezone}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  timezone: event.target.value,
                }))
              }
            >
              {TIMEZONES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <span className="mt-1.5 block text-[11px] font-normal text-slate-400">
              Los recordatorios usan la zona horaria de tu cuenta.
            </span>
          </label>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <Globe2 size={15} /> Idioma y región
            </span>
            <Select
              className="form-input mt-2"
              value={values.locale}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  locale: event.target.value,
                }))
              }
            >
              {LOCALES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <span className="mt-1.5 block text-[11px] font-normal text-slate-400">
              La preferencia queda guardada en tu cuenta. Algunas traducciones
              de la interfaz aún pueden aparecer en español.
            </span>
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
            >
              {error}
            </p>
          )}
          <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="submit" loading={busy}>
              <Check size={16} /> {busy ? "Guardando…" : "Guardar preferencias"}
            </Button>
          </div>
        </form>
      </section>

      <section className="surface-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
            {theme === "dark" ? <Moon size={21} /> : <Sun size={21} />}
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Apariencia
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Elige el tema que te resulte más cómodo para consultar información
              de salud.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setTheme("light")}
            aria-pressed={theme === "light"}
            className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${theme === "light" ? "border-brand-500 bg-brand-50/70 dark:bg-brand-950/20" : "border-slate-200 hover:border-brand-200 dark:border-slate-800"}`}
          >
            <Sun size={19} className="text-amber-500" />
            <span className="flex-1">
              <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                Claro
              </span>
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                Fondo luminoso
              </span>
            </span>
            {theme === "light" && (
              <Check size={16} className="text-brand-600" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            aria-pressed={theme === "dark"}
            className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${theme === "dark" ? "border-brand-500 bg-brand-50/70 dark:bg-brand-950/20" : "border-slate-200 hover:border-brand-200 dark:border-slate-800"}`}
          >
            <Moon size={19} className="text-violet-500" />
            <span className="flex-1">
              <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                Oscuro
              </span>
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                Fondo oscuro suave
              </span>
            </span>
            {theme === "dark" && <Check size={16} className="text-brand-600" />}
          </button>
        </div>
      </section>
    </div>
  );
}
