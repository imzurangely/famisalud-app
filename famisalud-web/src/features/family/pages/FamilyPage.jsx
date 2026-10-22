import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ChevronDown,
  Clock3,
  Copy,
  Eye,
  FileClock,
  HeartPulse,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useAuth } from "../../../shared/hooks/useAuth.js";
import { useFamilies } from "../../../shared/hooks/useFamily.js";
import Modal from "../../../shared/components/ui/Modal.jsx";
import {
  SelectField,
  TextField,
} from "../../../shared/components/ui/FormField.jsx";
import { confirmAction, notify } from "../../../shared/utils/feedback.js";
import { useFamilyWorkspace } from "../hooks/useFamilyWorkspace.js";
import { FAMILY_TABS } from "../utils/familyConstants.js";
import {
  formatDate,
  formatDateTime,
  personName,
  relationshipLabel,
  statusStyle,
  valueOf,
} from "../utils/familyUtils.js";
import EmptyState from "../../../shared/components/ui/EmptyState.jsx";
import InvitationFormModal from "../components/InvitationFormModal.jsx";
import MemberDetailsModal from "../components/MemberDetailsModal.jsx";
import MemberFormModal from "../components/MemberFormModal.jsx";

export default function FamilyPage() {
  const { user } = useAuth();
  const {
    families,
    selectedFamily,
    selectedFamilyId,
    selectFamily,
    reloadFamilies,
    loadingFamilies,
    familyError,
  } = useFamilies();
  const isAdmin =
    valueOf(selectedFamily, "role").toUpperCase() === "ADMINISTRADOR";
  const selectedIsPersonal = Boolean(
    valueOf(selectedFamily, "isPersonal", "is_personal"),
  );
  const hasRegularFamilies = families.some(
    (family) => !Boolean(valueOf(family, "isPersonal", "is_personal")),
  );

  const [tab, setTab] = useState("members");
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(null);
  const [familyForm, setFamilyForm] = useState({ name: "", isPersonal: false });
  const [transferUserId, setTransferUserId] = useState("");
  const [debugToken, setDebugToken] = useState("");

  const selectableTabs = useMemo(
    () => FAMILY_TABS.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin],
  );
  const {
    members,
    sentInvitations,
    receivedInvitations,
    auditLogs,
    loadingMembers,
    loadingPanel,
    busy,
    error: workspaceError,
    clearError,
    createFamily,
    saveMember,
    removeMember,
    invite,
    resendInvitation,
    transferAdministrator,
    reloadSentInvitations: refreshSentInvitations,
    reloadAuditLogs: refreshAuditLogs,
  } = useFamilyWorkspace({
    familyId: selectedFamilyId,
    tab,
    isAdmin,
    reloadFamilies,
  });

  const transferOptions = useMemo(
    () =>
      members.filter((member) => {
        const linkedId = valueOf(member, "linkedUserId", "linked_user_id");
        return linkedId && String(linkedId) !== String(user?.id);
      }),
    [members, user?.id],
  );

  useEffect(() => {
    if (!selectableTabs.some((item) => item.id === tab)) setTab("members");
  }, [isAdmin, selectableTabs, tab]);

  useEffect(() => {
    if (!notice) return;
    if (notice.type === "success") notify.success(notice.message);
    else if (notice.type === "info") notify.info(notice.message);
    else notify.error(notice.message);
    setNotice(null);
  }, [notice]);

  useEffect(() => {
    setTab("members");
    setModal(null);
    setDebugToken("");
    setNotice(null);
    clearError();
  }, [selectedFamilyId, clearError]);

  const handleCreateFamily = useCallback(
    async (event) => {
      event.preventDefault();
      try {
        const response = await createFamily({
          name: familyForm.name.trim(),
          isPersonal: false,
        });
        const createdId = response?.family?.id || response?.id;
        const updated = await reloadFamilies();
        const idToSelect = createdId || updated[updated.length - 1]?.id;
        if (idToSelect) selectFamily(idToSelect);
        setFamilyForm({ name: "", isPersonal: false });
        setModal(null);
        setNotice({
          type: "success",
          message: "La familia se creó correctamente.",
        });
      } catch (requestError) {
        setModal(null);
        setNotice({
          type: "error",
          message: requestError.message || "No fue posible crear la familia.",
        });
        clearError();
      }
    },
    [createFamily, familyForm.name, reloadFamilies, selectFamily, clearError],
  );

  const handleMemberSave = useCallback(
    async (payload) => {
      try {
        await saveMember({
          mode: modal.mode,
          memberId: modal.member?.id,
          payload,
        });
        setModal(null);
        setNotice({
          type: "success",
          message:
            modal.mode === "createMember"
              ? "El perfil se agregó a la familia."
              : "Los cambios del perfil se guardaron.",
        });
      } catch (requestError) {
        clearError();
        throw requestError;
      }
    },
    [saveMember, modal, clearError],
  );

  const handleDeleteMember = useCallback(
    async (member) => {
      const confirmation = await confirmAction({
        title: `¿Retirar a ${personName(member)}?`,
        text: "La persona dejará de pertenecer a esta familia. Su identidad y su historia clínica no se borrarán.",
        confirmButtonText: "Retirar de la familia",
        cancelButtonText: "Conservar perfil",
        icon: "warning",
      });
      if (!confirmation.isConfirmed) return;
      try {
        await removeMember(member.id);
        setNotice({
          type: "success",
          message:
            "El perfil se retiró de esta familia. Su historia clínica se conserva.",
        });
      } catch (requestError) {
        setNotice({
          type: "error",
          message: requestError.message || "No fue posible retirar el perfil.",
        });
        clearError();
      }
    },
    [removeMember, clearError],
  );

  const handleInvite = useCallback(
    async (payload) => {
      try {
        const response = await invite(payload);
        setDebugToken(response?.debugToken || "");
        setNotice({
          type: response?.emailSent
            ? "success"
            : response?.warning
              ? "info"
              : "success",
          message: response?.emailSent
            ? "Invitación creada y correo enviado."
            : response?.warning || "Invitación creada.",
        });
        setModal(null);
        setTab("sent");
      } catch (requestError) {
        clearError();
        throw requestError;
      }
    },
    [invite, clearError],
  );

  const handleResend = useCallback(
    async (invitation) => {
      try {
        const response = await resendInvitation(invitation.id);
        setDebugToken(response?.debugToken || "");
        setNotice({
          type: response?.emailSent
            ? "success"
            : response?.warning
              ? "info"
              : "success",
          message: response?.emailSent
            ? "Invitación reenviada."
            : response?.warning || "Invitación renovada.",
        });
      } catch (requestError) {
        setNotice({
          type: "error",
          message:
            requestError.message || "No fue posible reenviar la invitación.",
        });
        clearError();
      }
    },
    [resendInvitation, clearError],
  );

  const handleTransfer = useCallback(
    async (event) => {
      event.preventDefault();
      if (!transferUserId) return;
      const target = members.find(
        (member) =>
          String(valueOf(member, "linkedUserId", "linked_user_id")) ===
          String(transferUserId),
      );
      const confirmation = await confirmAction({
        title: "Transferir administración",
        text: `¿Quieres transferir la administración de ${selectedFamily?.name} a ${personName(target || {})}? Tu rol pasará a MIEMBRO.`,
        confirmButtonText: "Transferir",
        cancelButtonText: "Cancelar",
        icon: "warning",
      });
      if (!confirmation.isConfirmed) return;
      try {
        await transferAdministrator(transferUserId);
        setNotice({
          type: "success",
          message:
            "La administración se transfirió correctamente. Tu rol ahora es MIEMBRO.",
        });
        setTransferUserId("");
        setTab("members");
      } catch (requestError) {
        setNotice({
          type: "error",
          message:
            requestError.message ||
            "No fue posible transferir la administración.",
        });
        clearError();
      }
    },
    [
      transferUserId,
      members,
      selectedFamily,
      transferAdministrator,
      clearError,
    ],
  );

  const copyDebugToken = useCallback(async () => {
    if (!debugToken) return;
    try {
      await navigator.clipboard.writeText(debugToken);
      setNotice({ type: "success", message: "Token de depuración copiado." });
    } catch {
      setNotice({
        type: "error",
        message:
          "No fue posible copiarlo automáticamente. Selecciona el token y cópialo manualmente.",
      });
    }
  }, [debugToken]);

  function openTab(id) {
    setNotice(null);
    setTab(id);
    if (id !== "sent") setDebugToken("");
  }

  const isLoadingPage =
    loadingFamilies && !selectedFamily && families.length === 0;

  const createFamilyModal =
    modal?.mode === "createFamily" ? (
      <Modal
        title="Crear una familia"
        description="Crea un espacio compartido para agregar perfiles, invitar personas y administrar la información familiar."
        onClose={() => setModal(null)}
      >
        <form className="space-y-4" onSubmit={handleCreateFamily}>
          <TextField
            id="new-family-name"
            label="Nombre de la familia"
            value={familyForm.name}
            onChange={(event) =>
              setFamilyForm({ name: event.target.value, isPersonal: false })
            }
            required
            maxLength={100}
            placeholder="Ej. Familia Ríos"
          />
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setModal(null)}
            >
              Cancelar
            </button>
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? "Creando…" : "Crear familia"}
            </button>
          </div>
        </form>
      </Modal>
    ) : null;

  if (!isLoadingPage && selectedIsPersonal) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-2xl flex-col justify-center gap-5">
        <section className="surface-card p-6 text-center sm:p-10">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
            <HeartPulse size={29} />
          </span>
          <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.17em] text-brand-700 dark:text-brand-300">
            Espacio personal
          </p>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Tu salud, en tu espacio
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Este espacio es solo para tu información personal. Aquí no puedes
            agregar ni invitar a otras personas. Para organizar perfiles
            familiares, crea una familia o elige otra familia desde el menú
            lateral.
          </p>
          {familyError && (
            <p
              role="alert"
              className="mt-4 text-xs text-rose-600 dark:text-rose-300"
            >
              {familyError}
            </p>
          )}
          <button
            type="button"
            className="primary-button mt-6"
            onClick={() => {
              setFamilyForm({ name: "", isPersonal: false });
              setModal({ mode: "createFamily" });
            }}
          >
            <Plus size={16} /> Crear familia
          </button>
          {hasRegularFamilies && (
            <p className="mt-4 text-[11px] text-slate-400">
              También puedes cambiar a otra familia desde el selector del menú
              lateral.
            </p>
          )}
        </section>
        {createFamilyModal}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#176d79] via-brand-500 to-[#4c82a6] p-6 text-white shadow-lg shadow-brand-900/10 sm:p-8">
        <div className="absolute -right-20 -top-28 size-72 rounded-full border-42 border-white/8" />
        <div className="absolute -bottom-28 right-24 size-48 rounded-full border-28 border-white/[0.07]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold tracking-[0.14em]">
              <UsersRound size={14} /> ESPACIOS COMPARTIDOS
            </span>
            <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Mi familia
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
              Organiza los perfiles, gestiona invitaciones y administra el
              acceso a la información familiar.
            </p>
          </div>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-brand-800 shadow-sm transition hover:bg-brand-50 sm:self-auto"
            onClick={() => setModal({ mode: "createFamily" })}
          >
            <Plus size={16} /> Nueva familia
          </button>
        </div>
      </section>

      {familyError && !selectedFamily && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          {familyError}
        </div>
      )}
      {workspaceError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          {workspaceError}
        </div>
      )}
      {debugToken && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <Clock3
              className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300"
              size={18}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Token de invitación de desarrollo
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                Este token solo se muestra fuera de producción. Puedes usar el
                enlace con la cuenta invitada para probar el flujo.
              </p>
              <code className="mt-2 block break-all rounded-xl bg-white/80 p-3 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-100">
                {debugToken}
              </code>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="secondary-button min-h-9! py-2! text-xs!"
                  onClick={copyDebugToken}
                >
                  <Copy size={14} /> Copiar token
                </button>
                <button
                  className="secondary-button min-h-9! py-2! text-xs!"
                  onClick={() => {
                    const url = `${window.location.origin}/invitations/accept?token=${encodeURIComponent(debugToken)}`;
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  <Mail size={14} /> Abrir enlace de prueba
                </button>
                <button
                  className="secondary-button min-h-9! py-2! text-xs!"
                  onClick={() => setDebugToken("")}
                >
                  <X size={14} /> Ocultar
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {isLoadingPage ? (
        <div className="surface-card flex items-center gap-3 p-6 text-sm text-slate-500 dark:text-slate-300">
          <RefreshCw className="animate-spin" size={18} /> Cargando tus
          familias…
        </div>
      ) : families.length === 0 ? (
        <EmptyState
          title="Todavía no hay familias"
          description="Crea una familia para organizar perfiles e invitar a otras personas."
          action={
            <button
              className="primary-button"
              onClick={() => setModal({ mode: "createFamily" })}
            >
              <Plus size={16} /> Crear una familia
            </button>
          }
        />
      ) : (
        <>
          <section className="surface-card p-4 sm:p-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                Familia o espacio seleccionado
                <span className="relative mt-2 block">
                  <select
                    className="form-input appearance-none pr-10"
                    value={selectedFamily?.id || ""}
                    onChange={(event) => {
                      selectFamily(event.target.value);
                      setTab("members");
                      setNotice(null);
                    }}
                  >
                    <option value="" disabled>
                      Selecciona una familia
                    </option>
                    {families.map((family) => (
                      <option key={family.id} value={family.id}>
                        {family.name}
                        {family.is_personal ? " · Personal" : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold ${isAdmin ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" : "bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"}`}
                >
                  <ShieldCheck size={14} />{" "}
                  {isAdmin ? "Administradora/or" : "Miembro"}
                </span>
                <button
                  className="icon-button border border-slate-200 dark:border-slate-800"
                  title="Actualizar familias"
                  aria-label="Actualizar familias"
                  onClick={() => reloadFamilies().catch(() => {})}
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
            {selectedFamily && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {selectedFamily.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Creada el{" "}
                    {formatDate(
                      selectedFamily.created_at || selectedFamily.createdAt,
                    )}{" "}
                    ·{" "}
                    {selectedFamily.is_personal || selectedFamily.isPersonal
                      ? "Espacio personal"
                      : "Familia"}
                  </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {members.length}{" "}
                  {members.length === 1 ? "perfil activo" : "perfiles activos"}
                </p>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="soft-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-950">
              {selectableTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => openTab(id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition sm:px-4 ${tab === id ? "bg-brand-50 text-brand-800 dark:bg-brand-950/70 dark:text-brand-200" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"}`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            {tab === "members" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
                      Personas de esta familia
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Los datos personales son compartidos; el parentesco
                      corresponde a esta familia.
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      className="primary-button self-start min-h-10! py-2.5!"
                      onClick={() => setModal({ mode: "createMember" })}
                    >
                      <UserPlus size={16} /> Agregar perfil
                    </button>
                  )}
                </div>
                {loadingMembers ? (
                  <div className="surface-card flex items-center gap-3 p-6 text-sm text-slate-500 dark:text-slate-300">
                    <RefreshCw className="animate-spin" size={17} /> Cargando
                    perfiles…
                  </div>
                ) : members.length === 0 ? (
                  <EmptyState
                    title="No hay perfiles en esta familia"
                    description="Los perfiles aparecerán aquí después de crearlos o aceptar una invitación."
                    action={
                      isAdmin ? (
                        <button
                          className="primary-button"
                          onClick={() => setModal({ mode: "createMember" })}
                        >
                          <UserPlus size={16} /> Agregar perfil
                        </button>
                      ) : null
                    }
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {members.map((member) => {
                      const own =
                        String(
                          valueOf(member, "linkedUserId", "linked_user_id"),
                        ) === String(user?.id);
                      const linked = Boolean(
                        valueOf(member, "linkedUserId", "linked_user_id"),
                      );
                      const canEdit = isAdmin || own;
                      return (
                        <article
                          key={member.id}
                          className="surface-card flex min-w-0 flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-brand-100 to-violet-100 text-brand-800 dark:from-brand-950 dark:to-violet-950 dark:text-brand-200">
                              <span className="text-sm font-extrabold">
                                {personName(member)
                                  .split(" ")
                                  .slice(0, 2)
                                  .map((part) => part[0])
                                  .join("")
                                  .toUpperCase()}
                              </span>
                            </span>
                            <div className="min-w-0 flex-1">
                              <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                <button
                                  type="button"
                                  className="rounded text-left outline-none transition hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-brand-300"
                                  onClick={() =>
                                    setModal({
                                      mode: "viewMember",
                                      member,
                                      isOwn: own,
                                    })
                                  }
                                  aria-label={`Ver detalle de ${personName(member)}`}
                                >
                                  {personName(member)}
                                </button>
                              </h4>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {relationshipLabel(
                                  valueOf(member, "relationship"),
                                  valueOf(
                                    member,
                                    "customRelationship",
                                    "custom_relationship",
                                  ),
                                )}
                              </p>
                              {own && (
                                <span className="mt-2 inline-flex rounded-full bg-brand-50 px-2 py-1 text-[10px] font-bold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                                  Tu perfil
                                </span>
                              )}
                            </div>
                            <span
                              className={`mt-1 size-2 rounded-full ${linked ? "bg-emerald-400" : "bg-slate-300 dark:bg-slate-600"}`}
                              title={
                                linked ? "Cuenta vinculada" : "Perfil manual"
                              }
                            />
                          </div>
                          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                            <p className="flex items-center gap-2">
                              <Mail size={14} className="shrink-0" />
                              {linked
                                ? own
                                  ? "Vinculado a tu cuenta"
                                  : "Cuenta vinculada"
                                : "Perfil sin cuenta vinculada"}
                            </p>
                            {valueOf(member, "phone") && (
                              <p>Teléfono: {valueOf(member, "phone")}</p>
                            )}
                            {valueOf(member, "birthDate", "birth_date") && (
                              <p>
                                Fecha de nacimiento:{" "}
                                {formatDate(
                                  valueOf(member, "birthDate", "birth_date"),
                                )}
                              </p>
                            )}
                          </div>
                          <div className="mt-auto flex flex-wrap gap-2 pt-4">
                            <button
                              type="button"
                              className="secondary-button min-h-9! flex-1 px-3! py-2! text-xs!"
                              onClick={() =>
                                setModal({
                                  mode: "viewMember",
                                  member,
                                  isOwn: own,
                                })
                              }
                            >
                              <Eye size={14} /> Ver detalle
                            </button>
                            {canEdit && (
                              <button
                                className="secondary-button min-h-9! flex-1 px-3! py-2! text-xs!"
                                onClick={() =>
                                  setModal({
                                    mode: "editMember",
                                    member,
                                    isOwn: own,
                                  })
                                }
                              >
                                <Pencil size={14} /> Editar
                              </button>
                            )}
                            {isAdmin && !own && (
                              <button
                                className="icon-button size-9! border border-rose-100 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                                onClick={() => handleDeleteMember(member)}
                                title="Retirar perfil de esta familia"
                                aria-label={`Retirar a ${personName(member)} de esta familia`}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === "sent" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
                      Invitaciones enviadas
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Solo los administradores pueden gestionar invitaciones.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="icon-button border border-slate-200 dark:border-slate-800"
                      onClick={() =>
                        refreshSentInvitations().catch((error) =>
                          setNotice({ type: "error", message: error.message }),
                        )
                      }
                      title="Actualizar invitaciones"
                      aria-label="Actualizar invitaciones"
                    >
                      <RefreshCw size={16} />
                    </button>
                    <button
                      className="primary-button self-start min-h-10! py-2.5!"
                      onClick={() => setModal({ mode: "invite" })}
                    >
                      <Send size={15} /> Invitar persona
                    </button>
                  </div>
                </div>
                {loadingPanel ? (
                  <div className="surface-card p-5 text-sm text-slate-500 dark:text-slate-300">
                    Cargando invitaciones…
                  </div>
                ) : sentInvitations.length === 0 ? (
                  <EmptyState
                    icon={Mail}
                    title="No hay invitaciones"
                    description="Las invitaciones creadas para esta familia aparecerán aquí."
                    action={
                      <button
                        className="primary-button"
                        onClick={() => setModal({ mode: "invite" })}
                      >
                        <Send size={15} /> Crear invitación
                      </button>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {sentInvitations.map((invitation) => (
                      <article
                        key={invitation.id}
                        className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="break-all text-sm font-bold text-slate-800 dark:text-slate-100">
                              {invitation.email}
                            </h4>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyle(invitation.status)}`}
                            >
                              {invitation.status}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                            {relationshipLabel(
                              invitation.relationship,
                              invitation.custom_relationship,
                            )}{" "}
                            · Vence: {formatDateTime(invitation.expires_at)}
                          </p>
                          {invitation.linked_member_first_name && (
                            <p className="mt-1 text-[11px] text-slate-400">
                              Perfil vinculado:{" "}
                              {invitation.linked_member_first_name}{" "}
                              {invitation.linked_member_last_name || ""}
                            </p>
                          )}
                        </div>
                        {invitation.status === "PENDIENTE" && (
                          <button
                            className="secondary-button self-start min-h-9! py-2! text-xs sm:self-center"
                            onClick={() => handleResend(invitation)}
                            disabled={busy}
                          >
                            <RefreshCw size={14} /> Reenviar
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "received" && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
                    Invitaciones recibidas
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    La respuesta se confirma mediante el enlace seguro del
                    correo. Si acabas de recibir una invitación, abre ese enlace
                    con tu cuenta iniciada.
                  </p>
                </div>
                {loadingPanel ? (
                  <div className="surface-card p-5 text-sm text-slate-500 dark:text-slate-300">
                    Cargando invitaciones…
                  </div>
                ) : receivedInvitations.length === 0 ? (
                  <EmptyState
                    icon={Mail}
                    title="No tienes invitaciones"
                    description="Cuando alguien te invite a una familia, la invitación aparecerá aquí."
                  />
                ) : (
                  <div className="space-y-3">
                    {receivedInvitations.map((invitation) => (
                      <article
                        key={invitation.id}
                        className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                              {invitation.family_name}
                            </h4>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyle(invitation.status)}`}
                            >
                              {invitation.status}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                            Invita:{" "}
                            {[
                              invitation.inviter_first_name,
                              invitation.inviter_last_name,
                            ]
                              .filter(Boolean)
                              .join(" ") || "Administrador de la familia"}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            Parentesco:{" "}
                            {relationshipLabel(
                              invitation.relationship,
                              invitation.custom_relationship,
                            )}{" "}
                            · Recibida: {formatDateTime(invitation.created_at)}
                          </p>
                        </div>
                        {invitation.status === "PENDIENTE" && (
                          <span className="inline-flex max-w-56 items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-[11px] font-semibold text-brand-800 dark:bg-brand-950/40 dark:text-brand-200">
                            <Mail size={14} className="shrink-0" />
                            Abre el enlace enviado a tu correo
                          </span>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "admin" && isAdmin && (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                <section className="surface-card p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                      <ArrowLeftRight size={20} />
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        Transferir administración
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        La persona debe tener una cuenta y ser miembro activo de
                        esta familia. Después de transferir, tu rol será
                        MIEMBRO.
                      </p>
                    </div>
                  </div>
                  <form className="mt-5 space-y-4" onSubmit={handleTransfer}>
                    <SelectField
                      id="new-admin"
                      label="Nuevo administrador"
                      value={transferUserId}
                      onChange={(event) =>
                        setTransferUserId(event.target.value)
                      }
                      options={[
                        ["", "Selecciona una persona con cuenta"],
                        ...transferOptions.map((member) => [
                          valueOf(member, "linkedUserId", "linked_user_id"),
                          personName(member),
                        ]),
                      ]}
                      required
                    />
                    <button
                      className="primary-button w-full"
                      disabled={busy || !transferUserId}
                      type="submit"
                    >
                      {busy ? "Transfiriendo…" : "Transferir administración"}
                    </button>
                  </form>
                </section>
                <section className="surface-card p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                        <FileClock size={20} />
                      </span>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                          Auditoría de la familia
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Acciones administrativas recientes.
                        </p>
                      </div>
                    </div>
                    <button
                      className="icon-button border border-slate-200 dark:border-slate-800"
                      aria-label="Actualizar auditoría"
                      onClick={() =>
                        refreshAuditLogs().catch((error) =>
                          setNotice({ type: "error", message: error.message }),
                        )
                      }
                    >
                      <RefreshCw size={15} />
                    </button>
                  </div>
                  {loadingPanel ? (
                    <p className="mt-5 text-xs text-slate-500">
                      Cargando auditoría…
                    </p>
                  ) : auditLogs.length === 0 ? (
                    <p className="mt-5 rounded-xl bg-slate-50 p-4 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                      No hay eventos de auditoría para mostrar.
                    </p>
                  ) : (
                    <div className="soft-scrollbar mt-4 max-h-107.5space-y-2 overflow-y-auto">
                      {auditLogs.map((log) => (
                        <article
                          key={log.id}
                          className="rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {log.action}
                            </span>
                            <time className="text-[10px] text-slate-400">
                              {formatDateTime(log.created_at)}
                            </time>
                          </div>
                          <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {[log.actor_first_name, log.actor_last_name]
                              .filter(Boolean)
                              .join(" ") ||
                              log.actor_email ||
                              "Sistema"}{" "}
                            · {log.entity}
                          </p>
                          <p className="mt-1 break-all text-[10px] text-slate-400">
                            Registro: {log.entity_id || "—"}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </section>
        </>
      )}

      {createFamilyModal}
      {(modal?.mode === "createMember" || modal?.mode === "editMember") && (
        <MemberFormModal
          key={`${modal.mode}-${modal.member?.id || "new"}`}
          mode={modal.mode === "createMember" ? "create" : "edit"}
          member={modal.member}
          isAdmin={isAdmin}
          busy={busy}
          onClose={() => setModal(null)}
          onSave={handleMemberSave}
        />
      )}
      {modal?.mode === "viewMember" && (
        <MemberDetailsModal
          member={modal.member}
          isOwn={modal.isOwn}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "invite" && (
        <InvitationFormModal
          members={members}
          busy={busy}
          onClose={() => setModal(null)}
          onSave={handleInvite}
        />
      )}
    </div>
  );
}
