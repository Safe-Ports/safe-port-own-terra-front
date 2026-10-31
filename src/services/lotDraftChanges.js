/**
 * Cuántos lotes del borrador de Editar lotes todavía no están guardados en el
 * servidor: los nuevos y los que cambiaron respecto a como se cargaron.
 * "Aplicar al borrador" solo cambia esta copia local; sin un aviso, el usuario
 * salía de la pantalla creyendo que ya había guardado.
 */
const FIELDS = ["code", "area", "price", "priceFinanciado", "frente", "fondo", "orientacion", "sellerId"];

const sameSpecs = (current, original) => {
  const clean = (value) => Object.fromEntries(
    Object.entries(value || {}).filter(([, v]) => v !== false && v !== "" && v != null).map(([k, v]) => [k, v === true ? "true" : String(v)]),
  );
  let parsed = {};
  try { parsed = typeof original === "string" ? JSON.parse(original || "{}") : original || {}; } catch { parsed = {}; }
  return JSON.stringify(Object.entries(clean(current)).sort()) === JSON.stringify(Object.entries(clean(parsed)).sort());
};

export function lotHasChanges(lot) {
  if (!lot._backendId) return true;
  const orig = lot._orig || {};
  if (FIELDS.some((key) => String(lot[key] ?? "") !== String(orig[key] ?? ""))) return true;
  return !sameSpecs(lot.especificaciones, orig.especificaciones);
}

export function countPendingLotChanges(draft, deletedCount = 0) {
  const lots = (draft?.sections || []).flatMap((section) => section.lots || []);
  return lots.filter(lotHasChanges).length + deletedCount;
}
