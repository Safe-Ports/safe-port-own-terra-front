import { useMemo, useState } from "react";
import { HiArrowLeft, HiArrowRight, HiBellAlert, HiCalendarDays, HiCheckCircle, HiClock, HiExclamationTriangle } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import "./rent-operations.css";

const leases=[
  {id:"lease-01",tenant:"Sofía Herrera",unit:"Departamento 101",property:"Torre Jacarandas",rent:18500,due:"05 ago",payment:"paid",contractEnd:"30 nov 2026",days:104,channel:"Transferencia"},
  {id:"lease-02",tenant:"Carlos y Mariana Vega",unit:"Departamento 201",property:"Torre Jacarandas",rent:19000,due:"05 ago",payment:"overdue",lateDays:13,contractEnd:"31 ago 2026",days:13,channel:"SPEI"},
  {id:"lease-03",tenant:"Alejandro Campos",unit:"Penthouse 501",property:"Torre Jacarandas",rent:34000,due:"10 ago",payment:"pending",contractEnd:"15 sep 2026",days:28,channel:"Transferencia"},
  {id:"lease-04",tenant:"Familia Robles",unit:"Casa principal",property:"Casa Olivo",rent:39000,due:"01 ago",payment:"paid",contractEnd:"31 dic 2026",days:135,channel:"Domiciliación"},
  {id:"lease-05",tenant:"Café Bruma",unit:"Local 1 · Café",property:"Plaza Norte",rent:16800,due:"05 ago",payment:"partial",paid:10000,contractEnd:"30 sep 2026",days:43,channel:"SPEI"},
  {id:"lease-06",tenant:"Farmacias Sana",unit:"Local 3 · Farmacia",property:"Plaza Norte",rent:24500,due:"01 ago",payment:"paid",contractEnd:"31 ene 2027",days:166,channel:"Transferencia"},
  {id:"lease-07",tenant:"Estudio Norte",unit:"Bodega B-02",property:"Plaza Norte",rent:3800,due:"05 ago",payment:"overdue",lateDays:13,contractEnd:"20 ago 2026",days:2,channel:"Efectivo"},
  {id:"lease-08",tenant:"Renata Solís",unit:"Cabaña Brisa",property:"Refugio Bosque Alto",rent:12500,due:"15 ago",payment:"pending",contractEnd:"15 oct 2026",days:58,channel:"Transferencia"},
  {id:"lease-09",tenant:"Daniel Ibarra",unit:"Cabaña Pino",property:"Refugio Bosque Alto",rent:21000,due:"15 ago",payment:"paid",contractEnd:"30 ago 2026",days:12,channel:"SPEI"},
  {id:"lease-10",tenant:"Estudio Salvia",unit:"Oficina 3A",property:"Oficinas Centro 27",rent:9800,due:"05 ago",payment:"pending",contractEnd:"30 sep 2026",days:43,channel:"Transferencia"},
  {id:"lease-11",tenant:"Métrica Arquitectos",unit:"Oficina 3B",property:"Oficinas Centro 27",rent:12600,due:"05 ago",payment:"paid",contractEnd:"31 jul 2026",days:-18,channel:"Domiciliación"},
  {id:"lease-12",tenant:"Laura Esquivel",unit:"A-102",property:"Residencial La Arboleda",rent:21800,due:"03 ago",payment:"paid",contractEnd:"31 mar 2027",days:225,channel:"SPEI"},
];

const paymentLabel={paid:"Pagada",pending:"Por cobrar",overdue:"Vencida",partial:"Pago parcial"};
const money=value=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(value);

function RentOperationsPage(){
  const navigate=useNavigate();
  const [view,setView]=useState("collection");
  const [filter,setFilter]=useState("all");
  const expected=leases.reduce((sum,item)=>sum+item.rent,0);
  const collected=leases.reduce((sum,item)=>sum+(item.payment==="paid"?item.rent:item.paid||0),0);
  const overdue=leases.reduce((sum,item)=>sum+(item.payment==="overdue"?item.rent:0),0);
  const alerts=useMemo(()=>leases.filter(item=>item.days<=60).sort((a,b)=>a.days-b.days),[]);
  const visible=filter==="all"?leases:leases.filter(item=>item.payment===filter);
  return <EcoLayout active="properties" title="OwnTerra Properties" subtitle="Operación · Rentas"><main className="rent-page">
    <header className="rent-heading"><button type="button" onClick={()=>navigate("/properties")}><HiArrowLeft/> Properties</button><div><span>Cobranza y vigencias</span><h1>Rentas bajo control. <em className="rent-soon">Próximamente</em></h1><p>Vista previa de diseño con datos de ejemplo. Aún no está conectada a información real.</p></div><button type="button" onClick={()=>setView("expirations")}><HiBellAlert/> {alerts.length} alertas</button></header>
    <nav className="rent-view-tabs" aria-label="Vista de rentas"><button type="button" className={view==="collection"?"active":""} onClick={()=>setView("collection")}>Cobranza del mes</button><button type="button" className={view==="expirations"?"active":""} onClick={()=>setView("expirations")}>Vencimientos</button></nav>
    {view==="collection"?<>
      <section className="rent-kpis"><article><small>Renta esperada</small><strong>{money(expected)}</strong><span>12 contratos activos</span></article><article className="positive"><small>Recolectado</small><strong>{money(collected)}</strong><span>{Math.round(collected/expected*100)}% del mes</span></article><article className="warning"><small>Por cobrar</small><strong>{money(expected-collected)}</strong><span>5 movimientos abiertos</span></article><article className="danger"><small>Vencido</small><strong>{money(overdue)}</strong><span>2 rentas requieren atención</span></article></section>
      <section className="rent-collection"><header><div><span>Agosto 2026</span><h2>Estado de cobranza</h2></div><div>{["all","pending","overdue","partial","paid"].map(status=><button type="button" className={filter===status?"active":""} key={status} onClick={()=>setFilter(status)}>{status==="all"?"Todas":paymentLabel[status]}</button>)}</div></header><div className="rent-table"><div className="rent-row head"><span>Inquilino</span><span>Espacio</span><span>Vencimiento</span><span>Importe</span><span>Estado</span><span/></div>{visible.map(item=><div className="rent-row" key={item.id}><span><strong>{item.tenant}</strong><small>{item.channel}</small></span><span><strong>{item.unit}</strong><small>{item.property}</small></span><span><strong>{item.due}</strong><small>{item.lateDays?`${item.lateDays} días de atraso`:"Agosto 2026"}</small></span><span><strong>{money(item.rent)}</strong>{item.payment==="partial"&&<small>{money(item.paid)} recibidos</small>}</span><span><i className={item.payment}>{paymentLabel[item.payment]}</i></span></div>)}</div></section>
    </>:<>
      <section className="expiry-summary"><article className="expired"><HiExclamationTriangle/><div><small>Vencidos</small><strong>{alerts.filter(item=>item.days<0).length}</strong></div></article><article className="urgent"><HiClock/><div><small>Próximos 15 días</small><strong>{alerts.filter(item=>item.days>=0&&item.days<=15).length}</strong></div></article><article><HiCalendarDays/><div><small>Próximos 60 días</small><strong>{alerts.filter(item=>item.days>15).length}</strong></div></article><p>Las alertas también alimentarán <strong>Mi Día</strong> y podrán avisar al equipo responsable sin crear otra agenda.</p></section>
      <section className="expiry-timeline"><header><span>Renovaciones</span><h2>Contratos que requieren una decisión</h2></header>{alerts.map(item=><article key={item.id}><div className={`expiry-marker ${item.days<0?"expired":item.days<=15?"urgent":"soon"}`}><span/></div><div><small>{item.days<0?"Venció":item.days===0?"Vence hoy":`En ${item.days} días`}</small><h3>{item.tenant}</h3><p>{item.property} · {item.unit}</p></div><div><small>Fin de contrato</small><strong>{item.contractEnd}</strong><span>{money(item.rent)} mensuales</span></div><div className="expiry-action"><span>{item.days<0?"Sin renovación":item.days<=15?"Contactar esta semana":"Preparar propuesta"}</span><button type="button" disabled title="Todavía no está conectado — vista previa del diseño">Abrir relación <HiArrowRight/></button></div></article>)}</section>
      <section className="expiry-rule"><HiCheckCircle/><div><strong>Regla operacional propuesta</strong><p>Primer aviso a 60 días, decisión a 30, confirmación a 15 y escalamiento al vencer. Cada alerta conserva inmueble, unidad, contrato e inquilino.</p></div></section>
    </>}
  </main></EcoLayout>;
}
export default RentOperationsPage;
