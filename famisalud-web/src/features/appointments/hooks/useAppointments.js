import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../shared/hooks/useAuth.js';
import { useFamilies } from '../../../shared/hooks/useFamily.js';
import { listFamilyMembers } from '../../family/services/familyMemberService.js';
import {
  createAppointment as createAppointmentRequest,
  deleteAppointment as deleteAppointmentRequest,
  listAppointments,
  updateAppointment as updateAppointmentRequest,
} from '../services/appointmentsService.js';
import { errorMessage } from '../utils/appointmentUtils.js';

function linkedUserId(member) {
  return member?.linkedUserId ?? member?.linked_user_id ?? member?.person?.userId ?? member?.person?.user_id ?? null;
}

function personIdOf(member) {
  return member?.personId ?? member?.person_id ?? member?.person?.id ?? member?.person?.personId ?? member?.person?.person_id ?? '';
}

function preferredMemberId(members, userId, preferredId = '', preferredPersonId = '') {
  if (preferredId && members.some((member) => String(member.id) === String(preferredId))) return String(preferredId);
  const byPerson = preferredPersonId && members.find((member) => String(personIdOf(member)) === String(preferredPersonId));
  if (byPerson) return String(byPerson.id);
  const own = members.find((member) => String(linkedUserId(member)) === String(userId))
    || members.find((member) => String(member.relationship || '').toUpperCase() === 'YO_MISMO');
  return String(own?.id || members[0]?.id || '');
}

/** El hook concentra carga, errores y mutaciones; el servicio solo conoce HTTP. */
export function useAppointments({ initialMemberId = '', initialPersonId = '' } = {}) {
  const { user } = useAuth();
  const { families, selectedFamily, selectedFamilyId, loadingFamilies: loadingFamilyCollection } = useFamilies();
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setMembers([]);
    setAppointments([]);
    setSelectedMemberId('');
    setError('');

    if (!selectedFamilyId) {
      setLoadingMembers(false);
      return undefined;
    }

    setLoadingMembers(true);
    listFamilyMembers(selectedFamilyId)
      .then((result) => {
        if (!active) return;
        setMembers(result);
        setSelectedMemberId(preferredMemberId(result, user?.id, initialMemberId, initialPersonId));
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoadingMembers(false);
      });

    return () => { active = false; };
  }, [selectedFamilyId, user?.id, initialMemberId, initialPersonId]);

  const selectedMember = useMemo(
    () => members.find((member) => String(member.id) === String(selectedMemberId)) || null,
    [members, selectedMemberId],
  );
  const isOwnSelected = Boolean(selectedMember && String(linkedUserId(selectedMember)) === String(user?.id));
  const canManageSelected = Boolean(selectedMember && (
    String(selectedFamily?.role || '').toUpperCase() === 'ADMINISTRADOR' || isOwnSelected
  ));

  const reloadAppointments = useCallback(async () => {
    if (!selectedMemberId) {
      setAppointments([]);
      setLoadingAppointments(false);
      return [];
    }
    setLoadingAppointments(true);
    setError('');
    try {
      const result = await listAppointments(selectedMemberId, { status: statusFilter });
      setAppointments(result);
      return result;
    } catch (requestError) {
      setAppointments([]);
      setError(errorMessage(requestError));
      throw requestError;
    } finally {
      setLoadingAppointments(false);
    }
  }, [selectedMemberId, statusFilter]);

  useEffect(() => {
    let active = true;
    if (!selectedMemberId) {
      setAppointments([]);
      setLoadingAppointments(false);
      return undefined;
    }
    setLoadingAppointments(true);
    setError('');
    listAppointments(selectedMemberId, { status: statusFilter })
      .then((result) => { if (active) setAppointments(result); })
      .catch((requestError) => { if (active) { setAppointments([]); setError(errorMessage(requestError)); } })
      .finally(() => { if (active) setLoadingAppointments(false); });
    return () => { active = false; };
  }, [selectedMemberId, statusFilter]);

  const runMutation = useCallback(async (request) => {
    if (!selectedMemberId) throw new Error('Selecciona un perfil antes de gestionar sus citas.');
    if (!canManageSelected) throw new Error('No tienes permiso para modificar las citas de este perfil.');
    setBusy(true);
    setError('');
    try {
      const result = await request(selectedMemberId);
      await reloadAppointments();
      return result;
    } catch (requestError) {
      setError(errorMessage(requestError));
      throw requestError;
    } finally {
      setBusy(false);
    }
  }, [selectedMemberId, canManageSelected, reloadAppointments]);

  const createAppointment = useCallback((payload) => runMutation(
    (memberId) => createAppointmentRequest(memberId, payload),
  ), [runMutation]);
  const updateAppointment = useCallback((appointmentId, payload) => runMutation(
    (memberId) => updateAppointmentRequest(memberId, appointmentId, payload),
  ), [runMutation]);
  const deleteAppointment = useCallback((appointmentId) => runMutation(
    (memberId) => deleteAppointmentRequest(memberId, appointmentId),
  ), [runMutation]);

  return {
    families,
    loadingFamilyCollection,
    selectedFamily,
    selectedFamilyId,
    members,
    selectedMember,
    selectedMemberId,
    setSelectedMemberId,
    appointments,
    statusFilter,
    setStatusFilter,
    loadingMembers,
    loadingAppointments,
    busy,
    error,
    clearError: () => setError(''),
    canManageSelected,
    reloadAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  };
}
