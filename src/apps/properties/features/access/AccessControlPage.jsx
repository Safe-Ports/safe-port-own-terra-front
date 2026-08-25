import { useState } from "react";
import { HiArrowLeft, HiCheckBadge, HiClock, HiMapPin, HiPlus, HiQrCode, HiShieldCheck, HiTruck, HiUser } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import Modal from "@/components/ui/Modal";
import "./access-control.css";

const initialPasses=[
  {folio:"AC-1842",kind:"Proveedor",name:"Plomería Díaz",target:"Torre Jacarandas · Depto. 302",window:"Hoy · 14:00–16:00",host:"Fernando Demo",status:"expected",note:"Permitir acceso a cuarto de máquinas. Lleva herramienta."},
  {folio:"AC-1839",kind:"Visita",name:"Mariana Robles + 1",target:"Residencial La Arboleda · B-301",window:"Hoy · 17:30–18:15",host:"Claudia Reyes",status:"expected",note:"Visita comercial. Solicitar identificación de ambos visitantes."},
  {folio:"AC-1835",kind:"Entrega",name:"Muebles Nórdika",target:"Oficinas Centro 27 · Oficina 3B",window:"Hoy · 11:00–13:00",host:"Diego Ruiz",status:"inside",note:"Usar elevador de servicio. No bloquear acceso principal."},
  {folio:"AC-1828",kind:"Mantenimiento",name:"Climas del Centro",target:"Oficinas Centro 27 · Oficina 3B",window:"Ayer · 09:00–11:00",host:"Ana Castillo",status:"completed",note:"Acceso autorizado a azotea acompañado por personal interno."},
];

const statusLabel={expected:"Por llegar",inside:"Dentro",completed:"Salida registrada"};

function AccessControlPage(){
  const navigate=useNavigate();
  const [passes,setPasses]=useState(initialPasses);
  const [selectedId,setSelectedId]=useState(initialPasses[0].folio);
  const [creating,setCreating]=useState(false);
  const [draft,setDraft]=useState({kind:"Visita",name:"",target:"",window:"",host:"",note:""});
  const selected=passes.find(item=>item.folio===selectedId)||passes[0];
  const createPass=event=>{event.preventDefault();const pass={...draft,folio:`AC-${String(Date.now()).slice(-4)}`,status:"expected"};setPasses(current=>[pass,...current]);setSelectedId(pass.folio);setCreating(false);setDraft({kind:"Visita",name:"",target:"",window:"",host:"",note:""});};
  const advancePass=()=>setPasses(current=>current.map(item=>item.folio===selected.folio?{...item,status:item.status==="expected"?"inside":"completed"}:item));
  return <EcoLayout active="properties" title="OwnTerra Properties" subtitle="Operación · Accesos"><main className="access-page">
    <header className="access-heading"><button type="button" onClick={()=>navigate("/properties/condominios/operacion")}><HiArrowLeft/> Operación condominal</button><div><span>Caseta, visitas y paquetería</span><h1>Accesos sin fricción.</h1><p>La caseta recibe instrucciones claras para visitas, proveedores y entregas.</p></div><button type="button" onClick={()=>setCreating(true)}><HiPlus/> Crear pase</button></header>
    <section className="access-principle"><HiShieldCheck/><div><strong>Una vista pública, una sola tarea.</strong><p>Seguridad abre el enlace o escanea el QR, compara identificación, sigue instrucciones y registra entrada o salida.</p></div><span>Sin usuario · Sin contraseña</span></section>
    <section className="access-layout">
      <div className="access-queue"><header><div><span>Hoy</span><h2>Personas y entregas</h2></div><strong>{passes.filter(item=>item.status!=="completed").length} activas</strong></header>{passes.map(pass=><button type="button" className={selected.folio===pass.folio?"active":""} key={pass.folio} onClick={()=>setSelectedId(pass.folio)}><span className="access-kind">{pass.kind==="Entrega"?<HiTruck/>:<HiUser/>}</span><span><small>{pass.kind} · {pass.folio}</small><strong>{pass.name}</strong><em>{pass.target}</em></span><i className={pass.status}>{statusLabel[pass.status]}</i></button>)}</div>
      <article className="access-pass"><header><div><span>Pase temporal</span><strong>{selected.folio}</strong></div><span className={`access-state ${selected.status}`}><HiCheckBadge/> {statusLabel[selected.status]}</span></header><div className="access-pass-body"><div className="access-qr"><HiQrCode/><small>Escanear para validar</small></div><div className="access-identity"><small>{selected.kind}</small><h2>{selected.name}</h2><p><HiMapPin/> {selected.target}</p><p><HiClock/> {selected.window}</p></div></div><section><small>Instrucciones para caseta</small><p>{selected.note}</p></section><footer><div><small>Autoriza</small><strong>{selected.host}</strong></div><button type="button">Compartir pase</button>{selected.status!=="completed"?<button type="button" onClick={advancePass}>{selected.status==="expected"?"Registrar entrada":"Registrar salida"}</button>:<span>Acceso concluido</span>}</footer></article>
    </section>
    <section className="access-protocol"><header><span>Protocolo mínimo</span><h2>Lo que seguridad necesita saber</h2></header><div><article><strong>1</strong><h3>Quién llega</h3><p>Nombre, empresa, acompañantes y fotografía opcional.</p></article><article><strong>2</strong><h3>A dónde va</h3><p>Propiedad, unidad, persona anfitriona y zona permitida.</p></article><article><strong>3</strong><h3>Cuándo entra</h3><p>Ventana de vigencia; el pase expira automáticamente.</p></article><article><strong>4</strong><h3>Qué debe hacer</h3><p>Instrucciones breves y teléfono para cualquier excepción.</p></article></div></section>
    <Modal open={creating} onClose={()=>setCreating(false)} title="Crear pase" subtitle="Visita, proveedor o entrega" icon={<HiQrCode/>} width="max-w-[620px]" footer={<><button type="button" onClick={()=>setCreating(false)}>Cancelar</button><button type="submit" form="access-pass-form">Crear pase</button></>}><form id="access-pass-form" className="properties-form" onSubmit={createPass}><section className="properties-form-section"><div className="properties-form-grid"><label><span>Tipo</span><select value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value})}><option>Visita</option><option>Proveedor</option><option>Entrega</option><option>Mantenimiento</option></select></label><label><span>Nombre o empresa</span><input required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label className="properties-form-wide"><span>Destino</span><input required value={draft.target} onChange={e=>setDraft({...draft,target:e.target.value})} placeholder="Comunidad · Unidad"/></label><label><span>Ventana de acceso</span><input required value={draft.window} onChange={e=>setDraft({...draft,window:e.target.value})} placeholder="Hoy · 14:00–16:00"/></label><label><span>Autoriza</span><input required value={draft.host} onChange={e=>setDraft({...draft,host:e.target.value})}/></label><label className="properties-form-wide"><span>Instrucciones</span><textarea rows="3" value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/></label></div></section></form></Modal>
  </main></EcoLayout>;
}
export default AccessControlPage;
