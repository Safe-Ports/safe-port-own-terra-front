import { useEffect, useState } from "react";
import { HiArrowRight, HiBuildingOffice2, HiCheckCircle, HiDevicePhoneMobile, HiEnvelope, HiKey, HiShieldCheck, HiUser } from "react-icons/hi2";
import { useNavigate, useParams } from "react-router-dom";
import propertiesPortalService from "@/services/propertiesPortalService";
import propertiesService from "@/services/propertiesService";
import "./service-access.css";

const emptyApplication={name:"",representativeName:"",email:"",phone:"",specialtyIds:[],coverage:"",experience:"",consent:false};

function ServiceBrand(){return <div className="service-auth-brand"><span><HiShieldCheck/></span><div><strong>OwnTerra</strong><small>Servicio</small></div></div>}

export function ServiceLogin(){
  const navigate=useNavigate();
  const [credentials,setCredentials]=useState({email:"",password:""});
  const [error,setError]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const submit=async(event)=>{event.preventDefault();setError("");setSubmitting(true);try{await propertiesPortalService.login(credentials);navigate("/portal-comunidad");}catch(requestError){setError(requestError.response?.data?.error?.message||"No pudimos iniciar sesión. Revisa tus credenciales.");}finally{setSubmitting(false)}};
  return <main className="service-auth-page"><section className="service-auth-story"><ServiceBrand/><div><span>Portal de comunidad</span><h1>Tu comunidad.<br/>Tu información.</h1><p>Consulta unidades, estado de cuenta, comunicados, votaciones y paquetes con el acceso que te asignó la administración.</p></div><footer><HiShieldCheck/> Acceso limitado por organización, persona y permisos.</footer></section><section className="service-auth-card"><div className="service-auth-box"><header><span>Propietarios y residentes</span><h2>Inicia sesión</h2><p>Usa el correo y la contraseña que activaste desde tu invitación.</p></header><form onSubmit={submit}><label><span>Correo</span><div><HiEnvelope/><input type="email" required value={credentials.email} onChange={event=>setCredentials({...credentials,email:event.target.value})} placeholder="correo@ejemplo.mx"/></div></label><label><span>Contraseña</span><div><HiKey/><input required type="password" value={credentials.password} onChange={event=>setCredentials({...credentials,password:event.target.value})} placeholder="••••••••"/></div></label>{error?<p role="alert">{error}</p>:null}<button type="submit" disabled={submitting}>{submitting?"Ingresando…":"Entrar al portal"}<HiArrowRight/></button></form><footer>¿Recibiste una invitación nueva? <button onClick={()=>navigate("/servicio/invitacion")}>Activar acceso</button></footer></div></section></main>;
}

export function ServiceInvitation(){
  const navigate=useNavigate();
  const params=new URLSearchParams(window.location.search);
  const [form,setForm]=useState({token:params.get("token")||"",password:"",confirmation:""});
  const [error,setError]=useState("");
  const [done,setDone]=useState(false);
  const submit=async(event)=>{event.preventDefault();if(form.password!==form.confirmation){setError("Las contraseñas no coinciden.");return;}setError("");try{await propertiesPortalService.acceptInvite({token:form.token,password:form.password});setDone(true);}catch(requestError){setError(requestError.response?.data?.error?.message||"La invitación no es válida o ya expiró.");}};
  return <main className="service-invitation-page"><header><ServiceBrand/><span>Invitación protegida</span></header><section className="service-invitation-card"><div className="invitation-summary"><span>Portal OwnTerra Properties</span><h1>Activa tu acceso.</h1><p>La administración define exactamente qué inmuebles y funciones puedes consultar.</p><div><HiShieldCheck/><span><strong>Acceso controlado</strong><small>Tu sesión no funciona en los endpoints administrativos.</small></span></div></div><div className="invitation-form">{done?<section className="invitation-success"><HiCheckCircle/><h2>Acceso activado</h2><p>Ya puedes iniciar sesión en el portal de tu comunidad.</p><button className="invitation-next" onClick={()=>navigate("/servicio/login")}>Iniciar sesión <HiArrowRight/></button></section>:<form onSubmit={submit}><header><span>Invitación de la administración</span><h2>Define tu contraseña</h2></header><label><span>Token de invitación</span><input required value={form.token} onChange={event=>setForm({...form,token:event.target.value})}/></label><label><span>Contraseña</span><input required minLength="8" type="password" value={form.password} onChange={event=>setForm({...form,password:event.target.value})}/></label><label><span>Confirmar contraseña</span><input required minLength="8" type="password" value={form.confirmation} onChange={event=>setForm({...form,confirmation:event.target.value})}/></label>{error?<p role="alert">{error}</p>:null}<button className="invitation-next" type="submit">Activar acceso <HiArrowRight/></button></form>}</div></section></main>;
}

export function ServiceRegistration(){
  const navigate=useNavigate();
  const {token}=useParams();
  const [type,setType]=useState("independent");
  const [form,setForm]=useState(emptyApplication);
  const [info,setInfo]=useState(null);
  const [linkError,setLinkError]=useState("");
  const [loading,setLoading]=useState(Boolean(token));
  const [submitError,setSubmitError]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [ack,setAck]=useState(null);

  useEffect(()=>{
    if(!token){setLoading(false);return;}
    let active=true;
    propertiesService.serviceNetwork.public.info(token)
      .then(result=>{if(active)setInfo(result);})
      .catch(error=>{if(active)setLinkError(error.response?.data?.error?.message||"Este enlace de inscripción no es válido.");})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[token]);

  const toggleSpecialty=id=>setForm(current=>({...current,specialtyIds:current.specialtyIds.includes(id)?current.specialtyIds.filter(item=>item!==id):[...current.specialtyIds,id]}));

  const submit=async event=>{
    event.preventDefault();
    if(!form.consent){setSubmitError("Debes aceptar el consentimiento para enviar la solicitud.");return;}
    setSubmitError("");setSubmitting(true);
    try{
      const result=await propertiesService.serviceNetwork.public.apply(token,{
        kind:type,
        name:form.name.trim(),
        representative_name:type==="company"?form.representativeName.trim()||null:null,
        email:form.email.trim(),
        phone:form.phone.trim()||null,
        specialty_ids:form.specialtyIds,
        coverage:form.coverage.trim()||null,
        experience:form.experience.trim()||null,
        consent_version:"2026-10-08",
        consent_accepted:true,
      });
      setAck(result);
    }catch(error){
      setSubmitError(error.response?.data?.error?.message||"No pudimos enviar tu solicitud. Intenta de nuevo.");
    }finally{
      setSubmitting(false);
    }
  };

  if(!token) return <main className="service-registration-page"><header><ServiceBrand/><button type="button" onClick={()=>navigate("/servicio/login")}>Ya tengo cuenta</button></header><section className="service-registration-card"><aside><span>Red de servicio</span><h1>Falta el enlace de inscripción.</h1><p>Pide a la administración el enlace de inscripción de proveedores — este formulario no acepta registros sin uno.</p></aside></section></main>;

  if(loading) return <main className="service-registration-page"><section className="service-registration-card"><aside><span>Red de servicio</span><h1>Cargando…</h1></aside></section></main>;

  if(linkError) return <main className="service-registration-page"><header><ServiceBrand/></header><section className="service-registration-card"><aside><span>Red de servicio</span><h1>{linkError}</h1><p>Pide a la administración un enlace nuevo.</p></aside></section></main>;

  return <main className="service-registration-page"><header><ServiceBrand/><button type="button" onClick={()=>navigate("/servicio/login")}>Ya tengo cuenta</button></header><section className="service-registration-card"><aside><span>Red de servicio{info?.organization_name?` de ${info.organization_name}`:""}</span><h1>Ofrece tus servicios profesionales.</h1><p>Crea una solicitud para colaborar en mantenimientos y operaciones inmobiliarias. La administración revisará tu perfil antes de habilitar asignaciones.</p><ol><li><strong>1</strong><span>Completa tu perfil y cobertura.</span></li><li><strong>2</strong><span>La administración revisa tu solicitud.</span></li><li><strong>3</strong><span>Si es aprobada, activas tu Portal de servicio.</span></li></ol><small>Registrarte no da acceso automático a propiedades ni información privada.</small></aside><div>{!ack?<><header><span>Solicitud de colaboración</span><h2>Cuéntanos quién eres</h2></header><div className="registration-types"><button type="button" className={type==="independent"?"active":""} onClick={()=>setType("independent")}><HiUser/><span><strong>Profesional independiente</strong><small>Trabajo por cuenta propia.</small></span></button><button type="button" className={type==="company"?"active":""} onClick={()=>setType("company")}><HiBuildingOffice2/><span><strong>Empresa proveedora</strong><small>Tengo coordinadores o técnicos.</small></span></button></div><form onSubmit={submit}><label><span>{type==="company"?"Razón social":"Nombre completo"}</span><input required value={form.name} onChange={event=>setForm({...form,name:event.target.value})} placeholder={type==="company"?"Nombre legal de la empresa":"Tu nombre y apellidos"}/></label>{type==="company"?<label><span>Representante</span><input required value={form.representativeName} onChange={event=>setForm({...form,representativeName:event.target.value})} placeholder="Nombre del contacto principal"/></label>:null}<label><span>Correo</span><input required type="email" value={form.email} onChange={event=>setForm({...form,email:event.target.value})} placeholder="contacto@correo.mx"/></label><label><span>WhatsApp</span><input required value={form.phone} onChange={event=>setForm({...form,phone:event.target.value})} placeholder="+52 55 0000 0000"/></label><label className="wide"><span>Especialidades</span><div className="registration-specialties">{(info?.specialties||[]).map(specialty=><label key={specialty.id} className="registration-specialty-chip"><input type="checkbox" checked={form.specialtyIds.includes(specialty.id)} onChange={()=>toggleSpecialty(specialty.id)}/> {specialty.label}</label>)}</div></label><label><span>Zona de cobertura</span><input value={form.coverage} onChange={event=>setForm({...form,coverage:event.target.value})} placeholder="Municipios, ciudades o colonias"/></label><label className="wide"><span>Experiencia y servicios</span><textarea rows="3" value={form.experience} onChange={event=>setForm({...form,experience:event.target.value})} placeholder="Describe brevemente qué trabajos realizas…"/></label><label className="wide registration-consent"><input type="checkbox" required checked={form.consent} onChange={event=>setForm({...form,consent:event.target.checked})}/><span>Confirmo que la información es correcta y acepto que la administración revise mi solicitud.</span></label>{submitError?<p role="alert">{submitError}</p>:null}<button type="submit" disabled={submitting}>{submitting?"Enviando…":"Enviar solicitud para revisión"} <HiArrowRight/></button></form></>:<section className="registration-sent"><HiCheckCircle/><span>Solicitud {ack.folio}</span><h2>Tu perfil está en revisión.</h2><p>Recibimos tu información. Te avisaremos por correo o WhatsApp cuando exista una decisión.</p><div><small>Estado actual</small><strong>Pendiente de revisión</strong></div><button type="button" onClick={()=>navigate("/servicio/login")}>Ir al inicio de sesión</button></section>}</div></section><footer>Registro administrado por OwnTerra · Servicio</footer></main>;
}
