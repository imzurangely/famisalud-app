import { withTransaction } from '../../config/database.js';
import { AppError } from '../../shared/utils/AppError.js';
import { assertCanManageMember, assertCanViewMember } from '../../shared/authorization/familyAccess.js';
import { writeAuditLog } from '../../shared/utils/auditLog.js';
import * as repository from './reminder.repository.js';
import * as medicationRepository from '../medication-process/medicationProcess.repository.js';

export async function listRecipients(memberId, medicationId, userId) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    const medication = await medicationRepository.findMedication(client, medicationId, memberId);
    if (!medication) throw new AppError('Medicamento no encontrado.', 404);
    return repository.listRecipients(client, medicationId);
  });
}

export async function addRecipient(memberId, medicationId, actorUserId, recipientUserId) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, actorUserId);
    const medication = await medicationRepository.findMedication(client, medicationId, memberId);
    if (!medication) throw new AppError('Medicamento no encontrado.', 404);

    const isFamilyUser = await repository.userIsActiveFamilyMember(client, member.family_id, recipientUserId);
    if (!isFamilyUser) {
      throw new AppError('El usuario destinatario no pertenece activamente a la familia.', 422);
    }

    const existing = await repository.findRecipient(client, medicationId, recipientUserId);
    if (existing) {
      return existing;
    }

    const recipient = await repository.createRecipient(client, medicationId, recipientUserId);

    await writeAuditLog(client, {
      userId: actorUserId,
      familyId: member.family_id,
      action: 'CREATE',
      entity: 'REMINDER_RECIPIENT',
      entityId: recipient.id,
      changes: { new: recipient }
    });

    return recipient;
  });
}

export async function removeRecipient(memberId, medicationId, actorUserId, recipientUserId) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, actorUserId);
    const medication = await medicationRepository.findMedication(client, medicationId, memberId);
    if (!medication) throw new AppError('Medicamento no encontrado.', 404);

    const deleted = await repository.deleteRecipient(client, medicationId, recipientUserId);
    if (!deleted) throw new AppError('Destinatario de recordatorios no encontrado.', 404);

    await writeAuditLog(client, {
      userId: actorUserId,
      familyId: member.family_id,
      action: 'DELETE',
      entity: 'REMINDER_RECIPIENT',
      entityId: deleted.id,
      changes: { deleted }
    });

    return deleted;
  });
}
