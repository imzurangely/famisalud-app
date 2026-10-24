import { useState } from "react";
import Modal from "../../../shared/components/ui/Modal.jsx";
import {
  SelectField,
  TextField,
} from "../../../shared/components/ui/FormField.jsx";
import {
  BLOOD_TYPES,
  EMPTY_MEMBER_FORM,
  GENDERS,
  RELATIONSHIPS,
} from "../utils/familyConstants.js";
import { valueOf } from "../utils/familyUtils.js";

export default function MemberModal({
  mode,
  member,
  isAdmin,
  busy,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(() =>
    mode === "edit"
      ? {
          firstName: valueOf(member, "firstName", "first_name"),
          lastName: valueOf(member, "lastName", "last_name"),
          relationship: valueOf(member, "relationship") || "OTRO",
          customRelationship:
            valueOf(member, "customRelationship", "custom_relationship") || "",
          birthDate: String(
            valueOf(member, "birthDate", "birth_date") || "",
          ).slice(0, 10),
          gender: valueOf(member, "gender") || "",
          customGender: valueOf(member, "customGender", "custom_gender") || "",
          bloodType: valueOf(member, "bloodType", "blood_type") || "",
          phone: valueOf(member, "phone") || "",
          sisben: valueOf(member, "sisben") || "",
          stratum:
            valueOf(member, "stratum") === ""
              ? ""
              : String(valueOf(member, "stratum")),
        }
      : EMPTY_MEMBER_FORM,
  );
  const [localError, setLocalError] = useState("");
  const change = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setLocalError("");
    if (
      (mode === "create" || isAdmin) &&
      form.relationship === "OTRO" &&
      !form.customRelationship.trim()
    ) {
      setLocalError("Escribe el parentesco personalizado.");
      return;
    }
    if (form.gender === "OTRO" && !form.customGender.trim()) {
      setLocalError("Escribe el género personalizado.");
      return;
    }
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim() || null,
      birthDate: form.birthDate || null,
      gender: form.gender || null,
      customGender: form.gender === "OTRO" ? form.customGender.trim() : null,
      bloodType: form.bloodType || null,
      sisben: form.sisben.trim() || null,
      stratum: form.stratum === "" ? null : Number(form.stratum),
    };
    if (mode === "create" || isAdmin) {
      payload.relationship = form.relationship;
      payload.customRelationship =
        form.relationship === "OTRO" ? form.customRelationship.trim() : null;
    }
    try {
      await onSave(payload);
    } catch (error) {
      setLocalError(error.message || "No fue posible guardar el perfil.");
    }
  }

  return (
    <Modal
      title={mode === "create" ? "Agregar miembro" : "Editar perfil"}
      description={
        mode === "create"
          ? "Registra a una persona en esta familia. Si tiene una cuenta, podrás vincularla mediante una invitación."
          : "Los datos personales pertenecen a la persona; el parentesco pertenece a esta familia."
      }
      onClose={onClose}
      wide
    >
      <form className="space-y-5" onSubmit={submit}>
        {localError && (
          <div
            role="alert"
            className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {localError}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="member-first-name"
            label="Nombre(s)"
            value={form.firstName}
            onChange={(e) => change("firstName", e.target.value)}
            required
            maxLength={100}
          />
          <TextField
            id="member-last-name"
            label="Apellido(s)"
            value={form.lastName}
            onChange={(e) => change("lastName", e.target.value)}
            required
            maxLength={100}
          />
          {(mode === "create" || isAdmin) && (
            <SelectField
              id="member-relationship"
              label="Parentesco en esta familia"
              value={form.relationship}
              onChange={(e) => change("relationship", e.target.value)}
              options={RELATIONSHIPS}
              required
            />
          )}
          {(mode === "create" || isAdmin) && form.relationship === "OTRO" && (
            <TextField
              id="member-custom-relationship"
              label="Parentesco personalizado"
              value={form.customRelationship}
              onChange={(e) => change("customRelationship", e.target.value)}
              required
              maxLength={100}
            />
          )}
          <TextField
            id="member-birth-date"
            label="Fecha de nacimiento"
            type="date"
            value={form.birthDate}
            onChange={(e) => change("birthDate", e.target.value)}
          />
          <SelectField
            id="member-gender"
            label="Género"
            value={form.gender}
            onChange={(e) => {
              change("gender", e.target.value);
              if (e.target.value !== "OTRO") change("customGender", "");
            }}
            options={[["", "Sin especificar"], ...GENDERS]}
          />
          {form.gender === "OTRO" && (
            <TextField
              id="member-custom-gender"
              label="Género personalizado"
              value={form.customGender}
              onChange={(e) => change("customGender", e.target.value)}
              required
              maxLength={100}
            />
          )}
          <SelectField
            id="member-blood-type"
            label="Grupo sanguíneo"
            value={form.bloodType}
            onChange={(e) => change("bloodType", e.target.value)}
            options={[
              ["", "Sin especificar"],
              ...BLOOD_TYPES.map((item) => [item, item]),
            ]}
          />
          <TextField
            id="member-phone"
            label="Teléfono"
            value={form.phone}
            onChange={(e) => change("phone", e.target.value)}
            maxLength={30}
          />
          <TextField
            id="member-sisben"
            label="Sisbén"
            value={form.sisben}
            onChange={(e) => change("sisben", e.target.value)}
            maxLength={20}
          />
          <TextField
            id="member-stratum"
            label="Estrato"
            type="number"
            value={form.stratum}
            onChange={(e) => change("stratum", e.target.value)}
            min="1"
            max="6"
          />
        </div>
        {!isAdmin && mode === "edit" && (
          <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-xs text-brand-800 dark:bg-brand-950/40 dark:text-brand-200">
            Puedes actualizar tus datos personales. El parentesco solo lo puede
            cambiar el administrador de esta familia.
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button" type="submit" disabled={busy}>
            {busy
              ? "Guardando…"
              : mode === "create"
                ? "Agregar miembro"
                : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
