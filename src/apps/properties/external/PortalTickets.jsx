import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HiCheckCircle, HiWrenchScrewdriver } from "react-icons/hi2";
import propertiesPortalService from "@/services/propertiesPortalService";
import { TICKET_STATUS_LABEL, TICKET_TYPE_LABEL, TICKET_TYPE_OPTIONS } from "../features/tickets/ticketModel";
import "./portal-tickets.css";

const TONE = { open: "new", in_progress: "new", waiting: "new", resolved: "ok", cancelled: "muted" };
const EMPTY = { propertyId: "", type: "maintenance", title: "", description: "" };
const when = (value) => value ? new Date(value).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "";

/** Reportes de mantenimiento del residente: levantar uno y seguir los suyos. */
function PortalTickets({ units = [] }) {
  const queryClient = useQueryClient();
  const tickets = useQuery({ queryKey: ["portal-tickets"], queryFn: propertiesPortalService.tickets, retry: false });
  const [draft, setDraft] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(null);
  const propertyId = draft.propertyId || units[0]?.id || "";
  const unitLabel = (id) => units.find((unit) => unit.id === id)?.label || "Área común";

  const submit = async (event) => {
    event.preventDefault();
    if (!draft.title.trim()) { setNote({ tone: "warn", text: "Cuéntanos en pocas palabras qué pasa." }); return; }
    if (!propertyId) { setNote({ tone: "warn", text: "No tienes una unidad asignada para reportar." }); return; }
    setSaving(true); setNote(null);
    try {
      const row = await propertiesPortalService.createTicket({ property_id: propertyId, title: draft.title.trim(), description: draft.description.trim() || null, ticket_type: draft.type });
      setDraft(EMPTY); setOpen(false);
      setNote({ tone: "ok", text: `Recibimos tu reporte ${row.folio}. La administración te dará seguimiento.` });
      await queryClient.invalidateQueries({ queryKey: ["portal-tickets"] });
    } catch (failure) {
      setNote({ tone: "warn", text: failure.response?.data?.error?.message || "No pudimos enviar tu reporte. Intenta de nuevo." });
    } finally { setSaving(false); }
  };

  const rows = tickets.data || [];
  return <section className="community-section portal-tickets">
    <header>
      <div><span>Mantenimiento</span><p>Reporta algo que no funciona en tu unidad y sigue cómo avanza.</p></div>
      {!open ? <button type="button" className="portal-tickets-new" onClick={() => { setOpen(true); setNote(null); }}>Reportar un problema</button> : null}
    </header>

    {note ? <p className={`portal-tickets-note is-${note.tone}`} role="status">{note.text}</p> : null}

    {open ? <form className="portal-tickets-form" onSubmit={submit} noValidate aria-label="Reportar un problema">
      {units.length > 1 ? <label><span>Unidad</span><select value={propertyId} onChange={(event) => setDraft({ ...draft, propertyId: event.target.value })}>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}</select></label> : null}
      <label><span>Tipo</span><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>{TICKET_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{TICKET_TYPE_LABEL[type]}</option>)}</select></label>
      <label className="wide"><span>¿Qué pasa?</span><input value={draft.title} maxLength={160} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ej. Fuga debajo del lavabo"/></label>
      <label className="wide"><span>Detalles (opcional)</span><textarea rows="3" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Desde cuándo, dónde exactamente, horario en que pueden pasar…"/></label>
      <footer><button type="button" onClick={() => setOpen(false)}>Cancelar</button><button type="submit" disabled={saving}>{saving ? "Enviando…" : "Enviar reporte"}</button></footer>
    </form> : null}

    <div className="community-list">
      {tickets.isLoading ? <p>Cargando tus reportes…</p> : null}
      {tickets.error ? <p role="alert">{tickets.error.response?.data?.error?.message || "No pudimos cargar tus reportes."}</p> : null}
      {!tickets.isLoading && !tickets.error && !rows.length ? <p><HiCheckCircle/> No tienes reportes abiertos. Todo en orden en casa.</p> : null}
      {rows.map((ticket) => <article key={ticket.id}>
        <HiWrenchScrewdriver/>
        <div><strong>{ticket.title}</strong><small>{ticket.folio} · {unitLabel(ticket.property_id)} · {TICKET_TYPE_LABEL[ticket.ticket_type] || ticket.ticket_type} · {when(ticket.created_at)}</small></div>
        <i className={TONE[ticket.status] || "new"}>{TICKET_STATUS_LABEL[ticket.status] || ticket.status}</i>
      </article>)}
    </div>
  </section>;
}

export default PortalTickets;
