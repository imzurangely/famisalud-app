import { withTransaction } from '../../config/database.js';
import { AppError } from '../../shared/utils/AppError.js';
import { writeAuditLog } from '../../shared/utils/auditLog.js';
import * as repository from './device.repository.js';

const ENTITY = 'USER_DEVICE';

export async function list(userId) {
  return withTransaction((client) => repository.list(client, userId));
}

export async function register(userId, data) {
  return withTransaction(async (client) => {
    const existing = await repository.findByToken(client, data.deviceToken);

    if (existing && existing.user_id !== userId) {
      throw new AppError('El dispositivo ya está registrado para otro usuario.', 409);
    }

    if (existing) {
      const device = await repository.update(client, existing.id, userId, { isActive: true, osType: data.osType, deviceName: data.deviceName });
      await writeAuditLog(client, {
        userId,
        familyId: null,
        action: 'UPDATE',
        entity: ENTITY,
        entityId: existing.id,
        changes: { action: 'REACTIVATE', before: existing, after: device }
      });
      return device;
    }

    try {
      const device = await repository.create(client, userId, data);
      await writeAuditLog(client, {
        userId,
        familyId: null,
        action: 'CREATE',
        entity: ENTITY,
        entityId: device.id,
        changes: { new: device }
      });
      return device;
    } catch (error) {
      if (error?.code === '23505') {
        throw new AppError('El dispositivo ya está registrado.', 409);
      }
      throw error;
    }
  });
}

export async function update(deviceId, userId, data) {
  return withTransaction(async (client) => {
    const before = await repository.findById(client, deviceId, userId);
    if (!before) throw new AppError('Dispositivo no encontrado.', 404);

    const device = await repository.update(client, deviceId, userId, data);
    if (!device) throw new AppError('Dispositivo no encontrado.', 404);

    await writeAuditLog(client, {
      userId,
      familyId: null,
      action: 'UPDATE',
      entity: ENTITY,
      entityId: device.id,
      changes: { before, after: device }
    });

    return device;
  });
}

export async function deactivate(deviceId, userId) {
  return update(deviceId, userId, { isActive: false });
}
