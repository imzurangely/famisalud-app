import { ArrowUpRight, Check, Circle } from 'lucide-react';
import {
  formatNotificationDate,
  getNotificationDestination,
  getNotificationIconClass,
  getNotificationPresentation,
  notificationIsUnread,
} from '../utils/notificationUtils.js';

export default function NotificationItem({ notification, onOpen, onMarkRead, busy = false, compact = false }) {
  const presentation = getNotificationPresentation(notification.notification_type);
  const Icon = presentation.icon;
  const unread = notificationIsUnread(notification);
  const iconClass = getNotificationIconClass(notification.notification_type);

  return (
    <article className={`flex min-w-0 gap-3 ${compact ? 'px-4 py-3' : 'rounded-2xl border p-4 sm:p-5'} ${!compact ? unread ? 'border-brand-200 bg-brand-50/50 dark:border-brand-900/70 dark:bg-brand-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60' : 'border-b border-slate-100 last:border-0 dark:border-slate-800/70'}`}>
      <span className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
          <h3 className={`min-w-0 flex-1 text-xs leading-relaxed ${unread ? 'font-extrabold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-200'}`}>
            {notification.title || presentation.label}
          </h3>
          {unread && <span className="mt-1 size-2 shrink-0 rounded-full bg-brand-500" aria-label="No leída" title="No leída" />}
        </div>
        {notification.body && <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-slate-600 dark:text-slate-300">{notification.body}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-400">
          <span>{presentation.label}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={notification.created_at || undefined}>{formatNotificationDate(notification.created_at)}</time>
          {!unread && <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><Check size={11} /> Leída</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => onOpen(notification, getNotificationDestination(notification))} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-brand-700 transition hover:bg-brand-50 dark:border-brand-900 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-950/50">
            Abrir módulo <ArrowUpRight size={13} />
          </button>
          {unread && <button type="button" disabled={busy} onClick={() => onMarkRead(notification)} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"><Circle size={11} /> {busy ? 'Guardando…' : 'Marcar como leída'}</button>}
        </div>
      </div>
    </article>
  );
}
