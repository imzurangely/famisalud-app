import { useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  UserRound,
  X,
  Sun,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import GlobalSearch from "./GlobalSearch.jsx";
import PersonAvatar from "../ui/PersonAvatar.jsx";
import { useTheme } from "../../hooks/useTheme.js";
import { useAuth } from "../../hooks/useAuth.js";
import { mainNavigation } from "../../../routes/navigation.js";
import { useNotificationsSummary } from "../../../features/notifications/context/NotificationsContext.jsx";
import {
  getNotificationDestination,
  getNotificationIconClass,
  getNotificationPresentation,
  formatNotificationDate,
  notificationIsUnread,
} from "../../../features/notifications/utils/notificationUtils.js";

function getInitials(user) {
  const first = (user?.firstName || user?.first_name || "").trim()[0] || "";
  const last = (user?.lastName || user?.last_name || "").trim()[0] || "";
  return `${first}${last}`.toUpperCase() || "FS";
}

export default function Topbar({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const {
    previewItems,
    unreadCount,
    summaryLoading,
    summaryError,
    refreshNotifications,
    markRead,
  } = useNotificationsSummary();
  const [openPanel, setOpenPanel] = useState(null);
  const [toast, setToast] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [busyNotificationId, setBusyNotificationId] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = mainNavigation.find(
    (item) => item.to === location.pathname,
  );
  const pageTitle =
    currentPage?.label ||
    (location.pathname === "/perfil"
      ? "Mi perfil"
      : "FamiSalud"); /* : location.pathname === '/preferencias' ? 'Preferencias' : 'FamiSalud' */

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

  async function openNotifications() {
    const shouldOpen = openPanel !== "notifications";
    setOpenPanel(shouldOpen ? "notifications" : null);
    if (shouldOpen) {
      try {
        await refreshNotifications();
      } catch {
        /* el panel conserva los últimos datos */
      }
    }
  }

  async function handleMarkRead(notification) {
    if (busyNotificationId) return;
    setBusyNotificationId(notification.id);
    try {
      await markRead(notification.id);
    } catch (error) {
      setToast(error?.message || "No se pudo marcar el aviso como leído.");
      window.setTimeout(() => setToast(""), 3500);
    } finally {
      setBusyNotificationId("");
    }
  }

  async function openNotification(notification) {
    if (notificationIsUnread(notification)) await handleMarkRead(notification);
    setOpenPanel(null);
    navigate(getNotificationDestination(notification));
  }

  const displayName =
    [user?.firstName || user?.first_name, user?.lastName || user?.last_name].filter(Boolean).join(" ") || "Mi cuenta";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
      <div className="flex h-19.5 items-center gap-3 px-4 sm:px-6 lg:px-9">
        <button
          onClick={onMenuClick}
          className="icon-button"
          aria-label="Abrir menú"
        >
          <Menu size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="mt-1 truncate font-display text-[19px] font-bold tracking-tight text-slate-900 dark:text-white sm:text-[21px]">
            {pageTitle}
          </h1>
        </div>

        <GlobalSearch />

        <div className="relative">
          <button
            className="icon-button relative"
            aria-label={
              unreadCount > 0
                ? `Notificaciones, ${unreadCount} sin leer`
                : "Notificaciones"
            }
            aria-expanded={openPanel === "notifications"}
            onClick={openNotifications}
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-w-4.5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 py-0.5 text-[9px] font-extrabold leading-none text-white dark:border-slate-950">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          {openPanel === "notifications" && (
            <div className="popover-panel right-0 w-[min(390px,calc(100vw-2rem))]">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    Notificaciones
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {unreadCount} sin leer
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
              <div className="soft-scrollbar max-h-[min(65vh,460px)] overflow-y-auto">
                {summaryLoading && previewItems.length === 0 ? (
                  <div className="space-y-3 p-4">
                    <div className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                    <div className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                  </div>
                ) : previewItems.length === 0 ? (
                  <div className="px-5 py-9 text-center">
                    <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                      <Bell size={18} />
                    </span>
                    <p className="mt-3 text-xs font-bold text-slate-800 dark:text-slate-100">
                      No hay notificaciones
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Los avisos nuevos aparecerán aquí.
                    </p>
                  </div>
                ) : (
                  previewItems.map((notification) => {
                    const presentation = getNotificationPresentation(
                      notification.notification_type,
                    );
                    const Icon = presentation.icon;
                    return (
                      <div
                        key={notification.id}
                        className="flex gap-3 border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800/70"
                      >
                        <button
                          type="button"
                          onClick={() => openNotification(notification)}
                          className="flex min-w-0 flex-1 gap-3 text-left"
                        >
                          <span
                            className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${getNotificationIconClass(notification.notification_type)}`}
                          >
                            <Icon size={15} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block text-xs leading-relaxed ${notificationIsUnread(notification) ? "font-extrabold text-slate-900 dark:text-white" : "font-semibold text-slate-700 dark:text-slate-200"}`}
                            >
                              {notification.title || presentation.label}
                            </span>
                            {notification.body && (
                              <span className="mt-1 line-clamp-2 block text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                                {notification.body}
                              </span>
                            )}
                            <span className="mt-1.5 block text-[10px] text-slate-400">
                              {formatNotificationDate(notification.created_at)}
                            </span>
                          </span>
                          {notificationIsUnread(notification) && (
                            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500" />
                          )}
                        </button>
                        {notificationIsUnread(notification) && (
                          <button
                            type="button"
                            aria-label="Marcar como leída"
                            title="Marcar como leída"
                            disabled={busyNotificationId === notification.id}
                            onClick={() => handleMarkRead(notification)}
                            className="icon-button size-8! self-start disabled:opacity-50"
                          >
                            <span className="text-[10px] font-bold">✓</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              {summaryError && (
                <p
                  role="status"
                  className="px-4 py-2 text-[10px] text-rose-600 dark:text-rose-300"
                >
                  No se pudo actualizar la lista. {summaryError}
                </p>
              )}
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
            <PersonAvatar
              person={user}
              initials={getInitials(user)}
              alt={`Foto de ${displayName}`}
              className="size-10 rounded-full bg-linear-to-br from-violet-100 to-brand-100 text-sm font-bold text-brand-800 ring-2 ring-white dark:from-violet-950 dark:to-brand-950 dark:text-brand-200 dark:ring-slate-950"
              imageClassName="rounded-full"
            />
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
             {/*  <button
                onClick={() => {
                  setOpenPanel(null);
                  navigate("/preferencias");
                }}
                className="dropdown-item"
              >
                <Settings size={16} />
                Preferencias
              </button> */}
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
