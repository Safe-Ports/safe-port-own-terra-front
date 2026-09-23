import { useCallback, useEffect, useState } from "react";
import { HiClipboardDocument, HiKey, HiLockClosed, HiTrash } from "react-icons/hi2";
import Modal from "@/components/ui/Modal";
import { useAppContext } from "@/context/AppContext";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import "./portal-access.css";

const SCOPE={property:"Una unidad",inmueble:"Todo el inmueble",organization:"Toda la organización"};
const when=value=>value?new Date(value).toLocaleString("es-MX",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"nunca";

function PortalAccessModal({person,units,onClose}){
  const {showToast,canUseFeature}=useAppContext();
  const canWrite=canUseFeature("properties.write");
  const {portalIdentities,personUnitRelations,invitePortal,grantPortalAccess,suspendPortal,revokePortalGrant,portalGrants}=usePropertiesData();
  const identity=(portalIdentities||[]).find(item=>item.persona_id===person?.id);
  const [email,setEmail]=useState(person?.email||"");
  const [invite,setInvite]=useState(null);
  const [grants,setGrants]=useState([]);
  const [scopeId,setScopeId]=useState("");
  const [busy,setBusy]=useState("");

  // Solo tiene sentido dar acceso a las unidades donde la persona ya tiene una
  // relación: el portal enseña lo suyo, no el edificio entero.
  const ownUnits=units.filter(unit=>personUnitRelations.some(rel=>rel.personId===person?.id&&rel.unitId===unit.id&&rel.status!=="archived"));

  const loadGrants=useCallback(async()=>{
    if(!identity) return setGrants([]);
    try{setGrants(await portalGrants(identity.id)||[]);}catch{setGrants([]);}
  },[identity,portalGrants]);

  useEffect(()=>{loadGrants();},[loadGrants]);
  useEffect(()=>{if(!scopeId&&ownUnits[0])setScopeId(ownUnits[0].id);},[ownUnits,scopeId]);

  const sendInvite=async()=>{
    if(!email.trim()) return showToast("Escribe el correo del residente","warning");
    setBusy("invite");
    try{const row=await invitePortal({personId:person.id,email:email.trim()});setInvite(row);showToast("Invitación creada","success");}
    catch(error){showToast(error.response?.data?.error?.message||error.message,"warning");}
    finally{setBusy("");}
  };

  const addGrant=async()=>{
    if(!scopeId) return showToast("Elige la unidad a la que tendrá acceso","warning");
    setBusy("grant");
    try{await grantPortalAccess({identityId:identity.id,scopeType:"property",scopeId});await loadGrants();showToast("Acceso otorgado","success");}
    catch(error){showToast(error.response?.data?.error?.message||error.message,"warning");}
    finally{setBusy("");}
  };

  const drop=async id=>{
    setBusy("revoke");
    try{await revokePortalGrant(id);await loadGrants();showToast("Acceso revocado","success");}
    catch(error){showToast(error.response?.data?.error?.message||error.message,"warning");}
    finally{setBusy("");}
  };

  const suspend=async()=>{
    setBusy("suspend");
    try{await suspendPortal(identity.id);showToast("Acceso suspendido","success");onClose();}
    catch(error){showToast(error.response?.data?.error?.message||error.message,"warning");}
    finally{setBusy("");}
  };

  const inviteUrl=invite?`${window.location.origin}/servicio/invitacion?token=${invite.invite_token}`:"";
  const copy=async()=>{try{await navigator.clipboard.writeText(inviteUrl);showToast("Enlace copiado","success");}catch{showToast("No se pudo copiar","warning");}};

  return <Modal open={Boolean(person)} onClose={onClose} title="Acceso al portal" subtitle={person?.name} icon={<HiKey/>} width="max-w-[620px]">
    <div className="portal-access">
      {identity?<>
        <div className="portal-status">
          <span className={`portal-chip ${identity.status}`}>{identity.status==="active"?"Activa":identity.status==="invited"?"Invitación pendiente":"Suspendida"}</span>
          <div><strong>{identity.email}</strong><small>Último ingreso: {when(identity.last_login_at)}</small></div>
          {canWrite&&identity.status!=="suspended"?<button type="button" className="portal-danger" onClick={suspend} disabled={busy==="suspend"}><HiLockClosed/> Suspender</button>:null}
        </div>

        <section className="portal-grants">
          <h4>A qué tiene acceso</h4>
          {grants.length?<ul>{grants.map(grant=><li key={grant.id}>
            <span>{SCOPE[grant.scope_type]||grant.scope_type}</span>
            <strong>{units.find(unit=>unit.id===grant.scope_id)?.identifier||grant.scope_id?.slice(0,8)}</strong>
            <em>{grant.permission==="write"?"Lectura y escritura":"Solo lectura"}</em>
            {canWrite?<button type="button" onClick={()=>drop(grant.id)} disabled={busy==="revoke"} aria-label="Revocar acceso"><HiTrash/></button>:null}
          </li>)}</ul>:<p className="portal-empty">Sin accesos todavía. Entra al portal pero no ve nada hasta que le des uno.</p>}

          {canWrite?<div className="portal-grant-form">
            <select value={scopeId} onChange={e=>setScopeId(e.target.value)}>
              {ownUnits.length?ownUnits.map(unit=><option value={unit.id} key={unit.id}>{unit.identifier}</option>)
                :<option value="">Esta persona no tiene unidades vinculadas</option>}
            </select>
            <button type="button" onClick={addGrant} disabled={busy==="grant"||!ownUnits.length}>Dar acceso</button>
          </div>:null}
        </section>
      </>:<>
        <p className="portal-lede">El residente entra con su propia cuenta y ve únicamente sus unidades, su saldo, sus comunicados, sus votaciones y sus paquetes.</p>
        <label className="portal-field"><span>Correo del residente</span>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="residente@correo.mx"/>
        </label>
        <button type="button" className="portal-primary" onClick={sendInvite} disabled={!canWrite||busy==="invite"}>{busy==="invite"?"Creando…":"Crear invitación"}</button>
      </>}

      {invite?<div className="portal-invite">
        <strong>Comparte este enlace</strong>
        <p>Todavía no hay envío de correo en properties-back, así que la invitación no se manda sola: pásasela tú. Es de un solo uso.</p>
        <div className="portal-link"><code>{inviteUrl}</code><button type="button" onClick={copy}><HiClipboardDocument/> Copiar</button></div>
      </div>:null}
    </div>
  </Modal>;
}

export default PortalAccessModal;
