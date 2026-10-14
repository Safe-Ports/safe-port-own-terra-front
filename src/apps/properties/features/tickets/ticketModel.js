export const TICKET_TYPE_LABEL = {
  maintenance: "Mantenimiento",
  cleaning: "Limpieza",
  security: "Seguridad",
  inspection: "Inspección",
  administration: "Administración",
  other: "Otro",
};

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
};

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
