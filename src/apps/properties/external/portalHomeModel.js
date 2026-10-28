import { UNIT_TYPE_LABEL } from "../features/units/unitModel";

// Inicio del portal de comunidad: todo lo que se dice aquí sale de datos reales de la
// persona (cargos, paquetes, comunicados, votaciones y su unidad). Nada inventado.

const DAY_MS = 24 * 60 * 60 * 1000;

// El saludo y el cielo son los mismos del inicio de Properties.
export { skyPeriod as dayPeriod, greeting } from "@/components/shared/SkyScene";

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

const firstFilled = (source, keys) => keys.map((key) => source[key]).find((value) => value !== undefined && value !== null && value !== "");
const stamp = (value) => (value ? parseDate(value).getTime() : 0);

/** El cargo abierto que vence primero: es el "próximo pago" del encabezado. */
export function nextCharge(charges = []) {
  return charges.filter((charge) => pending(charge) > 0).sort((a, b) => stamp(a.due_date) - stamp(b.due_date))[0] || null;
}

/**
 * Ficha corta de la unidad para la tarjeta "Mi departamento": las medidas
 * principales y, aparte, lo que trae incluido. Sólo lo que la administración capturó.
 */
export function unitHighlights(unit) {
  const source = unit?.attributes || {};
  const area = firstFilled(source, ["area"]);
  const floor = firstFilled(source, ["floor"]);
  const bedrooms = firstFilled(source, ["bedrooms", "recamaras"]);
  const bathrooms = firstFilled(source, ["bathrooms", "banos"]);
  const parking = firstFilled(source, ["parking", "estacionamientos", "cajones"]);
  const main = [
    area ? { icon: "area", value: `${area} m²`, label: "Superficie" } : null,
    floor !== undefined ? { icon: "floor", value: `Piso ${floor}`, label: "Piso o nivel" } : null,
    Number(bedrooms) ? { icon: "bed", value: String(bedrooms), label: Number(bedrooms) === 1 ? "Recámara" : "Recámaras" } : null,
    Number(bathrooms) ? { icon: "bath", value: String(bathrooms), label: Number(bathrooms) === 1 ? "Baño" : "Baños" } : null,
  ].filter(Boolean);
  const extra = [
    Number(parking) ? { icon: "parking", label: "Estacionamiento", value: `${parking} ${Number(parking) === 1 ? "cajón" : "cajones"}` } : null,
    source.storage_room === true ? { icon: "storage", label: "Bodega", value: "Incluida" } : null,
    typeof source.pets_allowed === "boolean" ? { icon: "pets", label: "Mascotas", value: source.pets_allowed ? "Permitidas" : "No permitidas" } : null,
    source.furnished === true ? { icon: "furnished", label: "Amueblada", value: "Sí" } : null,
  ].filter(Boolean);
  return { main, extra };
}

const IMAGE_URL = /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i;
/** La primera imagen adjunta de un comunicado, para la portada de "Comunidad". */
export function noticeImage(notice) {
  return (notice?.attachments || []).map((file) => (typeof file === "string" ? file : file?.url)).find((url) => url && IMAGE_URL.test(url)) || null;
}

/**
 * Lo que ya pasó en el hogar, de lo más reciente a lo más viejo: pagos
 * reportados, solicitudes de mantenimiento, paquetes y comunicados.
 */
export function recentActivity({ reports = [], tickets = [], packages = [], announcements = [], statusLabel = {} }, limit = 4) {
  const items = [
    ...reports.filter((report) => report.status !== "cancelled").map((report) => ({
      key: `report-${report.id}`, icon: report.status === "approved" ? "paid" : "charge", tone: report.status === "approved" ? "ok" : report.status === "rejected" ? "alert" : "calm", section: "charges",
      title: report.status === "approved" ? "Pago confirmado" : report.status === "rejected" ? "Comprobante rechazado" : "Pago en revisión",
      detail: money(report.amount, report.currency), at: report.reviewed_at || report.paid_on || report.created_at,
    })),
    ...tickets.map((ticket) => ({
      key: `ticket-${ticket.id}`, icon: "ticket", tone: "warm", section: "tickets",
      title: `Solicitud de mantenimiento${ticket.folio ? ` ${ticket.folio}` : ""}`,
      detail: [ticket.title, statusLabel[ticket.status]].filter(Boolean).join(" · "), at: ticket.created_at,
    })),
    ...packages.map((item) => ({
      key: `package-${item.id}`, icon: "package", tone: "violet", section: "packages",
      title: item.status === "delivered" ? "Paquete entregado" : "Paquete recibido en recepción",
      detail: [item.carrier, item.status === "delivered" ? "Entregado" : "Te espera en recepción"].filter(Boolean).join(" · "), at: item.received_at,
    })),
    ...announcements.map((notice) => ({
      key: `notice-${notice.id}`, icon: "notice", tone: notice.is_urgent ? "alert" : "calm", section: "notices",
      title: notice.title, detail: clip(notice.body, 60), at: notice.published_at || notice.created_at,
    })),
  ].filter((item) => item.at);
  return items.sort((a, b) => stamp(b.at) - stamp(a.at)).slice(0, limit).map((item) => ({ ...item, date: shortDate(parseDate(item.at)) }));
}
