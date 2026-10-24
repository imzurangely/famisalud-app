import { Search, X } from "lucide-react";

/** Campo de búsqueda reutilizable: filtra al escribir y no necesita botón. */
export default function ModuleSearch({
  id,
  value,
  onChange,
  placeholder = "Buscar…",
  ariaLabel = "Buscar registros",
  className = "",
  onClear,
  disabled = false,
}) {
  return (
    <label className={`relative block min-w-0 ${className}`.trim()}>
      <span className="sr-only">{ariaLabel}</span>
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        maxLength={100}
        disabled={disabled}
        className="form-input pl-10! pr-10"
      />
      {value && (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          title="Limpiar búsqueda"
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          onClick={onClear || (() => onChange({ target: { value: "" } }))}
        >
          <X size={14} />
        </button>
      )}
    </label>
  );
}