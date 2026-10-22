import { useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme.js";
import { useAuth } from "../../hooks/useAuth.js";
import { mainNavigation } from "../../../routes/navigation.js";

const notices = [
  {
    title: "Tienes citas por revisar",
    body: "Mantén tus próximas consultas organizadas.",
    color:
      "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  },
  {
    title: "Revisa tus medicamentos",
    body: "Consulta los horarios y las próximas tomas.",
    color: "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
  },
  {
    title: "Tu familia está al día",
    body: "La información que necesitas, en un solo lugar.",
    color: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
];

function getInitials(user) {
  const first = user?.firstName?.trim()?.[0] || "";
  const last = user?.lastName?.trim()?.[0] || "";
  return `${first}${last}`.toUpperCase() || "FS";
}

export default function Topbar({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [openPanel, setOpenPanel] = useState(null);
  const [toast, setToast] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = mainNavigation.find(
    (item) => item.to === location.pathname,
  );
  const pageTitle =
    currentPage?.label ||
    (location.pathname === "/perfil" ? "Mi perfil" : "FamiSalud");

  async function handleLogout() {
    if (loggingOut) return;
    setOpenPanel(null);
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setToast(
        "La sesión se cerró en este navegador, pero no se pudo confirmar el cierre con el servidor.",
      );
      window.setTimeout(() => setToast(""), 4500);
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Mi cuenta";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
      <div className="flex h-19.5 items-center gap-3 px-4 sm:px-6 lg:px-9">
        <button
          onClick={onMenuClick}
          className="icon-button lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
            <span>FamiSalud</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="truncate text-slate-500 dark:text-slate-300">
              {pageTitle}
            </span>
          </div>
          <h1 className="mt-1 truncate font-display text-[19px] font-bold tracking-tight text-slate-900 dark:text-white sm:text-[21px]">
            {pageTitle}
          </h1>
        </div>

        <div className="hidden w-64 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition focus-within:border-brand-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-50 dark:border-slate-800 dark:bg-slate-900 dark:focus-within:border-brand-800 dark:focus-within:bg-slate-900 xl:flex">
          <Search size={17} className="shrink-0 text-slate-400" />
          <input
            aria-label="Buscar"
            placeholder="Buscar en FamiSalud"
            className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setToast(
                  "La búsqueda se conectará a los módulos en una siguiente etapa.",
                );
                window.setTimeout(() => setToast(""), 3000);
              }
            }}
          />
          <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 dark:border-slate-700 dark:bg-slate-800">
            /
          </kbd>
        </div>

        <div className="relative">
          <button
            className="icon-button relative"
            aria-label="Notificaciones"
            aria-expanded={openPanel === "notifications"}
            onClick={() =>
              setOpenPanel(
                openPanel === "notifications" ? null : "notifications",
              )
            }
          >
            <Bell size={19} />
            <span className="absolute right-2.25 top-2 size-2 rounded-full border-2 border-white bg-rose-400 dark:border-slate-950" />
          </button>
          {openPanel === "notifications" && (
            <div className="popover-panel right-0 w-[min(340px,calc(100vw-2rem))]">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    Notificaciones
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Vista de demostración
                  </p>
                </div>
                <button
                  className="icon-button size-8!"
                  onClick={() => setOpenPanel(null)}
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>
              {notices.map((notice) => (
                <div
                  key={notice.title}
                  className="flex gap-3 border-b border-slate-50 px-4 py-3 last:border-0 dark:border-slate-800/70"
                >
                  <span
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl ${notice.color}`}
                  >
                    <Bell size={15} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {notice.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                      {notice.body}
                    </p>
                  </div>
                </div>
              ))}
              <Link
                to="/notificaciones"
                onClick={() => setOpenPanel(null)}
                className="block rounded-b-2xl bg-slate-50 px-4 py-3 text-center text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-slate-800"
              >
                Ver todas las notificaciones
              </Link>
            </div>
          )}
        </div>

        <button
          onClick={toggleTheme}
          className="icon-button"
          aria-label={
            theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"
          }
          title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        >
          {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        <div className="relative">
          <button
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-900"
            onClick={() =>
              setOpenPanel(openPanel === "profile" ? null : "profile")
            }
            aria-expanded={openPanel === "profile"}
            aria-label="Abrir menú de usuario"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-violet-100 to-brand-100 text-sm font-bold text-brand-800 ring-2 ring-white dark:from-violet-950 dark:to-brand-950 dark:text-brand-200 dark:ring-slate-950">
              {getInitials(user)}
            </span>
            <span className="hidden text-left xl:block">
              <span className="block max-w-36 truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                {displayName}
              </span>
              <span className="mt-0.5 block max-w-36 truncate text-[10px] text-slate-400">
                {user?.email || "Cuenta conectada"}
              </span>
            </span>
            <ChevronDown size={14} className="hidden text-slate-400 xl:block" />
          </button>
          {openPanel === "profile" && (
            <div className="popover-panel right-0 w-60 p-2">
              <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                  {displayName}
                </p>
                <p className="mt-1 truncate text-[11px] text-slate-400">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={() => {
                  setOpenPanel(null);
                  navigate("/perfil");
                }}
                className="dropdown-item"
              >
                <UserRound size={16} />
                Mi perfil
              </button>
              <button
                onClick={() => {
                  setOpenPanel(null);
                  navigate("/perfil");
                }}
                className="dropdown-item"
              >
                <Settings size={16} />
                Preferencias
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="dropdown-item text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:text-rose-300 dark:hover:bg-rose-950/40"
              >
                <LogOut size={16} />
                {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
              </button>
            </div>
          )}
        </div>
      </div>
      {toast && (
        <div
          role="status"
          className="absolute right-4 top-21.5 z-50 max-w-sm rounded-xl border border-brand-100 bg-white px-4 py-3 text-xs font-medium text-slate-700 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {toast}
        </div>
      )}
    </header>
  );
}
