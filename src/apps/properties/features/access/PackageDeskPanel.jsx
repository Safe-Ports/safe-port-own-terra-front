import { useMemo, useState } from "react";
import { HiArchiveBox, HiCheckCircle, HiPlus, HiTruck } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import "./package-desk.css";

const emptyPackage={unitId:"",carrier:"",trackingNumber:"",photoUrl:""};
const when=value=>value?new Date(value).toLocaleString("es-MX",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"";

function PackageDeskPanel(){
  const {showToast,canUseFeature}=useAppContext();
  const canWrite=canUseFeature("properties.write");
  const {communities,units,communityPeople,personUnitRelations,packages,addPackage,deliverPackage}=usePropertiesData();
  const [communityId,setCommunityId]=useState(communities[0]?.id||"");
  const [draft,setDraft]=useState(emptyPackage);
  const [creating,setCreating]=useState(false);
  const [delivering,setDelivering]=useState(null);
  const [recipientId,setRecipientId]=useState("");
  const [busy,setBusy]=useState(false);

  const community=communities.find(item=>item.id===communityId)||communities[0];
  const communityUnits=units.filter(unit=>unit.propertyId===community?.propertyId&&unit.status!=="archived");
  const list=packages.filter(item=>item.communityId===community?.id);
  const pending=list.filter(item=>item.status!=="delivered");
  const delivered=list.filter(item=>item.status==="delivered");
  const personById=useMemo(()=>Object.fromEntries(communityPeople.map(person=>[person.id,person])),[communityPeople]);
  const unitName=id=>communityUnits.find(unit=>unit.id===id)?.identifier||"Unidad";
  // Quien recibe tiene que ser alguien vinculado a esa unidad: es la evidencia
  // que protege a la administración cuando alguien reclama un paquete.
  const recipients=unitId=>personUnitRelations.filter(rel=>rel.unitId===unitId&&rel.status!=="archived").map(rel=>personById[rel.personId]).filter(Boolean);

  const save=async event=>{
    event.preventDefault();
    if(!draft.unitId) return showToast("Elige la unidad a la que llegó el paquete","warning");
    setBusy(true);
    try{await addPackage(community.id,draft);setDraft(emptyPackage);setCreating(false);showToast("Paquete registrado en recepción","success");}
    catch(error){showToast(error.response?.data?.error?.message||error.message,"warning");}
    finally{setBusy(false);}
  };

  const confirmDelivery=async()=>{
    if(!recipientId) return showToast("Selecciona quién recibe","warning");
    setBusy(true);
    try{await deliverPackage(delivering.id,{personId:recipientId});setDelivering(null);setRecipientId("");showToast("Entrega registrada","success");}
    catch(error){showToast(error.response?.data?.error?.message||error.message,"warning");}
    finally{setBusy(false);}
  };

  if(!communities.length) return <section className="pkg-panel"><p className="pkg-zero">Primero crea una comunidad: la paquetería se registra contra las unidades de una comunidad.</p></section>;

  return <section className="pkg-panel">
    <header>
      <div><span>Recepción</span><h2>Paquetería</h2><p>Registro de lo que llega y evidencia de quién lo recibió.</p></div>
      <label><small>Comunidad</small><select value={community?.id||""} onChange={e=>setCommunityId(e.target.value)}>{communities.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <button type="button" onClick={()=>setCreating(value=>!value)} disabled={!canWrite||!communityUnits.length}><HiPlus/> {creating?"Cancelar":"Registrar paquete"}</button>
    </header>

    {creating?<form className="pkg-form" onSubmit={save}>
      <label><span>Unidad destino</span><select value={draft.unitId} onChange={e=>setDraft({...draft,unitId:e.target.value})}><option value="">Seleccionar unidad</option>{communityUnits.map(unit=><option value={unit.id} key={unit.id}>{unit.identifier}</option>)}</select></label>
      <label><span>Paquetería</span><input value={draft.carrier} onChange={e=>setDraft({...draft,carrier:e.target.value})} placeholder="DHL, Estafeta, Amazon"/></label>
      <label><span>Número de guía</span><input value={draft.trackingNumber} onChange={e=>setDraft({...draft,trackingNumber:e.target.value})}/></label>
      <label><span>Fotografía <small>Opcional</small></span><input type="url" value={draft.photoUrl} onChange={e=>setDraft({...draft,photoUrl:e.target.value})} placeholder="https://..."/></label>
      <footer><button type="submit" disabled={busy}>{busy?"Guardando…":"Registrar en recepción"}</button></footer>
    </form>:null}

    <div className="pkg-columns">
      <section>
        <h3><HiArchiveBox/> Pendientes de entrega <b>{pending.length}</b></h3>
        {pending.length?<ul>{pending.map(item=><li key={item.id}>
          <span className="pkg-ico"><HiTruck/></span>
          <div><strong>{unitName(item.property_id)}</strong><small>{item.carrier||"Sin paquetería"}{item.tracking_number?` · ${item.tracking_number}`:""}</small><em>Recibido {when(item.received_at)}</em></div>
          <button type="button" disabled={!canWrite} onClick={()=>{setDelivering(item);setRecipientId(recipients(item.property_id)[0]?.id||"");}}>Entregar</button>
        </li>)}</ul>:<p className="pkg-empty">Nada pendiente en esta comunidad.</p>}
      </section>

      <section>
        <h3><HiCheckCircle/> Entregados <b>{delivered.length}</b></h3>
        {delivered.length?<ul>{delivered.map(item=><li key={item.id} className="done">
          <span className="pkg-ico"><HiCheckCircle/></span>
          <div><strong>{unitName(item.property_id)}</strong><small>Recibió {personById[item.recipient_persona_id]?.name||"—"}</small><em>Entregado {when(item.delivered_at)}</em></div>
        </li>)}</ul>:<p className="pkg-empty">Todavía no registras ninguna entrega.</p>}
      </section>
    </div>

    {delivering?<div className="pkg-deliver">
      <div>
        <strong>Entregar paquete de {unitName(delivering.property_id)}</strong>
        <p>Queda asentado quién lo recibió y a qué hora.</p>
        <label><span>Recibe</span>
          <select value={recipientId} onChange={e=>setRecipientId(e.target.value)}>
            <option value="">Seleccionar persona</option>
            {recipients(delivering.property_id).map(person=><option value={person.id} key={person.id}>{person.name}</option>)}
          </select>
        </label>
        {recipients(delivering.property_id).length?null:<p className="pkg-warn">Esta unidad no tiene personas vinculadas. Vincula a alguien en Comunidades antes de poder entregar.</p>}
        <footer>
          <button type="button" className="ghost" onClick={()=>setDelivering(null)}>Cancelar</button>
          <button type="button" onClick={confirmDelivery} disabled={busy||!recipientId}>{busy?"Registrando…":"Confirmar entrega"}</button>
        </footer>
      </div>
    </div>:null}
  </section>;
}

export default PackageDeskPanel;
