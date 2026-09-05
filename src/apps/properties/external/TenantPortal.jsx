import { useState } from "react";
import { HiArrowDownTray, HiArrowRight, HiBanknotes, HiBellAlert, HiCalendarDays, HiChatBubbleLeftRight, HiCheckCircle, HiClock, HiCreditCard, HiDocumentText, HiHomeModern, HiKey, HiPlus, HiQrCode, HiTicket, HiUserCircle, HiWrenchScrewdriver, HiXMark } from "react-icons/hi2";
import PropertiesLogo from "@/apps/properties/components/PropertiesLogo";
import useEscapeKey from "@/hooks/useEscapeKey";
import "./tenant-portal.css";
import "./tenant-brand.css";

const payments = [
  ["Agosto 2026", "05 ago 2026", "Transferencia SPEI", "$18,500", "Pagada"],
  ["Julio 2026", "04 jul 2026", "Transferencia SPEI", "$18,500", "Pagada"],
  ["Junio 2026", "05 jun 2026", "Transferencia SPEI", "$18,500", "Pagada"],
];
const initialRequests = [
  ["OT-240381", "Fuga debajo del lavabo", "En progreso", "Hoy · 14:26", "Plomería Díaz"],
  ["OT-239910", "Ajuste de persiana", "Resuelta", "28 jul · 17:40", "Equipo interno"],
];

const REQUEST_TYPES = [
  ["maintenance", "Mantenimiento"], ["cleaning", "Limpieza"], ["security", "Seguridad"],
  ["inspection", "Inspección"], ["administration", "Administración"], ["other", "Otro"],
];
const REQUEST_PRIORITIES = [["low", "Baja"], ["medium", "Media"], ["high", "Alta"], ["urgent", "Urgente"]];

function TenantPortal() {
  const [section, setSection] = useState("home");
  const [requests, setRequests] = useState(initialRequests);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("spei");
  const [paymentDone, setPaymentDone] = useState(false);
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  useEscapeKey(() => setPaymentOpen(false), paymentOpen);
  useEscapeKey(() => setNewRequestOpen(false), newRequestOpen);
  const openPayment = () => { setPaymentDone(false); setPaymentOpen(true); };
  const submitRequest = (draft) => {
    const now = new Date();
    const folio = `OT-${String(Date.now()).slice(-6)}`;
    const time = `Hoy · ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setRequests((prev) => [[folio, draft.title, "Abierto", time, "Por asignar"], ...prev]);
    setNewRequestOpen(false);
  };
  const nav = [
    ["home", HiHomeModern, "Mi espacio", "Resumen"], ["payments", HiCreditCard, "Pagos", "Rentas y recibos"],
    ["requests", HiTicket, "Solicitudes", "Ayuda y mantenimiento"], ["documents", HiDocumentText, "Documentos", "Contrato y archivos"],
    ["access", HiKey, "Accesos", "Visitas y entregas"],
  ];

  return <div className="tenant-shell">
    <aside className="tenant-nav"><header><PropertiesLogo /></header><nav>{nav.map(([key, Icon, label, hint]) => <button key={key} className={section === key ? "active" : ""} onClick={() => setSection(key)}><Icon/><span><strong>{label}</strong><small>{hint}</small></span></button>)}</nav><footer><span>SH</span><div><strong>Sofía Herrera</strong><small>Inquilina</small></div><HiUserCircle/></footer></aside>
    <main className="tenant-main">
      <header><div><small>Martes, 18 de agosto</small><h1>Hola, Sofía.</h1><p>Todo lo relacionado con tu espacio, en un solo lugar.</p></div><button type="button"><HiBellAlert/><i>2</i></button></header>
      <section className="tenant-home-card"><div><span>Tu espacio</span><h2>Departamento 101</h2><p>Torre Jacarandas · Ciudad de México</p><div><small>Contrato vigente</small><strong>01 dic 2025 — 30 nov 2026</strong></div></div><span className="tenant-home-art"><HiHomeModern/></span><button type="button">Ver detalles <HiArrowRight/></button></section>
      <section className="tenant-pulse"><article><span><HiCheckCircle/></span><div><small>Renta de agosto</small><strong>Pagada</strong><em>05 ago · $18,500</em></div></article><article><span><HiCalendarDays/></span><div><small>Próximo pago</small><strong>05 septiembre</strong><em>$18,500 MXN</em></div></article><article><span><HiClock/></span><div><small>Contrato</small><strong>104 días restantes</strong><em>Vence 30 nov 2026</em></div></article></section>
      {section === "home" && <Home openPayment={openPayment} setSection={setSection}/>}
      {section === "payments" && <Payments openPayment={openPayment}/>}
      {section === "requests" && <Requests requests={requests} onNewRequest={() => setNewRequestOpen(true)}/>}
      {section === "documents" && <Documents/>}
      {section === "access" && <Access/>}
      <footer>OwnTerra protege tu información y sólo comparte lo necesario con las personas autorizadas.</footer>
    </main>
    {paymentOpen && <PaymentSheet method={paymentMethod} setMethod={setPaymentMethod} done={paymentDone} setDone={setPaymentDone} close={() => setPaymentOpen(false)}/>}
    {newRequestOpen && <NewRequestSheet onSubmit={submitRequest} close={() => setNewRequestOpen(false)}/>}
  </div>;
}

function Home({ openPayment, setSection }) { return <section className="tenant-grid"><article className="tenant-payment-card"><header><div><span>Pagos</span><h2>Tu cuenta está al corriente.</h2></div><HiBanknotes/></header><div><small>Próxima renta</small><strong>$18,500</strong><span>Vence el 05 de septiembre</span></div><button onClick={openPayment}>Pagar próxima renta <HiArrowRight/></button></article><article className="tenant-request-card"><header><div><span>Solicitud activa</span><h2>Fuga debajo del lavabo</h2></div><i>En progreso</i></header><div className="tenant-mini-trace"><span className="done"><HiCheckCircle/></span><i/><span className="done"><HiCheckCircle/></span><i/><span className="current"><HiWrenchScrewdriver/></span><i/><span><HiCheckCircle/></span></div><p>Plomería Díaz está en sitio. Última actualización: hoy a las 14:26.</p><button onClick={() => setSection("requests")}><HiChatBubbleLeftRight/> Ver seguimiento y chat</button></article><article className="tenant-shortcuts"><header><span>Acciones rápidas</span><h2>¿Qué necesitas?</h2></header><div><button onClick={() => setSection("requests")}><HiPlus/><span><strong>Nueva solicitud</strong><small>Mantenimiento o ayuda</small></span></button><button onClick={() => setSection("documents")}><HiDocumentText/><span><strong>Mi contrato</strong><small>Consulta y descarga</small></span></button><button onClick={() => setSection("access")}><HiQrCode/><span><strong>Autorizar visita</strong><small>Genera un pase</small></span></button></div></article></section>; }
function Payments({ openPayment }) { return <section className="tenant-section"><header><div><span>Pagos y recibos</span><h2>Historial de rentas</h2><p>Consulta cargos, pagos aplicados y comprobantes.</p></div><button onClick={openPayment}><HiCreditCard/> Realizar pago</button></header><div className="tenant-balance"><span><small>Saldo actual</small><strong>$0</strong><em>Cuenta al corriente</em></span><span><small>Próximo cargo</small><strong>$18,500</strong><em>05 sep 2026</em></span><span><small>Depósito</small><strong>$18,500</strong><em>En garantía</em></span></div><div className="tenant-table"><div className="head"><span>Periodo</span><span>Fecha</span><span>Método</span><span>Importe</span><span>Estado</span><span/></div>{payments.map(([month,date,method,amount,status]) => <button key={month}><span><strong>{month}</strong></span><span>{date}</span><span>{method}</span><span><strong>{amount}</strong></span><span><i>{status}</i></span><HiArrowDownTray/></button>)}</div></section>; }
function Requests({ requests, onNewRequest }) { return <section className="tenant-section"><header><div><span>Ayuda y mantenimiento</span><h2>Mis solicitudes</h2><p>Reporta lo que sucede y sigue cada actualización.</p></div><button onClick={onNewRequest}><HiPlus/> Nueva solicitud</button></header><div className="tenant-requests">{requests.map(([folio,title,status,updated,person]) => <button key={folio}><span className={status === "Resuelta" ? "done" : "active"}>{status === "Resuelta" ? <HiCheckCircle/> : <HiWrenchScrewdriver/>}</span><span><small>{folio}</small><strong>{title}</strong><em>{person}</em></span><span><i>{status}</i><small>{updated}</small></span><HiArrowRight/></button>)}</div></section>; }
function Documents() { return <section className="tenant-section"><header><div><span>Documentos</span><h2>Tu expediente</h2><p>Archivos compartidos para esta relación de renta.</p></div></header><div className="tenant-documents">{[["Contrato de arrendamiento","PDF · Firmado el 28 nov 2025","Vigente"],["Reglamento del inmueble","PDF · Actualizado 03 ene 2026","Referencia"],["Inventario de entrega","PDF · 24 fotografías","Firmado"],["Comprobante de depósito","PDF · $18,500 MXN","Recibido"]].map(([name,meta,state]) => <button key={name}><HiDocumentText/><span><strong>{name}</strong><small>{meta}</small></span><i>{state}</i><HiArrowDownTray/></button>)}</div></section>; }
function Access() { return <section className="tenant-section"><header><div><span>Accesos temporales</span><h2>Visitas y entregas</h2><p>Comparte instrucciones con caseta sin exponer información adicional.</p></div><button><HiPlus/> Nuevo pase</button></header><div className="tenant-access-card"><span><HiQrCode/></span><div><small>Pase activo · AC-1849</small><h3>Visita de Mariana Robles</h3><p>Hoy · 17:30–18:15 · 2 personas</p><em>Torre Jacarandas · Departamento 101</em></div><i>Vigente</i><button>Compartir</button></div></section>; }

function PaymentSheet({ method, setMethod, done, setDone, close }) { return <div className="tenant-payment-backdrop" onClick={close}><section className="tenant-payment-sheet" role="dialog" aria-modal="true" aria-labelledby="tenant-pay-title" onClick={event => event.stopPropagation()}><header><div><span>Pago seguro · Properties</span><h2 id="tenant-pay-title">{done ? "Pago recibido." : "Pagar renta de septiembre"}</h2><p>{done ? "Tu comprobante quedó guardado en Pagos y documentos." : "Departamento 101 · Torre Jacarandas"}</p></div><button onClick={close} aria-label="Cerrar"><HiXMark/></button></header>{done ? <div className="tenant-payment-success"><HiCheckCircle/><strong>$18,500 MXN</strong><span>Referencia OT-PAY-260905-1842</span><button onClick={close}>Listo</button></div> : <><div className="tenant-payment-summary"><span><small>Concepto</small><strong>Renta · septiembre 2026</strong></span><span><small>Total</small><strong>$18,500 MXN</strong></span></div><div className="tenant-payment-methods"><small>Selecciona cómo pagar</small>{[["spei","Transferencia SPEI","CLABE única y conciliación automática"],["card","Tarjeta débito o crédito","Visa, Mastercard o American Express"],["bank","Cuenta bancaria","Cargo desde tu cuenta registrada"]].map(([key,label,hint]) => <button key={key} className={method === key ? "active" : ""} onClick={() => setMethod(key)}><i>{method === key ? "✓" : ""}</i><span><strong>{label}</strong><small>{hint}</small></span></button>)}</div><aside>En esta fase mostramos el flujo completo; la conexión con la pasarela se habilitará posteriormente.</aside><footer><button onClick={close}>Cancelar</button><button onClick={() => setDone(true)}>Continuar y pagar</button></footer></>}</section></div>; }

function NewRequestSheet({ onSubmit, close }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("maintenance");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const canSubmit = title.trim() && description.trim();
  return <div className="tenant-payment-backdrop" onClick={close}><section className="tenant-payment-sheet tenant-request-sheet" role="dialog" aria-modal="true" aria-labelledby="tenant-request-title" onClick={event => event.stopPropagation()}>
    <header><div><span>Nueva solicitud · Properties</span><h2 id="tenant-request-title">Cuéntanos qué pasó</h2><p>Departamento 101 · Torre Jacarandas</p></div><button onClick={close} aria-label="Cerrar"><HiXMark/></button></header>
    <div className="tenant-request-form">
      <label><small>Título</small><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Fuga debajo del lavabo"/></label>
      <label><small>Tipo</small><div className="tenant-chip-row">{REQUEST_TYPES.map(([key,label]) => <button key={key} type="button" className={type === key ? "active" : ""} onClick={() => setType(key)}>{label}</button>)}</div></label>
      <label><small>Prioridad</small><div className="tenant-chip-row">{REQUEST_PRIORITIES.map(([key,label]) => <button key={key} type="button" className={priority === key ? "active" : ""} onClick={() => setPriority(key)}>{label}</button>)}</div></label>
      <label><small>Descripción</small><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Describe qué pasó, desde cuándo y en qué área."/></label>
    </div>
    <footer><button onClick={close}>Cancelar</button><button disabled={!canSubmit} onClick={() => onSubmit({ title: title.trim(), type, priority, description: description.trim() })}>Enviar solicitud</button></footer>
  </section></div>;
}

export default TenantPortal;
