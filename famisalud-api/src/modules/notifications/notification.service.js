import { withTransaction } from '../../config/database.js';
import { AppError } from '../../shared/utils/AppError.js';
import * as repository from './notification.repository.js';

export async function list(userId, filters) {
  return withTransaction(async (client) => {
    const items = await repository.list(client, userId, filters);
    const unreadCount = await repository.countUnread(client, userId);
    return { items, unreadCount };
  });
}

export async function getById(notificationId, userId) {
  return withTransaction(async (client) => {
    const notification = await repository.findById(client, notificationId, userId);
    if (!notification) throw new AppError('Notificación no encontrada.', 404);
    return notification;
  });
}

export async function markAsRead(notificationId, userId) {
  return withTransaction(async (client) => {
    const existing = await repository.findById(client, notificationId, userId);
    if (!existing) throw new AppError('Notificación no encontrada.', 404);

    if (existing.is_read) return existing;

    const notification = await repository.markAsRead(client, notificationId, userId);
    return notification ?? existing;
  });
}

export async function markAllAsRead(userId) {
  return withTransaction(async (client) => {
    const updatedCount = await repository.markAllAsRead(client, userId);
    return { updatedCount };
  });
}
