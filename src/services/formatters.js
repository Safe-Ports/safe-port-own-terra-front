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
