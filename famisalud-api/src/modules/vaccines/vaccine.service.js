import { withTransaction } from '../../config/database.js';
import { AppError } from '../../shared/utils/AppError.js';
import {
  assertCanManageMember,
  assertCanViewMember,
  assertMemberResourceManageAccess,
  assertMemberResourceViewAccess
} from '../../shared/authorization/familyAccess.js';
import { writeAuditLog } from '../../shared/utils/auditLog.js';
import * as repository from './vaccine.repository.js';

const RESOURCE = 'vaccines';
const TABLE = 'vaccines';

function normalizeDateOnly(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function assertVaccineDates(applicationDate, nextDose) {
  const normalizedApplicationDate = normalizeDateOnly(applicationDate);
  const normalizedNextDose = normalizeDateOnly(nextDose);

  if (normalizedApplicationDate && normalizedNextDose && normalizedNextDose < normalizedApplicationDate) {
    throw new AppError(
      'La próxima dosis no puede ser anterior a la fecha de aplicación.',
      422
    );
  }
}

export async function list(memberId, userId) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    return repository.list(client, memberId);
  });
}

export async function getById(memberId, resourceId, userId) {
  return withTransaction(async (client) => {
    await assertMemberResourceViewAccess(client, {
      memberId,
      resourceId,
      userId,
      tableName: TABLE
    });

    const item = await repository.findById(client, resourceId, memberId);
    if (!item) throw new AppError('Registro no encontrado.', 404);
    return item;
  });
}

export async function create(memberId, userId, data) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);

    assertVaccineDates(data.applicationDate, data.nextDose);

    const item = await repository.create(client, memberId, data);

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'CREATE',
      entity: RESOURCE,
      entityId: item.id,
      changes: { new: item }
    });

    return item;
  });
}

export async function update(memberId, resourceId, userId, data) {
  return withTransaction(async (client) => {
    const { member } = await assertMemberResourceManageAccess(client, {
      memberId,
      resourceId,
      userId,
      tableName: TABLE
    });

    const before = await repository.findById(client, resourceId, memberId);
    if (!before) throw new AppError('Registro no encontrado.', 404);

    const effectiveApplicationDate = data.applicationDate !== undefined
      ? data.applicationDate
      : before.application_date;
    const effectiveNextDose = data.nextDose !== undefined
      ? data.nextDose
      : before.next_dose;

    assertVaccineDates(effectiveApplicationDate, effectiveNextDose);

    const item = await repository.update(client, resourceId, memberId, data);
    if (!item) throw new AppError('Registro no encontrado.', 404);

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'UPDATE',
      entity: RESOURCE,
      entityId: resourceId,
      changes: { old: before, new: item }
    });

    return item;
  });
}

export async function remove(memberId, resourceId, userId) {
  return withTransaction(async (client) => {
    const { member } = await assertMemberResourceManageAccess(client, {
      memberId,
      resourceId,
      userId,
      tableName: TABLE
    });

    const item = await repository.softDelete(client, resourceId, memberId);
    if (!item) throw new AppError('Registro no encontrado.', 404);

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'DELETE',
      entity: RESOURCE,
      entityId: resourceId,
      changes: { deletedAt: item.deleted_at }
    });

    return item;
  });
}
