import Swal from 'sweetalert2';
import { toast } from 'sonner';
import 'sweetalert2/dist/sweetalert2.min.css';

/**
 * Notificaciones breves para el uso diario.
 * SweetAlert2 queda reservado para confirmaciones que requieren una decisión.
 */
export const notify = {
  success(message, options) {
    return toast.success(message, options);
  },
  error(message, options) {
    return toast.error(message, options);
  },
  info(message, options) {
    return toast.info(message, options);
  },
  warning(message, options) {
    return toast.warning(message, options);
  },
  loading(message, options) {
    return toast.loading(message, options);
  },
  dismiss(toastId) {
    return toast.dismiss(toastId);
  },
};

/** Confirmaciones destructivas o acciones importantes (retirar, transferir, aceptar/rechazar). */
export function confirmAction(options = {}) {
  const {
    title = '¿Deseas continuar?',
    text,
    confirmButtonText = 'Confirmar',
    cancelButtonText = 'Cancelar',
    icon = 'question',
    ...extraOptions
  } = options;

  const isDark = typeof document !== 'undefined'
    && document.documentElement.classList.contains('dark');

  return Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    focusCancel: true,
    allowOutsideClick: false,
    allowEscapeKey: false,
    buttonsStyling: true,
    confirmButtonColor: '#2596A6',
    cancelButtonColor: '#64748b',
    background: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#e2e8f0' : '#0f172a',
    customClass: {
      popup: 'famisalud-swal-popup',
      title: 'famisalud-swal-title',
      htmlContainer: 'famisalud-swal-text',
      confirmButton: 'famisalud-swal-confirm',
      cancelButton: 'famisalud-swal-cancel',
    },
    ...extraOptions,
  });
}
