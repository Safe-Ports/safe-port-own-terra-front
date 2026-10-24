import WorkflowForm from "@/components/forms/WorkflowForm";
import { useMemo, useState } from "react";
import { HiBolt, HiCheckCircle, HiClock, HiDocumentArrowUp, HiExclamationTriangle, HiFire, HiGlobeAlt, HiPlus, HiTicket, HiWrenchScrewdriver } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import { UTILITY_PAYER_LABEL, UTILITY_STATUS_LABEL, UTILITY_TYPE_LABEL } from "./condoOperationsModel";
import "./utility-monitoring.css";

const SERVICE_ICON={water:HiGlobeAlt,electricity:HiBolt,gas:HiFire,internet:HiGlobeAlt,other:HiWrenchScrewdriver};
const cycleLabel={monthly:"Mensual",bimonthly:"Bimestral",quarterly:"Trimestral",on_demand:"Bajo demanda"};
const initialService={type:"water",name:"",unitId:"",provider:"",accountReference:"",payerRole:"tenant",billingCycle:"monthly",periodStart:"",periodEnd:"",dueDate:"",amount:"",note:""};
const today="2026-08-26";
const money=value=>`$${Number(value||0).toLocaleString("es-MX")}`;
const period=item=>item?.periodStart?(item.periodEnd&&item.periodEnd!==item.periodStart?`${item.periodStart} al ${item.periodEnd}`:item.periodStart):"Sin periodo";

function UtilityMonitoringPanel({community,units}){
  const navigate=useNavigate();
  const {showToast}=useAppContext();
  const data=usePropertiesData();
  const services=data.utilityServices.filter(item=>item.communityId===community?.id);
  const [scope,setScope]=useState("all");
  const [selectedId,setSelectedId]=useState(services[0]?.id||"");
  const [mode,setMode]=useState("bill");
  const [serviceDraft,setServiceDraft]=useState(initialService);
  const [billDraft,setBillDraft]=useState({periodStart:"",periodEnd:"",amount:"",dueDate:"",recordedBy:"Administración",evidenceName:"",note:""});
  const [paymentDraft,setPaymentDraft]=useState({reportedAmount:"",paidAt:today,evidenceName:""});
  const selected=services.find(item=>item.id===selectedId)||services[0];
  const bills=data.utilityBills.filter(item=>item.serviceId===selected?.id).sort((a,b)=>b.periodEnd.localeCompare(a.periodEnd));
  const visible=scope==="all"?services:scope==="common"?services.filter(item=>!item.unitId):services.filter(item=>item.unitId);
  const unitById=useMemo(()=>Object.fromEntries(units.map(item=>[item.id,item])),[units]);
  const summary={due:services.filter(item=>["due_soon","overdue"].includes(item.status)).length,evidence:services.filter(item=>item.status==="pending_evidence").length,disputed:services.filter(item=>item.status==="disputed").length,verified:services.filter(item=>item.status==="verified").length};
  const previousBill=bills[1];
  const variation=bills[0]&&previousBill?.amount?Math.round((Number(bills[0].amount||0)-previousBill.amount)/previousBill.amount*100):null;

  const submitService=event=>{event.preventDefault();try{data.addUtilityService({...serviceDraft,communityId:community.id});setServiceDraft(initialService);setMode("bill");showToast("Servicio agregado a la bitácora de esta sesión","success");}catch(error){showToast(error.message,"warning")}};
  const submitBill=event=>{event.preventDefault();try{const result=data.addUtilityBill(selected.id,billDraft);setBillDraft({periodStart:"",periodEnd:"",amount:"",dueDate:"",recordedBy:"Administración",evidenceName:"",note:""});showToast(result.isCurrent?"Recibo registrado; falta el comprobante de pago":"Recibo de un periodo anterior guardado en el historial","success");}catch(error){showToast(error.message,"warning")}};
  const reportPayment=event=>{event.preventDefault();try{data.reportUtilityPayment(selected.id,paymentDraft);setPaymentDraft({reportedAmount:"",paidAt:today,evidenceName:""});showToast("Comprobante registrado como reporte; aún requiere verificación","success");}catch(error){showToast(error.message,"warning")}};
  const verifyPayment=()=>{try{data.verifyUtilityPayment(selected.id);showToast("Comprobante verificado","success");}catch(error){showToast(error.message,"warning")}};
  const createIncident=()=>{const ticket=data.addTicket({title:`Revisar ${selected.name}`,description:`Revisión solicitada desde gastos de servicios. ${UTILITY_TYPE_LABEL[selected.type]} · ${selected.provider||"sin proveedor"}. Importe del periodo ${period(selected)}: ${money(selected.amount)}.`,propertyId:community.propertyId,unitId:selected.unitId,type:"maintenance",priority:selected.status==="overdue"?"high":"medium",assignee:""});showToast(`Ticket ${ticket.folio} creado desde la bitácora`,"success");navigate(`/properties/tickets?unitId=${selected.unitId||""}`)};

  return <section className="utility-module">
    <header><div><span>Registro sin cobro</span><h2>Gastos de servicios</h2><p>Recibos, importes y comprobantes de agua, luz, gas y otros servicios. Own Terra no procesa estos pagos.</p></div><button type="button" onClick={()=>setMode("service")}><HiPlus/> Agregar servicio</button></header>
    <div className="utility-summary"><article><HiClock/><span>Por vencer o vencidos</span><strong>{summary.due}</strong></article><article><HiDocumentArrowUp/><span>Evidencia pendiente</span><strong>{summary.evidence}</strong></article><article className="warning"><HiExclamationTriangle/><span>En disputa</span><strong>{summary.disputed}</strong></article><article><HiCheckCircle/><span>Verificados</span><strong>{summary.verified}</strong></article></div>
    <div className={`utility-workspace${services.length?"":" is-empty"}`}>
      <aside className="utility-list"><header><div><button type="button" className={scope==="all"?"active":""} onClick={()=>setScope("all")}>Todos</button><button type="button" className={scope==="common"?"active":""} onClick={()=>setScope("common")}>Comunes</button><button type="button" className={scope==="unit"?"active":""} onClick={()=>setScope("unit")}>Por unidad</button></div><span>{visible.length} servicios</span></header>{visible.map(item=>{const Icon=SERVICE_ICON[item.type];return <button type="button" className={selected?.id===item.id?"active":""} key={item.id} onClick={()=>{setSelectedId(item.id);setMode("bill")}}><span className={`utility-icon ${item.type}`}><Icon/></span><span><small>{unitById[item.unitId]?.identifier||"Servicio común"}</small><strong>{item.name}</strong><em>{item.provider||"Sin proveedor"}</em></span><i className={item.status}>{UTILITY_STATUS_LABEL[item.status]}</i></button>})}{!visible.length?<p className="utility-list-empty">{services.length?"No hay servicios en este alcance.":"Aún no registras servicios en esta comunidad."}</p>:null}</aside>
      {mode==="service"
        ?<WorkflowForm className="utility-detail utility-form" onSubmit={submitService}>
          <header><div><small>Nuevo registro</small><h3>Agregar servicio a la comunidad</h3></div><button type="button" onClick={()=>setMode("bill")}>Cancelar</button></header>
          <div>
            <label>Servicio<select value={serviceDraft.type} onChange={e=>setServiceDraft({...serviceDraft,type:e.target.value})}>{Object.entries(UTILITY_TYPE_LABEL).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
            <label>Alcance<select value={serviceDraft.unitId} onChange={e=>setServiceDraft({...serviceDraft,unitId:e.target.value})}><option value="">Área común</option>{units.map(item=><option value={item.id} key={item.id}>{item.identifier}</option>)}</select></label>
            <label className="wide">Nombre operativo<input required value={serviceDraft.name} onChange={e=>setServiceDraft({...serviceDraft,name:e.target.value})} placeholder="Ej. Luz de pasillos"/></label>
            <label>Proveedor<input value={serviceDraft.provider} onChange={e=>setServiceDraft({...serviceDraft,provider:e.target.value})} placeholder="CFE, SACMEX…"/></label>
            <label>Responsable de pago<select value={serviceDraft.payerRole} onChange={e=>setServiceDraft({...serviceDraft,payerRole:e.target.value})}>{Object.entries(UTILITY_PAYER_LABEL).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
            <label>Referencia o contrato<input value={serviceDraft.accountReference} onChange={e=>setServiceDraft({...serviceDraft,accountReference:e.target.value})}/></label>
            <label>Periodicidad<select value={serviceDraft.billingCycle} onChange={e=>setServiceDraft({...serviceDraft,billingCycle:e.target.value})}>{Object.entries(cycleLabel).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
            <label>Periodo del recibo actual<input type="date" value={serviceDraft.periodStart} onChange={e=>setServiceDraft({...serviceDraft,periodStart:e.target.value})}/></label>
            <label>Hasta<input type="date" value={serviceDraft.periodEnd} onChange={e=>setServiceDraft({...serviceDraft,periodEnd:e.target.value})}/></label>
            <label>Fecha límite<input type="date" value={serviceDraft.dueDate} onChange={e=>setServiceDraft({...serviceDraft,dueDate:e.target.value})}/></label>
            <label>Importe del recibo<input type="number" min="0" step="0.01" value={serviceDraft.amount} onChange={e=>setServiceDraft({...serviceDraft,amount:e.target.value})}/></label>
            <label className="wide">Nota<input value={serviceDraft.note} onChange={e=>setServiceDraft({...serviceDraft,note:e.target.value})}/></label>
          </div>
          <footer><span>El responsable puede cambiar según contrato; no se asumirá automáticamente.</span><button type="submit">Guardar servicio</button></footer>
        </WorkflowForm>
        :selected
        ?<section className="utility-detail">
          <header><div><small>{UTILITY_TYPE_LABEL[selected.type]} · {unitById[selected.unitId]?.identifier||"Servicio común"}</small><h3>{selected.name}</h3><p>{selected.provider||"Sin proveedor"} · {selected.accountReference||"Sin referencia"}</p></div><i className={selected.status}>{UTILITY_STATUS_LABEL[selected.status]}</i></header>
          <div className="utility-detail-grid">
            <article><small>Responsable</small><strong>{UTILITY_PAYER_LABEL[selected.payerRole]}</strong><span>{cycleLabel[selected.billingCycle]||selected.billingCycle}</span></article>
            <article><small>Importe del periodo</small><strong>{money(selected.amount)}</strong><span>{period(selected)}</span></article>
            <article><small>Fecha límite</small><strong>{selected.dueDate||"Sin definir"}</strong><span>{selected.reportedAmount?`Reportado ${money(selected.reportedAmount)}`:"Sin pago reportado"}</span></article>
            <article><small>Contra periodo anterior</small><strong>{variation===null?"Sin comparación":`${variation>0?"+":""}${variation}%`}</strong><span>{previousBill?`Anterior ${money(previousBill.amount)}`:"Falta un recibo previo"}</span></article>
          </div>
          <nav><button type="button" className={mode==="bill"?"active":""} onClick={()=>setMode("bill")}>Registrar recibo</button><button type="button" className={mode==="payment"?"active":""} onClick={()=>setMode("payment")}>Comprobante de pago</button><button type="button" className={mode==="history"?"active":""} onClick={()=>setMode("history")}>Historial</button><button type="button" onClick={createIncident}><HiTicket/> Crear incidencia</button></nav>
          {mode==="bill"
            ?<WorkflowForm className="utility-action-form" onSubmit={submitBill}>
              <label>Periodo desde<input required type="date" value={billDraft.periodStart} onChange={e=>setBillDraft({...billDraft,periodStart:e.target.value})}/></label>
              <label>Hasta<input required type="date" value={billDraft.periodEnd} onChange={e=>setBillDraft({...billDraft,periodEnd:e.target.value})}/></label>
              <label>Importe<input required type="number" min="0" step="0.01" value={billDraft.amount} onChange={e=>setBillDraft({...billDraft,amount:e.target.value})}/><span>MXN</span></label>
              <label>Fecha límite<input type="date" value={billDraft.dueDate} onChange={e=>setBillDraft({...billDraft,dueDate:e.target.value})}/></label>
              <label>Registró<input value={billDraft.recordedBy} onChange={e=>setBillDraft({...billDraft,recordedBy:e.target.value})}/></label>
              <label>Recibo del proveedor<input value={billDraft.evidenceName} onChange={e=>setBillDraft({...billDraft,evidenceName:e.target.value})} placeholder="Nombre del archivo"/></label>
              <label className="wide">Nota<textarea rows="2" value={billDraft.note} onChange={e=>setBillDraft({...billDraft,note:e.target.value})}/></label>
              <button type="submit">Guardar recibo</button>
            </WorkflowForm>
            :mode==="payment"
            ?<WorkflowForm className="utility-payment-form" onSubmit={reportPayment}>
              <HiDocumentArrowUp/>
              <div>
                <strong>Registrar comprobante reportado</strong>
                <p>Esto no realiza ni confirma el pago. La administración puede verificar posteriormente el comprobante.</p>
                <input required value={paymentDraft.evidenceName} onChange={e=>setPaymentDraft({...paymentDraft,evidenceName:e.target.value})} placeholder="Ej. comprobante-cfe-agosto.pdf"/>
                <input type="number" min="0" step="0.01" value={paymentDraft.reportedAmount} onChange={e=>setPaymentDraft({...paymentDraft,reportedAmount:e.target.value})} placeholder={`Importe pagado (${money(selected.amount)})`}/>
                <input type="date" value={paymentDraft.paidAt} onChange={e=>setPaymentDraft({...paymentDraft,paidAt:e.target.value})}/>
              </div>
              <button type="submit">Marcar como reportado</button>
              {selected.status==="reported_paid"?<button type="button" onClick={verifyPayment}>Verificar evidencia</button>:null}
            </WorkflowForm>
            :<div className="utility-history">{bills.map(item=><article key={item.id}><span>{money(item.amount)}</span><div><strong>{period(item)} · {UTILITY_STATUS_LABEL[item.status]}</strong><small>{item.note||"Sin nota"}</small><em>{item.evidenceName||"Sin evidencia adjunta"}</em></div></article>)}{!bills.length?<p>No hay recibos registrados todavía.</p>:null}</div>}
        </section>
        :<section className="utility-detail utility-empty"><HiWrenchScrewdriver/><h3>Agrega el primer servicio</h3><p>Registra agua, luz, gas u otro servicio para llevar sus recibos, importes y comprobantes.</p><button type="button" onClick={()=>setMode("service")}><HiPlus/> Agregar servicio</button></section>}
    </div>
  </section>;
}

export default UtilityMonitoringPanel;
