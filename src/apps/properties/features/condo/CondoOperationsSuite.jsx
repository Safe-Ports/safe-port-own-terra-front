import WorkflowForm from "@/components/forms/WorkflowForm";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HiAdjustmentsHorizontal, HiBanknotes, HiBolt, HiBuildingStorefront, HiCheckCircle, HiDocumentArrowUp, HiDocumentText, HiHomeModern, HiInboxStack, HiMagnifyingGlass, HiPlus, HiScale, HiSquares2X2 } from "react-icons/hi2";
import { useNavigate, useSearchParams } from "react-router-dom";
import Modal from "@/components/ui/Modal";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import { useAppContext } from "@/context/AppContext";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import { PROPERTIES_MVP_SCOPE } from "../../mvpScope";
import UtilityMonitoringPanel from "./UtilityMonitoringPanel";
import QuotaPlansPanel from "./QuotaPlansPanel";
import CommunityReportsPanel from "./CommunityReportsPanel";
import { ReviewDialog, paymentReportsKey } from "../collections/PaymentReviewPanel";
import CollectionPolicyPanel from "../collections/CollectionPolicyPanel";
import { COLLECTIONS_API_READY, onPreviewChange, staffPayments } from "../collections/collectionsApi";
import { reportForCharge } from "../collections/collectionsModel";
import { UTILITY_TYPE_LABEL } from "./condoOperationsModel";
import StaffFeed from "../community-feed/StaffFeed";
import "./condo-operations.css";

// Las seis pestañas viven ahora en el menú lateral (Operaciones); esta lista
// solo valida el `?module=` de la URL para no caer en una pestaña inexistente.
const moduleKeys=["charges","utilities","communications","amenities","committee","reports"];
const money=value=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(value||0);

function CondoOperationsSuite(){
  const navigate=useNavigate();const [params,setParams]=useSearchParams();const {showToast}=useAppContext();
  const data=usePropertiesData();
  // `?community=` llega desde las alertas de las tarjetas de Comunidades.
  const [communityId,setCommunityId]=useState(params.get("community")||data.communities[0]?.id||"");
  const requested=params.get("module");const [active,setActive]=useState(moduleKeys.includes(requested)?requested:"charges");
  const [draft,setDraft]=useState({});
  const [domainFilter,setDomainFilter]=useState("all");
  const [chargeFilter,setChargeFilter]=useState("all");
  const [chargeSearch,setChargeSearch]=useState("");
  const [newChargeOpen,setNewChargeOpen]=useState(false);
  const [configOpen,setConfigOpen]=useState(false);
  const [reviewing,setReviewing]=useState(null);
  const [reportingService,setReportingService]=useState(null);
  const [serviceReportDraft,setServiceReportDraft]=useState({evidenceName:"",reportedAmount:"",paidAt:""});
  const [rentPaymentFor,setRentPaymentFor]=useState(null);
  const [rentPaymentDraft,setRentPaymentDraft]=useState({amount:"",paidAt:"",method:"transfer"});
  const community=data.communities.find(item=>item.id===communityId);
  // Un cargo "por revisar" es el mismo registro que antes vivía en una bandeja
  // aparte (PaymentReviewPanel): acá se cruza con la tabla de cargos para que
  // "Revisar comprobante" y "Registrar pago" sean el mismo botón según lo que
  // trae cada fila, en vez de dos caminos distintos para lo mismo.
  const reportsKey=paymentReportsKey(COLLECTIONS_API_READY?communityId:null);
  const reportsQuery=useQuery({queryKey:reportsKey,queryFn:()=>staffPayments.list({communityId}),enabled:active==="charges"});
  const queryClient=useQueryClient();
  useEffect(()=>(COLLECTIONS_API_READY?undefined:onPreviewChange(()=>queryClient.invalidateQueries({queryKey:["payment-reports"]}))),[queryClient]);
  const reports=reportsQuery.data||[];
  useEffect(()=>{if(!communityId&&data.communities[0])setCommunityId(data.communities[0].id)},[communityId,data.communities]);
  // El menú lateral cambia de módulo sólo con la URL (`?module=`), sin volver a
  // montar la pantalla: hay que seguirla para no quedarse en el módulo anterior.
  useEffect(()=>{if(moduleKeys.includes(requested))setActive(requested)},[requested]);
  useEffect(()=>{const requestedCommunity=params.get("community");if(requestedCommunity)setCommunityId(requestedCommunity)},[params]);
  const units=data.units.filter(item=>item.propertyId===community?.propertyId&&item.status!=="archived");
  const charges=data.condoCharges.filter(item=>item.communityId===communityId);const announcements=data.announcements.filter(item=>item.communityId===communityId);const amenities=data.amenities.filter(item=>item.communityId===communityId);const reservations=data.reservations.filter(item=>item.communityId===communityId);const votes=data.votes.filter(item=>item.communityId===communityId);
  const totals=useMemo(()=>({billed:charges.reduce((sum,item)=>sum+item.amount,0),paid:charges.filter(item=>item.status==="paid").reduce((sum,item)=>sum+item.amount,0),overdue:charges.filter(item=>item.status==="overdue").reduce((sum,item)=>sum+item.amount,0)}),[charges]);
  // El badge del menú cuenta los vencidos de TODA la organización, pero esta
  // vista filtra por la comunidad activa: si están en otra, el menú marcaba 5
  // y la pantalla salía vacía. Aquí se dice dónde están y se salta allá.
  const overdueElsewhere=useMemo(()=>{
    const byCommunity=new Map();
    for(const item of data.condoCharges){
      if(item.status!=="overdue"||item.communityId===communityId) continue;
      byCommunity.set(item.communityId,(byCommunity.get(item.communityId)||0)+1);
    }
    return [...byCommunity].map(([id,count])=>({id,count,name:data.communities.find(c=>c.id===id)?.name||"Otra comunidad"}))
      .sort((a,b)=>b.count-a.count);
  },[data.condoCharges,data.communities,communityId]);
  const overdueHere=charges.filter(item=>item.status==="overdue").length;
  const today=new Date().toISOString().slice(0,10);

  // "Cobros" junta tres dominios que hoy viven en lugares distintos de la app:
  // cuotas (condoCharges, real), gastos de servicios y rentas (ambos sin
  // backend — ver mvpScope y el propio encabezado de UtilityMonitoringPanel,
  // "Own Terra no procesa estos pagos"). Cada fila se normaliza a un estado
  // común (overdue/pending/reported/paid) para poder filtrarlas juntas, pero
  // la ACCIÓN de cada una respeta el vocabulario y las mutaciones propias de
  // su dominio — aprobar un comprobante de cuota no es lo mismo que verificar
  // un recibo de servicio ni que registrar una renta.
  const cuotaRows=useMemo(()=>charges.map(charge=>{
    const report=reportForCharge(reports,charge.id);
    const reported=charge.status!=="paid"&&report?.status==="submitted";
    const viewProof=charge.status==="paid"&&report?.status==="approved"&&report.evidence?.url;
    return {
      domain:"cuota",domainLabel:"Cuota",icon:HiBanknotes,id:charge.id,concept:charge.concept,
      unitId:charge.unitId,unitLabel:charge.unitId?(units.find(u=>u.id===charge.unitId)?.identifier||"Unidad"):"Cargo general",
      status:reported?"reported":charge.status,amount:charge.amount,dueDate:charge.dueDate,
      action:reported?{label:"Revisar comprobante",onClick:()=>setReviewing(report)}
        :charge.status!=="paid"?{label:"Registrar pago",onClick:()=>data.markCondoChargePaid(charge.id)}
        :viewProof?{label:"Ver comprobante",href:report.evidence.url}
        :{label:"Cancelar registro",onClick:()=>data.reverseCondoChargePayment(charge.id)},
    };
  }),[charges,reports,units]);

  const serviceList=useMemo(()=>data.utilityServices.filter(item=>item.communityId===communityId),[data.utilityServices,communityId]);
  const servicioRows=useMemo(()=>serviceList.map(service=>{
    const normalized=service.status==="verified"?"paid":service.status==="reported_paid"?"reported":service.status==="overdue"?"overdue":"pending";
    return {
      domain:"servicio",domainLabel:"Servicio",icon:HiBolt,id:service.id,concept:`${UTILITY_TYPE_LABEL[service.type]||"Servicio"} · ${service.name}`,
      unitId:service.unitId,unitLabel:service.unitId?(units.find(u=>u.id===service.unitId)?.identifier||"Unidad"):"Área común",
      status:normalized,amount:service.amount,dueDate:service.dueDate,
      action:normalized==="reported"?{label:"Verificar comprobante",onClick:()=>{try{data.verifyUtilityPayment(service.id);showToast("Comprobante verificado","success");}catch(error){showToast(error.message,"warning")}}}
        :normalized==="paid"?null
        :{label:"Reportar comprobante",onClick:()=>{setReportingService(service);setServiceReportDraft({evidenceName:"",reportedAmount:"",paidAt:today});}},
    };
  }),[serviceList,units,today]);

  const communityUnitIds=useMemo(()=>new Set(units.map(item=>item.id)),[units]);
  const currentPeriod=today.slice(0,7);
  const rentaRows=useMemo(()=>{
    if(!PROPERTIES_MVP_SCOPE.rentals)return [];
    return data.rentalLeases.filter(lease=>lease.status==="active"&&communityUnitIds.has(lease.unitId)).map(lease=>{
      const payment=data.rentalPayments.find(item=>item.leaseId===lease.id&&item.period===currentPeriod);
      const tenant=data.rentalTenants.find(item=>item.id===lease.tenantId);
      const unit=units.find(item=>item.id===lease.unitId);
      const dueDateThisMonth=`${currentPeriod}-${String(lease.dueDay).padStart(2,"0")}`;
      const status=payment?"paid":dueDateThisMonth<today?"overdue":"pending";
      return {
        domain:"renta",domainLabel:"Renta",icon:HiHomeModern,id:lease.id,concept:`Renta · ${tenant?.name||"Inquilino"}`,
        unitId:lease.unitId,unitLabel:unit?.identifier||"Unidad",
        status,amount:payment?.amount||lease.rent,dueDate:payment?payment.paidAt:dueDateThisMonth,
        action:status==="paid"?null:{label:"Registrar pago",onClick:()=>{setRentPaymentFor(lease);setRentPaymentDraft({amount:String(lease.rent),paidAt:today,method:"transfer"});}},
      };
    });
  },[data.rentalLeases,data.rentalPayments,data.rentalTenants,communityUnitIds,units,currentPeriod,today]);

  const allRows=useMemo(()=>[...cuotaRows,...servicioRows,...rentaRows],[cuotaRows,servicioRows,rentaRows]);
  const domainCounts={all:allRows.length,cuota:cuotaRows.length,servicio:servicioRows.length,renta:rentaRows.length};
  const domainRows=domainFilter==="all"?allRows:allRows.filter(row=>row.domain===domainFilter);
  const reviewCount=allRows.filter(row=>row.status==="reported").length;
  const statusCounts={
    all:domainRows.length,
    reported:domainRows.filter(row=>row.status==="reported").length,
    overdue:domainRows.filter(row=>row.status==="overdue").length,
    pending:domainRows.filter(row=>row.status==="pending").length,
    paid:domainRows.filter(row=>row.status==="paid").length,
  };
  const matchesSearch=row=>{
    if(!chargeSearch.trim())return true;
    const q=chargeSearch.trim().toLowerCase();
    return row.concept.toLowerCase().includes(q)||row.unitLabel.toLowerCase().includes(q);
  };
  const visibleRows=domainRows.filter(row=>(chargeFilter==="all"||row.status===chargeFilter)&&matchesSearch(row));
  const hasPreviewRows=servicioRows.length>0||rentaRows.length>0;
  const communityPlans=data.quotaPlans.filter(plan=>plan.communityId===communityId);

  const select=key=>{setActive(key);setDraft({});setParams({module:key},{replace:true})};
  const submit=async event=>{event.preventDefault();try{
    if(active==="charges"){await data.addCondoCharge({...draft,communityId});setNewChargeOpen(false);}
    if(active==="amenities")await data.addReservation({...draft,communityId});
    if(active==="committee")await data.addVote({...draft,communityId});
    setDraft({});showToast("Registro guardado","success");
  }catch(error){showToast(error.response?.data?.error?.message||error.message,"warning")}};

  const submitServiceReport=event=>{event.preventDefault();try{
    data.reportUtilityPayment(reportingService.id,serviceReportDraft);
    setReportingService(null);showToast("Comprobante registrado como reporte; aún requiere verificación","success");
  }catch(error){showToast(error.message,"warning")}};

  const submitRentPayment=event=>{event.preventDefault();try{
    data.addRentalPayment({leaseId:rentPaymentFor.id,period:currentPeriod,amount:rentPaymentDraft.amount,dueDate:`${currentPeriod}-${String(rentPaymentFor.dueDay).padStart(2,"0")}`,paidAt:rentPaymentDraft.paidAt,method:rentPaymentDraft.method,status:"paid"});
    setRentPaymentFor(null);showToast("Pago de renta registrado","success");
  }catch(error){showToast(error.message,"warning")}};
  return <EcoLayout active="properties" title="Operación diaria" subtitle={`${community?.name||"Comunidad"} · Segundo nivel`}><main className="condo-suite">
    <header className="condo-suite-heading"><div><h1>Operación diaria</h1></div><label><small>Comunidad activa</small><select value={communityId} onChange={event=>setCommunityId(event.target.value)}>{data.communities.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label></header>
    <div className="condo-suite-content">
    {active==="utilities"&&<UtilityMonitoringPanel community={community} units={units}/>}
    {/* Primero lo que espera una decisión (comprobantes), luego las reglas y los planes. */}
    {active==="charges"&&<section className="condo-ledger">
      {!overdueHere&&overdueElsewhere.length?<p className="condo-overdue-elsewhere"><strong>{overdueElsewhere.reduce((sum,item)=>sum+item.count,0)} cargos vencidos</strong> están en otras comunidades:{overdueElsewhere.map(item=><button type="button" key={item.id} onClick={()=>setCommunityId(item.id)}>{item.name} ({item.count})</button>)}</p>:null}
      <div className="ledger-layout">
        <div className="ledger-main">
          <nav className="ledger-tabs" aria-label="Tipo de cobro">
            {[["all","Todos",HiSquares2X2],["cuota","Cuotas",HiBanknotes],["servicio","Servicios",HiBolt],...(PROPERTIES_MVP_SCOPE.rentals?[["renta","Rentas",HiHomeModern]]:[])].map(([value,label,Icon])=>
              <button type="button" key={value} className={domainFilter===value?"active":""} onClick={()=>{setDomainFilter(value);setChargeFilter("all")}}>
                <Icon aria-hidden="true"/> {label}{domainCounts[value]?<i>{domainCounts[value]}</i>:null}
              </button>)}
          </nav>
          <nav className="ledger-subtabs" aria-label="Filtrar por estado">
            {[["all","Todos"],["reported","Por revisar"],["overdue","Vencidos"],["pending","Pendientes"],["paid","Pagados"]].map(([value,label])=>
              <button type="button" key={value} className={`${chargeFilter===value?"active":""} ${value==="reported"&&statusCounts.reported?"warn":""}`} onClick={()=>setChargeFilter(value)}>
                {label}{statusCounts[value]?<i>{statusCounts[value]}</i>:null}
              </button>)}
          </nav>
          <div className="ledger-filterbar">
            <label className="ledger-search"><HiMagnifyingGlass aria-hidden="true"/><input value={chargeSearch} onChange={e=>setChargeSearch(e.target.value)} placeholder="Buscar por unidad, residente o concepto…"/></label>
            {PROPERTIES_MVP_SCOPE.rentals?<button type="button" className="condo-contract-link" onClick={()=>navigate("/properties/modulos/contratos")}><HiDocumentText/> Contratos y documentos</button>:null}
            <button type="button" className="ledger-new" onClick={()=>setNewChargeOpen(true)}><HiPlus/> Nuevo cargo</button>
          </div>
          {hasPreviewRows?<p className="ledger-preview-note">Las filas de Servicios {PROPERTIES_MVP_SCOPE.rentals?"y Rentas":""} son vista previa: no tienen backend todavía y no se guardan al recargar.</p>:null}
          <div className="ledger-table-wrap">
            <table className="ledger-table">
              <thead><tr><th>Concepto</th><th>Unidad</th><th>Estado</th><th>Importe</th><th>Vence</th><th></th></tr></thead>
              <tbody>
                {visibleRows.map(row=>{
                  const RowIcon=row.icon;
                  return <tr key={`${row.domain}-${row.id}`} className={row.status==="reported"?"needs-review":""}>
                    <td className="ledger-concept"><RowIcon aria-hidden="true" title={row.domainLabel}/> {row.concept}</td>
                    <td>{row.unitId?<button type="button" className="condo-unit-link" onClick={()=>navigate(`/properties/comunidades?tab=units&community=${communityId}&unit=${row.unitId}`)} title="Ver el contexto de la unidad">{row.unitLabel}</button>:row.unitLabel}</td>
                    <td><span className={`condo-state ${row.status}`}>{row.status==="paid"?"Pagado":row.status==="overdue"?"Vencido":row.status==="reported"?"Por revisar":"Pendiente"}</span></td>
                    <td className="ledger-amt">{money(row.amount)}</td>
                    <td>{row.dueDate||"sin fecha"}</td>
                    <td className="ledger-act">
                      {row.action?(row.action.href
                        ?<a href={row.action.href} target="_blank" rel="noreferrer">{row.action.label}</a>
                        :<button type="button" className={row.status==="reported"?"proof":""} onClick={row.action.onClick}>{row.status==="reported"?<HiInboxStack/>:row.status!=="paid"?<HiCheckCircle/>:null} {row.action.label}</button>)
                        :<span className="ledger-act-muted">—</span>}
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
            {!visibleRows.length?<p className="condo-charge-empty">No hay cobros en este estado.</p>:null}
          </div>
        </div>
        <aside className="ledger-side">
          <div className="ledger-side-card">
            <h3>Acciones rápidas</h3>
            <div className="ledger-side-actions">
              <button type="button" className="primary" onClick={()=>setNewChargeOpen(true)}><HiPlus/> Nuevo cargo</button>
              <button type="button" onClick={()=>{setDomainFilter("all");setChargeFilter("reported")}}><HiInboxStack/> Revisar comprobantes{reviewCount?<i>{reviewCount}</i>:null}</button>
              <button type="button" onClick={()=>setConfigOpen(true)}><HiAdjustmentsHorizontal/> Configurar cobranza</button>
            </div>
          </div>
          <div className="ledger-side-card">
            <h3>Resumen de cuotas</h3>
            <div className="ledger-kpi"><span>Facturado</span><b>{money(totals.billed)}</b></div>
            <div className="ledger-kpi is-ok"><span>Cobrado</span><b>{money(totals.paid)}</b></div>
            <div className="ledger-kpi is-danger"><span>Vencido</span><b>{money(totals.overdue)}</b></div>
            {communityPlans.length?<div className="ledger-plans">
              {communityPlans.map(plan=><div className="ledger-plan" key={plan.id}><span>{plan.concept}</span><b>{money(plan.amount)}</b></div>)}
            </div>:null}
          </div>
        </aside>
      </div>
    </section>}
    {active==="communications"&&<StaffFeed community={community} announcements={announcements} onPublish={draft=>data.addAnnouncement({...draft,communityId})}/>}
    {active==="amenities"&&<section className="condo-module"><header><div><span>Espacios compartidos</span><h2>Amenidades y reservaciones</h2></div></header><div className="condo-split"><WorkflowForm onSubmit={submit}><h3><HiPlus/> Nueva reservación</h3><label>Amenidad<select required value={draft.amenityId||""} onChange={e=>setDraft({...draft,amenityId:e.target.value})}><option value="">Seleccionar</option>{amenities.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Persona<input required value={draft.personName||""} onChange={e=>setDraft({...draft,personName:e.target.value})}/></label><label>Fecha<input required type="date" value={draft.date||""} onChange={e=>setDraft({...draft,date:e.target.value})}/></label><label>Horario<input required type="time" value={draft.time||""} onChange={e=>setDraft({...draft,time:e.target.value})}/></label><button type="submit">Confirmar reservación</button></WorkflowForm><div className="condo-records">{reservations.map(item=><article key={item.id}><HiBuildingStorefront className="record-icon"/><div><strong>{amenities.find(a=>a.id===item.amenityId)?.name}</strong><small>{item.personName} · {item.date} a las {item.time}</small></div><span className="condo-state paid">Confirmada</span></article>)}</div></div></section>}
    {active==="committee"&&<section className="condo-module"><header><div><span>Gobernanza</span><h2>Comité, votaciones y aprobaciones</h2></div></header><div className="condo-split"><WorkflowForm onSubmit={submit}><h3><HiPlus/> Nueva votación</h3><label>Asunto<input required value={draft.title||""} onChange={e=>setDraft({...draft,title:e.target.value})}/></label><label>Descripción<textarea rows="4" value={draft.description||""} onChange={e=>setDraft({...draft,description:e.target.value})}/></label><label>Cierre<input required type="date" value={draft.closesAt||""} onChange={e=>setDraft({...draft,closesAt:e.target.value})}/></label><button type="submit">Abrir votación</button></WorkflowForm><div className="condo-records">{votes.map(item=><article key={item.id}><HiScale className="record-icon"/><div><strong>{item.title}</strong><small>{item.description} · cierra {item.closesAt}</small><em>Sí {item.yes} · No {item.no} · Abstenciones {item.abstain}</em></div><button type="button" onClick={()=>data.castVote(item.id,"yes")}>Votar sí</button></article>)}</div></div></section>}
    {active==="reports"&&<CommunityReportsPanel community={community} units={units} onOpenModule={select}/>}
    </div>

    <Modal open={newChargeOpen} onClose={()=>setNewChargeOpen(false)} title="Nuevo cargo" subtitle={community?.name} icon={<HiPlus/>} width="max-w-[520px]" footer={<><button type="button" onClick={()=>setNewChargeOpen(false)}>Cancelar</button><button type="submit" form="new-charge-form">Generar cargo</button></>}>
      <WorkflowForm id="new-charge-form" className="properties-form" onSubmit={submit}>
        <section className="properties-form-section"><div className="properties-form-grid">
          <label className="properties-form-wide"><span>Concepto</span><input required value={draft.concept||""} onChange={e=>setDraft({...draft,concept:e.target.value})}/></label>
          <label><span>Unidad</span><select value={draft.unitId||""} onChange={e=>setDraft({...draft,unitId:e.target.value})}><option value="">Toda la comunidad</option>{units.map(item=><option key={item.id} value={item.id}>{item.identifier}</option>)}</select></label>
          <label><span>Importe</span><input required type="number" min="1" value={draft.amount||""} onChange={e=>setDraft({...draft,amount:e.target.value})}/></label>
          <label className="properties-form-wide"><span>Vencimiento</span><input type="date" value={draft.dueDate||""} onChange={e=>setDraft({...draft,dueDate:e.target.value})}/></label>
        </div></section>
        <p className="condo-penalty-note">Las penalizaciones quedan pendientes de una regla configurable aprobada; no se calculan automáticamente.</p>
      </WorkflowForm>
    </Modal>

    <Modal open={configOpen} onClose={()=>setConfigOpen(false)} title="Configurar cobranza" subtitle={community?.name} icon={<HiAdjustmentsHorizontal/>} width="max-w-[760px]">
      <QuotaPlansPanel community={community} units={units}/>
      <CollectionPolicyPanel community={community}/>
    </Modal>

    <Modal open={Boolean(reportingService)} onClose={()=>setReportingService(null)} title="Reportar comprobante" subtitle={reportingService?.name} icon={<HiDocumentArrowUp/>} width="max-w-[460px]" footer={<><button type="button" onClick={()=>setReportingService(null)}>Cancelar</button><button type="submit" form="service-report-form">Marcar como reportado</button></>}>
      <WorkflowForm id="service-report-form" className="properties-form" onSubmit={submitServiceReport}>
        <section className="properties-form-section"><div className="properties-form-grid">
          <label className="properties-form-wide"><span>Comprobante</span><input required value={serviceReportDraft.evidenceName} onChange={e=>setServiceReportDraft({...serviceReportDraft,evidenceName:e.target.value})} placeholder="Ej. comprobante-cfe-octubre.pdf"/></label>
          <label><span>Importe pagado</span><input type="number" min="0" step="0.01" value={serviceReportDraft.reportedAmount} onChange={e=>setServiceReportDraft({...serviceReportDraft,reportedAmount:e.target.value})} placeholder={reportingService?String(reportingService.amount):""}/></label>
          <label><span>Fecha de pago</span><input type="date" value={serviceReportDraft.paidAt} onChange={e=>setServiceReportDraft({...serviceReportDraft,paidAt:e.target.value})}/></label>
        </div></section>
        <p className="condo-penalty-note">Esto no realiza ni confirma el pago. La administración puede verificar el comprobante después.</p>
      </WorkflowForm>
    </Modal>

    <Modal open={Boolean(rentPaymentFor)} onClose={()=>setRentPaymentFor(null)} title="Registrar pago de renta" subtitle={units.find(u=>u.id===rentPaymentFor?.unitId)?.identifier} icon={<HiHomeModern/>} width="max-w-[460px]" footer={<><button type="button" onClick={()=>setRentPaymentFor(null)}>Cancelar</button><button type="submit" form="rent-payment-form">Registrar pago</button></>}>
      <WorkflowForm id="rent-payment-form" className="properties-form" onSubmit={submitRentPayment}>
        <section className="properties-form-section"><div className="properties-form-grid">
          <label><span>Importe</span><input required type="number" min="1" value={rentPaymentDraft.amount} onChange={e=>setRentPaymentDraft({...rentPaymentDraft,amount:e.target.value})}/></label>
          <label><span>Fecha de pago</span><input required type="date" value={rentPaymentDraft.paidAt} onChange={e=>setRentPaymentDraft({...rentPaymentDraft,paidAt:e.target.value})}/></label>
        </div></section>
      </WorkflowForm>
    </Modal>

    {reviewing?<ReviewDialog report={reviewing} onClose={()=>setReviewing(null)} onReviewed={()=>{setReviewing(null);queryClient.invalidateQueries({queryKey:["payment-reports"]})}}/>:null}
  </main></EcoLayout>;
}
export default CondoOperationsSuite;
