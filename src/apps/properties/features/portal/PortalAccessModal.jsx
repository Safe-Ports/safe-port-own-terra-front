import WorkflowForm from "@/components/forms/WorkflowForm";
import { useCallback, useEffect, useState } from "react";
import { HiChatBubbleLeftRight, HiClipboardDocument, HiEnvelope, HiKey, HiLockClosed, HiTrash } from "react-icons/hi2";
import useConfirmation from "@/hooks/useConfirmation";
import Modal from "@/components/ui/Modal";
import { useAppContext } from "@/context/AppContext";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import { inviteMessage, mailtoUrl, whatsappUrl } from "./shareLinks";
import "./portal-access.css";

const SCOPE={property:"Una unidad",inmueble:"Todo el inmueble",organization:"Toda la organización"};
const when=value=>value?new Date(value).toLocaleString("es-MX",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"nunca";

function PortalAccessModal({person,units,initialInvite=null,onClose}){
  const {showToast,canUseFeature}=useAppContext();
  const canWrite=canUseFeature("properties.write");
  const {portalIdentities,personUnitRelations,invitePortal,grantPortalAccess,suspendPortal,revokePortalGrant,portalGrants}=usePropertiesData();
  const identity=(portalIdentities||[]).find(item=>item.persona_id===person?.id);
  const [email,setEmail]=useState(person?.email||"");
  const [invite,setInvite]=useState(initialInvite);
  const [grants,setGrants]=useState([]);
  const [scopeId,setScopeId]=useState("");
  const [busy,setBusy]=useState("");
  const [grantsLoading,setGrantsLoading]=useState(false);
  const [grantsError,setGrantsError]=useState("");
  const {requestConfirmation,confirmationDialog}=useConfirmation();

  // Solo tiene sentido dar acceso a las unidades donde la persona ya tiene una
  // relación: el portal enseña lo suyo, no el edificio entero.
  const ownUnits=units.filter(unit=>personUnitRelations.some(rel=>rel.personId===person?.id&&rel.unitId===unit.id&&rel.status!=="archived"));

  const loadGrants=useCallback(async()=>{
    if(!identity) return setGrants([]);
    setGrantsLoading(true);setGrantsError("");
    try{setGrants(await portalGrants(identity.id)||[]);}catch(error){setGrantsError(error.response?.data?.error?.message||"No pudimos consultar los accesos adicionales.");}
    finally{setGrantsLoading(false)}
  },[identity,portalGrants]);

  useEffect(()=>{loadGrants();},[loadGrants]);
  useEffect(()=>{if(!scopeId&&ownUnits[0])setScopeId(ownUnits[0].id);},[ownUnits,scopeId]);

  const sendInvite=async()=>{
    if(busy||!canWrite)return;
    if(!email.trim()) return showToast("Escribe el correo del residente","warning");
    setBusy("invite");
    try{const row=await invitePortal({personId:person.id,email:email.trim()});setInvite(row);showToast("Invitación creada","success");}
    catch(error){showToast(error.response?.data?.error?.message||error.message,"warning");}
    finally{setBusy("");}
  };

  const addGrant=async()=>{
    if(busy||!canWrite||grantsLoading||grantsError)return;
    if(!scopeId) return showToast("Elige la unidad a la que tendrá acceso","warning");
    setBusy("grant");
    try{await grantPortalAccess({identityId:identity.id,scopeType:"property",scopeId});await loadGrants();showToast("Acceso otorgado","success");}
    catch(error){showToast(error.response?.data?.error?.message||error.message,"warning");}
    finally{setBusy("");}
  };

  const drop=async id=>{
    if(busy||!canWrite||grantsLoading||grantsError)return;
    setBusy("revoke");
    try{await revokePortalGrant(id);await loadGrants();showToast("Acceso revocado","success");}
    catch(error){showToast(error.response?.data?.error?.message||error.message,"warning");}
    finally{setBusy("");}
  };

  const suspend=async()=>{
    if(busy||!canWrite)return;
    if(!await requestConfirmation("Se suspenderá esta cuenta de portal en todas las comunidades y verticales de la organización. Sus datos e historial se conservan. ¿Continuar?"))return;
    setBusy("suspend");
    try{await suspendPortal(identity.id);showToast("Acceso suspendido","success");onClose();}
    catch(error){showToast(error.response?.data?.error?.message||error.message,"warning");}
    finally{setBusy("");}
  };

  const inviteUrl=invite?.invite_token?`${window.location.origin}/portal/invitacion?token=${invite.invite_token}`:"";
  const message=inviteUrl?inviteMessage({name:person?.name,url:inviteUrl}):"";
  const sendTo=(email||identity?.email||"").trim();
  const copy=async()=>{try{await navigator.clipboard.writeText(inviteUrl);showToast("Enlace copiado","success");}catch{showToast("No se pudo copiar","warning");}};

  return <><Modal open={Boolean(person)} onClose={onClose} title="Acceso al portal" subtitle={person?.name} icon={<HiKey/>} width="max-w-[620px]">
    <div className="portal-access">
      {identity?<>
        <div className="portal-status">
          <span className={`portal-chip ${identity.status}`}>{identity.status==="active"?"Activa":identity.status==="invited"?"Invitación pendiente":"Suspendida"}</span>
          <div><strong>{identity.email}</strong><small>Último ingreso: {when(identity.last_login_at)}</small></div>
          {canWrite&&identity.status!=="suspended"?<button type="button" className="portal-danger" onClick={suspend} disabled={busy==="suspend"}><HiLockClosed/> Suspender</button>:null}
        </div>

        <section className="portal-grants">
          <h4>Accesos adicionales</h4>
          <p>Las relaciones vigentes con sus unidades ya le dan visibilidad. Estos permisos agregan acceso de consulta.</p>
          {grantsLoading?<p role="status">Consultando accesos…</p>:null}
          {grantsError?<div role="alert"><p>{grantsError}</p><button type="button" onClick={loadGrants}>Reintentar accesos</button></div>:null}
          {!grantsLoading&&!grantsError?(grants.length?<ul>{grants.map(grant=><li key={grant.id}>
            <span>{SCOPE[grant.scope_type]||grant.scope_type}</span>
            <strong>{units.find(unit=>unit.id===grant.scope_id)?.identifier||grant.scope_id?.slice(0,8)}</strong>
            <em>{grant.permission==="write"?"Lectura y escritura":"Solo lectura"}</em>
            {canWrite?<button type="button" onClick={()=>drop(grant.id)} disabled={busy==="revoke"} aria-label="Revocar acceso"><HiTrash/></button>:null}
          </li>)}</ul>:<p className="portal-empty">No tiene permisos adicionales. Ve las unidades que tenga vinculadas mediante relaciones vigentes.</p>):null}

          {canWrite?<WorkflowForm className="portal-grant-form" busy={Boolean(busy)} onSubmit={event=>{event.preventDefault();return addGrant()}}>
            <select aria-label="Unidad a la que tendrá acceso" value={scopeId} onChange={e=>setScopeId(e.target.value)}>
              {ownUnits.length?ownUnits.map(unit=><option value={unit.id} key={unit.id}>{unit.identifier}</option>)
                :<option value="">Esta persona no tiene unidades vinculadas</option>}
            </select>
            <button type="submit" disabled={Boolean(busy)||grantsLoading||Boolean(grantsError)||!ownUnits.length}>Dar acceso</button>
          </WorkflowForm>:null}
        </section>
      </>:<>
        <p className="portal-lede">El residente entra con su propia cuenta y ve únicamente sus unidades, su saldo, sus comunicados, sus votaciones y sus paquetes.</p>
        <WorkflowForm busy={Boolean(busy)} onSubmit={event=>{event.preventDefault();return sendInvite()}}><label className="portal-field"><span>Correo del residente</span>
          <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="residente@correo.mx"/>
        </label>
        <button type="submit" className="portal-primary" disabled={!canWrite||busy==="invite"}>{busy==="invite"?"Creando…":"Crear invitación"}</button></WorkflowForm>
      </>}

      {inviteUrl?<div className="portal-invite">
        <strong>Comparte este enlace</strong>
        <p>Mándasela por WhatsApp o por correo con el mensaje ya escrito, o copia el enlace. Es de un solo uso.</p>
        <div className="portal-send">
          <a className="is-whatsapp" href={whatsappUrl({phone:person?.phone,text:message})} target="_blank" rel="noreferrer"><HiChatBubbleLeftRight/> Enviar por WhatsApp{person?.phone?"":" (elige el contacto)"}</a>
          <a href={mailtoUrl({email:sendTo,subject:"Tu acceso al portal de residentes",body:message})}><HiEnvelope/> Enviar por correo{sendTo?` a ${sendTo}`:""}</a>
        </div>
        <div className="portal-link"><code>{inviteUrl}</code><button type="button" onClick={copy}><HiClipboardDocument/> Copiar</button></div>
      </div>:invite?<p role="status">{invite.status==="active"?"La cuenta ya está activa. Puede entrar desde el acceso del portal.":"La cuenta ya tiene una invitación pendiente; el servidor no devolvió un enlace nuevo. Solicita su reemisión al administrador."}</p>:null}
    </div>
  </Modal>{confirmationDialog}</>;
}

export default PortalAccessModal;
