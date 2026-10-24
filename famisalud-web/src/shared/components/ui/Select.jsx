import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown } from "lucide-react";

function optionText(children) {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number")
        return String(child);
      if (isValidElement(child)) return optionText(child.props.children);
      return "";
    })
    .join("");
}

function readChildrenOptions(children, results = []) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      readChildrenOptions(child.props.children, results);
      return;
    }
    if (child.type !== "option") return;
    results.push({
      value: String(child.props.value ?? ""),
      label: child.props.children,
      plainLabel: optionText(child.props.children),
      disabled: Boolean(child.props.disabled),
      description: child.props["data-description"] || "",
    });
  });
  return results;
}

export default function Select({
  id,
  name,
  value = "",
  onChange,
  options,
  children,
  disabled = false,
  required = false,
  className = "",
  wrapperClassName = "",
  buttonClassName = "",
  placeholder = "Seleccionar…",
  ariaLabel,
  startAdornment = null,
  emptyMessage = "No hay opciones disponibles.",
  menuPlacement = "bottom",
  size = "md",
}) {
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [requiredError, setRequiredError] = useState(false);
  const normalizedOptions = useMemo(() => {
    if (Array.isArray(options)) {
      return options.map((item) => ({
        value: String(item?.value ?? ""),
        label: item?.label ?? "",
        plainLabel: item?.plainLabel ?? optionText(item?.label ?? ""),
        description: item?.description || "",
        disabled: Boolean(item?.disabled),
        icon: item?.icon || null,
      }));
    }
    return readChildrenOptions(children);
  }, [children, options]);
  const normalizedValue = String(value ?? "");
  const selected = normalizedOptions.find(
    (option) => option.value === normalizedValue,
  );
  const selectedIsPlaceholder =
    !selected || (selected.value === "" && !selected.plainLabel);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form || !required) return undefined;
    function validateRequired(event) {
      if (!normalizedValue) {
        event.preventDefault();
        event.stopPropagation();
        setRequiredError(true);
        triggerRef.current?.focus();
      } else {
        setRequiredError(false);
      }
    }
    form.addEventListener("submit", validateRequired, true);
    return () => form.removeEventListener("submit", validateRequired, true);
  }, [required, normalizedValue]);

  useEffect(() => {
    if (!open) return undefined;
    function closeIfOutside(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function choose(option) {
    if (disabled || option.disabled) return;
    onChange?.({ target: { name, value: option.value } });
    setRequiredError(false);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event) {
    if (disabled) return;
    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowUp" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      setOpen(true);
      window.requestAnimationFrame(() => {
        const items = rootRef.current?.querySelectorAll(
          '[role="option"]:not([aria-disabled="true"])',
        );
        if (!items?.length) return;
        const enabledOptions = normalizedOptions.filter(
          (option) => !option.disabled,
        );
        const index = enabledOptions.findIndex(
          (option) => option.value === normalizedValue,
        );
        const targetIndex =
          event.key === "ArrowUp"
            ? index <= 0
              ? items.length - 1
              : index - 1
            : Math.min(items.length - 1, index < 0 ? 0 : index);
        items[targetIndex]?.focus();
      });
    }
  }

  function handleOptionKeyDown(event, index) {
    const items = rootRef.current?.querySelectorAll(
      '[role="option"]:not([aria-disabled="true"])',
    );
    if (!items?.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const next = (index + direction + items.length) % items.length;
      items[next]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = normalizedOptions.filter((item) => !item.disabled)[index];
      if (option) choose(option);
    }
  }

  const triggerSize =
    size === "sm"
      ? "min-h-9 py-2 text-[11px]"
      : size === "lg"
        ? "min-h-12 py-3 text-sm"
        : "min-h-11 py-2.5 text-xs";
  const positionClass =
    menuPlacement === "top" ? "bottom-full mb-2" : "top-full mt-2";

  return (
    <div
      ref={rootRef}
      className={`relative min-w-0 ${wrapperClassName}`.trim()}
      data-select-root
    >
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required || undefined}
        aria-controls={open && id ? `${id}-options` : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        className={`form-input flex w-full items-center justify-between gap-3 text-left ${triggerSize} ${disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer hover:border-brand-300 dark:hover:border-brand-800"} ${requiredError ? "border-rose-400 ring-4 ring-rose-50 dark:border-rose-700 dark:ring-rose-950/50" : open ? "border-brand-400 ring-4 ring-brand-50 dark:border-brand-600 dark:ring-brand-950/60" : ""} ${className} ${buttonClassName}`.trim()}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          {startAdornment}
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate ${selectedIsPlaceholder ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-100"}`}
            >
              {selected?.label ?? placeholder}
            </span>
            {selected?.description && (
              <span className="mt-0.5 block truncate text-[10px] font-normal text-slate-400 dark:text-slate-500">
                {selected.description}
              </span>
            )}
          </span>
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180 text-brand-600 dark:text-brand-300" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          id={id ? `${id}-options` : undefined}
          role="listbox"
          aria-label={ariaLabel || "Opciones"}
          aria-activedescendant={undefined}
          className={`absolute ${positionClass} left-0 z-90 w-full min-w-48 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl shadow-slate-900/10 ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30 ${menuPlacement === "top" ? "" : ""}`}
        >
          <div className="soft-scrollbar max-h-64 overflow-y-auto">
            {normalizedOptions.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">
                {emptyMessage}
              </p>
            ) : (
              normalizedOptions.map((option, index) => {
                const isSelected = option.value === normalizedValue;
                return (
                  <button
                    key={`${option.value}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled || undefined}
                    disabled={option.disabled}
                    onClick={() => choose(option)}
                    onKeyDown={(event) =>
                      handleOptionKeyDown(
                        event,
                        normalizedOptions
                          .filter((item) => !item.disabled)
                          .findIndex((item) => item.value === option.value),
                      )
                    }
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs transition ${isSelected ? "bg-brand-50 font-bold text-brand-800 dark:bg-brand-950/70 dark:text-brand-200" : "font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"} ${option.disabled ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    {option.icon && (
                      <span className="shrink-0">{option.icon}</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block wrap-break-words">
                        {option.label}
                      </span>
                      {option.description && (
                        <span
                          className={`mt-0.5 block text-[10px] font-normal ${isSelected ? "text-brand-700/75 dark:text-brand-300/75" : "text-slate-400 dark:text-slate-500"}`}
                        >
                          {option.description}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <Check
                        size={14}
                        className="shrink-0 text-brand-600 dark:text-brand-300"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
      {requiredError && (
        <p
          role="alert"
          className="mt-1.5 text-[10px] font-medium text-rose-600 dark:text-rose-300"
        >
          Selecciona una opción para continuar.
        </p>
      )}
      <input
        type="hidden"
        name={name || undefined}
        value={normalizedValue}
        readOnly
      />
    </div>
  );
}
