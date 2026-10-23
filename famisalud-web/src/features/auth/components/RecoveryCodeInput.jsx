import { useRef } from 'react';

const DIGIT_COUNT = 6;

/** Input OTP accesible: seis casillas, autocompletado del navegador y pegado del código completo. */
export default function RecoveryCodeInput({ value, onChange, disabled = false, hasError = false }) {
  const inputRefs = useRef([]);
  const digits = Array.isArray(value) ? value : Array.from({ length: DIGIT_COUNT }, (_, index) => value[index] || '');

  function updateDigit(index, rawValue) {
    const cleaned = rawValue.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      onChange(next);
      return;
    }

    const next = [...digits];
    const chars = cleaned.slice(0, DIGIT_COUNT - index).split('');
    chars.forEach((digit, offset) => { next[index + offset] = digit; });
    onChange(next);
    inputRefs.current[Math.min(index + chars.length, DIGIT_COUNT - 1)]?.focus();
  }

  function handlePaste(event) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGIT_COUNT);
    if (!pasted) return;
    event.preventDefault();
    onChange([...pasted.split(''), ...Array(DIGIT_COUNT - pasted.length).fill('')].slice(0, DIGIT_COUNT));
    inputRefs.current[Math.min(pasted.length, DIGIT_COUNT - 1)]?.focus();
  }

  function handleKeyDown(event, index) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < DIGIT_COUNT - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  return (
    <div className="flex justify-between gap-2 sm:gap-3" role="group" aria-label="Código de recuperación de seis dígitos" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => { inputRefs.current[index] = element; }}
          aria-label={`Dígito ${index + 1}`}
          className={`h-12 min-w-0 flex-1 rounded-xl border bg-white text-center font-display text-xl font-extrabold text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 disabled:cursor-wait disabled:opacity-60 dark:bg-slate-900 dark:text-white sm:h-14 ${hasError ? 'border-rose-400 dark:border-rose-700' : 'border-slate-200 dark:border-slate-700'}`}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          pattern="[0-9]*"
          maxLength={index === 0 ? 6 : 1}
          value={digit}
          disabled={disabled}
          onChange={(event) => updateDigit(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onFocus={(event) => event.target.select()}
        />
      ))}
    </div>
  );
}
