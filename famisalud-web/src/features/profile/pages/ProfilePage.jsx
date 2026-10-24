import Select from "../../../shared/components/ui/Select.jsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  KeyRound,
  LogOut,
  Mail,
  MonitorSmartphone,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import Button from "../../../shared/components/ui/Button.jsx";
import EmptyState from "../../../shared/components/ui/EmptyState.jsx";
import { Link } from "react-router-dom";
import { useAuth } from "../../../shared/hooks/useAuth.js";
import { useFamilies } from "../../../shared/hooks/useFamily.js";
import { confirmAction, notify } from "../../../shared/utils/feedback.js";
import {
  valueOf,
  personName,
  formatDateTime,
} from "../../family/utils/familyUtils.js";
import {
  changePassword,
  createInsurancePlan,
  deleteInsurancePlan,
  leaveFamily,
  listEPSCompanies,
  listInsurancePlans,
  listProfileFamilyMembers,
  listSessions,
  revokeAllSessions,
  revokeSession,
  transferFamilyAdministrator,
  updateOwnProfile,
  updateInsurancePlan,
} from "../services/profileService.js";

const GENDERS = [
  ["", "Seleccionar…"],
  ["MASCULINO", "Masculino"],
  ["FEMENINO", "Femenino"],
  ["NO_BINARIO", "No binario"],
  ["OTRO", "Otro"],
  ["PREFIERO_NO_DECIR", "Prefiero no decir"],
];
const BLOOD_TYPES = [
  ["", "Sin especificar"],
  ["A+", "A+"],
  ["A-", "A-"],
  ["B+", "B+"],
  ["B-", "B-"],
  ["AB+", "AB+"],
  ["AB-", "AB-"],
  ["O+", "O+"],
  ["O-", "O-"],
];

function stringValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

function dateValue(value) {
  return value ? String(value).slice(0, 10) : "";
}

function fieldLabelClass() {
  return "block text-xs font-semibold text-slate-600 dark:text-slate-300";
}

function ProfileField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  maxLength,
  placeholder,
  min,
  max,
  hint,
}) {
  return (
    <label className={fieldLabelClass()}>
      {label}
      {required && <span className="ml-1 text-rose-500">*</span>}
      <input
        className="form-input mt-2"
        type={type}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        min={min}
        max={max}
      />
      {hint && (
        <span className="mt-1.5 block text-[11px] font-normal leading-relaxed text-slate-400">
          {hint}
        </span>
      )}
    </label>
  );
}

function ProfileSelect({ label, value, onChange, options, required = false }) {
  return (
    <label className={fieldLabelClass()}>
      {label}
      {required && <span className="ml-1 text-rose-500">*</span>}
      <Select
        className="form-input mt-2"
        value={value ?? ""}
        onChange={onChange}
        required={required}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue || "empty"} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </Select>
    </label>
  );
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200">
        <Icon size={21} />
      </span>
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function initialProfile(user) {
  return {
    firstName: stringValue(user?.firstName),
    lastName: stringValue(user?.lastName),
    birthDate: dateValue(user?.birthDate),
    gender: stringValue(user?.gender),
    customGender: stringValue(user?.customGender),
    bloodType: stringValue(user?.bloodType),
    phone: stringValue(user?.phone),
    sisben: stringValue(user?.sisben),
    stratum: stringValue(user?.stratum),
    avatarUrl: stringValue(user?.avatarUrl),
  };
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateUser, clearAuth } = useAuth();
  const { families, selectedFamily, selectedFamilyId, reloadFamilies } =
    useFamilies();
  const [profile, setProfile] = useState(() => initialProfile(user));
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [members, setMembers] = useState([]);
  const [selfMember, setSelfMember] = useState(null);
  const [loadingSelfMember, setLoadingSelfMember] = useState(true);
  const [epsCompanies, setEpsCompanies] = useState([]);
  const [insurancePlans, setInsurancePlans] = useState([]);
  const [loadingEPS, setLoadingEPS] = useState(false);
  const [epsBusy, setEpsBusy] = useState(false);
  const [epsError, setEpsError] = useState("");
  const [epsValues, setEpsValues] = useState({
    epsId: "",
    planNumber: "",
    contributorType: "",
    contactPhone: "",
    website: "",
    notes: "",
  });
  const [transferUserId, setTransferUserId] = useState("");
  const [familyBusy, setFamilyBusy] = useState(false);
  const [passwordValues, setPasswordValues] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => setProfile(initialProfile(user)), [user]);

  useEffect(() => {
    let active = true;
    setLoadingSessions(true);
    listSessions()
      .then((data) => {
        if (active) setSessions(data);
      })
      .catch((error) => {
        if (active)
          notify.error(error?.message || "No fue posible cargar las sesiones.");
      })
      .finally(() => {
        if (active) setLoadingSessions(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingSelfMember(true);
    setMembers([]);
    setSelfMember(null);
    async function findOwnProfile() {
      const orderedFamilies = [
        selectedFamily,
        ...families.filter(
          (family) => String(family.id) !== String(selectedFamilyId),
        ),
      ].filter(Boolean);
      for (const family of orderedFamilies) {
        try {
          const familyMembers = await listProfileFamilyMembers(family.id);
          if (!active) return;
          if (String(family.id) === String(selectedFamilyId))
            setMembers(familyMembers);
          const own = familyMembers.find(
            (member) =>
              String(
                valueOf(member, "linkedUserId", "linked_user_id") || "",
              ) === String(user?.id || ""),
          );
          if (own) {
            setSelfMember(own);
            return;
          }
        } catch {
          // Si un espacio no responde, se siguen buscando los perfiles accesibles en los demás.
        }
      }
    }
    findOwnProfile().finally(() => {
      if (active) setLoadingSelfMember(false);
    });
    return () => {
      active = false;
    };
  }, [families, selectedFamily, selectedFamilyId, user?.id]);

  useEffect(() => {
    let active = true;
    listEPSCompanies()
      .then((items) => {
        if (active) setEpsCompanies(items);
      })
      .catch((error) => {
        if (active)
          setEpsError(error?.message || "No fue posible cargar las EPS.");
      });
    return () => {
      active = false;
    };
  }, []);

  const reloadInsurance = useCallback(async () => {
    if (!selfMember?.id) {
      setInsurancePlans([]);
      return [];
    }
    setLoadingEPS(true);
    setEpsError("");
    try {
      const plans = await listInsurancePlans(selfMember.id);
      setInsurancePlans(plans);
      const active = plans[0];
      setEpsValues({
        epsId: stringValue(valueOf(active, "epsId", "eps_id")),
        planNumber: stringValue(valueOf(active, "planNumber", "plan_number")),
        contributorType: stringValue(
          valueOf(active, "contributorType", "contributor_type"),
        ),
        contactPhone: stringValue(
          valueOf(active, "contactPhone", "contact_phone"),
        ),
        website: stringValue(active?.website),
        notes: stringValue(active?.notes),
      });
      return plans;
    } catch (error) {
      setInsurancePlans([]);
      setEpsError(error?.message || "No fue posible cargar la afiliación EPS.");
      return [];
    } finally {
      setLoadingEPS(false);
    }
  }, [selfMember?.id]);

  useEffect(() => {
    reloadInsurance();
  }, [reloadInsurance]);

  const activePlan = insurancePlans[0] || null;
  const transferOptions = useMemo(
    () =>
      members.filter((member) => {
        const linkedId = valueOf(member, "linkedUserId", "linked_user_id");
        return linkedId && String(linkedId) !== String(user?.id);
      }),
    [members, user?.id],
  );
  const isAdmin =
    String(valueOf(selectedFamily, "role")).toUpperCase() === "ADMINISTRADOR";

  async function saveProfile(event) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileError("");
    try {
      const payload = {
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        birthDate: profile.birthDate || null,
        gender: profile.gender || null,
        customGender:
          profile.gender === "OTRO"
            ? profile.customGender.trim() || null
            : null,
        bloodType: profile.bloodType || null,
        phone: profile.phone.trim() || null,
        sisben: profile.sisben.trim() || null,
        stratum: profile.stratum === "" ? null : Number(profile.stratum),
        avatarUrl: profile.avatarUrl.trim() || null,
      };
      const response = await updateOwnProfile(payload);
      if (response?.user) updateUser(response.user);
      notify.success(
        "Tu perfil personal quedó actualizado. Los cambios de identidad se comparten entre tus familias.",
      );
    } catch (error) {
      const message = error?.message || "No fue posible guardar el perfil.";
      setProfileError(message);
      notify.error(message);
    } finally {
      setProfileBusy(false);
    }
  }

  async function saveInsurance(event) {
    event.preventDefault();
    if (!selfMember?.id) {
      notify.warning(
        "No encontramos tu perfil vinculado en una familia. Primero revisa Mi familia.",
      );
      return;
    }
    if (!epsValues.epsId) {
      setEpsError("Selecciona una EPS para guardar la afiliación.");
      return;
    }
    setEpsBusy(true);
    setEpsError("");
    try {
      const payload = {
        epsId: epsValues.epsId,
        planNumber: epsValues.planNumber.trim() || null,
        contributorType: epsValues.contributorType.trim() || null,
        contactPhone: epsValues.contactPhone.trim() || null,
        website: epsValues.website.trim() || null,
        notes: epsValues.notes.trim() || null,
      };
      if (activePlan)
        await updateInsurancePlan(selfMember.id, activePlan.id, payload);
      else await createInsurancePlan(selfMember.id, payload);
      await reloadInsurance();
      notify.success(
        "La afiliación EPS quedó guardada. Ya puedes asociarla a una autorización de medicamento.",
      );
    } catch (error) {
      const message =
        error?.message || "No fue posible guardar la afiliación EPS.";
      setEpsError(message);
      notify.error(message);
    } finally {
      setEpsBusy(false);
    }
  }

  async function removeInsurance() {
    if (!activePlan || !selfMember?.id) return;
    const confirmation = await confirmAction({
      title: "¿Retirar esta afiliación EPS?",
      text: "La afiliación activa se retirará del perfil. No se borrarán la persona ni sus registros clínicos.",
      confirmButtonText: "Retirar afiliación",
      cancelButtonText: "Conservar",
      icon: "warning",
    });
    if (!confirmation.isConfirmed) return;
    setEpsBusy(true);
    try {
      await deleteInsurancePlan(selfMember.id, activePlan.id);
      await reloadInsurance();
      notify.success("La afiliación EPS se retiró correctamente.");
    } catch (error) {
      notify.error(error?.message || "No fue posible retirar la afiliación.");
    } finally {
      setEpsBusy(false);
    }
  }

  async function doTransferAdministrator() {
    if (!selectedFamilyId || !transferUserId) {
      notify.warning(
        "Selecciona a otro miembro con cuenta para transferir la administración.",
      );
      return;
    }
    const target = transferOptions.find(
      (member) =>
        String(valueOf(member, "linkedUserId", "linked_user_id")) ===
        String(transferUserId),
    );
    const confirmation = await confirmAction({
      title: "¿Transferir la administración?",
      text: `${personName(target)} pasará a ser administrador y tu rol cambiará a miembro.`,
      confirmButtonText: "Transferir administración",
      cancelButtonText: "Cancelar",
      icon: "warning",
    });
    if (!confirmation.isConfirmed) return;
    setFamilyBusy(true);
    try {
      await transferFamilyAdministrator(selectedFamilyId, transferUserId);
      await reloadFamilies();
      setTransferUserId("");
      notify.success("La administración se transfirió correctamente.");
    } catch (error) {
      notify.error(
        error?.message || "No fue posible transferir la administración.",
      );
    } finally {
      setFamilyBusy(false);
    }
  }

  async function doLeaveFamily() {
    if (!selectedFamilyId || !selectedFamily) return;
    const confirmation = await confirmAction({
      title: `¿Salir de ${selectedFamily.name}?`,
      text: isAdmin
        ? "Solo podrás salir si la familia ya tiene otro administrador. Si eres el único, transfiere primero la administración."
        : "Dejarás de tener acceso a esta familia. Tu identidad global y tu historia clínica no se eliminan.",
      confirmButtonText: "Salir de la familia",
      cancelButtonText: "Permanecer",
      icon: "warning",
    });
    if (!confirmation.isConfirmed) return;
    setFamilyBusy(true);
    try {
      await leaveFamily(selectedFamilyId);
      await reloadFamilies();
      notify.success(
        "Saliste de la familia. Tu cuenta y tu información personal siguen activas.",
      );
    } catch (error) {
      notify.error(error?.message || "No fue posible salir de la familia.");
    } finally {
      setFamilyBusy(false);
    }
  }

  async function handleRevokeSession(session) {
    const confirmation = await confirmAction({
      title: session.isCurrent
        ? "¿Cerrar esta sesión?"
        : "¿Revocar esta sesión?",
      text: session.isCurrent
        ? "Se cerrará la sesión actual y tendrás que ingresar nuevamente."
        : "El dispositivo seleccionado tendrá que volver a iniciar sesión.",
      confirmButtonText: "Revocar sesión",
      cancelButtonText: "Cancelar",
      icon: "warning",
    });
    if (!confirmation.isConfirmed) return;
    setSessionBusy(true);
    try {
      await revokeSession(session.id);
      if (session.isCurrent) {
        clearAuth();
        navigate("/login", { replace: true });
      } else {
        setSessions((current) =>
          current.filter((item) => item.id !== session.id),
        );
        notify.success("La sesión fue revocada.");
      }
    } catch (error) {
      notify.error(error?.message || "No fue posible revocar la sesión.");
    } finally {
      setSessionBusy(false);
    }
  }

  async function handleRevokeAllSessions() {
    const confirmation = await confirmAction({
      title: "¿Cerrar todas las sesiones?",
      text: "Se revocarán todas las sesiones activas, incluida esta. Tendrás que iniciar sesión otra vez.",
      confirmButtonText: "Cerrar todas",
      cancelButtonText: "Cancelar",
      icon: "warning",
    });
    if (!confirmation.isConfirmed) return;
    setSessionBusy(true);
    try {
      await revokeAllSessions();
      clearAuth();
      navigate("/login", { replace: true });
    } catch (error) {
      notify.error(
        error?.message || "No fue posible cerrar todas las sesiones.",
      );
    } finally {
      setSessionBusy(false);
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setPasswordBusy(true);
    setPasswordError("");
    try {
      await changePassword(passwordValues);
      clearAuth();
      notify.success(
        "La contraseña cambió. Inicia sesión con la nueva contraseña.",
      );
      navigate("/login", { replace: true });
    } catch (error) {
      const message = error?.message || "No fue posible cambiar la contraseña.";
      setPasswordError(message);
      notify.error(message);
    } finally {
      setPasswordBusy(false);
    }
  }

  if (!user)
    return (
      <EmptyState
        icon={UserRound}
        title="No hay una sesión activa"
        description="Vuelve a iniciar sesión para gestionar tu perfil."
      />
    );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">
            Tu cuenta FamiSalud
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Mi perfil
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Tus datos personales viven en una identidad global. Si perteneces a
            varias familias, los cambios de identidad se reflejan en los
            perfiles que representan a la misma persona.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <Mail size={15} /> {user.email}
        </div>
      </header>

      <section className="surface-card p-5 sm:p-6">
        <SectionHeader
          icon={UserRound}
          title="Información personal"
          description="Actualiza tu nombre y datos demográficos. El correo de acceso se mantiene como identificador de tu cuenta."
        />
        <form className="mt-6 space-y-4" onSubmit={saveProfile}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField
              label="Nombre"
              value={profile.firstName}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  firstName: event.target.value,
                }))
              }
              required
              maxLength={100}
            />
            <ProfileField
              label="Apellidos"
              value={profile.lastName}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  lastName: event.target.value,
                }))
              }
              required
              maxLength={100}
            />
            <ProfileField
              label="Fecha de nacimiento"
              type="date"
              value={profile.birthDate}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  birthDate: event.target.value,
                }))
              }
            />
            <ProfileField
              label="Teléfono"
              type="tel"
              value={profile.phone}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
              maxLength={30}
              placeholder="Tu número de contacto"
            />
            <ProfileSelect
              label="Género"
              value={profile.gender}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  gender: event.target.value,
                  customGender:
                    event.target.value === "OTRO" ? current.customGender : "",
                }))
              }
              options={GENDERS}
            />
            {profile.gender === "OTRO" && (
              <ProfileField
                label="Especifica tu género"
                value={profile.customGender}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    customGender: event.target.value,
                  }))
                }
                required
                maxLength={100}
              />
            )}
            <ProfileSelect
              label="Grupo sanguíneo"
              value={profile.bloodType}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  bloodType: event.target.value,
                }))
              }
              options={BLOOD_TYPES}
            />
            <ProfileField
              label="Grupo Sisbén"
              value={profile.sisben}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  sisben: event.target.value,
                }))
              }
              maxLength={20}
              placeholder="Opcional"
            />
            <ProfileField
              label="Estrato"
              type="number"
              min="1"
              max="6"
              value={profile.stratum}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  stratum: event.target.value,
                }))
              }
              hint="Debe estar entre 1 y 6."
            />
            <ProfileField
              label="URL de foto de perfil (opcional)"
              type="url"
              value={profile.avatarUrl}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  avatarUrl: event.target.value,
                }))
              }
              placeholder="https://…"
            />
          </div>
          {profileError && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
            >
              {profileError}
            </p>
          )}
          <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="submit" loading={profileBusy}>
              <Save size={16} /> {profileBusy ? "Guardando…" : "Guardar perfil"}
            </Button>
          </div>
        </form>
      </section>

      <section className="surface-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            icon={ShieldCheck}
            title="Afiliación a EPS"
            description="Guarda la EPS activa de tu perfil para poder asociarla a tus autorizaciones de medicamentos."
          />
          {selfMember && (
            <span className="inline-flex h-fit items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Check size={13} /> Perfil vinculado
            </span>
          )}
        </div>
        {loadingSelfMember ? (
          <p className="mt-5 text-xs text-slate-500">
            Buscando tu perfil familiar…
          </p>
        ) : !selfMember ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            No encontramos un perfil familiar vinculado a esta cuenta. Entra en{" "}
            <Link className="font-bold underline" to="/familia">
              Mi familia
            </Link>{" "}
            y verifica que tu cuenta esté vinculada a tu propio perfil; después
            podrás registrar la EPS.
          </div>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={saveInsurance}>
            {activePlan && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                Ya hay una afiliación registrada. Guardar reemplazará sus datos
                activos; solo puede haber una EPS activa por perfil.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileSelect
                label="EPS"
                value={epsValues.epsId}
                onChange={(event) =>
                  setEpsValues((current) => ({
                    ...current,
                    epsId: event.target.value,
                  }))
                }
                options={[
                  ["", "Seleccionar EPS…"],
                  ...epsCompanies.map((company) => [
                    String(company.id),
                    company.name,
                  ]),
                ]}
                required
              />
              <ProfileField
                label="Número de afiliación (opcional)"
                value={epsValues.planNumber}
                onChange={(event) =>
                  setEpsValues((current) => ({
                    ...current,
                    planNumber: event.target.value,
                  }))
                }
                maxLength={100}
              />
              <ProfileField
                label="Tipo de afiliado"
                value={epsValues.contributorType}
                onChange={(event) =>
                  setEpsValues((current) => ({
                    ...current,
                    contributorType: event.target.value,
                  }))
                }
                maxLength={50}
                placeholder="Ej. Cotizante, beneficiario"
              />
              <ProfileField
                label="Teléfono de contacto"
                value={epsValues.contactPhone}
                onChange={(event) =>
                  setEpsValues((current) => ({
                    ...current,
                    contactPhone: event.target.value,
                  }))
                }
                maxLength={30}
              />
              <ProfileField
                label="Sitio web"
                type="url"
                value={epsValues.website}
                onChange={(event) =>
                  setEpsValues((current) => ({
                    ...current,
                    website: event.target.value,
                  }))
                }
                placeholder="https://…"
              />
              <label className={fieldLabelClass()}>
                Notas
                <textarea
                  className="form-input mt-2 min-h-11 resize-y"
                  rows={2}
                  maxLength={1000}
                  value={epsValues.notes}
                  onChange={(event) =>
                    setEpsValues((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            {epsError && (
              <p
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
              >
                {epsError}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-between">
              {activePlan ? (
                <Button
                  variant="danger"
                  onClick={removeInsurance}
                  disabled={epsBusy}
                >
                  <Trash2 size={15} /> Retirar afiliación
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" loading={epsBusy || loadingEPS}>
                <Save size={16} />{" "}
                {epsBusy
                  ? "Guardando…"
                  : activePlan
                    ? "Actualizar afiliación"
                    : "Guardar afiliación"}
              </Button>
            </div>
          </form>
        )}
      </section>

      <section className="surface-card p-5 sm:p-6">
        <SectionHeader
          icon={MonitorSmartphone}
          title="Sesiones activas"
          description="Consulta los dispositivos con sesión iniciada y revoca los que ya no reconozcas."
        />
        <div className="mt-5 space-y-3">
          {loadingSessions ? (
            <p className="text-xs text-slate-500">Cargando sesiones…</p>
          ) : sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-800">
              No hay sesiones activas para mostrar.
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {session.isCurrent
                        ? "Este dispositivo"
                        : session.userAgent || "Dispositivo / navegador"}
                    </p>
                    {session.isCurrent && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Sesión actual
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Último uso: {formatDateTime(session.lastUsedAt)} · Vence:{" "}
                    {formatDateTime(session.expiresAt)}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => handleRevokeSession(session)}
                  disabled={sessionBusy}
                  className="shrink-0"
                >
                  <LogOut size={14} /> Revocar
                </Button>
              </div>
            ))
          )}
        </div>
        {sessions.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Button
              variant="danger"
              onClick={handleRevokeAllSessions}
              disabled={sessionBusy}
            >
              <LogOut size={15} /> Cerrar todas las sesiones
            </Button>
          </div>
        )}
      </section>

      <section className="surface-card p-5 sm:p-6">
        <SectionHeader
          icon={KeyRound}
          title="Cambiar contraseña"
          description="Por seguridad, cambiar la contraseña cerrará las demás sesiones y te pedirá iniciar sesión de nuevo."
        />
        <form className="mt-5 space-y-4" onSubmit={handleChangePassword}>
          <div className="grid gap-4 sm:grid-cols-3">
            <ProfileField
              label="Contraseña actual"
              type="password"
              value={passwordValues.currentPassword}
              onChange={(event) =>
                setPasswordValues((current) => ({
                  ...current,
                  currentPassword: event.target.value,
                }))
              }
              required
              maxLength={128}
            />
            <ProfileField
              label="Nueva contraseña"
              type="password"
              value={passwordValues.newPassword}
              onChange={(event) =>
                setPasswordValues((current) => ({
                  ...current,
                  newPassword: event.target.value,
                }))
              }
              required
              maxLength={128}
              hint="Mínimo 8 caracteres, con minúscula, mayúscula y número."
            />
            <ProfileField
              label="Confirmar nueva contraseña"
              type="password"
              value={passwordValues.confirmPassword}
              onChange={(event) =>
                setPasswordValues((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              required
              maxLength={128}
            />
          </div>
          {passwordError && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
            >
              {passwordError}
            </p>
          )}
          <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="submit" loading={passwordBusy}>
              <KeyRound size={15} /> Actualizar contraseña
            </Button>
          </div>
        </form>
      </section>

      <section className="surface-card p-5 sm:p-6">
        <SectionHeader
          icon={UsersRound}
          title="Pertenencia familiar"
          description="Salir de una familia no elimina tu cuenta, tu identidad global ni tu historia clínica. Esta acción solo cambia tu membresía."
        />
        {!selectedFamily ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-800">
            No tienes una familia seleccionada. Puedes crear o revisar tus
            espacios desde{" "}
            <Link
              className="font-bold text-brand-700 underline dark:text-brand-300"
              to="/familia"
            >
              Mi familia
            </Link>
            .
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedFamily.name}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Tu rol: {valueOf(selectedFamily, "role") || "Miembro"} ·{" "}
                  {families.length} espacio(s) disponible(s)
                </p>
              </div>
              {isAdmin && (
                <span className="inline-flex h-fit items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-200">
                  <ShieldCheck size={13} /> Administrador
                </span>
              )}
            </div>
            {isAdmin && (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Transferir administración antes de salir
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Selecciona un miembro que tenga una cuenta vinculada. La API
                  impedirá que el único administrador abandone la familia.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Select
                    className="form-input min-w-0 flex-1"
                    value={transferUserId}
                    onChange={(event) => setTransferUserId(event.target.value)}
                  >
                    <option value="">Seleccionar nuevo administrador…</option>
                    {transferOptions.map((member) => (
                      <option
                        key={valueOf(member, "linkedUserId", "linked_user_id")}
                        value={valueOf(
                          member,
                          "linkedUserId",
                          "linked_user_id",
                        )}
                      >
                        {personName(member)}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="secondary"
                    onClick={doTransferAdministrator}
                    disabled={familyBusy || !transferUserId}
                  >
                    <ShieldCheck size={15} /> Transferir
                  </Button>
                </div>
                {transferOptions.length === 0 && (
                  <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
                    No encontramos otros miembros con cuenta vinculada. Invita a
                    otra persona y vincula su cuenta antes de transferir.
                  </p>
                )}
              </div>
            )}
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                <AlertTriangle
                  size={15}
                  className="mt-0.5 shrink-0 text-amber-500"
                />{" "}
                {isAdmin
                  ? "Si eres el único administrador, primero debes transferir este rol."
                  : "Asegúrate de no necesitar acceso a esta familia antes de salir."}
              </p>
              <Button
                variant="danger"
                onClick={doLeaveFamily}
                disabled={familyBusy}
              >
                <LogOut size={15} /> Salir de la familia
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
