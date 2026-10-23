import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../shared/hooks/useAuth.js';
import { useFamilies } from '../../../shared/hooks/useFamily.js';
import { listFamilyMembers } from '../../family/services/familyMemberService.js';
import { listAppointments } from '../../appointments/services/appointmentsService.js';
import {
  createDocument as createDocumentRequest,
  deleteDocument as deleteDocumentRequest,
  listDocuments,
  updateDocument as updateDocumentRequest,
} from '../services/documentsService.js';
import { buildDocumentFormData, errorMessage } from '../utils/documentUtils.js';

function linkedUserId(member) {
  return member?.linkedUserId ?? member?.linked_user_id ?? member?.person?.userId ?? member?.person?.user_id ?? null;
}

function preferredMemberId(members, userId, preferredId = '') {
  if (preferredId && members.some((member) => String(member.id) === String(preferredId))) return String(preferredId);
  const own = members.find((member) => String(linkedUserId(member)) === String(userId))
    || members.find((member) => String(member.relationship || '').toUpperCase() === 'YO_MISMO');
  return String(own?.id || members[0]?.id || '');
}

/** Gestiona el estado del módulo de documentos; los servicios solo ejecutan peticiones HTTP. */
export function useDocuments({ initialMemberId = '', initialAppointmentId = '' } = {}) {
  const { user } = useAuth();
  const { families, selectedFamily, selectedFamilyId, loadingFamilies: loadingFamilyCollection } = useFamilies();
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [filters, setFilters] = useState(() => ({ category: '', appointmentId: initialAppointmentId, search: '' }));
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setMembers([]);
    setAppointments([]);
    setDocuments([]);
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
        setSelectedMemberId(preferredMemberId(result, user?.id, initialMemberId));
      })
      .catch((requestError) => { if (active) setError(errorMessage(requestError)); })
      .finally(() => { if (active) setLoadingMembers(false); });
    return () => { active = false; };
  }, [selectedFamilyId, user?.id, initialMemberId]);

  const selectedMember = useMemo(
    () => members.find((member) => String(member.id) === String(selectedMemberId)) || null,
    [members, selectedMemberId],
  );
  const isOwnSelected = Boolean(selectedMember && String(linkedUserId(selectedMember)) === String(user?.id));
  const canManageSelected = Boolean(selectedMember && (
    String(selectedFamily?.role || '').toUpperCase() === 'ADMINISTRADOR' || isOwnSelected
  ));

  const reloadDocuments = useCallback(async (overrides = null) => {
    if (!selectedMemberId) {
      setDocuments([]);
      setLoadingDocuments(false);
      return [];
    }
    const activeFilters = overrides || filters;
    setLoadingDocuments(true);
    setError('');
    try {
      const result = await listDocuments(selectedMemberId, activeFilters);
      setDocuments(result);
      return result;
    } catch (requestError) {
      setDocuments([]);
      setError(errorMessage(requestError));
      throw requestError;
    } finally {
      setLoadingDocuments(false);
    }
  }, [selectedMemberId, filters]);

  useEffect(() => {
    let active = true;
    if (!selectedMemberId) {
      setAppointments([]);
      return undefined;
    }
    setLoadingAppointments(true);
    listAppointments(selectedMemberId)
      .then((result) => { if (active) setAppointments(result); })
      .catch((requestError) => { if (active) setError(errorMessage(requestError)); })
      .finally(() => { if (active) setLoadingAppointments(false); });
    return () => { active = false; };
  }, [selectedMemberId]);

  useEffect(() => {
    let active = true;
    if (!selectedMemberId) {
      setDocuments([]);
      setLoadingDocuments(false);
      return undefined;
    }
    setLoadingDocuments(true);
    setError('');
    listDocuments(selectedMemberId, filters)
      .then((result) => { if (active) setDocuments(result); })
      .catch((requestError) => { if (active) { setDocuments([]); setError(errorMessage(requestError)); } })
      .finally(() => { if (active) setLoadingDocuments(false); });
    return () => { active = false; };
  }, [selectedMemberId, filters]);

  const runMutation = useCallback(async (request) => {
    if (!selectedMemberId) throw new Error('Selecciona un perfil antes de gestionar sus documentos.');
    if (!canManageSelected) throw new Error('No tienes permiso para modificar los documentos de este perfil.');
    setBusy(true);
    setError('');
    try {
      const result = await request(selectedMemberId);
      await reloadDocuments();
      return result;
    } catch (requestError) {
      setError(errorMessage(requestError));
      throw requestError;
    } finally {
      setBusy(false);
    }
  }, [selectedMemberId, canManageSelected, reloadDocuments]);

  const createDocument = useCallback((values) => runMutation((memberId) => {
    const formData = buildDocumentFormData(values, { requireFile: true });
    return createDocumentRequest(memberId, formData);
  }), [runMutation]);

  const updateDocument = useCallback((documentId, values) => runMutation((memberId) => {
    const formData = buildDocumentFormData(values);
    return updateDocumentRequest(memberId, documentId, formData);
  }), [runMutation]);

  const deleteDocument = useCallback((documentId) => runMutation(
    (memberId) => deleteDocumentRequest(memberId, documentId),
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
    documents,
    filters,
    setFilters,
    loadingMembers,
    loadingAppointments,
    loadingDocuments,
    busy,
    error,
    clearError: () => setError(''),
    canManageSelected,
    reloadDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
  };
}
