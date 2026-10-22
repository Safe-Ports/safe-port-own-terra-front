/* `currency()` de @/services/formatters.js trunca a 0 decimales (pensado para
   montos grandes de bienes raíces) — en obra los precios unitarios (ej.
   $397.69/m²) necesitan 2 decimales, de ahí este formateador propio. */
export function currency2(value = 0) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export const UNIT_LABEL = { m2: "m²", m3: "m³", ml: "ml", pza: "pza", lote: "lote" };
