/**
 * Lectura de las especificaciones de un lote (agua, luz, pavimento…).
 *
 * El backend guarda cada una como texto. "true" significa que el lote la tiene,
 * y cualquier otro texto también: es la descripción que capturó el usuario
 * ("Solar", "Terracería", "Pozo propio"). Así una luz solar o un camino de
 * terracería se distinguen de la red de CFE o el concreto sin otra columna.
 */
export const SPEC_OTHER_KEY = "otros";

export function specOn(value) {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  const text = value.trim().toLowerCase();
  return text !== "" && text !== "false";
}

export function specDetail(value) {
  if (typeof value !== "string") return "";
  const text = value.trim();
  return text.toLowerCase() === "true" ? "" : text;
}

/** "Sí", o "Sí · Solar" cuando trae descripción. */
export function specLabel(value) {
  if (!specOn(value)) return "No";
  const detail = specDetail(value);
  return detail ? `Sí · ${detail}` : "Sí";
}
