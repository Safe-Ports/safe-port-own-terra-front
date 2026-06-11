import { useEffect, useMemo, useState } from "react";
import GuideModal from "@/components/shared/GuideModal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appointmentService } from "@/services/appointmentService";
import { useAppContext } from "@/context/AppContext";
import { getUserErrorMessage } from "@/services/errors";
import EcoLayout from "./EcoLayout";

function buildWhatsAppLink(phone, message) {
  const clean = String(phone || "").replace(/\D/g, "");
  const base = clean ? `https://wa.me/${clean}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}

const APP_META = {
  core: { name: "Core", color: "#1E3D2B" },
  lands: { name: "Lands", color: "#6FAF6B" },
  neighb: { name: "Neighborhoods", color: "#355E3B" },
  homes: { name: "Homes", color: "#A7CBA1" },
};
const CREATABLE_APPS = Object.entries(APP_META).filter(([key]) => key === "core" || key === "lands");

const TYPES = {
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

const FILTERS = ["Todos", "Core", "Lands"];

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMonthDays(baseDate) {
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

function normalizeAppt(a) {
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

function AppTag({ app }) {
  const meta = APP_META[app] || APP_META.core;
  return (
    <span className="ag-app-tag">
      <span style={{ background: meta.color }} />
      {meta.name}
    </span>
  );
}

function AgendaPage() {
  const today = new Date();
  const qc = useQueryClient();
  const { showToast, clearCalendarAlerts, clients } = useAppContext();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    clearCalendarAlerts();
  }, []);

  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).toISOString();
  const monthEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: rawAppts = [], isLoading } = useQuery({
    queryKey: ["appointments", "agenda", monthStart],
    queryFn: () => appointmentService.list({ upcoming_only: false, from_date: monthStart, to_date: monthEnd }),
  });

  const appointments = useMemo(() => rawAppts.map(normalizeAppt), [rawAppts]);

  const createMutation = useMutation({
    mutationFn: (body) => appointmentService.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      showToast("Evento guardado");
    },
    onError: (err) => showToast(getUserErrorMessage(err, "Error al guardar el evento")),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => appointmentService.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      showToast("Evento eliminado");
    },
    onError: (err) => showToast(getUserErrorMessage(err, "Error al eliminar el evento")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => appointmentService.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      showToast("Evento actualizado");
    },
    onError: (err) => showToast(getUserErrorMessage(err, "Error al actualizar el evento")),
  });

  const [selectedDate, setSelectedDate] = useState(toDateKey(today));
  const [filter, setFilter] = useState("Todos");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    date: toDateKey(today),
    time: "10:00",
    client: "",
    app: "core",
    type: "evento",
    context: "",
    owner: "",
  });

  const monthDays = useMemo(() => buildMonthDays(visibleMonth), [visibleMonth]);

  const visibleAppointments = appointments.filter((item) => (
    filter === "Todos" || APP_META[item.app]?.name === filter
  ));
  const selectedAppointments = visibleAppointments
    .filter((item) => item.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const total = appointments.length;
  const pending = appointments.filter((a) => a.status === "pending").length;
  const completed = appointments.filter((a) => a.status === "completed").length;
  const today_count = appointments.filter((a) => a.date === toDateKey(today)).length;

  const openCreate = (date = selectedDate) => {
    setEditingId(null);
    setForm({ title: "", date, time: "10:00", client: "", app: "core", type: "evento", context: "", owner: "" });
    setSelectedDate(date);
    setShowModal(true);
  };

  const openEdit = (appointment) => {
    setEditingId(appointment.id);
    setSelectedDate(appointment.date);
    setForm({
      title: appointment.title,
      date: appointment.date,
      time: appointment.time,
      client: appointment.client,
      app: appointment.app,
      type: appointment.type,
      context: appointment.context,
      owner: appointment.owner,
    });
    setShowModal(true);
  };

  const saveAppointment = async (event) => {
    event.preventDefault();
    const [h, m] = form.time.split(":");
    const dt = new Date(`${form.date}T${h}:${m}:00`);
    const body = {
      scheduled_at: dt.toISOString(),
      title: form.title || `${TYPES[form.type] || form.type}${form.client ? ` con ${form.client}` : ""}`,
      appt_type: form.type,
      app_key: form.app,
      contact_name: form.client || form.title || "",
      notes: form.context,
      owner: form.owner,
    };
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, body });
    } else {
      await createMutation.mutateAsync(body);
    }
    setShowModal(false);
    setEditingId(null);
    setForm({ title: "", date: form.date, time: "10:00", client: "", app: "core", type: "evento", context: "", owner: "" });
  };

  const monthLabel = visibleMonth.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const moveMonth = (offset) => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    setVisibleMonth(next);
    setSelectedDate(toDateKey(next));
  };

  return (
    <EcoLayout active="agenda" title="Agenda" subtitle="Agenda general del ecosistema: eventos, recordatorios, reuniones y citas" onGuide={() => setShowGuide(true)}>
      <div className="ag-hero">
        <div>
          <div className="ag-kicker">Agenda General</div>
          <h2>Tu agenda centralizada</h2>
          <p>Registra visitas, reuniones, recordatorios, tareas, llamadas y cualquier evento personal o de negocio.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="ag-primary" onClick={() => openCreate()}>Nuevo evento</button>
        </div>
      </div>

      <div className="ag-kpis">
        <div className="ag-kpi"><span>Total</span><b>{isLoading ? "—" : total}</b><small>Eventos este mes</small></div>
        <div className="ag-kpi"><span>Completados</span><b>{completed}</b><small>Realizados</small></div>
        <div className="ag-kpi"><span>Pendientes</span><b>{pending}</b><small>Por realizar</small></div>
        <div className="ag-kpi"><span>Hoy</span><b>{today_count}</b><small>Eventos de hoy</small></div>
      </div>

      <div className="ag-layout">
        <section className="ag-calendar-card">
          <div className="ag-card-head">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button className="ag-soft" onClick={() => moveMonth(-1)} aria-label="Mes anterior">‹</button>
                <h3 style={{ textTransform: "capitalize" }}>{monthLabel}</h3>
                <button className="ag-soft" onClick={() => moveMonth(1)} aria-label="Mes siguiente">›</button>
              </div>
              <p>Vista mensual</p>
            </div>
            <div className="ag-seg">
              {FILTERS.map((item) => (
                <button key={item} className={filter === item ? "on" : ""} onClick={() => setFilter(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="ag-weekdays">
            {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="ag-calendar-grid">
            {monthDays.map((day) => {
              const dayItems = visibleAppointments.filter((item) => item.date === day.key);
              const active = selectedDate === day.key;
              return (
                <button
                  key={day.key}
                  className={`ag-day ${day.inMonth ? "" : "muted"} ${active ? "active" : ""}`}
                  onClick={() => setSelectedDate(day.key)}
                  onDoubleClick={() => openCreate(day.key)}
                >
                  <span className="ag-day-num">{day.label}</span>
                  <div className="ag-day-items">
                    {dayItems.slice(0, 3).map((item) => (
                      <span key={item.id} style={{ borderLeftColor: APP_META[item.app]?.color }}>
                        {item.time} · {TYPES[item.type] || item.type}
                      </span>
                    ))}
                    {dayItems.length > 3 ? <em>+{dayItems.length - 3}</em> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="ag-side">
          <div className="ag-side-card">
            <div className="ag-card-head compact">
              <div>
                <h3>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}</h3>
                <p>{selectedAppointments.length} eventos programados</p>
              </div>
              <button className="ag-soft" onClick={() => openCreate(selectedDate)}>Agregar</button>
            </div>
            <div className="ag-list">
              {selectedAppointments.length ? selectedAppointments.map((item) => {
                // Busca el teléfono del cliente: primero en el campo directo, luego en la lista de clientes
                const matchedClient = clients.find(
                  (c) => (item.clientId && String(c.id) === String(item.clientId))
                    || (item.client && c.name?.toLowerCase() === item.client.toLowerCase())
                );
                const phone = item.clientPhone || matchedClient?.phone || null;
                const waMessage = `Hola ${item.client || "cliente"}, te recordamos que tienes agendado: *${item.title}* el ${new Date(`${item.date}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long" })} a las ${item.time} hrs.${item.context ? ` (${item.context})` : ""} ¡Te esperamos!`;
                const waLink = buildWhatsAppLink(phone, waMessage);
                return (
                <div key={item.id} className="ag-item">
                  <div className="ag-time">{item.time}<span>HRS</span></div>
                  <div className="ag-info">
                    <div className="ag-title">{item.title}</div>
                    <div className="ag-meta">{item.client ? `${item.client} · ` : ""}{item.context}</div>
                    <div className="ag-row">
                      <AppTag app={item.app} />
                      <span className={`ag-status ${item.status}`}>{item.status}</span>
                      <button
                        className="ag-soft"
                        style={{ marginLeft: "auto", fontSize: ".7rem", padding: "2px 8px" }}
                        onClick={() => openEdit(item)}
                      >
                        Editar
                      </button>
                      {item.status !== "completed" && (
                        <button
                          className="ag-soft"
                          style={{ fontSize: ".7rem", padding: "2px 8px" }}
                          onClick={() => updateMutation.mutate({ id: item.id, body: { status: "completed" } })}
                        >
                          Completar
                        </button>
                      )}
                      {/* TODO: habilitar cuando se implemente notificación al cliente
                      {item.client && (
                        <a href={waLink} target="_blank" rel="noopener noreferrer" className="ag-soft"
                          style={{ fontSize: ".7rem", padding: "2px 8px", textDecoration: "none", color: "inherit", display: "inline-flex", alignItems: "center", gap: 3 }}>
                          📲 Notificar
                        </a>
                      )}
                      */}
                      <button
                        className="ag-soft"
                        style={{ fontSize: ".7rem", padding: "2px 8px" }}
                        onClick={() => cancelMutation.mutate(item.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
                );
              }) : (
                <div className="ag-empty">
                  <b>Sin eventos para este día</b>
                  <span>Doble clic en el día o usa "Agregar" para crear un evento.</span>
                </div>
              )}
            </div>
          </div>

          <div className="ag-side-card">
            <div className="ag-card-head compact">
              <div>
                <h3>Tipos de evento</h3>
                <p>Categorías disponibles</p>
              </div>
            </div>
            <div className="ag-flow">
              {[
                ["Visita / Llamada / Firma", "Actividades comerciales con clientes."],
                ["Reunión / Seguimiento", "Juntas internas o de seguimiento de proyecto."],
                ["Recordatorio / Tarea", "Avisos y pendientes personales u operativos."],
                ["Cobranza", "Gestión de pagos y cobros pendientes."],
                ["Personal / Evento", "Cualquier actividad de agenda libre."],
              ].map(([label, text]) => (
                <div key={label}>
                  <span>{label}</span>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {showModal ? (
        <div className="ag-modal-backdrop" onClick={() => { setShowModal(false); setEditingId(null); }}>
          <form className="ag-modal" onSubmit={saveAppointment} onClick={(e) => e.stopPropagation()}>
            <div className="ag-modal-head">
              <div>
                <h3>{editingId ? "Editar evento" : "Nuevo evento"}</h3>
                <p>{editingId ? "Actualiza la actividad seleccionada." : "Agrégalo a la agenda del ecosistema."}</p>
              </div>
              <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }}>Cerrar</button>
            </div>
            <div className="ag-form-grid">
              <label>
                Título
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Ej: Junta con equipo, Recordatorio pago..." />
              </label>
              <label>
                Participante / Cliente
                <input value={form.client} onChange={(e) => setForm((p) => ({ ...p, client: e.target.value }))} placeholder="Opcional" />
              </label>
              <label>
                Fecha
                <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              </label>
              <label>
                Hora
                <input type="time" value={form.time} onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))} />
              </label>
              <label>
                App / Área
                <select value={form.app} onChange={(e) => setForm((p) => ({ ...p, app: e.target.value }))}>
                  {CREATABLE_APPS.map(([key, item]) => <option key={key} value={key}>{item.name}</option>)}
                </select>
              </label>
              <label>
                Tipo
                <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                  {Object.entries(TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </label>
              <label className="wide">
                Notas / Contexto
                <input value={form.context} onChange={(e) => setForm((p) => ({ ...p, context: e.target.value }))} placeholder="Descripción, lote, contrato, documento relacionado..." />
              </label>
              <label className="wide">
                Responsable
                <input value={form.owner} onChange={(e) => setForm((p) => ({ ...p, owner: e.target.value }))} placeholder="Nombre del responsable (opcional)" />
              </label>
            </div>
            <div className="ag-modal-foot">
              <button type="button" className="ag-soft" onClick={() => { setShowModal(false); setEditingId(null); }}>Cancelar</button>
              <button className="ag-primary" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Guardando…" : editingId ? "Guardar cambios" : "Guardar evento"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Agenda General"
        subtitle="Tu agenda centralizada para eventos, reuniones, recordatorios y citas del ecosistema."
        steps={[
          { title: "Crear un evento", text: "Haz clic en cualquier día del calendario o en 'Nuevo evento' para abrir el formulario. Elige tipo (visita, reunión, recordatorio, tarea, personal, etc.), hora y notas." },
          { title: "Navegar el calendario", text: "Usa las flechas ‹ › junto al nombre del mes para avanzar o retroceder entre meses." },
          { title: "Filtrar por app", text: "Las pestañas (Todos, Core y Lands) filtran los eventos por la app que los generó." },
          { title: "Editar evento", text: "Haz clic en 'Editar' en cualquier evento de la lista para modificar título, fecha, hora, tipo y notas." },
          { title: "Completar o eliminar", text: "Marca un evento como completado con el botón 'Completar' o elimínalo con 'Eliminar'." },
          { title: "Doble clic para crear", text: "Doble clic en cualquier día del calendario abre directamente el formulario con esa fecha seleccionada." },
          { title: "KPIs de la agenda", text: "Los 4 indicadores muestran total de eventos del mes, completados, pendientes y cuántos hay programados para hoy." },
        ]}
      />
    </EcoLayout>
  );
}

export default AgendaPage;
