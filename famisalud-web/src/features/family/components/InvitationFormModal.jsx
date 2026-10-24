import { useState } from "react";
import { Send } from "lucide-react";
import Modal from "../../../shared/components/ui/Modal.jsx";
import {
  SelectField,
  TextField,
} from "../../../shared/components/ui/FormField.jsx";
import { EMPTY_INVITE_FORM, RELATIONSHIPS } from "../utils/familyConstants.js";
import {
  personName,
  relationshipLabel,
  valueOf,
} from "../utils/familyUtils.js";

export default function InviteModal({ members, busy, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_INVITE_FORM);
  const [localError, setLocalError] = useState("");
  const availableMembers = members.filter(
    (member) => !valueOf(member, "linkedUserId", "linked_user_id"),
  );

  function selectMember(memberId) {
    const selected = availableMembers.find(
      (member) => String(member.id) === String(memberId),
    );
    setForm((current) => ({
      ...current,
      memberId,
      relationship: selected
        ? valueOf(selected, "relationship")
        : current.relationship,
      customRelationship: selected
        ? valueOf(selected, "customRelationship", "custom_relationship") || ""
        : "",
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setLocalError("");
    if (form.relationship === "OTRO" && !form.customRelationship.trim()) {
      setLocalError("Escribe el parentesco personalizado.");
      return;
    }
    const payload = {
      email: form.email.trim().toLowerCase(),
      relationship: form.relationship,
      customRelationship:
        form.relationship === "OTRO" ? form.customRelationship.trim() : null,
    };
    if (form.memberId) payload.memberId = form.memberId;
    try {
      await onSave(payload);
    } catch (error) {
      setLocalError(error.message || "No fue posible crear la invitación.");
    }
  }

  return (
    <Modal
      title="Invitar a la familia"
      description="La persona debe aceptar la invitación desde el enlace enviado a su correo. Las invitaciones vencen en siete días."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={submit}>
        {localError && (
          <div
            role="alert"
            className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {localError}
          </div>
        )}
        <TextField
          id="invite-email"
          label="Correo de la persona"
          type="email"
          value={form.email}
          onChange={(e) =>
            setForm((current) => ({ ...current, email: e.target.value }))
          }
          required
          maxLength={254}
          placeholder="persona@correo.com"
        />
        <SelectField
          id="invite-member"
          label="Perfil manual a vincular (opcional)"
          value={form.memberId}
          onChange={(e) => selectMember(e.target.value)}
          options={[
            ["", "Crear perfil al aceptar"],
            ...availableMembers.map((member) => [
              member.id,
              `${personName(member)} · ${relationshipLabel(valueOf(member, "relationship"), valueOf(member, "customRelationship", "custom_relationship"))}`,
            ]),
          ]}
        />
        <SelectField
          id="invite-relationship"
          label="Parentesco"
          value={form.relationship}
          onChange={(e) =>
            setForm((current) => ({
              ...current,
              relationship: e.target.value,
              customRelationship: "",
            }))
          }
          options={RELATIONSHIPS.filter(([key]) => key !== "YO_MISMO")}
          disabled={Boolean(form.memberId)}
          required
        />
        {form.relationship === "OTRO" && (
          <TextField
            id="invite-custom-relationship"
            label="Parentesco personalizado"
            value={form.customRelationship}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                customRelationship: e.target.value,
              }))
            }
            required
            maxLength={100}
          />
        )}
        {form.memberId && (
          <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-xs leading-relaxed text-brand-800 dark:bg-brand-950/40 dark:text-brand-200">
            La relación se fija al parentesco del perfil que elegiste, para que
            la vinculación coincida con el perfil existente.
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? "Enviando…" : "Crear invitación"} <Send size={15} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
