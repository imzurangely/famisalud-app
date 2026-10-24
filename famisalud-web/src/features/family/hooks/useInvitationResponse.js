import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../shared/hooks/useAuth.js";
import { useFamilies } from "../../../shared/hooks/useFamily.js";
import {
  answerFamilyInvitation,
  previewFamilyInvitation,
} from "../services/familyInvitationService.js";
import { extractFamilyName } from "../utils/familyUtils.js";

export function useInvitationResponse(token, initialFamilyName = "") {
  const [invitation, setInvitation] = useState(null);
  const [resolvedFamilyName, setResolvedFamilyName] =
    useState(initialFamilyName);
  const [previewDenied, setPreviewDenied] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(Boolean(token));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const { familySetupRequired, markFamilySetupComplete } = useAuth();
  const { reloadFamilies, selectFamily } = useFamilies();

  useEffect(() => {
    let cancelled = false;
    setResolvedFamilyName(initialFamilyName || "");
    setInvitation(null);
    setPreviewDenied(false);
    setError("");
    setResult(null);
    if (!token) {
      setLoadingPreview(false);
      return () => {
        cancelled = true;
      };
    }

    setLoadingPreview(true);
    previewFamilyInvitation(token)
      .then((payload) => {
        if (cancelled) return;
        const nextInvitation = payload?.invitation ?? null;
        const familyName = extractFamilyName(nextInvitation);
        setInvitation(nextInvitation);
        if (familyName) setResolvedFamilyName(familyName);
        if (!nextInvitation) {
          setPreviewDenied(true);
          setError(
            "No fue posible verificar la invitación. Abre el enlace completo del correo.",
          );
          return;
        }
        if (nextInvitation.status && nextInvitation.status !== "PENDIENTE") {
          setPreviewDenied(true);
          setError(
            "Esta invitación ya no está pendiente y no puede responderse de nuevo.",
          );
          return;
        }
        const expiresAt = nextInvitation.expiresAt || nextInvitation.expires_at;
        if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
          setPreviewDenied(true);
          setError(
            "Esta invitación venció. Solicita al administrador que te envíe una nueva.",
          );
        }
      })
      .catch((previewError) => {
        if (cancelled) return;
        setPreviewDenied(true);
        setError(
          previewError?.message ||
            "No fue posible verificar la invitación. Intenta abrir el enlace de nuevo.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, initialFamilyName]);

  const submitAnswer = useCallback(
    async (action) => {
      if (!token || busy || previewDenied) return null;
      setError("");
      setBusy(action);
      try {
        const payload = await answerFamilyInvitation(
          `/invitations/${action}`,
          token,
        );
        const acceptedInvitation = payload?.invitation;
        const familyName =
          extractFamilyName(acceptedInvitation) ||
          resolvedFamilyName ||
          "la familia";
        if (action === "accept") {
          const familyId =
            acceptedInvitation?.familyId || acceptedInvitation?.family_id;
          try {
            const refreshedFamilies = await reloadFamilies();
            if (
              familyId &&
              refreshedFamilies.some(
                (family) => String(family.id) === String(familyId),
              )
            ) {
              selectFamily(familyId);
            }
          } catch {
            // La acción se completó; un fallo de refresco no debe convertirla en un error.
          }
          markFamilySetupComplete();
          setResult({ accepted: true, familyName });
        } else {
          setResult({ accepted: false, familyName });
        }
        return { accepted: action === "accept", familyName };
      } catch (requestError) {
        setError(
          requestError?.message || "No fue posible procesar la invitación.",
        );
        throw requestError;
      } finally {
        setBusy("");
      }
    },
    [
      token,
      busy,
      previewDenied,
      resolvedFamilyName,
      reloadFamilies,
      selectFamily,
      markFamilySetupComplete,
    ],
  );

  return {
    invitation,
    resolvedFamilyName,
    previewDenied,
    loadingPreview,
    busy,
    error,
    setError,
    result,
    submitAnswer,
    familySetupRequired,
  };
}
