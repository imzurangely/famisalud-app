import Select from "../../../shared/components/ui/Select.jsx";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../../../shared/components/ui/Button.jsx";
import EmptyState from "../../../shared/components/ui/EmptyState.jsx";
import { confirmAction, notify } from "../../../shared/utils/feedback.js";
import { useMedicalHistory } from "../hooks/useMedicalHistory.js";
import MedicalRecordCard from "../components/MedicalRecordCard.jsx";
import MedicalRecordFormModal from "../components/MedicalRecordFormModal.jsx";
import { HISTORY_SECTIONS } from "../utils/medicalHistoryConfig.js";
import { fieldValue } from "../utils/medicalHistoryUtils.js";

function memberName(member) {
  return (
    [fieldValue(member, "firstName"), fieldValue(member, "lastName")]
      .filter(Boolean)
      .join(" ") || "Perfil sin nombre"
  );
}

export default function MedicalHistoryPage() {
  const {
    families,
    selectedFamily,
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
    clearError,
    canManageSelected,
    isOwnSelected,
    familyNotSelected,
    createRecord,
    updateRecord,
    deleteRecord,
    reloadRecords,
  } = useMedicalHistory();
  const [modalRecord, setModalRecord] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const currentSection = useMemo(
    () =>
      HISTORY_SECTIONS.find((item) => item.id === section) ||
      HISTORY_SECTIONS[0],
    [section],
  );

  function openCreate() {
    setModalMode("create");
    setModalRecord(null);
  }

  function openEdit(record) {
    setModalMode("edit");
    setModalRecord(record);
  }

  async function handleSave(payload) {
    try {
      if (modalMode === "create") await createRecord(payload);
      else await updateRecord(modalRecord.id, payload);
      setModalRecord(null);
      setModalMode(null);
      notify.success(
        modalMode === "create"
          ? "Registro agregado a la historia clínica."
          : "Registro actualizado correctamente.",
      );
    } catch (requestError) {
      notify.error(
        requestError?.message || "No fue posible guardar el registro.",
      );
      throw requestError;
    }
  }

  async function handleDelete(record) {
    const title =
      section === "allergies"
        ? fieldValue(record, "allergen")
        : section === "conditions"
          ? fieldValue(record, "name")
          : section === "vaccines"
            ? fieldValue(record, "vaccineName")
            : "este registro de signos vitales";
    const confirmation = await confirmAction({
      title: "¿Eliminar este registro?",
      text: `Se eliminará ${title || "el registro seleccionado"} de la historia clínica de ${memberName(selectedMember)}.`,
      confirmButtonText: "Eliminar registro",
      cancelButtonText: "Conservar",
      icon: "warning",
    });
    if (!confirmation.isConfirmed) return;
    try {
      await deleteRecord(record.id);
      notify.success("Registro eliminado correctamente.");
    } catch (requestError) {
      notify.error(
        requestError?.message || "No fue posible eliminar el registro.",
      );
    }
  }

  if (families.length === 0 && !loadingMembers) {
    return (
      <EmptyState
        icon={UsersRound}
        title="Primero crea o únete a una familia"
        description="La historia clínica se consulta dentro de uno de tus espacios. Puedes empezar creando una familia o configurar tu espacio personal."
        action={
          <Link to="/familia" className="primary-button">
            Ir a mis familias
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#176d79] via-brand-500 to-[#4c82a6] p-6 text-white shadow-lg shadow-brand-900/10 sm:p-8">
        <div className="absolute -right-20 -top-28 size-72 rounded-full border-42 border-white/8" />
        <div className="absolute -bottom-28 right-24 size-48 rounded-full border-28 border-white/[0.07]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
              Información de salud
            </p>
            {selectedMember && (
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
                Historia clínica de {memberName(selectedMember)}
              </h1>
            )}
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              Consulta y registra información clínica como alergias, vacunas, condiciones y signos vitales
              de las personas a las que tienes acceso
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="border-white/30! bg-white/10! text-white! hover:bg-white/20!"
              onClick={() => reloadRecords().catch(() => {})}
              disabled={loadingRecords || !selectedMemberId}
            >
              <RefreshCw
                size={15}
                className={loadingRecords ? "animate-spin" : ""}
              />{" "}
              Actualizar
            </Button>
            {canManageSelected && (
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-brand-800 shadow-sm transition hover:bg-brand-50 sm:self-auto"
                onClick={openCreate}
              >
                <Plus size={16} /> Agregar registro
              </button>
            )}
          </div>
        </div>
      </header>
      {/* <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">
            Información de salud
          </p>
          {selectedMember && (
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Historia clínica de {memberName(selectedMember)}
            </h1>
          )}
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {canManageSelected
              ? "Puedes gestionar los registros de este perfil según tus permisos."
              : "Tienes permiso de consulta para este perfil."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => reloadRecords().catch(() => {})}
            disabled={loadingRecords || !selectedMemberId}
          >
            <RefreshCw
              size={15}
              className={loadingRecords ? "animate-spin" : ""}
            />{" "}
            Actualizar
          </Button>
          {canManageSelected && (
            <Button onClick={openCreate}>
              <Plus size={16} /> Agregar registro
            </Button>
          )}
        </div>
      </header> */}

      {familyNotSelected && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Selecciona una familia desde el menú lateral.
        </div>
      )}

      <section className="surface-card grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:p-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Familia
          </span>
          <div className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <UsersRound size={16} className="text-brand-600" />
            {selectedFamily?.name || "Selecciona un espacio en el menú"}
          </div>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Perfil clínico
          </span>
          <Select
            className="form-input"
            value={selectedMemberId}
            onChange={(event) => setSelectedMemberId(event.target.value)}
            disabled={loadingMembers || members.length === 0}
          >
            {members.length === 0 && (
              <option value="">No hay perfiles activos</option>
            )}
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {memberName(member)}
                {isOwnSelected && String(member.id) === String(selectedMemberId)
                  ? " (mi perfil)"
                  : ""}
              </option>
            ))}
          </Select>
        </label>
      </section>

      <section className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {HISTORY_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition ${section === id ? "border-brand-500 bg-brand-500 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"}`}
            >
              <Icon size={16} /> {label}
              {section === id && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                  {records.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div>
          {!canManageSelected && selectedMember && (
            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              Solo lectura
            </span>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="font-bold underline"
            >
              Cerrar
            </button>
          </div>
        )}

        {loadingMembers || loadingRecords ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="surface-card h-44 animate-pulse" />
            <div className="surface-card h-44 animate-pulse" />
            <div className="surface-card h-44 animate-pulse" />
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No hay perfiles en este espacio"
            description="Agrega o vincula un perfil desde la sección de familia antes de consultar su historia clínica."
            action={
              <Link to="/familia" className="secondary-button">
                Ir a Mi familia
              </Link>
            }
          />
        ) : records.length === 0 ? (
          <EmptyState
            icon={Activity}
            title={`Aún no hay registros de ${currentSection.label.toLowerCase()}`}
            description={
              canManageSelected
                ? "Puedes agregar el primer registro para este perfil."
                : "Cuando un administrador o el titular agregue información, aparecerá aquí."
            }
            action={
              canManageSelected ? (
                <Button onClick={openCreate}>
                  <Plus size={16} /> Agregar registro
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {records.map((record) => (
              <MedicalRecordCard
                key={record.id}
                section={section}
                record={record}
                canManage={canManageSelected}
                busy={busy}
                onEdit={() => openEdit(record)}
                onDelete={() => handleDelete(record)}
              />
            ))}
          </div>
        )}
      </section>

      {modalMode && (modalRecord || modalMode === "create") && (
        <MedicalRecordFormModal
          key={`${section}:${modalRecord?.id || "new"}`}
          section={section}
          record={modalRecord}
          title={`${modalMode === "create" ? "Agregar" : "Editar"} ${currentSection.label.toLowerCase()}`}
          submitting={busy}
          onClose={() => {
            setModalRecord(null);
            setModalMode(null);
          }}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}
