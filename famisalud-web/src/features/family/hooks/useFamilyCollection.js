import { useCallback, useEffect, useMemo, useState } from "react";
import { listFamilies } from "../services/familyService.js";

const SELECTED_FAMILY_KEY = "famisalud-selected-family";

function readSavedFamilyId() {
  try {
    return window.localStorage.getItem(SELECTED_FAMILY_KEY) || "";
  } catch {
    return "";
  }
}

function saveFamilyId(id) {
  try {
    if (id) window.localStorage.setItem(SELECTED_FAMILY_KEY, id);
    else window.localStorage.removeItem(SELECTED_FAMILY_KEY);
  } catch {
    // La selección permanece en memoria cuando el navegador no permite persistirla.
  }
}

/** Carga de familias y selección activa; se aloja en la feature family, no en el contexto. */
export function useFamilyCollection({
  status,
  isAuthenticated,
  familySetupRequired,
  userId,
}) {
  const [families, setFamilies] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState(readSavedFamilyId);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const [familyError, setFamilyError] = useState("");

  const reloadFamilies = useCallback(async () => {
    setLoadingFamilies(true);
    setFamilyError("");
    try {
      const list = await listFamilies();
      setFamilies(list);
      setSelectedFamilyId((currentId) => {
        const selected = list.find(
          (family) => String(family.id) === String(currentId),
        );
        const nextId = selected?.id || list[0]?.id || "";
        saveFamilyId(nextId);
        return String(nextId || "");
      });
      return list;
    } catch (error) {
      setFamilyError(error?.message || "No fue posible cargar tus familias.");
      throw error;
    } finally {
      setLoadingFamilies(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    if (!isAuthenticated) {
      setFamilies([]);
      setSelectedFamilyId("");
      saveFamilyId("");
      setFamilyError("");
      return;
    }
    if (familySetupRequired) {
      setFamilies([]);
      setSelectedFamilyId("");
      saveFamilyId("");
      return;
    }
    reloadFamilies().catch(() => {});
  }, [status, isAuthenticated, familySetupRequired, userId, reloadFamilies]);

  const selectFamily = useCallback((id) => {
    const safeId = id ? String(id) : "";
    setSelectedFamilyId(safeId);
    saveFamilyId(safeId);
  }, []);

  const selectedFamily = useMemo(
    () =>
      families.find(
        (family) => String(family.id) === String(selectedFamilyId),
      ) || null,
    [families, selectedFamilyId],
  );

  useEffect(() => {
    if (
      selectedFamilyId &&
      !families.some(
        (family) => String(family.id) === String(selectedFamilyId),
      ) &&
      families.length === 0
    ) {
      setSelectedFamilyId("");
      saveFamilyId("");
    }
  }, [families, selectedFamilyId]);

  return {
    families,
    selectedFamily,
    selectedFamilyId: selectedFamily?.id || selectedFamilyId,
    selectFamily,
    loadingFamilies,
    familyError,
    reloadFamilies,
  };
}
