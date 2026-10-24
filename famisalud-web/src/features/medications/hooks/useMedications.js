import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../shared/hooks/useAuth.js";
import { useFamilies } from "../../../shared/hooks/useFamily.js";
import { listFamilyMembers } from "../../family/services/familyMemberService.js";
import {
  getMedicationProcessSummary,
  listEpsCompanies,
  listMedicationLogs,
  listMedications,
  listSchedules,
} from "../services/medicationsService.js";
import { errorMessage, linkedUserId } from "../utils/medicationUtils.js";

function personIdOf(member) {
  return (
    member?.personId ??
    member?.person_id ??
    member?.person?.id ??
    member?.person?.personId ??
    member?.person?.person_id ??
    ""
  );
}

function preferredMemberId(
  members,
  userId,
  preferredMemberId = "",
  preferredPersonId = "",
) {
  const byId =
    preferredMemberId &&
    members.find((member) => String(member.id) === String(preferredMemberId));
  if (byId) return String(byId.id);
  const byPerson =
    preferredPersonId &&
    members.find(
      (member) => String(personIdOf(member)) === String(preferredPersonId),
    );
  if (byPerson) return String(byPerson.id);
  const own =
    members.find((member) => String(linkedUserId(member)) === String(userId)) ||
    members.find((member) =>
      Boolean(member?.is_own_member ?? member?.isOwnMember),
    );
  return String(own?.id || members[0]?.id || "");
}

export function useMedications({
  initialMemberId = "",
  initialPersonId = "",
  initialMedicationId = "",
} = {}) {
  const { user } = useAuth();
  const { families, selectedFamily, selectedFamilyId, loadingFamilies } =
    useFamilies();
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [medications, setMedications] = useState([]);
  const [selectedMedicationId, setSelectedMedicationId] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [processSummary, setProcessSummary] = useState(null);
  const [epsCompanies, setEpsCompanies] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingMedications, setLoadingMedications] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setMembers([]);
    setSelectedMemberId("");
    setMedications([]);
    setSelectedMedicationId("");
    setSchedules([]);
    setLogs([]);
    setProcessSummary(null);
    setError("");

    if (!selectedFamilyId) {
      setLoadingMembers(false);
      return undefined;
    }

    setLoadingMembers(true);
    listFamilyMembers(selectedFamilyId)
      .then((result) => {
        if (!active) return;
        setMembers(result);
        setSelectedMemberId(
          preferredMemberId(result, user?.id, initialMemberId, initialPersonId),
        );
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoadingMembers(false);
      });

    return () => {
      active = false;
    };
  }, [selectedFamilyId, user?.id, initialMemberId, initialPersonId]);

  useEffect(() => {
    let active = true;
    setMedications([]);
    setSelectedMedicationId("");
    setSchedules([]);
    setLogs([]);
    setProcessSummary(null);
    setError("");

    if (!selectedMemberId) {
      setLoadingMedications(false);
      return undefined;
    }

    setLoadingMedications(true);
    listMedications(selectedMemberId)
      .then((result) => {
        if (!active) return;
        setMedications(result);
        const linkedMedication = result.find(
          (medication) => String(medication.id) === String(initialMedicationId),
        );
        setSelectedMedicationId((currentId) =>
          linkedMedication
            ? String(linkedMedication.id)
            : result.some(
                  (medication) => String(medication.id) === String(currentId),
                )
              ? currentId
              : String(result[0]?.id || ""),
        );
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoadingMedications(false);
      });

    return () => {
      active = false;
    };
  }, [selectedMemberId, initialMedicationId]);

  useEffect(() => {
    let active = true;
    setSchedules([]);
    setLogs([]);
    setProcessSummary(null);

    if (!selectedMemberId || !selectedMedicationId) {
      setLoadingDetails(false);
      return undefined;
    }

    setLoadingDetails(true);
    setError("");
    Promise.allSettled([
      listSchedules(selectedMemberId, selectedMedicationId),
      listMedicationLogs(selectedMemberId, selectedMedicationId),
      getMedicationProcessSummary(selectedMemberId, selectedMedicationId),
    ])
      .then(([scheduleResult, logResult, summaryResult]) => {
        if (!active) return;
        const failures = [];
        if (scheduleResult.status === "fulfilled")
          setSchedules(scheduleResult.value);
        else failures.push(scheduleResult.reason);
        if (logResult.status === "fulfilled") setLogs(logResult.value);
        else failures.push(logResult.reason);
        if (summaryResult.status === "fulfilled")
          setProcessSummary(summaryResult.value);
        else failures.push(summaryResult.reason);
        if (failures.length) setError(errorMessage(failures[0]));
      })
      .finally(() => {
        if (active) setLoadingDetails(false);
      });

    return () => {
      active = false;
    };
  }, [selectedMemberId, selectedMedicationId]);

  useEffect(() => {
    let active = true;
    listEpsCompanies()
      .then((result) => {
        if (active) setEpsCompanies(result);
      })
      .catch(() => {
        if (active) setEpsCompanies([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedMember = useMemo(
    () =>
      members.find(
        (member) => String(member.id) === String(selectedMemberId),
      ) || null,
    [members, selectedMemberId],
  );
  const selectedMedication = useMemo(
    () =>
      medications.find(
        (medication) => String(medication.id) === String(selectedMedicationId),
      ) || null,
    [medications, selectedMedicationId],
  );
  const isOwnSelected = Boolean(
    selectedMember &&
    ((linkedUserId(selectedMember) &&
      String(linkedUserId(selectedMember)) === String(user?.id)) ||
      Boolean(selectedMember?.is_own_member ?? selectedMember?.isOwnMember)),
  );
  const canManageSelected = Boolean(
    selectedMember &&
    (String(
      selectedFamily?.role || selectedFamily?.my_role || "",
    ).toUpperCase() === "ADMINISTRADOR" ||
      isOwnSelected),
  );

  const reloadMedications = useCallback(
    async (preferredId = "") => {
      if (!selectedMemberId) return "";
      setRefreshing(true);
      setError("");
      try {
        const result = await listMedications(selectedMemberId);
        setMedications(result);
        const nextId = result.some(
          (medication) => String(medication.id) === String(preferredId),
        )
          ? String(preferredId)
          : result.some(
                (medication) =>
                  String(medication.id) === String(selectedMedicationId),
              )
            ? String(selectedMedicationId)
            : String(result[0]?.id || "");
        setSelectedMedicationId(nextId);
        return nextId;
      } catch (requestError) {
        setError(errorMessage(requestError));
        throw requestError;
      } finally {
        setRefreshing(false);
      }
    },
    [selectedMemberId, selectedMedicationId],
  );

  const reloadDetails = useCallback(
    async (medicationId = selectedMedicationId) => {
      if (!selectedMemberId || !medicationId) return;
      setRefreshing(true);
      setError("");
      try {
        const [nextSchedules, nextLogs, nextSummary] = await Promise.all([
          listSchedules(selectedMemberId, medicationId),
          listMedicationLogs(selectedMemberId, medicationId),
          getMedicationProcessSummary(selectedMemberId, medicationId),
        ]);
        if (String(medicationId) === String(selectedMedicationId)) {
          setSchedules(nextSchedules);
          setLogs(nextLogs);
          setProcessSummary(nextSummary);
        } else {
          setSchedules(nextSchedules);
          setLogs(nextLogs);
          setProcessSummary(nextSummary);
        }
      } catch (requestError) {
        setError(errorMessage(requestError));
        throw requestError;
      } finally {
        setRefreshing(false);
      }
    },
    [selectedMemberId, selectedMedicationId],
  );

  const reloadEverything = useCallback(
    async (preferredId = "") => {
      const medicationId = await reloadMedications(preferredId);
      if (medicationId) await reloadDetails(medicationId);
      else {
        setSchedules([]);
        setLogs([]);
        setProcessSummary(null);
      }
    },
    [reloadDetails, reloadMedications],
  );

  return {
    families,
    selectedFamily,
    selectedFamilyId,
    loadingFamilies,
    members,
    selectedMember,
    selectedMemberId,
    setSelectedMemberId,
    selectedMedication,
    selectedMedicationId,
    setSelectedMedicationId,
    medications,
    schedules,
    logs,
    processSummary,
    epsCompanies,
    loadingMembers,
    loadingMedications,
    loadingDetails,
    refreshing,
    error,
    clearError: () => setError(""),
    canManageSelected,
    isOwnSelected,
    reloadMedications,
    reloadDetails,
    reloadEverything,
  };
}
