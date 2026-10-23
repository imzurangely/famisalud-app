export const DOCUMENT_CATEGORIES = [
  { value: 'RESULTADO_EXAMENES', label: 'Resultado de exámenes' },
  { value: 'HISTORIA_CLINICA', label: 'Historia clínica' },
  { value: 'ORDEN_MEDICA', label: 'Orden médica' },
  { value: 'PRESCRIPCION', label: 'Prescripción' },
  { value: 'RECOMENDACION', label: 'Recomendación' },
  { value: 'OTRO', label: 'Otro' },
];

const CATEGORY_LABELS = Object.fromEntries(DOCUMENT_CATEGORIES.map((item) => [item.value, item.label]));

export function valueOf(record, camelKey, snakeKey = camelKey) {
  return record?.[camelKey] ?? record?.[snakeKey] ?? null;
}

export function memberFullName(member) {
  const person = member?.person ?? member;
  return [valueOf(person, 'firstName', 'first_name'), valueOf(person, 'lastName', 'last_name')]
    .filter(Boolean)
    .join(' ')
    || 'Perfil sin nombre';
}

export function documentCategoryLabel(document) {
  const category = valueOf(document, 'category');
  if (category === 'OTRO') return valueOf(document, 'customCategory', 'custom_category') || 'Otro';
  return CATEGORY_LABELS[category] || 'Documento';
}

export function formatDocumentDate(value) {
  if (!value) return 'Sin fecha de documento';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no válida';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(date);
}

export function formatFileSize(size) {
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes < 0) return 'Tamaño desconocido';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function errorMessage(error) {
  const issues = error?.data?.errors;
  if (Array.isArray(issues) && issues.length) {
    const messages = [...new Set(issues.map((item) => item?.message).filter(Boolean))];
    if (messages.length) return messages.join(' ');
  }
  return error?.message || 'Ocurrió un error inesperado.';
}

export function buildDocumentFormData(values, { requireFile = false } = {}) {
  const title = String(values.title || '').trim();
  if (!title) throw new Error('El título del documento es obligatorio.');
  if (!values.category) throw new Error('Selecciona una categoría.');
  if (values.category === 'OTRO' && !String(values.customCategory || '').trim()) {
    throw new Error('Describe la categoría cuando seleccionas “Otro”.');
  }
  if (requireFile && !values.file) throw new Error('Selecciona el archivo que deseas subir.');
  if (values.file) {
    const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
    if (!allowedTypes.has(values.file.type)) throw new Error('Solo se permiten archivos PDF, JPG, PNG o WEBP.');
    if (values.file.size > 10 * 1024 * 1024) throw new Error('El archivo no puede superar los 10 MB.');
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('category', values.category);
  if (values.category === 'OTRO') formData.append('customCategory', String(values.customCategory).trim());
  if (values.documentDate) formData.append('documentDate', values.documentDate);
  if (values.appointmentId) formData.append('appointmentId', values.appointmentId);
  if (values.file) formData.append('file', values.file);
  return formData;
}
