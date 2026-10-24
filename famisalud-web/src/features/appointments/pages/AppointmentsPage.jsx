import Select from "../../../shared/components/ui/Select.jsx";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  CalendarDays,
  Plus,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import { useFamilies } from "../../../shared/hooks/useFamily.js";
import Button from "../../../shared/components/ui/Button.jsx";
import EmptyState from "../../../shared/components/ui/EmptyState.jsx";
import ModuleSearch from "../../../shared/components/ui/ModuleSearch.jsx";
import { confirmAction, notify } from "../../../shared/utils/feedback.js";
import AppointmentCard from "../components/AppointmentCard.jsx";
import AppointmentFormModal from "../components/AppointmentFormModal.jsx";
import { useAppointments } from "../hooks/useAppointments.js";
import {
  APPOINTMENT_STATUSES,
  memberFullName,
} from "../utils/appointmentUtils.js";

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

export default function AppointmentsPage() {
  const {
    families: availableFamilies,
    selectedFamilyId: activeFamilyId,
    selectFamily,
  } = useFamilies();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialMemberId = searchParams.get("memberId") || "";
  const initialPersonId = searchParams.get("personId") || "";
  const targetAppointmentId = searchParams.get("appointmentId") || "";
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
    statusFilter,
    setStatusFilter,
    loadingMembers,
    loadingAppointments,
    busy,
    error,
    clearError,
    canManageSelected,
    reloadAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments({ initialMemberId, initialPersonId });
  const [modalMode, setModalMode] = useState(null);
  const [currentAppointment, setCurrentAppointment] = useState(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const filteredAppointments = useMemo(() => {
    const query = appliedSearch.trim().toLocaleLowerCase("es-CO");
    if (!query) return appointments;
    return appointments.filter((appointment) => [
      appointment.title,
      appointment.type,
      appointment.appointmentType,
      appointment.appointment_type,
      appointment.specialty,
      appointment.doctorName,
      appointment.doctor_name,
      appointment.location,
      appointment.reason,
      appointment.notes,
      appointment.status,
    ].filter(Boolean).join(" ").toLocaleLowerCase("es-CO").includes(query));
  }, [appointments, appliedSearch]);

  function clearSearch() {
    setSearchDraft("");
    setAppliedSearch("");
  }

  useEffect(() => {
    if (loadingAppointments || !targetAppointmentId) return;
    const element = document.getElementById(
      `appointment-${targetAppointmentId}`,
    );
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [
    appointments,
    loadingAppointments,
    targetAppointmentId,
    selectedMemberId,
  ]);

  function openCreate() {
    setCurrentAppointment(null);
    setModalMode("create");
  }

  function openEdit(appointment) {
    setCurrentAppointment(appointment);
    setModalMode("edit");
  }

  async function handleSave(payload) {
    try {
      if (modalMode === "create") await createAppointment(payload);
      else await updateAppointment(currentAppointment.id, payload);
      setModalMode(null);
      setCurrentAppointment(null);
      notify.success(
        modalMode === "create"
          ? "Cita creada correctamente."
          : "Cita actualizada correctamente.",
      );
    } catch (requestError) {
      notify.error(requestError?.message || "No fue posible guardar la cita.");
      throw requestError;
    }
  }

  async function handleDelete(appointment) {
    const confirmation = await confirmAction({
      title: "¿Eliminar esta cita?",
      text: `Se eliminará “${appointment.title || "Cita médica"}” de la historia de ${selectedMember ? memberFullName(selectedMember) : "este perfil"}.`,
      confirmButtonText: "Eliminar cita",
      cancelButtonText: "Conservar",
      icon: "warning",
    });
    if (!confirmation.isConfirmed) return;
    try {
      await deleteAppointment(appointment.id);
      notify.success("Cita eliminada correctamente.");
    } catch (requestError) {
      notify.error(requestError?.message || "No fue posible eliminar la cita.");
    }
  }

  function openDocuments(appointment) {
    const personId =
      selectedMember?.personId ??
      selectedMember?.person_id ??
      selectedMember?.person?.id ??
      "";
    const params = new URLSearchParams({
      memberId: String(selectedMemberId || ""),
      appointmentId: String(appointment.id),
    });
    if (personId) params.set("personId", String(personId));
    if (selectedFamily?.id) params.set("familyId", String(selectedFamily.id));
    navigate(`/documentos?${params.toString()}`);
  }

  if (families.length === 0 && !loadingFamilyCollection) {
    return (
      <EmptyState
        icon={UsersRound}
        title="Primero crea o únete a una familia"
        description="Las citas se administran dentro de un espacio personal o familiar."
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
      <header className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#176d79] via-brand-500 to-[#4c82a6] p-6 text-white shadow-lg shadow-brand-900/10 sm:p-8">
        <div className="absolute -right-20 -top-28 size-72 rounded-full border-42 border-white/8" />
        <div className="absolute -bottom-28 right-24 size-48 rounded-full border-28 border-white/[0.07]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
              Agenda de salud
            </p>
            {selectedMember && (
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
                Citas médicas de {memberFullName(selectedMember)}
              </h1>
            )}
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              Programa citas, consulta los detalles y accede a los documentos
              vinculados a cada consulta.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="border-white/30! bg-white/10! text-white! hover:bg-white/20!"
              onClick={() => reloadAppointments().catch(() => {})}
              disabled={loadingAppointments || !selectedMemberId}
            >
              <RefreshCw
                size={15}
                className={loadingAppointments ? "animate-spin" : ""}
              />{" "}
              Actualizar
            </Button>
            {canManageSelected && (
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-brand-800 shadow-sm transition hover:bg-brand-50 sm:self-auto"
                onClick={openCreate}
              >
                <Plus size={16} /> Nueva cita
              </button>
            )}
          </div>
        </div>
      </header>

      {/* <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">
            Agenda de salud
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Citas médicas
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Programa citas, consulta los detalles y accede a los documentos
            vinculados a cada consulta.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => reloadAppointments().catch(() => {})}
            disabled={loadingAppointments || !selectedMemberId}
          >
            <RefreshCw
              size={15}
              className={loadingAppointments ? "animate-spin" : ""}
            />{" "}
            Actualizar
          </Button>
          {canManageSelected && (
            <Button onClick={openCreate}>
              <Plus size={16} /> Nueva cita
            </Button>
          )}
        </div>
      </header> */}

      <section className="surface-card grid gap-4 p-4 sm:grid-cols-2 sm:p-5 items-center">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Familia o espacio
          </span>
          <div className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <UsersRound size={16} className="text-brand-600 shrink-0" />
            <span className="truncate">
              {selectedFamily?.name || "Selecciona una familia"}
            </span>
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Perfil clínico
          </span>
          <Select
            className="form-input w-full"
            value={selectedMemberId}
            onChange={(event) => setSelectedMemberId(event.target.value)}
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

      <InlineError message={error} onClose={clearError} />

      <section className="surface-card grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.45fr)] sm:p-5">
        <ModuleSearch
          id="appointments-search"
          value={searchDraft}
          onChange={(event) => {
            setSearchDraft(event.target.value);
            setAppliedSearch(event.target.value);
          }}
          onClear={clearSearch}
          placeholder="Buscar por título, profesional o lugar…"
          ariaLabel="Buscar citas médicas"
        />
        <Select
          ariaLabel="Filtrar citas por estado"
          className="form-input"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">Todos los estados</option>
          {APPOINTMENT_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </Select>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {!canManageSelected && selectedMember && (
            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              Solo lectura
            </span>
          )}
        </div>
      </div>

      {loadingMembers || loadingAppointments ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="surface-card h-56 animate-pulse" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No hay perfiles en este espacio"
          description="Crea o vincula un perfil desde Mi familia antes de programar citas."
          action={
            <Link to="/familia" className="secondary-button">
              Ir a Mi familia
            </Link>
          }
        />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No hay citas para mostrar"
          description={
            statusFilter
              ? "No encontramos citas con ese estado. Prueba otro filtro."
              : canManageSelected
                ? "Puedes crear la primera cita de este perfil."
                : "Cuando se registren citas para este perfil, aparecerán aquí."
          }
          action={
            canManageSelected && !statusFilter ? (
              <Button onClick={openCreate}>
                <Plus size={16} /> Programar cita
              </Button>
            ) : null
          }
        />
      ) : filteredAppointments.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No encontramos citas"
          description="Prueba con otro término de búsqueda o limpia el buscador."
          action={<Button variant="secondary" onClick={clearSearch}>Limpiar búsqueda</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              isTarget={String(appointment.id) === String(targetAppointmentId)}
              canManage={canManageSelected}
              onEdit={() => openEdit(appointment)}
              onDelete={() => handleDelete(appointment)}
              onOpenDocuments={() => openDocuments(appointment)}
            />
          ))}
        </div>
      )}

      {modalMode && (
        <AppointmentFormModal
          mode={modalMode}
          appointment={currentAppointment}
          busy={busy}
          onClose={() => {
            if (!busy) {
              setModalMode(null);
              setCurrentAppointment(null);
            }
          }}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}
