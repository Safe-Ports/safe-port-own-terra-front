/* Portal del proveedor de servicio.
 *
 * Las órdenes usan los mismos estados que `work_orders` en properties-back
 * (dispatched → accepted → in_progress → done; rejected / cancelled). El backend
 * del proveedor (`/portal/service/*`) todavía no existe: mientras tanto el portal
 * corre en VISTA PREVIA con órdenes de ejemplo guardadas en este navegador. */

export const PARTNER_API_READY = false;

export const ORDER_STATUS = {
  dispatched: { label: "Por confirmar", tone: "warn" },
  accepted: { label: "Confirmada", tone: "info" },
  in_progress: { label: "En sitio", tone: "active" },
  done: { label: "Terminada", tone: "ok" },
  rejected: { label: "Rechazada", tone: "muted" },
  cancelled: { label: "Cancelada", tone: "muted" },
};
export const OPEN_STATUSES = new Set(["dispatched", "accepted", "in_progress"]);
export const PRIORITY_LABEL = { low: "Baja", medium: "Media", high: "Alta", urgent: "Urgente" };

/** Pasos que ve el proveedor; el índice marca cuánto lleva. */
export const STEPS = [
  ["dispatched", "Orden recibida"],
  ["accepted", "Visita confirmada"],
  ["in_progress", "Trabajo en sitio"],
  ["done", "Terminado con evidencia"],
];
export const stepIndex = (status) => Math.max(0, STEPS.findIndex(([key]) => key === status));

/** Acción principal según el estado (mismas transiciones que el backend). */
export function nextAction(order) {
  if (order.status === "dispatched") return { status: "accepted", label: "Confirmar visita" };
  if (order.status === "accepted") return { status: "in_progress", label: "Registrar llegada" };
  if (order.status === "in_progress") return { status: "done", label: "Terminar trabajo", needsEvidence: true };
  return null;
}

const ALLOWED = { dispatched: ["accepted", "rejected"], accepted: ["in_progress"], in_progress: ["done"] };
export function canMove(from, to) { return (ALLOWED[from] || []).includes(to); }

export function validateFinish({ note, evidence }) {
  const errors = {};
  if (!evidence?.length) errors.evidence = "Agrega al menos una foto del trabajo terminado.";
  if (!note?.trim()) errors.note = "Cuenta en una línea qué se hizo.";
  return errors;
}

const at = (base, days, hour, minute = 0) => { const date = new Date(base); date.setDate(date.getDate() + days); date.setHours(hour, minute, 0, 0); return date.toISOString(); };

/** Órdenes de ejemplo relativas a hoy, para que la vista previa siempre tenga sentido. */
export function demoOrders(now = new Date()) {
  return [
    { id: "wo-1", folio: "OT-000124", ticketFolio: "OT-000002", title: "Fuga debajo del lavabo", detail: "Goteo constante en el baño principal. La residente ya cerró la llave de paso.", community: "Torre Jacarandas", unit: "Departamento 302", priority: "urgent", status: "in_progress", scheduledAt: at(now, 0, 14), contact: "Laura Méndez · residente", access: "Presentarse en caseta con identificación. La administración autorizó el ingreso; la residente estará en casa de 14:00 a 17:00.",
      timeline: { dispatched: at(now, 0, 9, 20), accepted: at(now, 0, 9, 34), in_progress: at(now, 0, 14, 2) },
      messages: [{ id: "m1", from: "admin", body: "¿Se puede resolver hoy sin cortar el agua del edificio?", at: at(now, 0, 14, 12) }, { id: "m2", from: "me", body: "Sí. Necesitamos otra válvula; calculamos 90 minutos más.", at: at(now, 0, 14, 26) }], evidence: [] },
    { id: "wo-2", folio: "OT-000127", ticketFolio: "OT-000005", title: "Revisar minisplit que no enfría", detail: "El equipo enciende pero sólo sopla aire a temperatura ambiente.", community: "Residencial La Arboleda", unit: "Casa 14", priority: "medium", status: "dispatched", scheduledAt: at(now, 1, 10, 30), contact: "Jorge Salinas · propietario", access: "Acceso vehicular por la puerta 2. Estacionar en visitas.",
      timeline: { dispatched: at(now, 0, 11, 5) }, messages: [], evidence: [] },
    { id: "wo-3", folio: "OT-000129", ticketFolio: "OT-000006", title: "Cambio de chapa en puerta principal", detail: "La chapa se atora al cerrar. El residente pidió cambio completo.", community: "Plaza Norte", unit: "Local 3", priority: "low", status: "accepted", scheduledAt: at(now, 3, 9), contact: "Administración Plaza Norte", access: "Entrar antes de las 10:00, cuando abre la plaza.",
      timeline: { dispatched: at(now, -1, 16), accepted: at(now, -1, 17, 40) }, messages: [], evidence: [] },
    { id: "wo-4", folio: "OT-000118", ticketFolio: "OT-000001", title: "Ajuste de puerta de acceso", detail: "La puerta peatonal no cerraba sola.", community: "Villas del Lago", unit: "Área común", priority: "medium", status: "done", scheduledAt: at(now, -2, 9), contact: "Administración", access: "",
      timeline: { dispatched: at(now, -3, 10), accepted: at(now, -3, 11), in_progress: at(now, -2, 9, 10), done: at(now, -2, 10, 5) }, messages: [], evidence: [{ id: "e1", name: "puerta-ajustada.jpg" }], closingNote: "Se ajustó el brazo hidráulico y se lubricaron bisagras." },
  ];
}

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

/** Qué cae en cada sección del portal. */
export function partitionOrders(orders, now = new Date()) {
  const open = orders.filter((order) => OPEN_STATUSES.has(order.status));
  const byDate = (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt);
  return {
    today: open.filter((order) => sameDay(order.scheduledAt, now) || order.status === "in_progress" || order.status === "dispatched").sort(byDate),
    agenda: open.filter((order) => new Date(order.scheduledAt) >= new Date(new Date(now).setHours(0, 0, 0, 0))).sort(byDate),
    history: orders.filter((order) => !OPEN_STATUSES.has(order.status)).sort((a, b) => byDate(b, a)),
  };
}

export function summary(orders, now = new Date()) {
  const open = orders.filter((order) => OPEN_STATUSES.has(order.status));
  const upcoming = open.filter((order) => new Date(order.scheduledAt) > now && order.status !== "in_progress").sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0];
  return {
    today: open.filter((order) => sameDay(order.scheduledAt, now)).length,
    toConfirm: open.filter((order) => order.status === "dispatched").length,
    onSite: open.filter((order) => order.status === "in_progress").length,
    next: upcoming || null,
  };
}

export function whenLabel(value, now = new Date()) {
  const date = new Date(value);
  const time = date.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
  const diff = Math.round((new Date(date).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return `Hoy · ${time}`;
  if (diff === 1) return `Mañana · ${time}`;
  if (diff === -1) return `Ayer · ${time}`;
  return `${date.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })} · ${time}`;
}

/* ── Vista previa: órdenes guardadas en este navegador ─────────────────── */
const KEY = "ownterra_preview_partner_orders";
export function loadOrders(now = new Date()) {
  try { const saved = JSON.parse(window.localStorage.getItem(KEY)); if (Array.isArray(saved) && saved.length) return saved; } catch { /* sin almacenamiento */ }
  return demoOrders(now);
}
export function saveOrders(orders) { try { window.localStorage.setItem(KEY, JSON.stringify(orders)); } catch { /* sólo se pierde la vista previa */ } }
export function resetOrders(now = new Date()) { try { window.localStorage.removeItem(KEY); } catch { /* nada */ } return demoOrders(now); }
