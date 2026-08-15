import { useEffect, useMemo, useState } from "react";
import GuideModal from "@/components/shared/GuideModal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appointmentService } from "@/services/appointmentService";
import { calendarService } from "@/services/calendarService";
import { useAppContext } from "@/context/AppContext";

import FieldError from "@/components/shared/FieldError";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import useEscapeKey from "@/hooks/useEscapeKey";
import EcoLayout from "./EcoLayout";
import AgendaTimeGrid from "./AgendaTimeGrid";
import AgendaQuickCreate from "./AgendaQuickCreate";
import ConnectCalendarModal from "./ConnectCalendarModal";
import {
  APP_META,
  CREATABLE_APPS,
  TYPES,
  FILTERS,
  AGENDA_RULES,
  toDateKey,
  buildMonthDays,
  getVisibleRange,
  normalizeAppt,
  buildAppointmentBody,
  AppTag,
} from "./agendaShared";

function buildWhatsAppLink(phone, message) {
  const clean = String(phone || "").replace(/\D/g, "");
  const base = clean ? `https://wa.me/${clean}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}

const VIEW_OPTIONS = [
  ["day", "Día"],
  ["week", "Semana"],
  ["month", "Mes"],
];

const TOTAL_LABEL = {
  day: "Eventos del día",
  week: "Eventos esta semana",
  month: "Eventos este mes",
};

function AgendaPage() {
  const today = new Date();
  const qc = useQueryClient();
  const { showToast, showError, clearCalendarAlerts, clients } = useAppContext();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(toDateKey(today));
  const [showGuide, setShowGuide] = useState(false);
  const [view, setView] = useState("week");
  const [quickCreate, setQuickCreate] = useState(null);

  useEffect(() => {
    clearCalendarAlerts();
  }, []);

  // Un popover de creación rápida anclado a una celda ya no aplica si el
  // usuario navega a otra semana/día/mes o cambia de vista.
  useEffect(() => {
    setQuickCreate(null);
    setShowAllDay(false);
  }, [view, visibleMonth, selectedDate]);

  const visibleRange = useMemo(
    () => getVisibleRange(view, visibleMonth, selectedDate),
    [view, visibleMonth, selectedDate]
  );

  const { data: rawAppts = [], isLoading } = useQuery({
    queryKey: ["appointments", "agenda", view, visibleRange.start.toISOString()],
    queryFn: () => appointmentService.list({
      upcoming_only: false,
      from_date: visibleRange.start.toISOString(),
      to_date: visibleRange.end.toISOString(),
    }),
  });

  const todayRange = useMemo(
    () => getVisibleRange("day", visibleMonth, toDateKey(today)),
    [visibleMonth]
  );
  const visibleRangeIncludesToday = today >= visibleRange.start && today <= visibleRange.end;
  const { data: rawTodayAppts = [], isLoading: isTodayLoading } = useQuery({
    queryKey: ["appointments", "agenda", "today", todayRange.start.toISOString()],
    queryFn: () => appointmentService.list({
      upcoming_only: false,
      from_date: todayRange.start.toISOString(),
      to_date: todayRange.end.toISOString(),
    }),
    enabled: !visibleRangeIncludesToday,
  });

  const appointments = useMemo(() => rawAppts.map(normalizeAppt), [rawAppts]);

  const createMutation = useMutation({
    mutationFn: (body) => appointmentService.create(body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      if (data?.meet_url) showToast("Evento creado · videollamada de Meet lista");
      else showToast("Evento guardado");
    },
    onError: (err) => showError(err, "Error al guardar el evento"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => appointmentService.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      showToast("Evento eliminado");
    },
    onError: (err) => showError(err, "Error al eliminar el evento"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => appointmentService.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      showToast("Evento actualizado");
    },
    onError: (err) => showError(err, "Error al actualizar el evento"),
  });

  const [filter, setFilter] = useState("Todos");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  useEscapeKey(() => {
    setShowModal(false);
    setEditingId(null);
  }, showModal);
  const fe = useFieldErrors();
  const [showConnect, setShowConnect] = useState(false);
  const [withMeet, setWithMeet] = useState(false);
  // La lista del día muestra solo los próximos 2 por defecto (para que no crezca
  // infinitamente); se puede expandir a todos.
  const [showAllDay, setShowAllDay] = useState(false);
  // Enlaces de Google/Meet de la cita que se está editando (para el modal).
  const [editLinks, setEditLinks] = useState({ meetUrl: null, eventUrl: null });

  // ¿El usuario conectó su Google? (para ofrecer la videollamada de Meet al crear).
  const { data: gcal } = useQuery({
    queryKey: ["calendar-google-status"],
    queryFn: () => calendarService.googleStatus(),
    staleTime: 60_000,
  });
  const googleConnected = !!gcal?.connected;

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

  // Por defecto solo los próximos 2 del día; el resto se despliega con "Ver todos".
  const DAY_PREVIEW = 2;
  const dayList = showAllDay ? selectedAppointments : selectedAppointments.slice(0, DAY_PREVIEW);
  const hiddenDayCount = selectedAppointments.length - dayList.length;

  const total = appointments.length;
  const pending = appointments.filter((a) => a.status === "pending").length;
  const completed = appointments.filter((a) => a.status === "completed").length;
  const today_count = visibleRangeIncludesToday
    ? appointments.filter((a) => a.date === toDateKey(today)).length
    : rawTodayAppts.length;

  const openCreate = (date = selectedDate, time = "10:00") => {
    setEditingId(null);
    setWithMeet(false);
    setEditLinks({ meetUrl: null, eventUrl: null });
    setForm({ title: "", date, time, client: "", app: "core", type: "evento", context: "", owner: "" });
    setSelectedDate(date);
    setShowModal(true);
  };

  const openEdit = (appointment) => {
    setEditingId(appointment.id);
    setWithMeet(false);
    setEditLinks({ meetUrl: appointment.meetUrl || null, eventUrl: appointment.eventUrl || null });
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
    if (!fe.validate(form, AGENDA_RULES)) return;
    const body = buildAppointmentBody(form);
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, body });
    } else {
      await createMutation.mutateAsync({ ...body, with_meet: withMeet && googleConnected });
    }
    setShowModal(false);
    setEditingId(null);
    setForm({ title: "", date: form.date, time: "10:00", client: "", app: "core", type: "evento", context: "", owner: "" });
  };

  const syncVisibleMonth = (date) => {
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const moveRange = (offset) => {
    if (view === "month") {
      const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
      setVisibleMonth(next);
      setSelectedDate(toDateKey(next));
      return;
    }
    const step = view === "week" ? offset * 7 : offset;
    const anchor = new Date(`${selectedDate}T12:00:00`);
    anchor.setDate(anchor.getDate() + step);
    setSelectedDate(toDateKey(anchor));
    syncVisibleMonth(anchor);
  };

  const goToToday = () => {
    setSelectedDate(toDateKey(today));
    syncVisibleMonth(today);
  };

  const rangeLabel = useMemo(() => {
    if (view === "month") return visibleMonth.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    if (view === "day") {
      return new Date(`${selectedDate}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    }
    const days = visibleRange.days || [];
    if (!days.length) return "";
    const start = days[0].date;
    const end = days[days.length - 1].date;
    const sameMonth = start.getMonth() === end.getMonth();
    const startLabel = start.toLocaleDateString("es-MX", { day: "numeric", month: sameMonth ? undefined : "short" });
    const endLabel = end.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
    return `${startLabel} – ${endLabel}`;
  }, [view, visibleMonth, selectedDate, visibleRange]);

  return (
    <EcoLayout active="agenda" title="Agenda" subtitle="Agenda general del ecosistema: eventos, recordatorios, reuniones y citas" onGuide={() => setShowGuide(true)}>
      <div className="ag-hero">
        <div>
          <div className="ag-kicker">Agenda General</div>
          <h2>Tu agenda centralizada</h2>
          <p>Registra visitas, reuniones, recordatorios, tareas, llamadas y cualquier evento personal o de negocio.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="ag-connect" onClick={() => setShowConnect(true)} title="Sincroniza tu agenda con Google Calendar">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11v6m3-3H9m10.5 6h-15A1.5 1.5 0 0 1 3 18.5v-11A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v11a1.5 1.5 0 0 1-1.5 1.5M7 3v4m10-4v4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>
            Conectar Google Calendar
          </button>
          <button className="ag-primary" onClick={() => openCreate()}>Nuevo evento</button>
        </div>
      </div>

      <div className="ag-kpis">
        <div className="ag-kpi"><span>Total</span><b>{isLoading ? "—" : total}</b><small>{TOTAL_LABEL[view]}</small></div>
        <div className="ag-kpi"><span>Completados</span><b>{completed}</b><small>Realizados</small></div>
        <div className="ag-kpi"><span>Pendientes</span><b>{pending}</b><small>Por realizar</small></div>
        <div className="ag-kpi"><span>Hoy</span><b>{isTodayLoading ? "—" : today_count}</b><small>Eventos de hoy</small></div>
      </div>

      <div className="ag-layout">
        <section className="ag-calendar-card">
          <div className="ag-card-head">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button className="ag-soft" onClick={() => moveRange(-1)} aria-label="Anterior">‹</button>
                <h3 style={{ textTransform: "capitalize" }}>{rangeLabel}</h3>
                <button className="ag-soft" onClick={() => moveRange(1)} aria-label="Siguiente">›</button>
                <button className="ag-soft" onClick={goToToday}>Hoy</button>
              </div>
              <div className="ag-seg" style={{ marginTop: 8 }}>
                {VIEW_OPTIONS.map(([key, label]) => (
                  <button key={key} className={view === key ? "on" : ""} onClick={() => setView(key)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="ag-seg">
              {FILTERS.map((item) => (
                <button key={item} className={filter === item ? "on" : ""} onClick={() => setFilter(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>

          {view === "month" ? (
            <>
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
            </>
          ) : (
            <AgendaTimeGrid
              view={view}
              days={visibleRange.days}
              appointments={visibleAppointments}
              onSlotClick={(date, time, anchorRect) => setQuickCreate({ date, time, anchorRect })}
              onEventClick={(item) => openEdit(item)}
            />
          )}
        </section>

        <aside className="ag-side">
          <div className="ag-side-card">
            <div className="ag-card-head compact">
              <div>
                <h3>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}</h3>
                <p>
                  {selectedAppointments.length === 0
                    ? "Sin eventos"
                    : !showAllDay && selectedAppointments.length > DAY_PREVIEW
                      ? `Próximos ${dayList.length} de ${selectedAppointments.length}`
                      : `${selectedAppointments.length} evento${selectedAppointments.length === 1 ? "" : "s"} programado${selectedAppointments.length === 1 ? "" : "s"}`}
                </p>
              </div>
              <button className="ag-soft" onClick={() => openCreate(selectedDate)}>Agregar</button>
            </div>
            <div className="ag-list">
              {selectedAppointments.length ? dayList.map((item) => (
                <div
                  key={item.id}
                  className="md-visit ag-visit"
                  role="button"
                  tabIndex={0}
                  title="Ver / editar evento"
                  onClick={() => openEdit(item)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openEdit(item))}
                >
                  <div className="md-time"><b>{item.time}</b><span>HRS</span></div>
                  <div className="md-st">
                    <span className={`md-sdot ${item.status}`}>{item.status === "completed" ? "✓" : ""}</span>
                  </div>
                  <div className="md-info">
                    <div className="md-name">{item.title}</div>
                    <div className="md-meta">{[item.client, item.context].filter(Boolean).join(" · ") || "—"}</div>
                  </div>
                  <AppTag app={item.app} />
                  {item.meetUrl ? (
                    <a
                      href={item.meetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="md-open"
                      onClick={(e) => e.stopPropagation()}
                      title="Unirse a la videollamada"
                    >
                      🎥 Unirse
                    </a>
                  ) : null}
                </div>
              )) : (
                <div className="ag-empty">
                  <b>Sin eventos para este día</b>
                  <span>Doble clic en el día o usa "Agregar" para crear un evento.</span>
                </div>
              )}
              {selectedAppointments.length > DAY_PREVIEW ? (
                <button className="ag-more" onClick={() => setShowAllDay((v) => !v)}>
                  {showAllDay ? "Ver menos" : `Ver todos (${selectedAppointments.length})`}
                </button>
              ) : null}
            </div>
          </div>

        </aside>
      </div>

      {quickCreate ? (
        <AgendaQuickCreate
          date={quickCreate.date}
          time={quickCreate.time}
          anchorRect={quickCreate.anchorRect}
          onClose={() => setQuickCreate(null)}
          onSubmit={(body) => createMutation.mutateAsync(body)}
          onMore={(date, time) => { setQuickCreate(null); openCreate(date, time); }}
        />
      ) : null}

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
                <input type="date" className={fe.errors.date ? "is-invalid" : undefined} value={form.date} onChange={(e) => { setForm((p) => ({ ...p, date: e.target.value })); fe.clear("date"); }} />
                <FieldError msg={fe.errors.date} />
              </label>
              <label>
                Hora
                <input type="time" className={fe.errors.time ? "is-invalid" : undefined} value={form.time} onChange={(e) => { setForm((p) => ({ ...p, time: e.target.value })); fe.clear("time"); }} />
                <FieldError msg={fe.errors.time} />
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
            {editingId && (editLinks.meetUrl || editLinks.eventUrl) ? (
              <div className="ag-meet-links">
                {editLinks.meetUrl ? (
                  <a href={editLinks.meetUrl} target="_blank" rel="noopener noreferrer" className="ag-meet-join">
                    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 10l4.5-2.5v9L15 14m-11-4A1.5 1.5 0 0 1 5.5 8.5h8A1.5 1.5 0 0 1 15 10v4a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 14z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/></svg>
                    Unirse a la videollamada
                  </a>
                ) : null}
                {editLinks.eventUrl ? (
                  <a href={editLinks.eventUrl} target="_blank" rel="noopener noreferrer" className="ag-gcal-link">
                    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 6h15A1.5 1.5 0 0 1 21 7.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-11A1.5 1.5 0 0 1 4.5 6M3 10h18M7 3v4m10-4v4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
                    Ver en Google Calendar
                  </a>
                ) : null}
              </div>
            ) : null}
            {!editingId && googleConnected ? (
              <label className="ag-meet-opt">
                <input type="checkbox" checked={withMeet} onChange={(e) => setWithMeet(e.target.checked)} />
                <span className="ag-meet-ico">
                  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 10l4.5-2.5v9L15 14m-11-4A1.5 1.5 0 0 1 5.5 8.5h8A1.5 1.5 0 0 1 15 10v4a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 14z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/></svg>
                </span>
                Agregar videollamada de Google Meet
              </label>
            ) : null}
            <div className="ag-modal-foot">
              {editingId ? (
                <button
                  type="button"
                  className="ag-danger"
                  style={{ marginRight: "auto" }}
                  onClick={() => { if (window.confirm("¿Eliminar este evento del calendario? Si tiene videollamada, también se borra de Google Calendar.")) { cancelMutation.mutate(editingId); setShowModal(false); setEditingId(null); } }}
                >
                  Eliminar evento
                </button>
              ) : null}
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
          { title: "Vistas Día / Semana / Mes", text: "Cambia entre las tres vistas con el selector junto a la fecha. Semana y Día muestran una rejilla por hora, igual que Google Calendar; Mes conserva la vista general de siempre." },
          { title: "Crear con un clic", text: "En las vistas de Semana o Día, haz clic en cualquier celda de hora para abrir un formulario rápido ya con esa fecha y hora. Usa 'Más opciones' si necesitas cliente, notas o responsable." },
          { title: "Crear un evento completo", text: "El botón 'Nuevo evento' abre el formulario completo. Elige tipo (visita, reunión, recordatorio, tarea, personal, etc.), hora y notas." },
          { title: "Navegar el calendario", text: "Usa las flechas ‹ › para avanzar o retroceder (mes, semana o día según la vista activa) y 'Hoy' para volver a la fecha actual." },
          { title: "Filtrar por app", text: "Las pestañas (Todos, Core y Lands) filtran los eventos por la app que los generó, en cualquier vista." },
          { title: "Editar evento", text: "Haz clic en cualquier evento de la rejilla, o en 'Editar' en la lista del panel derecho, para modificar título, fecha, hora, tipo y notas." },
          { title: "Completar o eliminar", text: "Marca un evento como completado con el botón 'Completar' o elimínalo con 'Eliminar'." },
          { title: "Doble clic para crear (vista Mes)", text: "Doble clic en cualquier día del calendario mensual abre directamente el formulario con esa fecha seleccionada." },
          { title: "KPIs de la agenda", text: "Los 4 indicadores muestran el total de eventos del período visible (mes, semana o día), completados, pendientes y cuántos hay programados para hoy." },
        ]}
      />
      {showConnect ? <ConnectCalendarModal onClose={() => setShowConnect(false)} /> : null}
    </EcoLayout>
  );
}

export default AgendaPage;
