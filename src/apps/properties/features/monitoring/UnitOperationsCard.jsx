import { useState } from "react";
import { Link } from "react-router-dom";
import { HiArrowRight, HiCheckCircle, HiInboxStack, HiPlus, HiTicket } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import { TICKET_STATUS_LABEL } from "../tickets/ticketModel";

const when = (value) => value ? new Date(value).toLocaleString("es-MX", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }) : "";
const CLOSED_TICKETS = new Set(["resolved", "closed", "cancelled"]);
const failure = (error) => error?.response?.data?.error?.message || error?.message || "No pudimos completar la acción.";

/* Lo que pasa en la unidad día a día: paquetes en recepción y tickets abiertos.
   Se registra y se entrega desde aquí; la pantalla de recepción y la de
   tickets quedan como vista de toda la comunidad. */
function UnitOperationsCard({ unit, community, people = [], canWrite = false }) {
  const data = usePropertiesData();
  const { showToast } = useAppContext();
  const packages = (data.packages || []).filter((item) => (item.unitId || item.property_id) === unit.id && item.status !== "delivered");
  const tickets = (data.tickets || []).filter((item) => item.unitId === unit.id && !CLOSED_TICKETS.has(item.status));
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ carrier:"", trackingNumber:"" });
  const [delivering, setDelivering] = useState(null);
  const [recipientId, setRecipientId] = useState("");
  const [busy, setBusy] = useState(false);

  const register = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try { await data.addPackage(community.id, { unitId: unit.id, carrier: draft.carrier.trim(), trackingNumber: draft.trackingNumber.trim() }); setDraft({ carrier:"", trackingNumber:"" }); setAdding(false); showToast(`Paquete registrado para ${unit.identifier}`, "success"); }
    catch (error) { showToast(failure(error), "warning"); }
    finally { setBusy(false); }
  };
  const deliver = async (event) => {
    event.preventDefault();
    if (!recipientId || busy) return;
    setBusy(true);
    try { await data.deliverPackage(delivering, { personId: recipientId }); setDelivering(null); setRecipientId(""); showToast("Entrega registrada", "success"); }
    catch (error) { showToast(failure(error), "warning"); }
    finally { setBusy(false); }
  };

  return <section className="unit-page-card unit-ops" aria-label={`Operación de ${unit.identifier}`}>
    <div className="unit-ops-block">
      <header><h3><HiInboxStack/> Paquetería</h3>{canWrite ? <button type="button" onClick={() => setAdding((value) => !value)}>{adding ? "Cancelar" : <><HiPlus/> Registrar paquete</>}</button> : null}</header>
      {adding ? <form className="unit-ops-form" onSubmit={register}>
        <input aria-label="Paquetería" value={draft.carrier} onChange={(event) => setDraft({ ...draft, carrier: event.target.value })} placeholder="Paquetería (Amazon, DHL…)" autoFocus/>
        <input aria-label="Número de guía" value={draft.trackingNumber} onChange={(event) => setDraft({ ...draft, trackingNumber: event.target.value })} placeholder="Guía (opcional)"/>
        <button type="submit" disabled={busy}>{busy ? "Guardando…" : "Registrar"}</button>
      </form> : null}
      {packages.length ? <ul className="unit-ops-list">{packages.map((item) => <li key={item.id}>
        <span><strong>{item.carrier || "Paquete"}</strong><small>Llegó {when(item.receivedAt || item.received_at)}{item.trackingNumber || item.tracking_number ? ` · Guía ${item.trackingNumber || item.tracking_number}` : ""}</small></span>
        {delivering === item.id ? <form className="unit-ops-deliver" onSubmit={deliver}>
          <select aria-label="Quién recibe" value={recipientId} onChange={(event) => setRecipientId(event.target.value)}><option value="">¿Quién lo recibe?</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select>
          <button type="submit" disabled={!recipientId || busy}>Confirmar</button>
          <button type="button" onClick={() => setDelivering(null)}>Cancelar</button>
        </form> : canWrite ? <button type="button" className="is-primary" onClick={() => { setDelivering(item.id); setRecipientId(people.length === 1 ? people[0].id : ""); }} disabled={!people.length} title={people.length ? undefined : "Solo se entrega a una persona de la unidad"}><HiCheckCircle/> Entregar</button> : null}
      </li>)}</ul> : <p className="unit-ops-empty">Sin paquetes en recepción.</p>}
    </div>
    <div className="unit-ops-block">
      <header><h3><HiTicket/> Tickets abiertos</h3>{canWrite ? <Link to={`/properties/tickets?create=1&unitId=${unit.id}`}><HiPlus/> Nuevo ticket</Link> : null}</header>
      {tickets.length ? <ul className="unit-ops-list">{tickets.map((ticket) => <li key={ticket.id}>
        <span><strong>{ticket.title}</strong><small>{[ticket.folio, TICKET_STATUS_LABEL[ticket.status] || ticket.status].filter(Boolean).join(" · ")}</small></span>
      </li>)}</ul> : <p className="unit-ops-empty">Sin tickets abiertos.</p>}
      <Link to="/properties/tickets" className="unit-service-link">Ver todos los tickets <HiArrowRight/></Link>
    </div>
  </section>;
}

export default UnitOperationsCard;
