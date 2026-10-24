/* Pases de visita con QR (properties-back `access`).
 *
 * El backend entrega el `qr_token` UNA sola vez, al crear el pase; en su base sólo
 * guarda el hash. Por eso el front lo muestra en ese momento y no lo guarda en ningún lado. */

export const VISITOR_TYPES = [
  ["guest", "Visita"],
  ["provider", "Proveedor"],
  ["delivery", "Entrega"],
  ["staff", "Personal de servicio"],
];
export const visitorTypeLabel = (type) => VISITOR_TYPES.find(([key]) => key === type)?.[1] || "Visita";

export const ACCESS_POINT_KINDS = [
  ["pedestrian", "Peatonal"],
  ["vehicle", "Vehicular"],
  ["service", "Servicio"],
];
export const accessPointKindLabel = (kind) => ACCESS_POINT_KINDS.find(([key]) => key === kind)?.[1] || kind;

/** Motivos con los que la caseta niega el paso, en palabras del guardia. */
export const DENIAL_REASON = {
  EXPIRED: "El pase ya venció.",
  REVOKED: "El pase fue cancelado.",
  WRONG_POINT: "Este pase no es válido en esta entrada.",
  MAX_ENTRIES: "El pase ya se usó todas las veces permitidas.",
  NOT_YET_VALID: "El pase todavía no está vigente.",
  UNKNOWN_CODE: "Código no reconocido.",
  ALREADY_INSIDE: "Esta persona ya está dentro.",
};

const pad = (value) => String(value).padStart(2, "0");
/** Valor para `<input type="datetime-local">` en hora local. */
export const toLocalInput = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** Ventana por defecto: desde ahora y por 4 horas. */
export function defaultWindow(now = new Date(), hours = 4) {
  return { validFrom: toLocalInput(now), validUntil: toLocalInput(new Date(now.getTime() + hours * 3600_000)) };
}

export function validateVisitor(draft, { requireProperty = true } = {}) {
  const errors = {};
  if (!draft.fullName?.trim()) errors.fullName = "Escribe el nombre de quien viene.";
  if (requireProperty && !draft.propertyId) errors.propertyId = "Elige la unidad que recibe la visita.";
  if (!draft.validFrom || !draft.validUntil) errors.validUntil = "Indica desde y hasta cuándo vale el pase.";
  else if (new Date(draft.validUntil) <= new Date(draft.validFrom)) errors.validUntil = "El final debe ser después del inicio.";
  const entries = Number(draft.maxEntries);
  if (!Number.isInteger(entries) || entries < 1 || entries > 50) errors.maxEntries = "Entre 1 y 50 entradas.";
  return errors;
}

/** Borrador del formulario → body de `POST .../visitors`. */
export function visitorBody(draft) {
  return {
    property_id: draft.propertyId,
    full_name: draft.fullName.trim(),
    visitor_type: draft.visitorType || "guest",
    phone: draft.phone?.trim() || null,
    vehicle_plate: draft.vehiclePlate?.trim().toUpperCase() || null,
    ...(draft.documentHint !== undefined ? { document_hint: draft.documentHint.trim().slice(-4) || null } : {}),
    valid_from: new Date(draft.validFrom).toISOString(),
    valid_until: new Date(draft.validUntil).toISOString(),
    max_entries: Number(draft.maxEntries) || 1,
    allowed_point_ids: draft.allowedPointIds || [],
  };
}

export const passWindowText = (from, until) => {
  const start = new Date(from); const end = new Date(until);
  const day = (date) => date.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
  const time = (date) => date.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
  return start.toDateString() === end.toDateString() ? `${day(start)} · ${time(start)} a ${time(end)}` : `${day(start)} ${time(start)} a ${day(end)} ${time(end)}`;
};

export const newClientEventId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`);
