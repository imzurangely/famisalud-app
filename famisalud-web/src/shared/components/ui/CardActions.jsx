import { Download, Eye, Pencil, Trash2 } from "lucide-react";
import Button from "./Button.jsx";

const ACTIONS = {
  view: { Icon: Eye, variant: "secondary" },
  download: { Icon: Download, variant: "secondary" },
  edit: { Icon: Pencil, variant: "secondary" },
  delete: { Icon: Trash2, variant: "danger" },
};

/** Pie de acciones consistente con el estilo original de las tarjetas de Citas y Documentos. */
export default function CardActions({ actions = [], className = "" }) {
  const visibleActions = actions.filter(
    (action) => action && typeof action.onClick === "function" && action.visible !== false,
  );
  if (visibleActions.length === 0) return null;

  return (
    <div
      className={`mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:gap-2.5 ${className}`.trim()}
    >
      {visibleActions.map((action) => {
        const config = ACTIONS[action.type] || ACTIONS.view;
        const Icon = action.icon || config.Icon;
        const isLabelVisible = Boolean(action.showLabel);
        
        const key = action.key || action.type || action.label;

        if (isLabelVisible) {
          return (
            <Button
              key={key}
              type="button"
              variant={action.variant || config.variant}
              className={`h-8! px-2.5! text-xs! font-medium! inline-flex items-center gap-1.5 ${action.className || ""}`.trim()}
              onClick={action.onClick}
              disabled={action.disabled}
              aria-label={action.label}
              title={action.label}
            >
              <Icon size={14} className="shrink-0" />
              <span className="text-xs leading-none">{action.label}</span>
            </Button>
          );
        }

        return (
          <button
            key={key}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            aria-label={action.label}
            title={action.label}
            className={`flex h-11 w-11 items-center justify-center rounded-xl border transition disabled:opacity-50 ${
              action.type === "delete"
                ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/50"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            } ${action.className || ""}`.trim()}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}