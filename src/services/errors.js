function cleanMessage(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function firstString(...values) {
  for (const value of values) {
    const text = cleanMessage(value);
    if (text) return text;
  }
  return "";
}

export function getApiErrorData(error) {
  return error?.response?.data || error?.data || null;
}

export function getFieldErrors(error, fieldMap = {}) {
  // Los errores por campo (marcar inputs en rojo) SOLO vienen de validación 422.
  // Los errores de negocio (400/404/409) pueden traer `details` de contexto (ids)
  // que NO son errores de campo — tratarlos como tales pintaba campos con un UUID
  // y ocultaba el mensaje real. Fuera de 422 devolvemos null para que el caller
  // muestre el mensaje del backend con showError.
  const status = error?.response?.status ?? error?.status ?? null;
  if (status !== 422) return null;

  const data = getApiErrorData(error);
  // El backend homologado manda los errores de campo en data.error.details (envelope OT-).
  // Se mantiene data.detail y data.errors como fallback para respuestas sin envelope.
  const candidates = [data?.error?.details, data?.detail, data?.errors].filter(Boolean);
  const fieldErrors = {};

  candidates.forEach((candidate) => {
    if (Array.isArray(candidate)) {
      candidate.forEach((item) => {
        const loc = item?.loc || item?.field || item?.path;
        const rawField = Array.isArray(loc) ? loc[loc.length - 1] : loc;
        const field = fieldMap[rawField] || rawField;
        const message = cleanMessage(item?.msg || item?.message || item?.detail);
        if (field && message) fieldErrors[field] = message;
      });
      return;
    }

    if (candidate && typeof candidate === "object") {
      Object.entries(candidate).forEach(([rawField, value]) => {
        const field = fieldMap[rawField] || rawField;
        const message = Array.isArray(value)
          ? firstString(...value)
          : cleanMessage(value?.message || value?.msg || value);
        if (field && message) fieldErrors[field] = message;
      });
    }
  });

  return Object.keys(fieldErrors).length ? fieldErrors : null;
}

