import "../components/properties-ui.css";
import { useEffect, useMemo, useState } from "react";
import { HiArrowLeft, HiArrowPath, HiArchiveBox, HiCalendarDays, HiChatBubbleLeftRight, HiCheckCircle, HiClock, HiExclamationTriangle, HiKey, HiMapPin, HiPaperAirplane, HiPhoto, HiSun, HiUser, HiWrenchScrewdriver, HiXMark } from "react-icons/hi2";
import PropertiesLogo from "../components/PropertiesLogo";
import SkyScene, { greeting, skyPeriod } from "../components/SkyScene";
import { ORDER_STATUS, PARTNER_API_READY, PRIORITY_LABEL, STEPS, canMove, loadOrders, nextAction, partitionOrders, resetOrders, saveOrders, stepIndex, summary, validateFinish, whenLabel } from "./partnerModel";
import "./service-partner-portal.css";

const PROVIDER = { name: "Plomería Díaz", team: "equipo Díaz", initials: "PD" };
const SECTIONS = [
  ["today", HiSun, "Hoy", "Lo que sigue"],
  ["agenda", HiCalendarDays, "Agenda", "Próximas visitas"],
  ["history", HiArchiveBox, "Historial", "Trabajos cerrados"],
];
const EMPTY = {
  today: ["Nada pendiente por hoy", "Cuando la administración te asigne un trabajo, aparece aquí."],
  agenda: ["Sin visitas programadas", "Tus próximas órdenes confirmadas se acomodan por fecha."],
  history: ["Aún no cierras trabajos", "Lo que termines queda aquí con su evidencia."],
};
const stamp = (value) => value ? new Date(value).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
const uid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);

function StatusChip({ status }) {
  const meta = ORDER_STATUS[status] || { label: status, tone: "muted" };
  return <i className={`sp-chip is-${meta.tone}`}>{meta.label}</i>;
}

function OrderDetail({ order, onChange, onBack, now }) {
  const [finish, setFinish] = useState({ note: "", evidence: [] });
  const [errors, setErrors] = useState({});
  const [incident, setIncident] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [message, setMessage] = useState("");
  useEffect(() => { setFinish({ note: "", evidence: [] }); setErrors({}); setIncident(null); setRejecting(null); setMessage(""); }, [order.id]);

  const action = nextAction(order);
  const current = stepIndex(order.status);
  const move = (status, extra = {}) => {
    if (!canMove(order.status, status)) return;
    onChange({ ...order, ...extra, status, timeline: { ...order.timeline, [status]: new Date().toISOString() } });
  };
  const addMessage = (body, kind = "message") => onChange({ ...order, messages: [...order.messages, { id: uid(), from: "me", body, kind, at: new Date().toISOString() }] });
  const finishWork = (event) => {
    event.preventDefault();
    const found = validateFinish(finish);
    setErrors(found);
    if (Object.keys(found).length) return;
    move("done", { evidence: finish.evidence.map(({ id, name }) => ({ id, name })), closingNote: finish.note.trim() });
  };
  const pickPhotos = (event) => {
    const files = [...event.target.files].slice(0, 6).map((file) => ({ id: uid(), name: file.name, url: URL.createObjectURL(file) }));
    setFinish((value) => ({ ...value, evidence: [...value.evidence, ...files].slice(0, 6) }));
    setErrors((value) => ({ ...value, evidence: undefined }));
    event.target.value = "";
  };

  return <article className="sp-order" aria-label={`Orden ${order.folio}`}>
    <button type="button" className="sp-back" onClick={onBack}><HiArrowLeft/> Mis órdenes</button>
    <header className="sp-order-head">
      <div>
        <span>{order.folio} · Ticket {order.ticketFolio}</span>
        <h2>{order.title}</h2>
        <p><HiMapPin/> {order.community} · {order.unit}</p>
      </div>
      <StatusChip status={order.status}/>
    </header>

    <dl className="sp-facts">
      <div><dt><HiClock/> Cuándo</dt><dd>{whenLabel(order.scheduledAt, now)}</dd></div>
      <div><dt><HiUser/> Contacto</dt><dd>{order.contact}</dd></div>
      <div><dt><HiExclamationTriangle/> Prioridad</dt><dd className={`is-${order.priority}`}>{PRIORITY_LABEL[order.priority]}</dd></div>
    </dl>
    {order.detail ? <p className="sp-detail">{order.detail}</p> : null}
    {order.access ? <section className="sp-access"><HiKey/><div><strong>Cómo entrar</strong><p>{order.access}</p></div></section> : null}

    <ol className="sp-steps" aria-label="Avance de la orden">
      {STEPS.map(([key, label], index) => {
        const state = order.status === "rejected" || order.status === "cancelled" ? (index === 0 ? "done" : "todo") : index < current || order.status === "done" ? "done" : index === current ? "current" : "todo";
        return <li key={key} className={`is-${state}`}><i>{state === "done" ? <HiCheckCircle/> : index + 1}</i><span><strong>{label}</strong><small>{order.timeline?.[key] ? stamp(order.timeline[key]) : state === "current" ? "Ahora" : "Pendiente"}</small></span></li>;
      })}
    </ol>

    {order.status === "dispatched" ? <section className="sp-action">
      {rejecting === null ? <>
        <p>La administración te asignó este trabajo. Confirma si puedes ir {whenLabel(order.scheduledAt, now).toLowerCase()}.</p>
        <div className="sp-buttons"><button type="button" className="sp-primary" onClick={() => move(action.status)}><HiCheckCircle/> {action.label}</button><button type="button" onClick={() => setRejecting("")}>No puedo atenderla</button></div>
      </> : <form onSubmit={(event) => { event.preventDefault(); if (rejecting.trim()) move("rejected", { rejectionReason: rejecting.trim() }); }}>
        <label><span>¿Por qué no puedes atenderla?</span><textarea rows="2" value={rejecting} onChange={(event) => setRejecting(event.target.value)} placeholder="Ej. No tengo disponibilidad mañana; puedo el jueves."/></label>
        <div className="sp-buttons"><button type="submit" className="sp-danger" disabled={!rejecting.trim()}>Rechazar orden</button><button type="button" onClick={() => setRejecting(null)}>Volver</button></div>
      </form>}
    </section> : null}

    {order.status === "accepted" ? <section className="sp-action">
      <p>Cuando llegues, regístralo: la administración y la residente ven que ya estás en sitio.</p>
      <div className="sp-buttons"><button type="button" className="sp-primary" onClick={() => move(action.status)}><HiMapPin/> {action.label}</button></div>
    </section> : null}

    {order.status === "in_progress" ? <form className="sp-action sp-finish" onSubmit={finishWork} noValidate>
      <strong>Terminar el trabajo</strong>
      <label className="sp-photos"><span>Fotos del trabajo terminado</span>
        <input type="file" accept="image/*" multiple onChange={pickPhotos} aria-invalid={Boolean(errors.evidence)}/>
        <span className="sp-drop"><HiPhoto/> {finish.evidence.length ? `${finish.evidence.length} ${finish.evidence.length === 1 ? "foto" : "fotos"} · agregar más` : "Toca para tomar o elegir fotos"}</span>
      </label>
      {finish.evidence.length ? <ul className="sp-thumbs">{finish.evidence.map((file) => <li key={file.id}><img src={file.url} alt={file.name}/><button type="button" aria-label={`Quitar ${file.name}`} onClick={() => setFinish((value) => ({ ...value, evidence: value.evidence.filter((item) => item.id !== file.id) }))}><HiXMark/></button></li>)}</ul> : null}
      {errors.evidence ? <em className="sp-error">{errors.evidence}</em> : null}
      <label><span>¿Qué se hizo?</span><textarea rows="2" value={finish.note} onChange={(event) => { setFinish({ ...finish, note: event.target.value }); if (errors.note) setErrors({ ...errors, note: undefined }); }} placeholder="Ej. Se cambió la válvula angular y se probó sin fugas." aria-invalid={Boolean(errors.note)}/></label>
      {errors.note ? <em className="sp-error">{errors.note}</em> : null}
      <div className="sp-buttons"><button type="submit" className="sp-primary"><HiCheckCircle/> {action.label}</button><button type="button" onClick={() => setIncident("")}><HiExclamationTriangle/> Reportar imprevisto</button></div>
    </form> : null}

    {incident !== null ? <form className="sp-action sp-incident" onSubmit={(event) => { event.preventDefault(); if (!incident.trim()) return; addMessage(incident.trim(), "incident"); setIncident(null); }}>
      <label><span>¿Qué pasó?</span><textarea rows="2" autoFocus value={incident} onChange={(event) => setIncident(event.target.value)} placeholder="Ej. Falta una pieza; regreso mañana a las 10:00."/></label>
      <div className="sp-buttons"><button type="submit" className="sp-primary" disabled={!incident.trim()}>Avisar a la administración</button><button type="button" onClick={() => setIncident(null)}>Cancelar</button></div>
    </form> : null}

    {order.status === "done" ? <section className="sp-closed"><HiCheckCircle/><div><strong>Trabajo terminado {stamp(order.timeline?.done)}</strong>{order.closingNote ? <p>{order.closingNote}</p> : null}{order.evidence?.length ? <small>{order.evidence.length} {order.evidence.length === 1 ? "foto de evidencia" : "fotos de evidencia"}</small> : null}</div></section> : null}
    {order.status === "rejected" ? <section className="sp-closed is-muted"><HiXMark/><div><strong>Rechazaste esta orden</strong>{order.rejectionReason ? <p>{order.rejectionReason}</p> : null}</div></section> : null}

    <section className="sp-chat" aria-label="Conversación con la administración">
      <header><HiChatBubbleLeftRight/><div><strong>Conversación</strong><small>Con la administración de {order.community}</small></div></header>
      <div className="sp-messages">
        {!order.messages.length ? <p className="sp-muted">Sin mensajes. Escribe si necesitas algo para el trabajo.</p> : null}
        {order.messages.map((item) => <div key={item.id} className={`sp-message ${item.from === "me" ? "is-mine" : ""} ${item.kind === "incident" ? "is-incident" : ""}`}>
          <small>{item.from === "me" ? "Tú" : "Administración"} · {stamp(item.at)}{item.kind === "incident" ? " · Imprevisto" : ""}</small>
          <p>{item.body}</p>
        </div>)}
      </div>
      {order.status !== "done" && order.status !== "rejected" ? <form className="sp-compose" onSubmit={(event) => { event.preventDefault(); if (!message.trim()) return; addMessage(message.trim()); setMessage(""); }}>
        <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribe una actualización…" aria-label="Mensaje para la administración"/>
        <button type="submit" aria-label="Enviar mensaje" disabled={!message.trim()}><HiPaperAirplane/></button>
      </form> : null}
    </section>
  </article>;
}

/** Portal del proveedor de servicio: sus órdenes de trabajo, avance, evidencia y conversación. */
function ServicePartnerPortal({ now: fixedNow }) {
  const now = useMemo(() => fixedNow || new Date(), [fixedNow]);
  const [orders, setOrders] = useState(() => loadOrders(now));
  const [section, setSection] = useState("today");
  const [selectedId, setSelectedId] = useState(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  useEffect(() => { if (!PARTNER_API_READY) saveOrders(orders); }, [orders]);

  const groups = useMemo(() => partitionOrders(orders, now), [orders, now]);
  const stats = useMemo(() => summary(orders, now), [orders, now]);
  const list = groups[section];
  const selected = orders.find((order) => order.id === selectedId) || list[0] || null;
  const period = skyPeriod(now.getHours());
  const update = (order) => setOrders((current) => current.map((item) => item.id === order.id ? order : item));
  const open = (id) => { setSelectedId(id); setMobileDetail(true); };
  const [title, subtitle] = (() => {
    if (stats.onSite) return [`Estás en sitio en ${stats.onSite === 1 ? "un trabajo" : `${stats.onSite} trabajos`}.`, "Cuando termines, sube las fotos y cierra la orden."];
    if (stats.toConfirm) return [`Tienes ${stats.toConfirm} ${stats.toConfirm === 1 ? "orden" : "órdenes"} por confirmar.`, "Confirma tu visita para que la administración avise al residente."];
    if (stats.next) return ["Todo al día.", `Tu siguiente visita es ${whenLabel(stats.next.scheduledAt, now).toLowerCase()}`.replace(/\.?$/, ".")];
    return ["Todo al día.", "No tienes trabajos pendientes."];
  })();

  return <div className={`sp-shell ${mobileDetail ? "is-detail" : ""}`}>
    <aside className="sp-nav">
      <header><PropertiesLogo/><span>PORTAL DE SERVICIO</span></header>
      <nav aria-label="Secciones del portal">{SECTIONS.map(([key, Icon, label, hint]) => <button type="button" key={key} className={section === key ? "active" : ""} aria-current={section === key ? "page" : undefined} onClick={() => { setSection(key); setSelectedId(null); setMobileDetail(false); }}><Icon/><span><strong>{label}</strong><small>{hint}</small></span>{key !== "history" && groups[key].length ? <i>{groups[key].length}</i> : null}</button>)}</nav>
      <footer><span>{PROVIDER.initials}</span><div><strong>{PROVIDER.name}</strong><small>Proveedor de la red</small></div></footer>
    </aside>

    <main className="sp-main">
      <header className={`sp-hero sky-host is-${period}`}>
        <SkyScene period={period} kind="community"/>
        <div className="sp-hero-copy">
          <small>{now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</small>
          <h1>{greeting(now.getHours())}, {PROVIDER.team}.</h1>
          <p><strong>{title}</strong> {subtitle}</p>
        </div>
        {!PARTNER_API_READY ? <button type="button" className="sp-preview" title="Las órdenes son de ejemplo y se guardan en este navegador. Toca para reiniciarlas." onClick={() => { setOrders(resetOrders(now)); setSelectedId(null); }}><HiArrowPath/> Vista previa</button> : null}
      </header>

      <section className="sp-stats" aria-label="Resumen">
        <article><small>Hoy</small><strong>{stats.today}</strong><span>{stats.today === 1 ? "servicio programado" : "servicios programados"}</span></article>
        <article className={stats.toConfirm ? "is-warn" : ""}><small>Por confirmar</small><strong>{stats.toConfirm}</strong><span>{stats.toConfirm ? "La administración espera tu respuesta" : "Nada pendiente"}</span></article>
        <article><small>Siguiente visita</small><strong>{stats.next ? new Date(stats.next.scheduledAt).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" }) : "—"}</strong><span>{stats.next ? `${whenLabel(stats.next.scheduledAt, now).split(" · ")[0]} · ${stats.next.community}` : "Sin visitas próximas"}</span></article>
      </section>

      <div className="sp-layout">
        <section className="sp-list" aria-label={SECTIONS.find(([key]) => key === section)[2]}>
          <header><div><small>{SECTIONS.find(([key]) => key === section)[3]}</small><h2>{section === "history" ? "Trabajos cerrados" : section === "agenda" ? "Próximas visitas" : "Mis órdenes de trabajo"}</h2></div><span>{list.length} {list.length === 1 ? "orden" : "órdenes"}</span></header>
          {!list.length ? <div className="sp-empty"><HiWrenchScrewdriver/><strong>{EMPTY[section][0]}</strong><p>{EMPTY[section][1]}</p></div> : <ul>
            {list.map((order) => <li key={order.id}><button type="button" className={`sp-item is-${order.priority} ${selected?.id === order.id ? "active" : ""}`} onClick={() => open(order.id)} aria-current={selected?.id === order.id ? "true" : undefined}>
              <span className="sp-item-icon">{order.status === "done" ? <HiCheckCircle/> : <HiWrenchScrewdriver/>}</span>
              <span className="sp-item-copy"><small>{order.folio} · {PRIORITY_LABEL[order.priority]}</small><strong>{order.title}</strong><em><HiMapPin/> {order.community} · {order.unit}</em></span>
              <span className="sp-item-state"><StatusChip status={order.status}/><small>{whenLabel(order.scheduledAt, now)}</small></span>
            </button></li>)}
          </ul>}
        </section>
        {selected ? <OrderDetail order={selected} now={now} onChange={update} onBack={() => setMobileDetail(false)}/> : <div className="sp-order sp-empty"><HiWrenchScrewdriver/><strong>Elige una orden</strong><p>Aquí ves cómo entrar, el avance y la conversación.</p></div>}
      </div>
    </main>
  </div>;
}

export default ServicePartnerPortal;
