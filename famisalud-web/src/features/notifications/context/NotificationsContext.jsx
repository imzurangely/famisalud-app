import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notificationsService.js';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [previewItems, setPreviewItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const refreshNotifications = useCallback(async () => {
    try {
      const result = await listNotifications({ limit: 5 });
      setPreviewItems(result.items);
      setUnreadCount(result.unreadCount);
      setSummaryError('');
      return result;
    } catch (error) {
      setSummaryError(error?.message || 'No se pudo actualizar el resumen de notificaciones.');
      throw error;
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const markRead = useCallback(async (notificationId) => {
    const updated = await markNotificationAsRead(notificationId);
    setPreviewItems((items) => items.map((item) => (
      item.id === notificationId ? { ...item, ...(updated || {}), is_read: true } : item
    )));
    try { await refreshNotifications(); } catch { /* el estado de lectura ya se guardó */ }
    return updated;
  }, [refreshNotifications]);

  const markAllRead = useCallback(async () => {
    const result = await markAllNotificationsAsRead();
    setPreviewItems((items) => items.map((item) => ({ ...item, is_read: true, read_at: item.read_at || new Date().toISOString() })));
    setUnreadCount(0);
    try { await refreshNotifications(); } catch { /* el cambio ya se guardó en el servidor */ }
    return result;
  }, [refreshNotifications]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await listNotifications({ limit: 5 });
        if (!active) return;
        setPreviewItems(result.items);
        setUnreadCount(result.unreadCount);
        setSummaryError('');
      } catch (error) {
        if (active) setSummaryError(error?.message || 'No se pudo consultar el resumen de notificaciones.');
      } finally {
        if (active) setSummaryLoading(false);
      }
    };

    load();
    const intervalId = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const value = useMemo(() => ({
    previewItems,
    unreadCount,
    summaryLoading,
    summaryError,
    refreshNotifications,
    markRead,
    markAllRead,
  }), [previewItems, unreadCount, summaryLoading, summaryError, refreshNotifications, markRead, markAllRead]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotificationsSummary() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotificationsSummary debe usarse dentro de NotificationsProvider.');
  return context;
}
