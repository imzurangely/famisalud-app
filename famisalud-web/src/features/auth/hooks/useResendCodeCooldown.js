import { useCallback, useEffect, useRef, useState } from 'react';

/** Gestiona el contador de un minuto sin mezclar temporizadores con peticiones HTTP. */
export function useResendCodeCooldown(initialSeconds = 60) {
  const initial = Math.max(0, Number(initialSeconds) || 0);
  const deadlineRef = useRef(Date.now() + initial * 1000);
  const [secondsRemaining, setSecondsRemaining] = useState(initial);

  const start = useCallback((seconds = 60) => {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    deadlineRef.current = Date.now() + safeSeconds * 1000;
    setSecondsRemaining(safeSeconds);
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setSecondsRemaining((current) => current === remaining ? current : remaining);
    }, 250);

    return () => window.clearInterval(timerId);
  }, []);

  return { secondsRemaining, canResend: secondsRemaining === 0, start };
}
