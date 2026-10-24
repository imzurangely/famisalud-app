import { useEffect } from "react";
import { X } from "lucide-react";

/** Modal visual reutilizable. La feature conserva sus formularios y su lógica. */
export default function Modal({
  title,
  description,
  children,
  onClose,
  wide = false,
  closeOnBackdrop = true,
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-80 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget)
          onClose?.();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-3xl sm:p-7 ${wide ? "max-w-2xl" : "max-w-lg"}`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            className="icon-button -mr-2 -mt-2"
            onClick={onClose}
            aria-label="Cerrar diálogo"
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
