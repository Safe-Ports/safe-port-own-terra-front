import { useState } from "react";
import { HiArrowPath, HiCalendarDays, HiCheckCircle, HiExclamationTriangle, HiPlus } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import "./quota-plans.css";

const money=value=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:2}).format(Number(value)||0);
const KIND={ordinary:"Ordinaria",extraordinary:"Extraordinaria"};
const BASIS={flat:"Monto igual por unidad",by_indiviso:"Repartida por indiviso"};
const FREQ={monthly:"Mensual",bimonthly:"Bimestral",quarterly:"Trimestral",annual:"Anual"};
const LATE={none:"Sin recargo",fixed:"Recargo fijo",percent_monthly:"% mensual sobre saldo"};
// El backend devuelve el motivo en inglés; se traduce acá para que el usuario
// entienda por qué una unidad quedó fuera en vez de leer una clave técnica.
const REASON={no_payment_responsible:"Sin responsable de pago",archived:"Unidad archivada",already_charged:"Ya tenía el cargo del periodo",no_indiviso:"Sin porcentaje de indiviso"};

const emptyPlan={concept:"",quotaKind:"ordinary",basis:"flat",amount:"",frequency:"monthly",lateFeeKind:"none",lateFeeValue:"",effectiveFrom:new Date().toISOString().slice(0,10)};
const monthEdges=()=>{const now=new Date();const start=new Date(now.getFullYear(),now.getMonth(),1);const end=new Date(now.getFullYear(),now.getMonth()+1,0);const iso=d=>d.toISOString().slice(0,10);
  return {periodStart:iso(start),periodEnd:iso(end),dueDate:iso(new Date(now.getFullYear(),now.getMonth(),5))};};

function QuotaPlansPanel({community,units}){
  const {showToast,canUseFeature}=useAppContext();
  const canWrite=canUseFeature("properties.write");
  const {quotaPlans,addQuotaPlan,previewQuotaRun,runQuotaPlan}=usePropertiesData();
  const [creating,setCreating]=useState(false);
  const [planDraft,setPlanDraft]=useState(emptyPlan);
  const [runPlanId,setRunPlanId]=useState("");
  const [runDraft,setRunDraft]=useState(monthEdges);
  const [preview,setPreview]=useState(null);
  const [busy,setBusy]=useState("");
  const plans=quotaPlans.filter(plan=>plan.communityId===community?.id);
  const unitName=id=>units.find(unit=>unit.id===id)?.identifier||"Unidad";

  const savePlan=async event=>{
    event.preventDefault();
    if(!planDraft.concept.trim()||!Number(planDraft.amount)) return showToast("Escribe el concepto y un importe mayor a cero","warning");
    setBusy("plan");
    try{await addQuotaPlan(community.id,planDraft);setPlanDraft(emptyPlan);setCreating(false);showToast("Plan de cuota creado","success");}
    catch(error){showToast(error.response?.data?.error?.message||error.message,"warning");}
    finally{setBusy("");}
  };

  const openRun=planId=>{setRunPlanId(planId===runPlanId?"":planId);setPreview(null);setRunDraft(monthEdges());};

  const simulate=async()=>{
    setBusy("preview");
    try{const result=await previewQuotaRun(community.id,runPlanId,runDraft);setPreview(result);}
    catch(error){setPreview(null);showToast(error.response?.data?.error?.message||error.message,"warning");}
    finally{setBusy("");}
  };

  const confirm=async()=>{
    setBusy("run");
    try{const result=await runQuotaPlan(community.id,runPlanId,runDraft);
      showToast(`${result.charges_created} cargos generados por ${money(result.total_amount)}`,"success");
      setRunPlanId("");setPreview(null);}
    catch(error){showToast(error.response?.data?.error?.message||error.message,"warning");}
    finally{setBusy("");}
  };

  return <section className="quota-panel">
    <header>
      <div><span>Cobranza recurrente</span><h2>Planes de cuota</h2><p>Define la cuota una vez y genera los cargos de todo el periodo de golpe, en lugar de capturarlos unidad por unidad.</p></div>
      <button type="button" onClick={()=>setCreating(value=>!value)} disabled={!canWrite||!community}><HiPlus/> {creating?"Cancelar":"Nuevo plan"}</button>
    </header>

    {creating?<form className="quota-form" onSubmit={savePlan}>
      <label className="wide"><span>Concepto</span><input autoFocus value={planDraft.concept} onChange={e=>setPlanDraft({...planDraft,concept:e.target.value})} placeholder="Cuota ordinaria de mantenimiento"/></label>
      <label><span>Tipo</span><select value={planDraft.quotaKind} onChange={e=>setPlanDraft({...planDraft,quotaKind:e.target.value})}>{Object.entries(KIND).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
      <label><span>Cómo se reparte</span><select value={planDraft.basis} onChange={e=>setPlanDraft({...planDraft,basis:e.target.value})}>{Object.entries(BASIS).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
      <label><span>Importe</span><input type="number" min="0" step="0.01" value={planDraft.amount} onChange={e=>setPlanDraft({...planDraft,amount:e.target.value})} placeholder="1500.00"/></label>
      <label><span>Periodicidad</span><select value={planDraft.frequency} onChange={e=>setPlanDraft({...planDraft,frequency:e.target.value})}>{Object.entries(FREQ).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
      <label><span>Recargo por mora</span><select value={planDraft.lateFeeKind} onChange={e=>setPlanDraft({...planDraft,lateFeeKind:e.target.value})}>{Object.entries(LATE).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
      {planDraft.lateFeeKind!=="none"?<label><span>Valor del recargo</span><input type="number" min="0" step="0.01" value={planDraft.lateFeeValue} onChange={e=>setPlanDraft({...planDraft,lateFeeValue:e.target.value})}/></label>:null}
      <label><span>Vigente desde</span><input type="date" value={planDraft.effectiveFrom} onChange={e=>setPlanDraft({...planDraft,effectiveFrom:e.target.value})}/></label>
      {planDraft.basis==="by_indiviso"?<p className="quota-hint wide"><HiExclamationTriangle/> Repartida por indiviso: el importe se prorratea con el <b>porcentaje de indiviso</b> de cada unidad. Las unidades que no lo tengan capturado quedarán fuera de la generación.</p>:null}
      <footer className="wide"><button type="submit" disabled={busy==="plan"}>{busy==="plan"?"Guardando…":"Crear plan"}</button></footer>
    </form>:null}

    {plans.length?<div className="quota-list">
      {plans.map(plan=><article key={plan.id} className={runPlanId===plan.id?"open":""}>
        <header>
          <div><strong>{plan.concept}</strong><small>{KIND[plan.quota_kind]||plan.quota_kind} · {BASIS[plan.basis]||plan.basis} · {FREQ[plan.frequency]||plan.frequency}</small></div>
          <b>{money(plan.amount)}</b>
          <button type="button" onClick={()=>openRun(plan.id)} disabled={!canWrite}><HiCalendarDays/> {runPlanId===plan.id?"Cerrar":"Generar periodo"}</button>
        </header>

        {runPlanId===plan.id?<div className="quota-run">
          <div className="quota-run-dates">
            <label><span>Inicio del periodo</span><input type="date" value={runDraft.periodStart} onChange={e=>{setRunDraft({...runDraft,periodStart:e.target.value});setPreview(null);}}/></label>
            <label><span>Fin del periodo</span><input type="date" value={runDraft.periodEnd} onChange={e=>{setRunDraft({...runDraft,periodEnd:e.target.value});setPreview(null);}}/></label>
            <label><span>Vencimiento</span><input type="date" value={runDraft.dueDate} onChange={e=>{setRunDraft({...runDraft,dueDate:e.target.value});setPreview(null);}}/></label>
            <button type="button" className="quota-sim" onClick={simulate} disabled={busy==="preview"}><HiArrowPath/> {busy==="preview"?"Simulando…":"Simular"}</button>
          </div>

          {preview?<div className="quota-preview">
            <div className="quota-preview-kpis">
              <span><small>Cargos a generar</small><b>{preview.charges_created}</b></span>
              <span><small>Importe total</small><b>{money(preview.total_amount)}</b></span>
              <span><small>Unidades omitidas</small><b>{preview.skipped?.length||0}</b></span>
            </div>
            {preview.skipped?.length?<ul className="quota-skipped">
              {preview.skipped.map(item=><li key={item.property_id}><HiExclamationTriangle/> <b>{unitName(item.property_id)}</b><span>{REASON[item.reason]||item.reason}</span></li>)}
            </ul>:<p className="quota-ok"><HiCheckCircle/> Ninguna unidad queda fuera.</p>}
            <footer>
              <p>La simulación no escribió nada. Generar es <b>idempotente</b>: si repites el mismo periodo no se duplican los cargos.</p>
              <button type="button" onClick={confirm} disabled={busy==="run"||!preview.charges_created}>{busy==="run"?"Generando…":`Confirmar y generar ${preview.charges_created} cargos`}</button>
            </footer>
          </div>:<p className="quota-idle">Elige el periodo y simula: verás cuántos cargos se crearían, por cuánto, y qué unidades quedan fuera y por qué — antes de escribir nada.</p>}
        </div>:null}
      </article>)}
    </div>:<p className="quota-zero">Todavía no hay planes de cuota en esta comunidad. Con un plan puedes generar la cuota de todas las unidades en una sola operación, en vez de capturar cargo por cargo.</p>}
  </section>;
}

export default QuotaPlansPanel;
