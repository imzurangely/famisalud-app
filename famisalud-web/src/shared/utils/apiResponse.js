/** Extrae el objeto de datos de las respuestas estándar de la API. */
export function unwrapApiData(response) {
  return response?.data ?? response ?? null;
}

/** Normaliza una respuesta que puede ser un array directo o un array dentro de data/key/items. */
export function readApiList(response, keys = []) {
  const clean = unwrapApiData(response);
  if (Array.isArray(clean)) return clean;

  for (const key of keys) {
    if (Array.isArray(clean?.[key])) return clean[key];
  }

  return Array.isArray(clean?.items) ? clean.items : [];
}
