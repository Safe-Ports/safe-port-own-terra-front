// Inicio del administrador: lo que ya pasó en la operación, de lo más reciente a
// lo más viejo. Sale de los datos que Properties ya cargó; nada inventado.

const parseDate = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? new Date(`${value}T12:00:00`) : new Date(value));
const stamp = (value) => (value ? parseDate(value).getTime() || 0 : 0);
const shortDate = (value) => parseDate(value).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
const money = (value, currency = "MXN") => new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value) || 0);
const clip = (text = "", size = 60) => (text.length > size ? `${text.slice(0, size - 1).trimEnd()}…` : text);

const TICKET_PATH = "/properties/tickets";
const CHARGES_PATH = "/properties/comunidades/operacion?module=charges";
const NOTICES_PATH = "/properties/comunidades/operacion?module=communications";
const PACKAGES_PATH = "/properties/accesos";

/**
 * Movimientos recientes de la operación: comprobantes reportados, tickets,
 * paquetes y comunicados publicados. `unitLabel(id)` pone el nombre de la unidad.
 */
export function adminActivity({ reports = [], tickets = [], packages = [], announcements = [], unitLabel = () => "" }, limit = 4) {
  const items = [
    ...reports.filter((report) => report.status !== "cancelled").map((report) => ({
      key: `report-${report.id}`, icon: report.status === "approved" ? "paid" : "charge", tone: report.status === "approved" ? "ok" : report.status === "rejected" ? "alert" : "calm", to: CHARGES_PATH,
      title: report.status === "approved" ? "Pago confirmado" : report.status === "rejected" ? "Comprobante rechazado" : "Pago reportado por revisar",
      detail: [money(report.amount, report.currency), report.persona_name || report.property_label].filter(Boolean).join(" · "), at: report.reviewed_at || report.created_at || report.paid_on,
    })),
    ...tickets.map((ticket) => ({
      key: `ticket-${ticket.id}`, icon: "ticket", tone: ticket.status === "resolved" ? "ok" : "warm", to: TICKET_PATH,
      title: `${ticket.status === "resolved" ? "Ticket resuelto" : "Ticket nuevo"}${ticket.folio ? ` ${ticket.folio}` : ""}`,
      detail: [ticket.title, unitLabel(ticket.unitId)].filter(Boolean).join(" · "), at: ticket.status === "resolved" ? ticket.resolvedAt || ticket.createdAt : ticket.createdAt,
    })),
    ...packages.map((item) => ({
      key: `package-${item.id}`, icon: "package", tone: "violet", to: PACKAGES_PATH,
      title: item.status === "delivered" ? "Paquete entregado" : "Paquete recibido en recepción",
      detail: [item.carrier, unitLabel(item.property_id)].filter(Boolean).join(" · ") || "Recepción", at: item.delivered_at || item.received_at,
    })),
    ...announcements.map((notice) => ({
      key: `notice-${notice.id}`, icon: "notice", tone: notice.is_urgent ? "alert" : "calm", to: NOTICES_PATH,
      title: notice.title, detail: clip(notice.body), at: notice.published_at || notice.created_at,
    })),
  ].filter((item) => stamp(item.at));
  return items.sort((a, b) => stamp(b.at) - stamp(a.at)).slice(0, limit).map((item) => ({ ...item, date: shortDate(item.at) }));
}

/** Ocupación de las unidades activas: porcentaje y conteo. */
export function occupancyOf(units = []) {
  const active = units.filter((unit) => unit.status !== "archived");
  const occupied = active.filter((unit) => unit.status === "rented").length;
  return { total: active.length, occupied, percent: active.length ? Math.round((occupied / active.length) * 100) : 0 };
}
