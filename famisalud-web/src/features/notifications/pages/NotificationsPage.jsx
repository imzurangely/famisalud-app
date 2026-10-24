import Select from "../../../shared/components/ui/Select.jsx";
import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  Info,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../../../shared/components/ui/Button.jsx";
import EmptyState from "../../../shared/components/ui/EmptyState.jsx";
import { notify } from "../../../shared/utils/feedback.js";
import { useNotificationsSummary } from "../context/NotificationsContext.jsx";
import NotificationItem from "../components/NotificationItem.jsx";
import {
  listNotifications,
  NOTIFICATION_TYPES,
} from "../services/notificationsService.js";
import { notificationIsUnread } from "../utils/notificationUtils.js";

function InlineError({ message, onRetry }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200 sm:flex-row sm:items-center sm:justify-between"
    >
      <span>{message}</span>
      <Button
        variant="secondary"
        onClick={onRetry}
        className="min-h-9! shrink-0 px-3! py-2!"
      >
        <RefreshCw size={14} /> Reintentar
      </Button>
    </div>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { unreadCount, refreshNotifications, markRead, markAllRead } =
    useNotificationsSummary();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listNotifications({
        limit: 100,
        unreadOnly: filter === "UNREAD",
        notificationType: typeFilter,
      });
      setNotifications(result.items);
    } catch (requestError) {
      setError(
        requestError?.message || "No fue posible cargar las notificaciones.",
      );
    } finally {
      setLoading(false);
    }
  }, [filter, typeFilter, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleMarkRead(notification) {
    setBusyId(notification.id);
    try {
      const updated = await markRead(notification.id);
      setNotifications((items) =>
        items.map((item) =>
          item.id === notification.id
            ? { ...item, ...(updated || {}), is_read: true }
            : item,
        ),
      );
    } catch (requestError) {
      notify.error(
        requestError?.message ||
          "No fue posible marcar la notificación como leída.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      const result = await markAllRead();
      setNotifications((items) =>
        items.map((item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at || new Date().toISOString(),
        })),
      );
      notify.success(
        `${Number(result?.updatedCount) || 0} notificaciones marcadas como leídas.`,
      );
    } catch (requestError) {
      notify.error(
        requestError?.message ||
          "No fue posible actualizar las notificaciones.",
      );
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleOpen(notification, destination) {
    if (notificationIsUnread(notification)) {
      try {
        await handleMarkRead(notification);
      } catch {
        // handleMarkRead informa el error; la navegación sigue disponible.
      }
    }
    navigate(destination);
  }

  async function handleRefresh() {
    setRefreshKey((current) => current + 1);
    try {
      await refreshNotifications();
    } catch {
      /* el listado expone su propio error */
    }
  }

  const filteredUnreadCount = notifications.filter(notificationIsUnread).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">
            Avisos de tu cuenta
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Notificaciones
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Consulta recordatorios de medicamentos y citas, invitaciones
            familiares y novedades de los trámites. Los avisos corresponden a tu
            cuenta autenticada.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{" "}
            Actualizar
          </Button>
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllRead}
              disabled={markingAll || loading}
            >
              <CheckCheck size={16} />{" "}
              {markingAll ? "Actualizando…" : "Marcar todas leídas"}
            </Button>
          )}
        </div>
      </header>

      <section className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/80 p-4 dark:border-sky-900/60 dark:bg-sky-950/20">
        <Info
          size={18}
          className="mt-0.5 shrink-0 text-sky-700 dark:text-sky-300"
        />
        <div>
          <p className="text-xs font-bold text-sky-900 dark:text-sky-200">
            Centro de avisos dentro de FamiSalud
          </p>
          <p className="mt-1 text-xs leading-relaxed text-sky-800/80 dark:text-sky-200/80">
            Los avisos se consultan aquí y en el menú superior. Las
            notificaciones push del navegador no están activadas: requieren
            configurar una suscripción web y un servicio de envío; registrar un
            dispositivo por sí solo no las habilita.
          </p>
        </div>
      </section>

      <section className="surface-card space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
              <SlidersHorizontal size={17} />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Filtrar avisos
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {unreadCount} sin leer en total
                {filter === "UNREAD"
                  ? ` · ${filteredUnreadCount} visibles`
                  : ""}
              </p>
            </div>
          </div>
          <label className="block sm:min-w-64">
            <span className="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Tipo de notificación
            </span>
            <Select
              className="form-input min-h-10 py-2 text-xs"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="">Todos los tipos</option>
              {NOTIFICATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Estado de lectura"
        >
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            aria-pressed={filter === "ALL"}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${filter === "ALL" ? "bg-brand-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"}`}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => setFilter("UNREAD")}
            aria-pressed={filter === "UNREAD"}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${filter === "UNREAD" ? "bg-brand-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"}`}
          >
            Sin leer{" "}
            {unreadCount > 0 && <span className="ml-1">({unreadCount})</span>}
          </button>
        </div>
      </section>

      <InlineError message={error} onRetry={handleRefresh} />

      {loading ? (
        <div
          className="grid gap-3"
          aria-label="Cargando notificaciones"
          aria-busy="true"
        >
          {[0, 1, 2].map((item) => (
            <div key={item} className="surface-card h-36 animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={
            filter === "UNREAD"
              ? "No tienes avisos sin leer"
              : "No hay notificaciones para mostrar"
          }
          description={
            filter === "UNREAD"
              ? "¡Todo al día! Cuando llegue un nuevo aviso, aparecerá aquí."
              : typeFilter
                ? "No hay avisos que coincidan con el tipo seleccionado. Prueba otro filtro."
                : "Los recordatorios de tus medicamentos, citas y trámites aparecerán aquí cuando se generen."
          }
          action={
            filter !== "ALL" || typeFilter ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setFilter("ALL");
                  setTypeFilter("");
                }}
              >
                Limpiar filtros
              </Button>
            ) : null
          }
        />
      ) : (
        <section className="space-y-3" aria-label="Lista de notificaciones">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              busy={busyId === notification.id}
              onMarkRead={handleMarkRead}
              onOpen={handleOpen}
            />
          ))}
          <p className="px-1 text-[10px] leading-relaxed text-slate-400">
            Se muestran como máximo las 100 notificaciones más recientes. El
            estado de lectura se guarda en el servidor.
          </p>
        </section>
      )}
    </div>
  );
}
