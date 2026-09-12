import { withTransaction } from '../../config/database.js';
import { AppError } from '../../shared/utils/AppError.js';
import { assertCanManageMember, assertCanViewMember } from '../../shared/authorization/familyAccess.js';
import { writeAuditLog } from '../../shared/utils/auditLog.js';
import * as repository from './medicalAppointment.repository.js';

const assertNoConflict = async (client, { memberId, startsAt, appointmentId = null }) => {
  const conflict = await repository.findConflictingAppointment(client, memberId, startsAt, appointmentId);

  if (conflict) {
    throw new AppError(
      `Ya existe una cita dentro del intervalo mínimo de 2 horas (${conflict.title} - ${conflict.starts_at}).`,
      409,
      { conflictingAppointment: conflict }
    );
  }
};

const getAppointmentForMember = async (client, appointmentId, memberId) => {
  const appointment = await repository.findAppointmentById(client, appointmentId, memberId);

  if (!appointment) {
    throw new AppError('Cita no encontrada.', 404);
  }

  return appointment;
};

export async function create(memberId, userId, data) {
  return withTransaction(async (client) => {
    const access = await assertCanManageMember(client, memberId, userId);
    await assertNoConflict(client, { memberId, startsAt: data.startsAt });

    const appointment = await repository.createAppointment(client, memberId, userId, data);

    await writeAuditLog(client, {
      userId,
      familyId: access.member.family_id,
      action: 'CREATE',
      entity: 'APPOINTMENT',
      entityId: appointment.id,
      changes: appointment
    });

    return appointment;
  });
}

export async function list(memberId, userId, filters) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    return repository.listAppointments(client, memberId, filters);
  });
}

export async function getById(memberId, appointmentId, userId) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    return getAppointmentForMember(client, appointmentId, memberId);
  });
}

export async function update(memberId, appointmentId, userId, data) {
  return withTransaction(async (client) => {
    const access = await assertCanManageMember(client, memberId, userId);
    const current = await getAppointmentForMember(client, appointmentId, memberId);

    const merged = {
      title: data.title ?? current.title,
      appointmentType: data.appointmentType ?? current.appointment_type,
      customType: data.customType !== undefined ? data.customType : current.custom_type,
      doctorName: data.doctorName !== undefined ? data.doctorName : current.doctor_name,
      location: data.location !== undefined ? data.location : current.location,
      startsAt: data.startsAt ?? current.starts_at,
      endsAt: data.endsAt !== undefined ? data.endsAt : current.ends_at,
      notes: data.notes !== undefined ? data.notes : current.notes,
      status: data.status ?? current.status
    };

    if (merged.appointmentType === 'OTRO' && !merged.customType?.trim()) {
      throw new AppError('customType es obligatorio cuando appointmentType es OTRO.', 422);
    }

    if (merged.appointmentType !== 'OTRO') {
      merged.customType = null;
    }

    if (merged.endsAt && new Date(merged.endsAt) <= new Date(merged.startsAt)) {
      throw new AppError('endsAt debe ser posterior a startsAt.', 422);
    }

    const changedSchedule =
      new Date(merged.startsAt).getTime() !== new Date(current.starts_at).getTime();

    if (changedSchedule) {
      await assertNoConflict(client, {
        memberId,
        startsAt: merged.startsAt,
        appointmentId
      });
    }

    const appointment = await repository.updateAppointment(client, appointmentId, {
      title: merged.title,
      appointmentType: merged.appointmentType,
      customType: merged.customType,
      doctorName: merged.doctorName,
      location: merged.location,
      startsAt: merged.startsAt,
      endsAt: merged.endsAt,
      notes: merged.notes,
      status: merged.status
    });

    if (!appointment) {
      throw new AppError('Cita no encontrada.', 404);
    }

    await writeAuditLog(client, {
      userId,
      familyId: access.member.family_id,
      action: 'UPDATE',
      entity: 'APPOINTMENT',
      entityId: appointment.id,
      changes: {
        before: current,
        after: appointment
      }
    });

    return appointment;
  });
}

export async function remove(memberId, appointmentId, userId) {
  return withTransaction(async (client) => {
    const access = await assertCanManageMember(client, memberId, userId);
    const current = await getAppointmentForMember(client, appointmentId, memberId);
    const deleted = await repository.softDeleteAppointment(client, appointmentId);

    if (!deleted) {
      throw new AppError('Cita no encontrada.', 404);
    }

    await writeAuditLog(client, {
      userId,
      familyId: access.member.family_id,
      action: 'DELETE',
      entity: 'APPOINTMENT',
      entityId: appointmentId,
      changes: {
        before: current,
        deletedAt: deleted.deleted_at
      }
    });

    return deleted;
  });
}
