import Select from "./Select.jsx";
/** Campo de texto reutilizable para formularios de cualquier feature. */
export function TextField({
  label,
  id,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
  maxLength,
  min,
  max,
  hint,
  autoComplete,
  disabled = false,
  className = "",
}) {
  return (
    <label
      htmlFor={id}
      className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
    >
      {label}
      {required && <span className="ml-1 text-rose-500">*</span>}
      <input
        id={id}
        className={`form-input mt-2 ${className}`.trim()}
        type={type}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        min={min}
        max={max}
        autoComplete={autoComplete}
        disabled={disabled}
      />
      {hint && (
        <span className="mt-1.5 block text-[11px] font-normal leading-relaxed text-slate-400">
          {hint}
        </span>
      )}
    </label>
  );
}

/** Campo de selección reutilizable, con etiquetas y opciones controladas por la feature. */
export function SelectField({
  label,
  id,
  value,
  onChange,
  options,
  disabled = false,
  required = false,
  className = "",
}) {
  return (
    <label
      htmlFor={id}
      className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
    >
      {label}
      {required && <span className="ml-1 text-rose-500">*</span>}
      <Select
        id={id}
        className={`form-input mt-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        required={required}
      >
        {options.map(([key, optionLabel]) => (
          <option key={key} value={key}>
            {optionLabel}
          </option>
        ))}
      </Select>
    </label>
  );
}
