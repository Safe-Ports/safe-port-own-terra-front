export function currency(value = 0) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0
  }).format(value);
}

export function compactCurrency(value = 0) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function dateLabel(value) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

export function relativeDays(value) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${value}T12:00:00`);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

export function progress(paid, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((paid / total) * 100));
}

/**
 * Medida sin decimales inútiles: "312.00" → "312", pero "312.50" → "312.5".
 *
 * Las medidas se capturan con 2 decimales fijos y casi siempre terminan en
 * ".00", que en pantalla sólo agrega ruido y desalinea las cifras entre sí.
 * Devuelve null cuando no hay valor, para que el llamador decida qué mostrar
 * en su lugar (un guion, ocultar la fila, etc.).
 *
 * @param {number|string|null} value
 * @returns {string|null} La cifra ya formateada, sin unidad.
 */
export function measure(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n % 1 === 0 ? String(n) : String(Number(n.toFixed(2)));
}
