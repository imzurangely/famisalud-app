export function fieldValue(record, camelName) {
  if (!record) return null;
  const snakeName = camelName.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  return record[camelName] ?? record[snakeName] ?? null;
}

export function recordTitle(section, record) {
  if (section === 'allergies') return fieldValue(record, 'allergen') || 'Alergia sin nombre';
  if (section === 'conditions') return fieldValue(record, 'name') || 'Condición médica';
  if (section === 'vaccines') return fieldValue(record, 'vaccineName') || 'Vacuna';
  return 'Registro de signos vitales';
}

export function formatDate(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-CO', { dateStyle: 'medium' });
}

export function formatDateTime(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

export function toDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export function toDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

export function toFormValues(record, fields, initialValues) {
  if (!record) return { ...initialValues };
  const result = { ...initialValues };
  fields.forEach((field) => {
    const value = fieldValue(record, field.name);
    if (value === null || value === undefined) result[field.name] = '';
    else if (field.type === 'date') result[field.name] = toDateInput(value);
    else if (field.type === 'datetime-local') result[field.name] = toDateTimeInput(value);
    else result[field.name] = String(value);
  });
  return result;
}

export function toRecordPayload(section, values, fields) {
  const payload = {};
  fields.forEach((field) => {
    const raw = values[field.name];
    if (field.type === 'textarea' || field.type === 'text' || field.type === 'select') {
      if (field.required) payload[field.name] = String(raw ?? '').trim();
      else if (raw === '' || raw === null || raw === undefined) payload[field.name] = null;
      else payload[field.name] = String(raw).trim();
      return;
    }
    if (field.type === 'date') {
      payload[field.name] = raw ? raw : null;
      return;
    }
    if (field.type === 'datetime-local') {
      if (raw) payload[field.name] = new Date(raw).toISOString();
      return;
    }
    if (field.type === 'number') {
      if (raw === '' || raw === null || raw === undefined) payload[field.name] = null;
      else payload[field.name] = Number(raw);
    }
  });

  if (section === 'vital-signs') {
    const measurementFields = fields.filter((field) => field.type === 'number');
    const hasAnyMeasurement = measurementFields.some((field) => payload[field.name] !== null && Number.isFinite(payload[field.name]));
    if (!hasAnyMeasurement) throw new Error('Registra al menos una medición antes de guardar los signos vitales.');
  }

  if (section === 'vaccines' && payload.applicationDate && payload.nextDose && payload.nextDose < payload.applicationDate) {
    throw new Error('La próxima dosis no puede ser anterior a la fecha de aplicación.');
  }

  return payload;
}
