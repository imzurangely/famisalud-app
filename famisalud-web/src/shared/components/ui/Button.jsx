const VARIANTS = {
  primary: 'primary-button',
  secondary: 'secondary-button',
  ghost: 'icon-button',
  danger: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60',
};

/** Botón global para acciones coherentes entre funcionalidades. */
export default function Button({ variant = 'primary', type = 'button', loading = false, disabled = false, className = '', children, ...props }) {
  const baseClass = VARIANTS[variant] || VARIANTS.primary;
  return (
    <button type={type} className={`${baseClass} ${className}`.trim()} disabled={disabled || loading} {...props}>
      {children}
    </button>
  );
}
