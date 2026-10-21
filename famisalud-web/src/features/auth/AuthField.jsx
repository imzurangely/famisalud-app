import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function AuthInput({ label, id, className = '', hint, ...props }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <input id={id} className={`auth-input ${className}`} {...props} />
      {hint && <span className="mt-1.5 block text-[11px] leading-relaxed text-slate-400">{hint}</span>}
    </label>
  );
}

export function PasswordInput({ label, id, value, onChange, autoComplete = 'current-password', hint, required = true }) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <span className="relative block">
        <input id={id} className="auth-input pr-12" type={showPassword ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} required={required} />
        <button type="button" className="absolute inset-y-0 right-2 inline-flex w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
      {hint && <span className="mt-1.5 block text-[11px] leading-relaxed text-slate-400">{hint}</span>}
    </label>
  );
}
