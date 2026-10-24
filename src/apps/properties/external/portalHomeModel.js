import { UNIT_TYPE_LABEL } from "../features/units/unitModel";

// Inicio del portal de comunidad: todo lo que se dice aquí sale de datos reales de la
// persona (cargos, paquetes, comunicados, votaciones y su unidad). Nada inventado.

const DAY_MS = 24 * 60 * 60 * 1000;

// El saludo y el cielo son los mismos del inicio de Properties.
export { skyPeriod as dayPeriod, greeting } from "../components/SkyScene";

/** "Laura Méndez (prueba)" -> "Laura". */
export function firstName(fullName = "") {
  return fullName.replace(/\(.*?\)/g, "").trim().split(/\s+/)[0] || "";
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
// Las fechas sin hora (2026-10-11) se leen a mediodía local para no brincar de día por zona horaria.
const parseDate = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? new Date(`${value}T12:00:00`) : new Date(value));
const daysBetween = (from, to) => Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
const shortDate = (date) => date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });

/** "hoy", "ayer", "hace 3 días" o "el 1 oct" para fechas pasadas. */
export function sinceLabel(value, now = new Date()) {
  const days = daysBetween(parseDate(value), now);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return `el ${shortDate(parseDate(value))}`;
}

const money = (value, currency = "MXN") => new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(Number(value) || 0);
const pending = (charge) => Number(charge.amount) - Number(charge.paid_amount || 0);
const clip = (text = "", size = 110) => (text.length > size ? `${text.slice(0, size - 1).trimEnd()}…` : text);

/**
 * Lo que la persona debería ver hoy, en orden de importancia: pagos vencidos,
 * comunicados urgentes, paquetes esperando, pagos por vencer, comunicados nuevos
 * y votaciones abiertas.
 */
export function todayItems({ charges = [], packages = [], announcements = [], votes = [] }, now = new Date()) {
  const items = [];
  for (const charge of charges) {
    const due = parseDate(charge.due_date);
    const days = daysBetween(now, due);
    const amount = money(pending(charge), charge.currency);
    if (charge.status === "overdue" || days < 0) {
      items.push({ key: `charge-${charge.id}`, rank: 0, tone: "alert", icon: "charge", section: "charges", label: "Pago vencido", title: `${charge.concept}`, detail: `${amount} · venció ${sinceLabel(charge.due_date, now)}` });
    } else if (days <= 7) {
      items.push({ key: `charge-${charge.id}`, rank: 3, tone: "warm", icon: "charge", section: "charges", label: "Próximo pago", title: `${charge.concept}`, detail: `${amount} · ${days === 0 ? "vence hoy" : days === 1 ? "vence mañana" : `vence en ${days} días`}` });
    }
  }
  for (const notice of announcements.filter((item) => !item.read_at)) {
    items.push({ key: `notice-${notice.id}`, rank: notice.is_urgent ? 1 : 4, tone: notice.is_urgent ? "alert" : "calm", icon: "notice", section: "notices", label: notice.is_urgent ? "Comunicado urgente" : "Comunicado nuevo", title: notice.title, detail: clip(notice.body) });
  }
  for (const item of packages.filter((entry) => entry.status !== "delivered")) {
    items.push({ key: `package-${item.id}`, rank: 2, tone: "warm", icon: "package", section: "packages", label: "Paquetería", title: `Tu paquete${item.carrier ? ` de ${item.carrier}` : ""} te espera en recepción`, detail: `Llegó ${sinceLabel(item.received_at, now)}` });
  }
  for (const vote of votes.filter((entry) => entry.status === "open")) {
    items.push({ key: `vote-${vote.id}`, rank: 5, tone: "calm", icon: "vote", section: "votes", label: "Votación abierta", title: vote.question, detail: vote.closes_at ? `Cierra ${shortDate(parseDate(vote.closes_at))}` : "Tu opinión cuenta" });
  }
  return items.sort((a, b) => a.rank - b.rank);
}

/** Casa o edificio, para dibujar la ilustración del encabezado. */
export function homeKind(unit) {
  return ["house", "cabin"].includes(unit?.attributes?.type) ? "house" : "building";
}

/** Datos de la unidad que la administración ya capturó, con su ícono. */
export function homeFacts(unit) {
  const attributes = unit?.attributes || {};
  const plural = (count, one, many) => `${count} ${Number(count) === 1 ? one : many}`;
  return [
    attributes.type ? { icon: "type", label: UNIT_TYPE_LABEL[attributes.type] || "Unidad" } : null,
    attributes.bedrooms ? { icon: "bed", label: plural(attributes.bedrooms, "recámara", "recámaras") } : null,
    attributes.bathrooms ? { icon: "bath", label: plural(attributes.bathrooms, "baño", "baños") } : null,
    attributes.area ? { icon: "area", label: `${attributes.area} m²` } : null,
    attributes.floor !== undefined && attributes.floor !== null && attributes.floor !== "" ? { icon: "floor", label: `Piso ${attributes.floor}` } : null,
  ].filter(Boolean);
}
