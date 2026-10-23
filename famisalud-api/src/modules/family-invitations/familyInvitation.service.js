import { createHash, randomBytes } from 'node:crypto';
import { withTransaction } from '../../config/database.js';
import { env } from '../../config/env.js';
import { sendFamilyInvitationEmail, hasSmtpConfiguration } from '../../config/mailer.js';
import { AppError } from '../../shared/utils/AppError.js';
import { assertCanManageFamily } from '../../shared/authorization/familyAccess.js';
import { writeAuditLog } from '../../shared/utils/auditLog.js';
import * as repository from './familyInvitation.repository.js';

function createRawToken() {
  return randomBytes(32).toString('base64url');
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function invitationUrl(token) {
  const base = env.FRONTEND_URL.replace(/\/$/, '');
  return `${base}/invitations/accept?token=${encodeURIComponent(token)}`;
}

function inviterFullName(user) {
  return `${user.first_name} ${user.last_name}`.trim();
}

async function auditExpiredRows(client, rows) {
  for (const invitation of rows) {
    await writeAuditLog(client, {
      userId: null,
      familyId: invitation.family_id,
      action: 'EXPIRE',
      entity: 'family_invitations',
      entityId: invitation.id,
      changes: { old: { status: 'PENDIENTE' }, new: { status: 'EXPIRADA' } }
    });
  }
}

async function hasValidActiveMembershipOrRepair(client, { familyId, userId, auditUserId }) {
  const membership = await repository.findActiveMembership(client, familyId, userId);
  if (!membership) return false;

  const linkedMember = await repository.findLinkedMember(client, familyId, userId);
  if (linkedMember) return true;

  const closed = await repository.leaveFamilyMembershipForUser(client, familyId, userId);
  if (closed) {
    await writeAuditLog(client, {
      userId: auditUserId ?? null,
      familyId,
      action: 'REPAIR_STALE_MEMBERSHIP',
      entity: 'family_users',
      entityId: closed.id,
      changes: {
        reason: 'Se cerró una membresía activa sin perfil familiar activo para permitir una nueva invitación.',
        old: { left_at: null },
        new: { left_at: closed.left_at }
      }
    });
  }

  return false;
}

async function sendInvitationEmailOrMarkFailure({ invitation, token, familyName, inviter, invitee }) {
  let emailSent = false;
  let warning = null;

  if (hasSmtpConfiguration()) {
    try {
      await sendFamilyInvitationEmail({
        to: invitation.email,
        inviteeName: invitee?.first_name ?? null,
        inviterName: inviterFullName(inviter),
        familyName,
        inviteUrl: invitationUrl(token),
        expiresAt: invitation.expires_at
      });
      emailSent = true;
    } catch (error) {
      console.error('[family-invitations] No se pudo enviar el correo de invitación:', error.message);
      warning = 'La invitación se guardó, pero no se pudo enviar el correo. Puedes intentar de nuevo o copiar el token de depuración en desarrollo.';
      await withTransaction(async (client) => {
        await writeAuditLog(client, {
          userId: inviter.id,
          familyId: invitation.family_id,
          action: 'EMAIL_FAILED',
          entity: 'family_invitations',
          entityId: invitation.id,
          changes: { emailSent: false }
        });
      });
    }
  } else {
    warning = 'El SMTP no está configurado; no se envió el correo.';
  }

  const result = { invitation, emailSent, ...(warning ? { warning } : {}) };
  if (env.NODE_ENV !== 'production') result.debugToken = token;
  return result;
}

export async function createInvitation(familyId, invitedByUserId, data) {
  if (env.NODE_ENV === 'production' && !hasSmtpConfiguration()) {
    throw new AppError('Configura SMTP antes de enviar invitaciones.', 503);
  }

  const token = createRawToken();
  const tokenHash = hashToken(token);
  const created = await withTransaction(async (client) => {
    const inviter = await repository.findUserById(client, invitedByUserId);
    if (!inviter) throw new AppError('Usuario no encontrado o inactivo.', 401);

    await assertCanManageFamily(client, familyId, invitedByUserId);
    const family = await repository.findFamily(client, familyId);
    if (!family) throw new AppError('Familia no encontrada.', 404);

    if (String(inviter.email).toLowerCase() === data.email.toLowerCase()) {
      throw new AppError('No puedes invitar tu propio correo a la familia.', 422);
    }

    const expiredRows = await repository.expirePendingInvitations(client, {
      familyId,
      email: data.email
    });
    await auditExpiredRows(client, expiredRows);

    const existingUser = await repository.findUserByEmail(client, data.email);
    if (existingUser && await hasValidActiveMembershipOrRepair(client, {
      familyId,
      userId: existingUser.id,
      auditUserId: invitedByUserId
    })) {
      throw new AppError('Este usuario ya pertenece a la familia.', 409);
    }

    const existingInvitation = await repository.findPendingInvitationByEmail(client, familyId, data.email);
    if (existingInvitation) throw new AppError('Ya existe una invitación pendiente para ese correo.', 409);

    if (data.memberId) {
      const member = await repository.findMemberForInvitation(client, familyId, data.memberId);
      if (!member) throw new AppError('El miembro indicado no existe en esta familia.', 404);
      if (member.linked_user_id && (!existingUser || member.linked_user_id !== existingUser.id)) {
        throw new AppError('Ese perfil ya está vinculado a otra cuenta.', 409);
      }
      if (member.relationship !== data.relationship || (member.custom_relationship ?? null) !== (data.customRelationship ?? null)) {
        throw new AppError('La relación enviada no coincide con el perfil del miembro seleccionado.', 422);
      }
    }

    const invitation = await repository.createInvitation(client, {
      familyId,
      invitedByUserId,
      email: data.email,
      relationship: data.relationship,
      customRelationship: data.customRelationship,
      memberId: data.memberId,
      tokenHash
    });

    const invitee = existingUser;
    if (invitee) {
      await repository.createNotification(client, {
        userId: invitee.id,
        title: `Invitación a ${family.name}`,
        body: `${inviterFullName(inviter)} te invitó a unirte a ${family.name}. Revisa el correo de invitación para responder.`,
        entityId: invitation.id,
        metadata: { module: 'family', destinationTab: 'received', familyId: family.id, invitationId: invitation.id }
      });
    }

    await writeAuditLog(client, {
      userId: invitedByUserId,
      familyId,
      action: 'INVITE',
      entity: 'family_invitations',
      entityId: invitation.id,
      changes: {
        new: {
          email: invitation.email,
          relationship: invitation.relationship,
          custom_relationship: invitation.custom_relationship,
          member_id: invitation.member_id,
          status: invitation.status,
          expires_at: invitation.expires_at
        }
      }
    });

    return { invitation, family, inviter, invitee };
  });

  const result = await sendInvitationEmailOrMarkFailure({
    invitation: created.invitation,
    token,
    familyName: created.family.name,
    inviter: created.inviter,
    invitee: created.invitee
  });
  return result;
}

export async function resendInvitation(familyId, invitationId, userId) {
  if (env.NODE_ENV === 'production' && !hasSmtpConfiguration()) {
    throw new AppError('Configura SMTP antes de reenviar invitaciones.', 503);
  }

  const token = createRawToken();
  const tokenHash = hashToken(token);
  const result = await withTransaction(async (client) => {
    await assertCanManageFamily(client, familyId, userId);
    const expiredRows = await repository.expirePendingInvitations(client, { familyId });
    await auditExpiredRows(client, expiredRows);

    const existing = await repository.findInvitationByIdForUpdate(client, familyId, invitationId);
    if (!existing) throw new AppError('Invitación no encontrada.', 404);
    if (existing.status === 'EXPIRADA') return { error: 'EXPIRED' };
    if (existing.status !== 'PENDIENTE') {
      return { error: 'NOT_PENDING', status: existing.status };
    }
    if (new Date(existing.expires_at) <= new Date()) {
      await repository.markInvitationStatus(client, invitationId, 'EXPIRADA');
      await writeAuditLog(client, {
        userId: null,
        familyId,
        action: 'EXPIRE',
        entity: 'family_invitations',
        entityId: invitationId,
        changes: { old: { status: 'PENDIENTE' }, new: { status: 'EXPIRADA' } }
      });
      return { error: 'EXPIRED' };
    }

    const updated = await repository.updateInvitationToken(client, invitationId, tokenHash);
    if (!updated) throw new AppError('No fue posible actualizar el token de invitación.', 409);
    const family = await repository.findFamily(client, familyId);
    const inviter = await repository.findUserById(client, userId);
    const invitee = await repository.findUserByEmail(client, existing.email);

    await writeAuditLog(client, {
      userId,
      familyId,
      action: 'RESEND',
      entity: 'family_invitations',
      entityId: invitationId,
      changes: { expiresAt: updated.expires_at }
    });

    return { invitation: updated, family, inviter, invitee };
  });

  if (result.error === 'EXPIRED') {
    throw new AppError('La invitación expiró. Crea una nueva invitación.', 410);
  }
  if (result.error === 'NOT_PENDING') {
    throw new AppError(`Solo puedes reenviar invitaciones pendientes; estado actual: ${result.status}.`, 409);
  }

  return sendInvitationEmailOrMarkFailure({
    invitation: result.invitation,
    token,
    familyName: result.family.name,
    inviter: result.inviter,
    invitee: result.invitee
  });
}

export async function listFamilyInvitations(familyId, userId, filters) {
  return withTransaction(async (client) => {
    await assertCanManageFamily(client, familyId, userId);
    const expiredRows = await repository.expirePendingInvitations(client, { familyId });
    await auditExpiredRows(client, expiredRows);
    return repository.listFamilyInvitations(client, familyId, filters);
  });
}

export async function listMyInvitations(userId, limit = 50) {
  return withTransaction(async (client) => {
    const user = await repository.findUserById(client, userId);
    if (!user) throw new AppError('Usuario no encontrado o inactivo.', 401);
    const expiredRows = await repository.expirePendingInvitations(client, { email: user.email });
    await auditExpiredRows(client, expiredRows);
    return repository.listInvitationsForEmail(client, user.email, limit);
  });
}

async function notifyInviter(client, invitation, status, actingUser) {
  if (!invitation.invited_by_user_id || invitation.invited_by_user_id === actingUser.id) return;
  const text = status === 'ACEPTADA'
    ? `${actingUser.first_name} ${actingUser.last_name} aceptó la invitación a ${invitation.family_name}.`
    : `${actingUser.first_name} ${actingUser.last_name} rechazó la invitación a ${invitation.family_name}.`;
  await repository.createNotification(client, {
    userId: invitation.invited_by_user_id,
    title: `Invitación ${status.toLowerCase()}`,
    body: text,
    entityId: invitation.id,
    metadata: { module: 'family', destinationTab: 'sent', familyId: invitation.family_id, invitationId: invitation.id }
  });
}

export async function getInvitationPreview(userId, token) {
  return withTransaction(async (client) => {
    const user = await repository.findUserById(client, userId);
    if (!user) throw new AppError('Usuario no encontrado o inactivo.', 401);

    const invitation = await repository.findInvitationByTokenForUpdate(client, hashToken(token));
    if (!invitation) throw new AppError('Invitación no encontrada.', 404);

    if (String(user.email).toLowerCase() !== String(invitation.email).toLowerCase()) {
      throw new AppError('Esta invitación fue enviada a otro correo. Inicia sesión con la cuenta invitada.', 403);
    }

    return {
      invitation: {
        id: invitation.id,
        familyId: invitation.family_id,
        familyName: invitation.family_name,
        status: invitation.status,
        expiresAt: invitation.expires_at,
        relationship: invitation.relationship,
        customRelationship: invitation.custom_relationship
      }
    };
  });
}

export async function acceptInvitation(userId, data) {
  const outcome = await withTransaction(async (client) => {
    const invitation = await repository.findInvitationByTokenForUpdate(client, hashToken(data.token));
    if (!invitation) return { error: 'NOT_FOUND' };

    const user = await repository.findUserById(client, userId);
    if (!user) return { error: 'UNAUTHENTICATED' };
    if (String(user.email).toLowerCase() !== String(invitation.email).toLowerCase()) {
      return { error: 'EMAIL_MISMATCH' };
    }

    if (invitation.status === 'EXPIRADA') return { error: 'EXPIRED' };
    if (invitation.status === 'PENDIENTE' && new Date(invitation.expires_at) <= new Date()) {
      await repository.markInvitationStatus(client, invitation.id, 'EXPIRADA');
      await writeAuditLog(client, {
        userId: null,
        familyId: invitation.family_id,
        action: 'EXPIRE',
        entity: 'family_invitations',
        entityId: invitation.id,
        changes: { old: { status: 'PENDIENTE' }, new: { status: 'EXPIRADA' } }
      });
      return { error: 'EXPIRED' };
    }
    if (invitation.status !== 'PENDIENTE') return { error: 'NOT_PENDING', status: invitation.status };

    if (await hasValidActiveMembershipOrRepair(client, {
      familyId: invitation.family_id,
      userId,
      auditUserId: userId
    })) {
      return { error: 'ALREADY_MEMBER' };
    }

    let member = null;
    if (invitation.member_id) {
      member = await repository.findMemberForInvitation(client, invitation.family_id, invitation.member_id);
      if (!member) return { error: 'MEMBER_NOT_FOUND' };
      if (member.linked_user_id && member.linked_user_id !== userId) {
        return { error: 'MEMBER_ALREADY_LINKED' };
      }
    }

    const alreadyLinked = await repository.findLinkedMember(client, invitation.family_id, userId);
    if (alreadyLinked && member && alreadyLinked.id !== member.id) {
      return { error: 'USER_ALREADY_LINKED' };
    }

    if (member) {
      const linkedMember = await repository.linkMemberToUser(client, member.id, userId);
      if (!linkedMember) throw new AppError('No fue posible vincular la cuenta al perfil.', 409);
      if (linkedMember.conflict === 'PERSON_LINKED_TO_OTHER_ACCOUNT') {
        return { error: 'MEMBER_ALREADY_LINKED' };
      }
      if (linkedMember.conflict === 'DUPLICATE_ACTIVE_PROFILE') {
        return { error: 'USER_ALREADY_LINKED' };
      }
      member = linkedMember;
    } else if (alreadyLinked) {
      member = alreadyLinked;
    }

    const membership = await repository.createFamilyMembership(client, invitation.family_id, userId);
    if (!membership) throw new AppError('Ya perteneces a esta familia o no fue posible activar la membresía.', 409);

    if (!member) {
      member = await repository.createLinkedMember(client, invitation, user);
    }

    const accepted = await repository.markInvitationStatus(client, invitation.id, 'ACEPTADA');
    if (!accepted) throw new AppError('La invitación ya no está pendiente.', 409);

    await writeAuditLog(client, {
      userId,
      familyId: invitation.family_id,
      action: 'ACCEPT',
      entity: 'family_invitations',
      entityId: invitation.id,
      changes: { old: { status: 'PENDIENTE' }, new: { status: 'ACEPTADA' }, memberId: member.id, personId: member.person_id }
    });
    await writeAuditLog(client, {
      userId,
      familyId: invitation.family_id,
      action: alreadyLinked || invitation.member_id ? 'LINK_ACCOUNT' : 'CREATE_FROM_INVITATION',
      entity: 'family_members',
      entityId: member.id,
      changes: { personId: member.person_id, linkedUserId: userId, relationship: member.relationship }
    });
    await writeAuditLog(client, {
      userId,
      familyId: invitation.family_id,
      action: 'JOIN',
      entity: 'family_users',
      entityId: membership.id,
      changes: { role: membership.role }
    });
    await notifyInviter(client, invitation, 'ACEPTADA', user);

    return {
      invitation: { id: accepted.id, status: accepted.status, familyId: invitation.family_id, familyName: invitation.family_name },
      membership,
      member: { id: member.id, person_id: member.person_id, first_name: member.first_name, last_name: member.last_name, linked_user_id: member.linked_user_id }
    };
  });

  if (outcome.error) {
    const errors = {
      NOT_FOUND: ['Invitación no encontrada.', 404],
      UNAUTHENTICATED: ['Usuario no encontrado o inactivo.', 401],
      EMAIL_MISMATCH: ['La invitación fue enviada a otro correo.', 403],
      EXPIRED: ['La invitación expiró. Solicita una nueva invitación.', 410],
      NOT_PENDING: [`La invitación ya no está pendiente (${outcome.status}).`, 409],
      ALREADY_MEMBER: ['Ya perteneces a esta familia.', 409],
      MEMBER_NOT_FOUND: ['El miembro que se iba a vincular ya no existe en esta familia.', 404],
      MEMBER_ALREADY_LINKED: ['El miembro ya está vinculado a otra cuenta.', 409],
      USER_ALREADY_LINKED: ['Tu cuenta ya está vinculada a otro perfil activo de esta familia; no se puede fusionar automáticamente.', 409],
    };
    const [message, statusCode] = errors[outcome.error] ?? ['No fue posible aceptar la invitación.', 409];
    throw new AppError(message, statusCode);
  }

  return outcome;
}

export async function rejectInvitation(userId, data) {
  const outcome = await withTransaction(async (client) => {
    const invitation = await repository.findInvitationByTokenForUpdate(client, hashToken(data.token));
    if (!invitation) return { error: 'NOT_FOUND' };
    const user = await repository.findUserById(client, userId);
    if (!user) return { error: 'UNAUTHENTICATED' };
    if (String(user.email).toLowerCase() !== String(invitation.email).toLowerCase()) return { error: 'EMAIL_MISMATCH' };

    if (invitation.status === 'EXPIRADA') return { error: 'EXPIRED' };
    if (invitation.status === 'PENDIENTE' && new Date(invitation.expires_at) <= new Date()) {
      await repository.markInvitationStatus(client, invitation.id, 'EXPIRADA');
      await writeAuditLog(client, {
        userId: null,
        familyId: invitation.family_id,
        action: 'EXPIRE',
        entity: 'family_invitations',
        entityId: invitation.id,
        changes: { old: { status: 'PENDIENTE' }, new: { status: 'EXPIRADA' } }
      });
      return { error: 'EXPIRED' };
    }
    if (invitation.status !== 'PENDIENTE') return { error: 'NOT_PENDING', status: invitation.status };

    const rejected = await repository.markInvitationStatus(client, invitation.id, 'RECHAZADA');
    await writeAuditLog(client, {
      userId,
      familyId: invitation.family_id,
      action: 'REJECT',
      entity: 'family_invitations',
      entityId: invitation.id,
      changes: { old: { status: 'PENDIENTE' }, new: { status: 'RECHAZADA' } }
    });
    await notifyInviter(client, invitation, 'RECHAZADA', user);
    return { invitation: rejected };
  });

  if (outcome.error) {
    const errors = {
      NOT_FOUND: ['Invitación no encontrada.', 404],
      UNAUTHENTICATED: ['Usuario no encontrado o inactivo.', 401],
      EMAIL_MISMATCH: ['La invitación fue enviada a otro correo.', 403],
      EXPIRED: ['La invitación expiró. Solicita una nueva invitación.', 410],
      NOT_PENDING: [`La invitación ya no está pendiente (${outcome.status}).`, 409]
    };
    const [message, statusCode] = errors[outcome.error] ?? ['No fue posible rechazar la invitación.', 409];
    throw new AppError(message, statusCode);
  }

  return outcome.invitation;
}


export async function expireInvitationsSweep() {
  return withTransaction(async (client) => {
    const expiredRows = await repository.expirePendingInvitations(client);
    await auditExpiredRows(client, expiredRows);
    return { expired: expiredRows.length };
  });
}
