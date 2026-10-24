import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../shared/hooks/useAuth.js";
import { friendlyErrorMessage } from "../../../shared/utils/friendlyErrors.js";
import { useFamilies } from "../../../shared/hooks/useFamily.js";
import { listFamilyMembers } from "../../family/services/familyMemberService.js";
import {
  createAllergy,
  deleteAllergy,
  listAllergies,
  updateAllergy,
} from "../services/allergiesService.js";
import {
  createCondition,
  deleteCondition,
  listConditions,
  updateCondition,
} from "../services/conditionsService.js";
import {
  createVaccine,
  deleteVaccine,
  listVaccines,
  updateVaccine,
} from "../services/vaccinesService.js";
import {
  createVitalSign,
  deleteVitalSign,
  listVitalSigns,
  updateVitalSign,
} from "../services/vitalSignsService.js";

const SECTION_ACTIONS = {
  allergies: {
    list: listAllergies,
    create: createAllergy,
    update: updateAllergy,
    remove: deleteAllergy,
  },
  conditions: {
    list: listConditions,
    create: createCondition,
    update: updateCondition,
    remove: deleteCondition,
  },
  vaccines: {
    list: listVaccines,
    create: createVaccine,
    update: updateVaccine,
    remove: deleteVaccine,
  },
  "vital-signs": {
    list: listVitalSigns,
    create: createVitalSign,
    update: updateVitalSign,
    remove: deleteVitalSign,
  },
};

function linkedUserId(member) {
  return member?.linkedUserId ?? member?.linked_user_id ?? null;
}

function cleanError(error) {
  return friendlyErrorMessage(
    error,
    "Ocurrió un problema al guardar la información. Inténtalo de nuevo.",
  );
}

/** Estado y operaciones del módulo; los servicios únicamente hacen solicitudes HTTP. */
export function useMedicalHistory() {
  const { user } = useAuth();
  const { families, selectedFamily, selectedFamilyId } = useFamilies();
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [section, setSection] = useState("allergies");
  const [records, setRecords] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reloadMembers = useCallback(async () => {
    if (!selectedFamilyId) {
      setMembers([]);
      setSelectedMemberId("");
      setLoadingMembers(false);
      return [];
    }

    setLoadingMembers(true);
    setError("");
    try {
      const list = await listFamilyMembers(selectedFamilyId);
      setMembers(list);
      setSelectedMemberId((currentId) => {
        if (list.some((member) => String(member.id) === String(currentId)))
          return currentId;
        const ownMember =
          list.find(
            (member) => String(linkedUserId(member)) === String(user?.id),
          ) ||
          list.find(
            (member) =>
              (member.relationship ?? "").toUpperCase() === "YO_MISMO",
          );
        return String(ownMember?.id || list[0]?.id || "");
      });
      return list;
    } catch (requestError) {
      setError(cleanError(requestError));
      throw requestError;
    } finally {
      setLoadingMembers(false);
    }
  }, [selectedFamilyId, user?.id]);

  useEffect(() => {
    let active = true;
    setMembers([]);
    setSelectedMemberId("");
    setRecords([]);
    if (!selectedFamilyId) {
      setLoadingMembers(false);
      return undefined;
    }

    setLoadingMembers(true);
    setError("");
    listFamilyMembers(selectedFamilyId)
      .then((list) => {
        if (!active) return;
        setMembers(list);
        const ownMember =
          list.find(
            (member) => String(linkedUserId(member)) === String(user?.id),
          ) ||
          list.find(
            (member) =>
              (member.relationship ?? "").toUpperCase() === "YO_MISMO",
          );
        setSelectedMemberId(String(ownMember?.id || list[0]?.id || ""));
      })
      .catch((requestError) => {
        if (active) setError(cleanError(requestError));
      })
      .finally(() => {
        if (active) setLoadingMembers(false);
      });

    return () => {
      active = false;
    };
  }, [selectedFamilyId, user?.id]);

  const selectedMember = useMemo(
    () =>
      members.find(
        (member) => String(member.id) === String(selectedMemberId),
      ) || null,
    [members, selectedMemberId],
  );

  const isOwnSelected = useMemo(
    () =>
      Boolean(
        selectedMember &&
        String(linkedUserId(selectedMember)) === String(user?.id),
      ),
    [selectedMember, user?.id],
  );

  const canManageSelected = useMemo(() => {
    const role = String(selectedFamily?.role || "").toUpperCase();
    return Boolean(
      selectedMember && (role === "ADMINISTRADOR" || isOwnSelected),
    );
  }, [selectedFamily?.role, selectedMember, isOwnSelected]);

  const reloadRecords = useCallback(async () => {
    if (!selectedMemberId || !SECTION_ACTIONS[section]) {
      setRecords([]);
      setLoadingRecords(false);
      return [];
    }
    setLoadingRecords(true);
    setError("");
    try {
      const list = await SECTION_ACTIONS[section].list(selectedMemberId);
      setRecords(list);
      return list;
    } catch (requestError) {
      setRecords([]);
      setError(cleanError(requestError));
      throw requestError;
    } finally {
      setLoadingRecords(false);
    }
  }, [section, selectedMemberId]);

  useEffect(() => {
    let active = true;
    if (!selectedMemberId || !SECTION_ACTIONS[section]) {
      setRecords([]);
      setLoadingRecords(false);
      return undefined;
    }

    setLoadingRecords(true);
    setError("");
    SECTION_ACTIONS[section]
      .list(selectedMemberId)
      .then((list) => {
        if (active) setRecords(list);
      })
      .catch((requestError) => {
        if (active) {
          setRecords([]);
          setError(cleanError(requestError));
        }
      })
      .finally(() => {
        if (active) setLoadingRecords(false);
      });

    return () => {
      active = false;
    };
  }, [section, selectedMemberId]);

  const createRecord = useCallback(
    async (payload) => {
      if (!selectedMemberId)
        throw new Error("Selecciona un perfil antes de registrar información.");
      setBusy(true);
      setError("");
      try {
        const result = await SECTION_ACTIONS[section].create(
          selectedMemberId,
          payload,
        );
        await reloadRecords();
        return result;
      } catch (requestError) {
        setError(cleanError(requestError));
        throw requestError;
      } finally {
        setBusy(false);
      }
    },
    [section, selectedMemberId, reloadRecords],
  );

  const updateRecord = useCallback(
    async (recordId, payload) => {
      if (!selectedMemberId)
        throw new Error(
          "Selecciona un perfil antes de actualizar información.",
        );
      setBusy(true);
      setError("");
      try {
        const result = await SECTION_ACTIONS[section].update(
          selectedMemberId,
          recordId,
          payload,
        );
        await reloadRecords();
        return result;
      } catch (requestError) {
        setError(cleanError(requestError));
        throw requestError;
      } finally {
        setBusy(false);
      }
    },
    [section, selectedMemberId, reloadRecords],
  );

  const deleteRecord = useCallback(
    async (recordId) => {
      if (!selectedMemberId)
        throw new Error("Selecciona un perfil antes de eliminar información.");
      setBusy(true);
      setError("");
      try {
        const result = await SECTION_ACTIONS[section].remove(
          selectedMemberId,
          recordId,
        );
        await reloadRecords();
        return result;
      } catch (requestError) {
        setError(cleanError(requestError));
        throw requestError;
      } finally {
        setBusy(false);
      }
    },
    [section, selectedMemberId, reloadRecords],
  );

  const familyNotSelected = !selectedFamily && families.length > 0;

  return {
    families,
    selectedFamily,
    selectedFamilyId,
    members,
    selectedMember,
    selectedMemberId,
    setSelectedMemberId,
    section,
    setSection,
    records,
    loadingMembers,
    loadingRecords,
    busy,
    error,
    clearError: () => setError(""),
    canManageSelected,
    isOwnSelected,
    familyNotSelected,
    reloadMembers,
    reloadRecords,
    createRecord,
    updateRecord,
    deleteRecord,
  };
}
