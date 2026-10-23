import {
  ChevronDown,
  HeartPulse,
  Plus,
  UsersRound,
  X,
} from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useFamilies } from "../../hooks/useFamily.js";
import { notify } from "../../utils/feedback.js";
import { mainNavigation } from "../../../routes/navigation.js";
import { APP_NAME } from "../../constants/app.js";
import { useNotificationsSummary } from "../../../features/notifications/context/NotificationsContext.jsx";

export default function Sidebar({ open, onClose }) {
  const {
    families,
    selectedFamily,
    selectedFamilyId,
    selectFamily,
    loadingFamilies,
  } = useFamilies();
  const { unreadCount } = useNotificationsSummary();
  const familyRole = selectedFamily?.role
    ? `Rol: ${selectedFamily.role}`
    : "Gestiona tus espacios";

  function handleSelectFamily(event) {
    const family = families.find(
      (item) => String(item.id) === String(event.target.value),
    );
    if (!family) return;
    selectFamily(family.id);
    onClose?.();
    notify.info(`Espacio seleccionado: ${family.name}`);
  }

  return (
    <>
      {open && (
        <button
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-69 flex-col border-r border-slate-200/80 bg-white transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-20.5 items-center justify-between border-b border-slate-100 px-6 dark:border-slate-800">
          <NavLink to="/" onClick={onClose} className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/20">
              <HeartPulse size={25} strokeWidth={2.3} />
            </span>
            <span>
              <span className="block font-display text-[21px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                {APP_NAME}
              </span>
              <span className="-mt-0.5 block text-[11px] font-medium tracking-[0.13em] text-slate-400">
                SALUD EN FAMILIA
              </span>
            </span>
          </NavLink>
          <button
            className="icon-button lg:hidden"
            onClick={onClose}
            aria-label="Cerrar navegación"
          >
            <X size={19} />
          </button>
        </div>

        <div className="px-4 pt-5">
          {families.length > 0 ? (
            <div className="relative">
              <div className="flex min-h-16.5 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-brand-200 hover:bg-brand-50/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-900 dark:hover:bg-slate-900">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-brand-100 to-violet-100 text-brand-700 dark:from-brand-950 dark:to-violet-950 dark:text-brand-200">
                  <UsersRound size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {selectedFamily?.name || "Seleccionar familia"}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                    {selectedFamily ? familyRole : "Gestiona tus espacios"}
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  className="shrink-0 text-slate-400"
                  aria-hidden="true"
                />
              </div>
              <select
                aria-label="Cambiar familia o espacio"
                title="Cambiar familia o espacio"
                value={selectedFamilyId ? String(selectedFamilyId) : ""}
                onChange={handleSelectFamily}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none rounded-2xl opacity-0"
              >
                {families.map((family) => {
                  const personal = Boolean(
                    family.is_personal ?? family.isPersonal,
                  );
                  return (
                    <option key={family.id} value={String(family.id)}>
                      {family.name} ·{" "}
                      {personal ? "Espacio personal" : family.role || "Miembro"}
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <Link
              to="/familia"
              onClick={onClose}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-slate-700 dark:text-brand-300 dark:hover:bg-slate-900"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/60">
                <Plus size={18} />
              </span>
              {loadingFamilies ? "Cargando espacios…" : "Crear familia"}
            </Link>
          )}
          {families.length > 0 && (
            <Link
              to="/familia"
              onClick={onClose}
              className="mt-2 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-brand-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-brand-300"
            >
              <Plus size={13} /> Gestionar familias
            </Link>
          )}
        </div>

        <nav className="soft-scrollbar flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Menú principal
          </p>
          <div className="space-y-1.5">
            {mainNavigation.map(({ label, to, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold transition ${isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-200" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex size-8 items-center justify-center rounded-lg transition ${isActive ? "bg-white text-brand-600 shadow-sm dark:bg-slate-900 dark:text-brand-300" : "text-slate-400 group-hover:text-brand-600"}`}
                    >
                      <Icon size={18} strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0 flex-1">{label}</span>
                    {to === '/notificaciones' && unreadCount > 0 && (
                      <span aria-label={`${unreadCount} notificaciones sin leer`} className="min-w-5 rounded-full bg-violet-100 px-1.5 py-0.5 text-center text-[10px] font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Accesos rápidos
          </p>
          <NavLink
            to="/historia-clinica"
            onClick={onClose}
            className="group flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300">
              <Plus size={18} />
            </span>
            Registrar información
          </NavLink>
        </nav>
      </aside>
    </>
  );
}
