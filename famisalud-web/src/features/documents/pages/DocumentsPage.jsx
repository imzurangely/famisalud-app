import Select from "../../../shared/components/ui/Select.jsx";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useFamilies } from "../../../shared/hooks/useFamily.js";
import Button from "../../../shared/components/ui/Button.jsx";
import EmptyState from "../../../shared/components/ui/EmptyState.jsx";
import { confirmAction, notify } from "../../../shared/utils/feedback.js";
import DocumentCard from "../components/DocumentCard.jsx";
import DocumentFormModal from "../components/DocumentFormModal.jsx";
import { useDocuments } from "../hooks/useDocuments.js";
import { DOCUMENT_CATEGORIES, memberFullName } from "../utils/documentUtils.js";

function InlineError({ message, onClose }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
    >
      <span>{message}</span>
      <button type="button" className="font-bold underline" onClick={onClose}>
        Cerrar
      </button>
    </div>
  );
}

export default function DocumentsPage() {
  const {
    families: availableFamilies,
    selectedFamilyId: activeFamilyId,
    selectFamily,
  } = useFamilies();
  const [searchParams] = useSearchParams();
  const initialMemberId = searchParams.get("memberId") || "";
  const initialPersonId = searchParams.get("personId") || "";
  const initialAppointmentId = searchParams.get("appointmentId") || "";
  const targetDocumentId = searchParams.get("documentId") || "";
  const targetFamilyId = searchParams.get("familyId") || "";
  useEffect(() => {
    if (
      targetFamilyId &&
      availableFamilies.some(
        (family) => String(family.id) === String(targetFamilyId),
      ) &&
      String(activeFamilyId) !== String(targetFamilyId)
    ) {
      selectFamily(targetFamilyId);
    }
  }, [targetFamilyId, availableFamilies, activeFamilyId, selectFamily]);

  const {
    families,
    loadingFamilyCollection,
    selectedFamily,
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
    clearError,
    canManageSelected,
    reloadDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
  } = useDocuments({ initialMemberId, initialPersonId, initialAppointmentId });
  useEffect(() => {
    setFilters((current) => ({
      ...current,
      appointmentId: initialAppointmentId,
    }));
  }, [initialAppointmentId, setFilters]);
  const [modalMode, setModalMode] = useState(null);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [searchDraft, setSearchDraft] = useState(filters.search || "");

  useEffect(() => {
    if (loadingDocuments || !targetDocumentId) return;
    const element = document.getElementById(`document-${targetDocumentId}`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [documents, loadingDocuments, targetDocumentId, selectedMemberId]);

  function openCreate() {
    setCurrentDocument(null);
    setModalMode("create");
  }

  function openEdit(document) {
    setCurrentDocument(document);
    setModalMode("edit");
  }

  async function handleSave(values) {
    try {
      if (modalMode === "create") await createDocument(values);
      else await updateDocument(currentDocument.id, values);
      setModalMode(null);
      setCurrentDocument(null);
      notify.success(
        modalMode === "create"
          ? "Documento subido correctamente."
          : "Documento actualizado correctamente.",
      );
    } catch (requestError) {
      notify.error(
        requestError?.message || "No fue posible guardar el documento.",
      );
      throw requestError;
    }
  }

  async function handleDelete(document) {
    const confirmation = await confirmAction({
      title: "¿Eliminar este documento?",
      text: `Se eliminará “${document.title || document.original_file_name || "Documento"}” de la historia de ${selectedMember ? memberFullName(selectedMember) : "este perfil"}.`,
      confirmButtonText: "Eliminar documento",
      cancelButtonText: "Conservar",
      icon: "warning",
    });
    if (!confirmation.isConfirmed) return;
    try {
      await deleteDocument(document.id);
      notify.success("Documento eliminado correctamente.");
    } catch (requestError) {
      notify.error(
        requestError?.message || "No fue posible eliminar el documento.",
      );
    }
  }

  function changeMember(memberId) {
    setSelectedMemberId(memberId);
    setFilters((current) => ({ ...current, appointmentId: "" }));
  }

  function applySearch(event) {
    event.preventDefault();
    setFilters((current) => ({ ...current, search: searchDraft.trim() }));
  }

  if (families.length === 0 && !loadingFamilyCollection) {
    return (
      <EmptyState
        icon={UsersRound}
        title="Primero crea o únete a una familia"
        description="Los documentos se consultan dentro de un espacio personal o familiar."
        action={
          <Link to="/familia" className="primary-button">
            Ir a Mi familia
          </Link>
        }
      />
    );
  }

  if (loadingFamilyCollection && families.length === 0) {
    return (
      <div
        className="surface-card h-64 animate-pulse"
        aria-label="Cargando familias"
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">
            Archivos clínicos
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Documentos
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Guarda y consulta resultados, órdenes médicas e información clínica,
            con opción de vincularlos a una cita.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => reloadDocuments().catch(() => {})}
            disabled={loadingDocuments || !selectedMemberId}
          >
            <RefreshCw
              size={15}
              className={loadingDocuments ? "animate-spin" : ""}
            />{" "}
            Actualizar
          </Button>
          {canManageSelected && (
            <Button onClick={openCreate}>
              <Plus size={16} /> Subir documento
            </Button>
          )}
        </div>
      </header>

      <section className="surface-card grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:p-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Familia o espacio
          </span>
          <div className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <UsersRound size={16} className="text-brand-600" />
            {selectedFamily?.name || "Selecciona una familia"}
          </div>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Perfil clínico
          </span>
          <Select
            className="form-input"
            value={selectedMemberId}
            onChange={(event) => changeMember(event.target.value)}
            disabled={loadingMembers || members.length === 0}
          >
            {members.length === 0 && (
              <option value="">No hay perfiles activos</option>
            )}
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {memberFullName(member)}
              </option>
            ))}
          </Select>
        </label>
      </section>

      {selectedMember && (
        <section className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 p-4 dark:border-brand-900/70 dark:bg-brand-950/25 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-200">
              <ShieldCheck size={19} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Documentos de {memberFullName(selectedMember)}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {canManageSelected
                  ? "Puedes gestionar documentos para este perfil según tus permisos."
                  : "Tienes permiso de consulta para los documentos de este perfil."}
              </p>
            </div>
          </div>
          {!canManageSelected && (
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              Solo lectura
            </span>
          )}
        </section>
      )}

      <InlineError message={error} onClose={clearError} />

      <section className="surface-card grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)_minmax(0,0.75fr)] sm:p-5">
        <form className="flex items-center gap-2" onSubmit={applySearch}>
          <label className="sr-only" htmlFor="documents-search">
            Buscar documento por título
          </label>
          <input
            id="documents-search"
            className="form-input min-w-0"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            maxLength={100}
            placeholder="Buscar por título…"
          />
          <Button type="submit" variant="secondary" className="shrink-0 px-3">
            <Search size={15} /> Buscar
          </Button>
        </form>
        <label className="block">
          <span className="sr-only">Filtrar por categoría</span>
          <Select
            className="form-input"
            value={filters.category}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                category: event.target.value,
              }))
            }
          >
            <option value="">Todas las categorías</option>
            {DOCUMENT_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="sr-only">Filtrar por cita</span>
          <Select
            className="form-input"
            value={filters.appointmentId}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                appointmentId: event.target.value,
              }))
            }
            disabled={loadingAppointments}
          >
            <option value="">Todas las citas</option>
            {appointments.map((appointment) => (
              <option key={appointment.id} value={appointment.id}>
                {appointment.title || "Cita médica"}
              </option>
            ))}
          </Select>
        </label>
      </section>

      {initialAppointmentId && (
        <div className="rounded-xl border border-brand-100 bg-brand-50/70 px-4 py-3 text-xs text-brand-800 dark:border-brand-900/70 dark:bg-brand-950/25 dark:text-brand-200">
          Mostrando documentos vinculados a la cita seleccionada.
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
            Archivos del perfil
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {documents.length}{" "}
            {documents.length === 1 ? "documento" : "documentos"}
          </p>
        </div>
        {initialAppointmentId && (
          <button
            type="button"
            className="text-xs font-bold text-brand-700 underline dark:text-brand-300"
            onClick={() => {
              setFilters((current) => ({ ...current, appointmentId: "" }));
            }}
          >
            Quitar filtro de cita
          </button>
        )}
      </div>

      {loadingMembers || loadingDocuments ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="surface-card h-48 animate-pulse" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No hay perfiles en este espacio"
          description="Crea o vincula un perfil desde Mi familia antes de subir documentos."
          action={
            <Link to="/familia" className="secondary-button">
              Ir a Mi familia
            </Link>
          }
        />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay documentos para mostrar"
          description={
            canManageSelected
              ? "Puedes subir el primer documento de este perfil."
              : "Cuando se registre información documental, aparecerá aquí."
          }
          action={
            canManageSelected ? (
              <Button onClick={openCreate}>
                <Plus size={16} /> Subir documento
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              isTarget={String(document.id) === String(targetDocumentId)}
              canManage={canManageSelected}
              onEdit={() => openEdit(document)}
              onDelete={() => handleDelete(document)}
            />
          ))}
        </div>
      )}

      {modalMode && (
        <DocumentFormModal
          mode={modalMode}
          document={currentDocument}
          appointments={appointments}
          loadingAppointments={loadingAppointments}
          busy={busy}
          onClose={() => {
            if (!busy) {
              setModalMode(null);
              setCurrentDocument(null);
            }
          }}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}
