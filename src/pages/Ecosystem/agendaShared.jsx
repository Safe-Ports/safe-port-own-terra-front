export const APP_META = {
  core: { name: "Core", color: "#1E3D2B" },
  lands: { name: "Lands", color: "#6FAF6B" },
  neighb: { name: "Properties", color: "#355E3B" },
  homes: { name: "Homes", color: "#A7CBA1" },
};
export const CREATABLE_APPS = Object.entries(APP_META).filter(([key]) => key === "core" || key === "lands");

export const TYPES = {
  visita: "Visita",
  llamada: "Llamada",
  firma: "Firma",
  seguimiento: "Seguimiento",
  cobranza: "Cobranza",
  reunion: "Reunión",
  recordatorio: "Recordatorio",
  tarea: "Tarea",
  personal: "Personal",
  evento: "Evento",
};

export const FILTERS = ["Todos", "Core", "Lands"];

export const AGENDA_RULES = {
  date: (v) => (!v ? "La fecha es obligatoria." : ""),
  time: (v) => (!v ? "La hora es obligatoria." : ""),
};

// Duración fija usada solo para dibujar el bloque del evento en las vistas de
// semana/día — el backend no guarda hora de fin (solo scheduled_at), así que
// esto es puramente visual y no representa una duración real capturada.
export const DEFAULT_DURATION_MINUTES = 60;

export function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildMonthDays(baseDate) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d, key: toDateKey(d), inMonth: d.getMonth() === month, label: d.getDate() };
  });
}

// Domingo de la semana que contiene `date` (mismo criterio que buildMonthDays).
export function startOfWeek(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function buildWeekDays(anchorDate) {
  const start = startOfWeek(anchorDate);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d, key: toDateKey(d), label: d.getDate() };
  });
}

// Rango visible + días a renderizar según la vista activa (mes/semana/día).
// `visibleMonth` ancla la vista de mes, `selectedDate` (string YYYY-MM-DD)
// ancla semana/día.
export function getVisibleRange(view, visibleMonth, selectedDate) {
  if (view === "week") {
    const anchor = new Date(`${selectedDate}T12:00:00`);
    const start = startOfWeek(anchor);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end, days: buildWeekDays(anchor) };
  }
  if (view === "day") {
    const start = new Date(`${selectedDate}T00:00:00`);
    const end = new Date(`${selectedDate}T23:59:59`);
    return { start, end, days: [{ date: start, key: selectedDate, label: start.getDate() }] };
  }
  const start = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const end = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0, 23, 59, 59);
  return { start, end, days: null };
}

export function normalizeAppt(a) {
  const dt = new Date(a.scheduled_at);
  return {
    id: a.id,
    date: toDateKey(dt),
    time: dt.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }),
    title: a.title || a.contact_name || "Sin título",
    client: a.client_name || a.contact_name || "",
    clientId: a.client_id || null,
    clientPhone: a.client_phone || a.contact_phone || null,
    app: a.app_key || "core",
    type: a.appt_type || "evento",
    context: a.notes || "",
    owner: a.owner || "",
    status: a.status || "pending",
  };
}

// Cuerpo del PATCH/POST /appointments a partir del form del modal o del popover
// de creación rápida — un solo lugar para que ambos flujos produzcan el mismo payload.
export function buildAppointmentBody(form) {
  const [h, m] = form.time.split(":");
  const dt = new Date(`${form.date}T${h}:${m}:00`);
  return {
    scheduled_at: dt.toISOString(),
    title: form.title || `${TYPES[form.type] || form.type}${form.client ? ` con ${form.client}` : ""}`,
    appt_type: form.type,
    app_key: form.app,
    contact_name: form.client || form.title || "",
    notes: form.context || "",
    owner: form.owner || "",
  };
}

export function AppTag({ app }) {
  const meta = APP_META[app] || APP_META.core;
  return (
    <span className="ag-app-tag">
      <span style={{ background: meta.color }} />
      {meta.name}
    </span>
  );
}
