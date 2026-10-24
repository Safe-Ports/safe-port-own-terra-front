import WorkflowForm from "@/components/forms/WorkflowForm";
import DialogPortal from "@/components/ui/DialogPortal";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HiChatBubbleLeftRight, HiCheckCircle, HiClock, HiLockClosed, HiWrenchScrewdriver } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { PROPERTY_ACTION_ICONS } from "../../components/propertiesIconCatalog";
import { OPEN_WORK_ORDER, TICKET_PRIORITY_LABEL, TICKET_STATUS_LABEL, TICKET_TYPE_LABEL, WORK_ORDER_NEXT, WORK_ORDER_STATUS_LABEL, isClosedTicket } from "./ticketModel";

const { close: HiXMark, send: HiPaperAirplane } = PROPERTY_ACTION_ICONS;
const stamp = (value) => value ? new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)).replace(",", " ·") : "";
const failureText = (failure) => failure?.response?.data?.error?.message || failure?.message || "No pudimos completar la acción.";

/**
 * Seguimiento de un ticket real de properties-back: bitácora con comentarios
 * (públicos o internos), orden de trabajo con su proveedor y cierre.
 */
function TicketLiveDetail({ ticket, place, providers, actions, onClose }) {
  const { showToast } = useAppContext();
  const queryClient = useQueryClient();
  const detailKey = ["properties", "ticket", ticket.id];
  const detail = useQuery({ queryKey: detailKey, queryFn: () => actions.getTicket(ticket.id), retry: false });
  const [message, setMessage] = useState("");
  const [internal, setInternal] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [busy, setBusy] = useState("");
  const current = { ...ticket, ...(detail.data ? { status: detail.data.status, resolvedAt: detail.data.resolved_at } : {}) };
  const closed = isClosedTicket(current);
  const order = ticket.workOrder;
  const orderOpen = order && OPEN_WORK_ORDER.has(order.status);
  const comments = detail.data?.comments || [];

  const run = async (key, action, success) => {
    setBusy(key);
    try { await action(); await queryClient.invalidateQueries({ queryKey: detailKey }); if (success) showToast(success, "success"); }
    catch (failure) { showToast(failureText(failure), "warning"); }
    finally { setBusy(""); }
  };
  const send = (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    run("comment", async () => { await actions.commentTicket(ticket.id, message.trim(), internal ? "internal" : "participants"); setMessage(""); });
  };

  const timeline = [
    { title: current.fromResident ? `Reportado por ${current.reportedBy}` : "Ticket creado por la administración", time: stamp(current.createdAt), state: "done" },
    order ? { title: `Orden ${order.folio || ""} · ${order.assigneeName || "Proveedor"}`, time: WORK_ORDER_STATUS_LABEL[order.status] || order.status, state: orderOpen ? "current" : "done" } : null,
    current.status === "resolved" ? { title: "Resuelto", time: stamp(current.resolvedAt), state: "done" }
      : current.status === "cancelled" ? { title: "Cancelado", time: "", state: "done" }
      : { title: "Cierre", time: orderOpen ? "Cuando la orden quede terminada" : "Pendiente", state: "next" },
  ].filter(Boolean);

  return <DialogPortal className="ticket-trace-backdrop" role="presentation" onClick={onClose}>
    <section className="ticket-trace" role="dialog" aria-modal="true" aria-label={`Seguimiento de ${ticket.title}`} onClick={(event) => event.stopPropagation()}>
      <header>
        <div>
          <span>{ticket.folio} · {TICKET_TYPE_LABEL[ticket.type] || ticket.type} · Prioridad {TICKET_PRIORITY_LABEL[ticket.priority]?.toLowerCase()}</span>
          <h2>{ticket.title}</h2>
          <p>{place}</p>
          {ticket.description ? <p className="ticket-live-description">{ticket.description}</p> : null}
        </div>
        <button type="button" className="ticket-trace-close" aria-label="Cerrar seguimiento" onClick={onClose}><HiXMark/><span>Cerrar</span></button>
      </header>
      <div className="ticket-trace-layout">
        <div className="ticket-trace-story">
          <section className="trace-status">
            <header><HiWrenchScrewdriver/><div><small>Estado actual</small><strong>{TICKET_STATUS_LABEL[current.status] || current.status}</strong></div><span>{order?.assigneeName || "Por asignar"}</span></header>
            <div>{timeline.map((event, index) => <article className={event.state} key={`${event.title}-${index}`}><i>{event.state === "done" ? <HiCheckCircle/> : <HiClock/>}</i><div><time>{event.time}</time><h3>{event.title}</h3></div></article>)}</div>
          </section>

          {!closed ? <section className="ticket-live-order" aria-label="Orden de trabajo">
            {!order || !orderOpen ? <>
              <label><span>{order ? "Asignar otro proveedor" : "Asignar a un proveedor"}</span>
                <select value={providerId} onChange={(event) => setProviderId(event.target.value)}>
                  <option value="">Elige un proveedor activo</option>
                  {providers.map((item) => <option key={item.id} value={item.id}>{item.name}{item.categoria ? ` · ${item.categoria}` : ""}</option>)}
                </select>
              </label>
              <button type="button" disabled={!providerId || busy === "assign"} onClick={() => run("assign", () => actions.assignTicket(ticket.id, { providerId }), "Orden de trabajo enviada al proveedor")}>{busy === "assign" ? "Asignando…" : "Asignar"}</button>
              {!providers.length ? <small>No hay proveedores activos en la red.</small> : null}
            </> : <>
              <p><strong>{WORK_ORDER_STATUS_LABEL[order.status]}</strong> · {order.assigneeName}</p>
              <div>{(WORK_ORDER_NEXT[order.status] || []).map(([status, label]) => <button type="button" key={status} disabled={Boolean(busy)} onClick={() => run(`order-${status}`, () => actions.advanceWorkOrder(ticket.id, status))}>{busy === `order-${status}` ? "Guardando…" : label}</button>)}</div>
              <small>Mientras el proveedor no tenga su portal, la administración registra su avance.</small>
            </>}
          </section> : null}

          {!closed ? <footer className="ticket-live-close">
            <button type="button" className="primary" disabled={Boolean(busy) || orderOpen} title={orderOpen ? "Termina o cancela la orden de trabajo antes de resolver." : undefined} onClick={() => run("resolve", async () => { await actions.changeTicketStatus(ticket.id, "resolved"); }, "Ticket resuelto")}>{busy === "resolve" ? "Resolviendo…" : "Marcar resuelto"}</button>
            <button type="button" disabled={Boolean(busy)} onClick={() => run("cancel", async () => { await actions.changeTicketStatus(ticket.id, "cancelled"); }, "Ticket cancelado")}>Cancelar ticket</button>
            {orderOpen ? <small>Para resolver, la orden debe quedar terminada.</small> : null}
          </footer> : null}
        </div>

        <section className="trace-chat">
          <header><HiChatBubbleLeftRight/><div><strong>Bitácora del ticket</strong><span>Lo marcado como interno nunca lo ve el residente</span></div></header>
          <div className="trace-messages" aria-live="polite">
            {detail.isLoading ? <p className="ticket-live-empty">Cargando bitácora…</p> : null}
            {detail.error ? <p className="ticket-live-empty" role="alert">{failureText(detail.error)}</p> : null}
            {!detail.isLoading && !detail.error && !comments.length ? <p className="ticket-live-empty">Sin comentarios todavía.</p> : null}
            {comments.map((item) => <article key={item.id} className={item.author_user_id ? "mine" : ""}>
              <div><strong>{item.author_user_id ? "Administración" : ticket.reportedBy}</strong><time>{stamp(item.created_at)}</time>{item.visibility === "internal" ? <em className="ticket-live-internal"><HiLockClosed/> Interno</em> : null}</div>
              <p>{item.body}</p>
            </article>)}
          </div>
          {!closed ? <WorkflowForm onSubmit={send}>
            <textarea rows="2" value={message} maxLength={2000} onChange={(event) => setMessage(event.target.value)} placeholder={internal ? "Nota interna para el equipo…" : "Escribe una actualización para el residente…"} aria-label="Comentario del ticket"/>
            <button type="submit" aria-label="Enviar comentario" disabled={!message.trim() || busy === "comment"}><HiPaperAirplane/></button>
          </WorkflowForm> : null}
          <footer><label className="ticket-live-toggle"><input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} disabled={closed}/> Nota interna (no la ve el residente)</label></footer>
        </section>
      </div>
    </section>
  </DialogPortal>;
}

export default TicketLiveDetail;
