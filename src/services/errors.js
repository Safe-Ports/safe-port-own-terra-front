const STATUS_MESSAGES = {
  400: "Revisa la información e intenta de nuevo.",
  401: "Tu sesión expiró. Inicia sesión de nuevo.",
  403: "No tienes permiso para realizar esta acción.",
  404: "No encontramos este recurso.",
  409: "Ya existe un registro con esos datos.",
  413: "El archivo es demasiado grande.",
  415: "El tipo de archivo no es compatible.",
  422: "Revisa los campos marcados.",
  429: "Demasiadas solicitudes. Intenta de nuevo en unos minutos.",
  500: "Ocurrió un error inesperado. Intenta de nuevo.",
  502: "El servicio no está disponible. Intenta de nuevo.",
  503: "El servicio no está disponible. Intenta de nuevo.",
};

const TECHNICAL_PATTERNS = [
  /traceback/i,
  /stack trace/i,
  /sqlalchemy/i,
  /integrityerror/i,
  /undefined is not/i,
  /cannot read propert/i,
  /network error/i,
];

function cleanMessage(value) {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (!text) return "";
  if (TECHNICAL_PATTERNS.some((pattern) => pattern.test(text))) return "";
  return text;
}

function firstString(...values) {
  for (const value of values) {
    const text = cleanMessage(value);
    if (text) return text;
  }
  return "";
}

function messageFromDetail(detail) {
  if (typeof detail === "string") return cleanMessage(detail);

  if (Array.isArray(detail)) {
    return firstString(...detail.map((item) => item?.msg || item?.message || item?.detail));
  }

  if (detail && typeof detail === "object") {
    return firstString(detail.message, detail.msg, detail.detail);
  }

  return "";
}

export function getApiErrorData(error) {
  return error?.response?.data || error?.data || null;
}

export function getUserErrorMessage(error, fallback = "No pudimos completar la acción. Intenta de nuevo.") {
  const data = getApiErrorData(error);
  const status = error?.response?.status || error?.status;

  const backendMessage = firstString(
    data?.error?.message,
    data?.message,
    messageFromDetail(data?.detail),
    messageFromDetail(data?.errors)
  );

  if (backendMessage) return backendMessage;
  if (status && STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];
  if (error?.code === "ERR_NETWORK") return "No pudimos conectar con el servidor.";
  return fallback;
}

export function getFieldErrors(error, fieldMap = {}) {
  const data = getApiErrorData(error);
  const candidates = [data?.detail, data?.errors].filter(Boolean);
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

