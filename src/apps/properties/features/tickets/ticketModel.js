export const TICKET_TYPE_LABEL = {
  maintenance: "Mantenimiento",
  inspection: "Inspección",
  administration: "Administración",
  complaint: "Queja",
  cleaning: "Limpieza",
  security: "Seguridad",
  other: "Otro",
};

/** Tipos que acepta properties-back (`ticket_type`). */
export const TICKET_TYPE_OPTIONS = ["maintenance", "inspection", "administration", "complaint"];

export const TICKET_PRIORITY_LABEL = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export const TICKET_STATUS_LABEL = {
  open: "Abierto",
  in_progress: "En progreso",
  waiting: "En espera",
  resolved: "Resuelto",
  cancelled: "Cancelado",
};

export const WORK_ORDER_STATUS_LABEL = {
  dispatched: "Enviada al proveedor",
  accepted: "Aceptada",
  rejected: "Rechazada",
  in_progress: "En proceso",
  done: "Terminada",
  cancelled: "Cancelada",
};

/** Siguiente paso de una orden de trabajo (mismas transiciones que properties-back). */
export const WORK_ORDER_NEXT = {
  dispatched: [["accepted", "Marcar aceptada"], ["rejected", "Marcar rechazada"]],
  accepted: [["in_progress", "Iniciar trabajo"]],
  in_progress: [["done", "Marcar terminada"]],
};

export const OPEN_WORK_ORDER = new Set(["dispatched", "accepted", "in_progress"]);
export const isClosedTicket = (ticket) => ticket?.status === "resolved" || ticket?.status === "cancelled";

export function createTicket(draft) {
  const now = new Date().toISOString();
  return {
    id: globalThis.crypto?.randomUUID?.() || `ticket-${Date.now()}`,
    folio: `OT-${String(Date.now()).slice(-6)}`,
    title: draft.title.trim(),
    description: draft.description.trim(),
    propertyId: draft.propertyId || "",
    unitId: draft.unitId || "",
    type: draft.type || "maintenance",
    priority: draft.priority || "medium",
    status: "open",
    assignee: draft.assignee.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

/** Ticket de properties-back → forma que usa la pantalla de tickets. */
export function mapTicket(row, { community, unitById = {}, personById = {}, workOrder = null } = {}) {
  const unit = row.property_id ? unitById[row.property_id] : null;
  return {
    id: row.id,
    folio: row.folio,
    title: row.title,
    description: row.description || "",
    communityId: row.community_id,
    propertyId: unit?.propertyId || community?.propertyId || "",
    unitId: unit ? unit.id : "",
    type: row.ticket_type,
    priority: row.priority,
    status: row.status,
    version: row.version,
    reportedBy: row.reported_by_persona_id ? (personById[row.reported_by_persona_id]?.name || "Residente") : "Administración",
    fromResident: Boolean(row.reported_by_persona_id),
    slaDueAt: row.sla_due_at,
    resolvedAt: row.resolved_at,
    assignee: workOrder?.assigneeName || "",
    workOrder,
    createdAt: row.created_at,
    updatedAt: row.resolved_at || row.created_at,
  };
}

/* Órdenes de trabajo conocidas por este navegador.
 *
 * properties-back aún no devuelve las órdenes en `GET /tickets/{id}` (pedido a backend):
 * sólo llegan en la respuesta de `assign` y de `PATCH /work-orders/{id}/status`. Mientras
 * tanto se recuerdan aquí para mostrar al responsable y poder avanzar la orden. */
const WORK_ORDERS_KEY = "ownterra_ticket_work_orders";
export function readWorkOrders() {
  try { return JSON.parse(window.localStorage.getItem(WORK_ORDERS_KEY)) || {}; } catch { return {}; }
}
export function rememberWorkOrder(ticketId, order) {
  const all = readWorkOrders();
  all[ticketId] = { ...(all[ticketId] || {}), ...order };
  try { window.localStorage.setItem(WORK_ORDERS_KEY, JSON.stringify(all)); } catch { /* sin espacio: sólo se pierde el recordatorio */ }
  return all[ticketId];
}
