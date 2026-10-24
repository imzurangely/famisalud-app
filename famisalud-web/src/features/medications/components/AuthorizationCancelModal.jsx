import { useState } from "react";
import { AlertTriangle, Ban } from "lucide-react";
import Button from "../../../shared/components/ui/Button.jsx";
import Modal from "../../../shared/components/ui/Modal.jsx";

export default function AuthorizationCancelModal({
  authorization,
  medication,
  busy = false,
  onClose,
  onSubmit,
}) {
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setFormError("");
    try {
      await onSubmit(reason.trim() || null);
    } catch (error) {
      setFormError(error?.message || "No fue posible anular la autorización. Inténtalo de nuevo.");
    }
  }

  return (
    <Modal
      title="Anular autorización"
      description="La autorización y su entrega abierta, si existe, quedarán anuladas y el cambio se guardará en el historial."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={submit}>
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-900/70 dark:bg-amber-950/30">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
              {medication?.name || "Este medicamento"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
              {(authorization?.authorizationNumber || authorization?.authorization_number)
                ? `Autorización ${authorization.authorizationNumber || authorization.authorization_number}. `
                : "La autorización seleccionada. "}
              Puedes registrar el motivo para que quede documentado.
            </p>
          </div>
        </div>

        <label htmlFor="authorization-cancel-reason" className="block text-xs font-bold text-slate-700 dark:text-slate-200">
          Motivo de la anulación <span className="font-medium text-slate-400">(opcional)</span>
          <textarea
            id="authorization-cancel-reason"
            className="form-input mt-2 min-h-28 resize-y"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
            placeholder="Escribe por qué se anula esta autorización…"
            autoFocus
          />
          <span className="mt-1 block text-right text-[10px] font-medium text-slate-400">{reason.length}/1000</span>
        </label>

        {formError && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {formError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" variant="danger" loading={busy}>
            <Ban size={15} /> {busy ? "Anulando…" : "Confirmar anulación"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
