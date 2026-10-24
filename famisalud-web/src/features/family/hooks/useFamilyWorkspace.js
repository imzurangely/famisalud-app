import { useCallback, useEffect, useState } from "react";
import { createFamily as createFamilyRequest } from "../services/familyService.js";
import {
  createFamilyMember,
  deleteFamilyMember,
  listFamilyMembers,
  updateFamilyMember,
} from "../services/familyMemberService.js";
import {
  createFamilyInvitation,
  listFamilyInvitations,
  listIncomingInvitations,
  resendFamilyInvitation,
} from "../services/familyInvitationService.js";
import {
  listFamilyAuditLogs,
  transferFamilyAdministrator,
} from "../services/familyAdministrationService.js";

/** Datos, loading/error y operaciones de la pantalla de familias e invitaciones. */
export function useFamilyWorkspace({ familyId, tab, isAdmin, reloadFamilies }) {
  const [members, setMembers] = useState([]);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [receivedInvitations, setReceivedInvitations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingPanel, setLoadingPanel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reloadMembers = useCallback(async () => {
    if (!familyId) {
      setMembers([]);
      return [];
    }
    setLoadingMembers(true);
    setError("");
    try {
      const list = await listFamilyMembers(familyId);
      setMembers(list);
      return list;
    } catch (requestError) {
      setError(requestError?.message || "No fue posible cargar los perfiles.");
      throw requestError;
    } finally {
      setLoadingMembers(false);
    }
  }, [familyId]);

  const reloadSentInvitations = useCallback(async () => {
    if (!familyId || !isAdmin) {
      setSentInvitations([]);
      return [];
    }
    const list = await listFamilyInvitations(familyId);
    setSentInvitations(list);
    return list;
  }, [familyId, isAdmin]);

  const reloadReceivedInvitations = useCallback(async () => {
    const list = await listIncomingInvitations();
    setReceivedInvitations(list);
    return list;
  }, []);

  const reloadAuditLogs = useCallback(async () => {
    if (!familyId || !isAdmin) {
      setAuditLogs([]);
      return [];
    }
    const list = await listFamilyAuditLogs(familyId);
    setAuditLogs(list);
    return list;
  }, [familyId, isAdmin]);

  const reloadPanel = useCallback(async () => {
    if (tab === "members") return;
    setLoadingPanel(true);
    setError("");
    try {
      if (tab === "sent") await reloadSentInvitations();
      else if (tab === "received") await reloadReceivedInvitations();
      else if (tab === "admin" && isAdmin) await reloadAuditLogs();
    } catch (requestError) {
      setError(requestError?.message || "No fue posible cargar esta sección.");
    } finally {
      setLoadingPanel(false);
    }
  }, [
    tab,
    isAdmin,
    reloadSentInvitations,
    reloadReceivedInvitations,
    reloadAuditLogs,
  ]);

  useEffect(() => {
    reloadMembers().catch(() => {});
  }, [reloadMembers]);
  useEffect(() => {
    reloadPanel().catch(() => {});
  }, [reloadPanel]);

  const runMutation = useCallback(async (action) => {
    setBusy(true);
    setError("");
    try {
      return await action();
    } catch (requestError) {
      setError(
        requestError?.message || "No fue posible completar la operación.",
      );
      throw requestError;
    } finally {
      setBusy(false);
    }
  }, []);

  const createFamily = useCallback(
    (payload) => runMutation(() => createFamilyRequest(payload)),
    [runMutation],
  );

  const saveMember = useCallback(
    ({ mode, memberId, payload }) =>
      runMutation(async () => {
        if (!familyId) throw new Error("Selecciona una familia primero.");
        if (mode === "createMember")
          await createFamilyMember(familyId, payload);
        else await updateFamilyMember(memberId, payload);
        await reloadMembers();
      }),
    [familyId, reloadMembers, runMutation],
  );

  const removeMember = useCallback(
    (memberId) =>
      runMutation(async () => {
        await deleteFamilyMember(memberId);
        await reloadMembers();
      }),
    [reloadMembers, runMutation],
  );

  const invite = useCallback(
    (payload) =>
      runMutation(async () => {
        if (!familyId) throw new Error("Selecciona una familia primero.");
        const result = await createFamilyInvitation(familyId, payload);
        await reloadSentInvitations();
        return result;
      }),
    [familyId, reloadSentInvitations, runMutation],
  );

  const resendInvitation = useCallback(
    (invitationId) =>
      runMutation(async () => {
        if (!familyId) throw new Error("Selecciona una familia primero.");
        const result = await resendFamilyInvitation(familyId, invitationId);
        await reloadSentInvitations();
        return result;
      }),
    [familyId, reloadSentInvitations, runMutation],
  );

  const transferAdministrator = useCallback(
    (newAdminUserId) =>
      runMutation(async () => {
        if (!familyId) throw new Error("Selecciona una familia primero.");
        const result = await transferFamilyAdministrator(
          familyId,
          newAdminUserId,
        );
        await reloadFamilies();
        await reloadMembers();
        return result;
      }),
    [familyId, reloadFamilies, reloadMembers, runMutation],
  );

  const clearError = useCallback(() => setError(""), []);

  return {
    members,
    sentInvitations,
    receivedInvitations,
    auditLogs,
    loadingMembers,
    loadingPanel,
    busy,
    error,
    clearError,
    reloadMembers,
    reloadSentInvitations,
    reloadReceivedInvitations,
    reloadAuditLogs,
    createFamily,
    saveMember,
    removeMember,
    invite,
    resendInvitation,
    transferAdministrator,
  };
}
