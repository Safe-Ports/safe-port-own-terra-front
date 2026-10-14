import "../components/properties-ui.css";
import { useEffect, useMemo, useState } from "react";
import { HiArrowRightOnRectangle, HiBanknotes, HiBellAlert, HiBuildingOffice2, HiCheckCircle, HiHomeModern, HiKey, HiMegaphone, HiScale, HiUserCircle } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import propertiesPortalService from "@/services/propertiesPortalService";
import PropertiesLogo from "../components/PropertiesLogo";
import PortalHome from "./PortalHome";
import SpecSheet from "../features/specs/SpecSheet";
import { unitSpecSheet } from "../features/specs/specModel";
import "./community-portal.css";
import "./community-portal-theme.css";

const VOTE_STATUS={draft:"Borrador",open:"Abierta",closed:"Cerrada",cancelled:"Cancelada"};
// El backend manda el estado del cargo en inglés; la residente lo lee en español.
const CHARGE_STATUS={pending:"Pendiente",overdue:"Vencido",partial:"Pago parcial",paid:"Pagado",waived:"Condonado",due_soon:"Por vencer"};
const shortDate=(value)=>value?new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString("es-MX",{day:"numeric",month:"short",year:"numeric"}):"";

const money=(value,currency="MXN")=>new Intl.NumberFormat("es-MX",{style:"currency",currency}).format(Number(value)||0);
function CommunityPortal(){
  const navigate=useNavigate();const [section,setSection]=useState("home");const [state,setState]=useState({me:null,units:[],statement:null,relations:[],announcements:[],votes:[],packages:[]});const [loading,setLoading]=useState(true);const [error,setError]=useState("");
  const load=async()=>{if(!propertiesPortalService.hasSession()){navigate("/portal/acceso",{replace:true});return}setLoading(true);setError("");try{const [identity,me,units,relations,statement,announcements,votes,packages]=await Promise.all([propertiesPortalService.identity(),propertiesPortalService.me(),propertiesPortalService.units(),propertiesPortalService.relations(),propertiesPortalService.statement(),propertiesPortalService.announcements(),propertiesPortalService.votes(),propertiesPortalService.packages()]);if(identity.organization_id&&me.organization_id&&identity.organization_id!==me.organization_id)throw new Error("No pudimos verificar la organización de tu cuenta.");setState({me:{...me,email:identity.email},units,relations,statement,announcements,votes,packages})}catch(requestError){if(requestError.response?.status===401||!propertiesPortalService.hasSession()){propertiesPortalService.logout();navigate("/portal/acceso",{replace:true});return}setError(requestError.response?.data?.error?.message||requestError.message||"No pudimos cargar el portal.")}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const nav=[["home",HiHomeModern,"Mi comunidad"],["unit",HiBuildingOffice2,"Mi unidad"],["charges",HiBanknotes,"Estado de cuenta"],["notices",HiMegaphone,"Comunicados"],["votes",HiScale,"Votaciones"],["packages",HiKey,"Paquetería"]];const title=useMemo(()=>nav.find(([key])=>key===section)?.[2],[section]);const unread=state.announcements.filter(item=>!item.read_at).length;const unit=state.units[0];const roleLabels={owner:"Propietario",resident:"Residente",tenant:"Inquilino",board_member:"Comité"};const relationByUnit=Object.fromEntries(state.relations.map(item=>[item.property_id,item]));
  const [reading,setReading]=useState(null);
  const [readError,setReadError]=useState({});
  const markRead=async(id)=>{
    setReading(id);setReadError(current=>({...current,[id]:null}));
    try{await propertiesPortalService.markAnnouncementRead(id);await load()}
    catch(error){setReadError(current=>({...current,[id]:error.response?.data?.error?.message||"No pudimos marcar el comunicado como leído. Intenta de nuevo."}))}
    finally{setReading(null)}
  };
  // Antes esto era un await suelto: si el backend respondía 409 ("ya emitió su
  // boleta") el error se perdía y la pantalla no cambiaba. La residente picaba
  // y no sabía si había votado.
  const [voting,setVoting]=useState(null);
  const [voteNote,setVoteNote]=useState({});
  const castVote=async(id,optionId)=>{
    setVoting(id);
    try{
      await propertiesPortalService.vote(id,optionId);
      setVoteNote(current=>({...current,[id]:{tone:"ok",done:true,text:"Tu voto quedó registrado."}}));
      await load();
    }catch(error){
      const status=error.response?.status;
      setVoteNote(current=>({...current,[id]:{tone:"warn",done:status===409,
        text:error.response?.data?.error?.message||(status===409?"No fue posible registrar el voto. Actualiza para consultar su estado.":"No pudimos registrar tu voto. Intenta de nuevo.")}}));
    }finally{ setVoting(null); }
  };
  if(loading)return <main className="community-portal-main"><p>Cargando tu comunidad…</p></main>;
  if(error)return <main className="community-portal-main"><h1>No pudimos abrir el portal</h1><p role="alert">{error}</p><button onClick={load}>Reintentar</button></main>;
  return <div className="community-portal-shell"><aside className="community-portal-nav"><header><PropertiesLogo/><span>PORTAL COMUNIDAD</span></header><nav>{nav.map(([key,Icon,label])=><button type="button" key={key} aria-label={label} className={section===key?"active":""} onClick={()=>setSection(key)}><Icon/><span>{label}</span>{key==="notices"&&unread?<i>{unread}</i>:null}</button>)}</nav><footer><span>{state.me?.nombre?.split(" ").slice(0,2).map(word=>word[0]).join("")}</span><div><strong>{state.me?.nombre}</strong><small>{state.me?.email}</small></div><button type="button" aria-label="Cerrar sesión del portal" onClick={()=>{propertiesPortalService.logout();navigate("/portal/acceso")}}><HiUserCircle/></button></footer></aside><main className="community-portal-main"><header><div><small>{state.units.length>1?"Todas mis unidades":unit?.label||"Portal personal"}</small><h1>{title}</h1></div><button type="button" className="community-bell" aria-label="Ver comunicados" onClick={()=>setSection("notices")}><HiBellAlert/>{unread?<i>{unread}</i>:null}</button><button type="button" className="community-header-logout" aria-label="Salir del portal" onClick={()=>{propertiesPortalService.logout();navigate("/portal/acceso")}}><HiArrowRightOnRectangle/></button></header>
    {section==="home"?<PortalHome me={state.me} units={state.units} relations={state.relations} statement={state.statement} announcements={state.announcements} votes={state.votes} packages={state.packages} onOpen={setSection}/>:null}
    {section==="unit"?<section className="community-section"><header><div><span>Tus espacios</span><p>Características de las unidades a las que tienes acceso.</p></div></header><div className="community-unit-specs">{state.units.map(item=><article key={item.id}><h3>{item.label}</h3><p>{relationByUnit[item.id]?.via_grant?"Acceso de consulta":(relationByUnit[item.id]?.roles||[]).map(role=>roleLabels[role]||role).join(" · ")}</p><SpecSheet {...unitSpecSheet(item.attributes)} label={`Ficha técnica de ${item.label}`} emptyText="La administración aún no registra la ficha de esta unidad."/></article>)}{!state.units.length?<p><HiCheckCircle/> Aún no tienes unidades asignadas.</p>:null}</div></section>:null}
    {section==="charges"?<section className="community-section"><header><div><span>Información personal</span><p>Sólo se muestran cargos asociados a tu persona.</p></div></header><div className="community-list">{state.statement?.open_charges?.map(item=><article key={item.id}><HiBanknotes/><div><strong>{item.concept}</strong><small>{state.units.find(unit=>unit.id===item.property_id)?.label||"Cargo asociado a tu persona"} · Vence {shortDate(item.due_date)}</small></div><i className={item.status==="overdue"?"due":"new"}>{CHARGE_STATUS[item.status]||item.status}</i><b>{money(Number(item.amount)-Number(item.paid_amount),item.currency)}</b></article>)}{!state.statement?.open_charges?.length?<p><HiCheckCircle/> No tienes cargos pendientes.</p>:null}</div></section>:null}
    {section==="notices"?<section className="community-section"><header><div><span>Información oficial</span><p>Avisos que publica la administración de tu comunidad.</p></div></header><div className="community-list">{!state.announcements.length?<p><HiCheckCircle/> No hay comunicados publicados.</p>:null}{state.announcements.map(item=><article key={item.id}><HiMegaphone/><div><strong>{item.title}</strong><small>{item.body}</small>{readError[item.id]?<p role="alert">{readError[item.id]}</p>:null}</div>{!item.read_at?<button type="button" disabled={reading===item.id} onClick={()=>markRead(item.id)}>{reading===item.id?"Guardando…":"Marcar leído"}</button>:<i className="ok">Leído</i>}</article>)}</div></section>:null}
    {section==="votes"?<section className="community-section"><header><div><span>Participación</span><p>Decisiones de la comunidad en las que puedes participar.</p></div></header>{state.votes.length?state.votes.map(item=>{const note=voteNote[item.id];const busy=voting===item.id;return <article className="community-vote" key={item.id}><HiScale/><div><small>{VOTE_STATUS[item.status]||item.status}{item.closes_at?` · cierra el ${new Date(item.closes_at).toLocaleDateString("es-MX",{day:"numeric",month:"long"})}`:" · sin fecha de cierre"}</small><h3>{item.question}</h3>{note?<p className={`community-vote-note ${note.tone}`} role="status">{note.text}</p>:null}</div>{item.status==="open"&&!note?.done?<footer>{item.options.map(option=><button key={option.id} disabled={busy} onClick={()=>castVote(item.id,option.id)}>{busy?"Enviando…":option.label}</button>)}</footer>:item.status!=="open"?<i>Cerrada</i>:null}</article>;}):<p className="community-empty">No hay votaciones abiertas en tu comunidad.</p>}</section>:null}
    {section==="packages"?<section className="community-section"><header><div><span>Recepción</span><p>Paquetes que recepción registró a tu nombre.</p></div></header><div className="community-list">{!state.packages.length?<p><HiCheckCircle/> No tienes paquetes en recepción.</p>:null}{state.packages.map(item=><article key={item.id}><HiKey/><div><strong>{item.carrier||"Paquete"}</strong><small>{item.tracking_number||"Sin guía"} · recibido {new Date(item.received_at).toLocaleString("es-MX")}</small></div><i className={item.status==="delivered"?"ok":"new"}>{item.status==="delivered"?"Entregado":"En recepción"}</i></article>)}</div></section>:null}
    <footer>La información visible depende de tus relaciones y permisos activos.</footer></main></div>;
}
export default CommunityPortal;
