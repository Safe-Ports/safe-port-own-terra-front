export function validateLotDraft(lot, sections = []) {
  const errors = {};
  const code = String(lot.code || "").trim();
  if (!code) errors.code = "Escribe el código del lote.";
  else if (code.length > 50) errors.code = "El código admite hasta 50 caracteres.";
  else if (sections.some(section => section.lots.some(other => other.id !== lot.id && String(other.code || "").trim().toLowerCase() === code.toLowerCase()))) errors.code = "Ya existe un lote con este código en el fraccionamiento.";
  for (const key of ["area", "frente", "fondo", "price", "priceFinanciado"]) {
    if (lot[key] !== "" && lot[key] != null && (!Number.isFinite(Number(lot[key])) || Number(lot[key]) < 0)) errors[key] = "Ingresa un número mayor o igual a cero.";
  }
  return errors;
}
