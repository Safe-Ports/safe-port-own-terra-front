import WorkflowForm from "@/components/forms/WorkflowForm";
import "../components/properties-ui.css";
import { useEffect, useState } from "react";
import { HiArrowRight, HiBuildingOffice2, HiCheckCircle, HiDevicePhoneMobile, HiEnvelope, HiKey, HiShieldCheck, HiUser } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import propertiesPortalService from "@/services/propertiesPortalService";
import propertiesService from "@/services/propertiesService";
import FieldError from "@/components/shared/FieldError";
import InlineError from "@/components/shared/InlineError";
import { parseApiError, validationMessage } from "@/errors/parseApiError";
import PropertiesLogo from "../components/PropertiesLogo";
import PrivacyConsent, { emptyConsent, isConsentValid, buildConsentBooleans } from "@/components/legal/PrivacyConsent";
import "./service-access.css";
import "./portal-login.css";

const emptyApplication={name:"",representativeName:"",email:"",phone:"",specialtyIds:[],coverage:"",experience:""};

function ServiceBrand(){return <div className="service-auth-brand"><span><HiShieldCheck/></span><div><strong>OwnTerra</strong><small>Servicio</small></div></div>}

export function ServiceLogin(){
  const navigate=useNavigate();
  const [credentials,setCredentials]=useState({email:"",password:""});
  const [error,setError]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const submit=async(event)=>{event.preventDefault();setError("");setSubmitting(true);try{await propertiesPortalService.login(credentials);navigate("/portal-comunidad");}catch(requestError){setError(requestError.response?.data?.error?.message||"No pudimos iniciar sesión. Revisa tus credenciales.");}finally{setSubmitting(false)}};
  // Mismo lenguaje visual de Comunidades (logo de Properties, foto de condominio y tarjeta
  // flotante) sólo en este login; invitación y recuperación siguen con su estilo.
  return <main className="service-auth-page portal-login"><section className="service-auth-story"><PropertiesLogo/><div><span>Portal de comunidad</span><h1>Tu comunidad.<br/>Tu información.</h1><p>Consulta unidades, estado de cuenta, comunicados, votaciones y paquetes con el acceso que te asignó la administración.</p></div><footer><HiShieldCheck/> Acceso limitado por organización, persona y permisos.</footer></section><section className="service-auth-card"><div className="service-auth-box"><header><span>Propietarios y residentes</span><h2>Inicia sesión</h2><p>Usa el correo y la contraseña que activaste desde tu invitación.</p></header><WorkflowForm onSubmit={submit}><label><span>Correo</span><div><HiEnvelope/><input type="email" required value={credentials.email} onChange={event=>setCredentials({...credentials,email:event.target.value})} placeholder="correo@ejemplo.mx"/></div></label><label><span>Contraseña</span><div><HiKey/><input required type="password" value={credentials.password} onChange={event=>setCredentials({...credentials,password:event.target.value})} placeholder="••••••••"/></div></label>{error?<p role="alert">{error}</p>:null}<button type="submit" disabled={submitting}>{submitting?"Ingresando…":"Entrar al portal"}<HiArrowRight/></button></WorkflowForm><footer><button type="button" onClick={()=>navigate("/portal/recuperar")}>Olvidé mi contraseña</button><br/>¿Recibiste una invitación nueva? <button onClick={()=>navigate("/portal/invitacion")}>Activar acceso</button></footer></div></section></main>;
}

export function ServiceInvitation(){
  const navigate=useNavigate();
  const params=new URLSearchParams(window.location.search);
  const [form,setForm]=useState({token:params.get("token")||"",password:"",confirmation:""});
  const [error,setError]=useState("");
  const [done,setDone]=useState(false);
  const [activating,setActivating]=useState(false);
  const submit=async(event)=>{event.preventDefault();if(form.password!==form.confirmation){setError("Las contraseñas no coinciden.");return;}setError("");setActivating(true);try{await propertiesPortalService.acceptInvite({token:form.token,new_password:form.password});setForm(current=>({...current,password:"",confirmation:""}));setDone(true);}catch(requestError){setError(validationMessage(requestError)||requestError.response?.data?.error?.message||"La invitación no es válida o ya expiró.");}finally{setActivating(false)}};
  return <main className="service-auth-page portal-login"><section className="service-auth-story"><PropertiesLogo/><div><span>Invitación protegida</span><h1>Activa tu acceso.</h1><p>La administración define exactamente qué inmuebles y funciones puedes consultar.</p></div><footer><HiShieldCheck/> Tu cuenta del portal no da acceso a la administración.</footer></section><section className="service-auth-card"><div className="service-auth-box">{done?<section className="invitation-success" role="status"><HiCheckCircle/><h2>Acceso activado</h2><p>Ya puedes iniciar sesión en el portal de tu comunidad.</p><button className="invitation-next" onClick={()=>navigate("/portal/acceso")}>Iniciar sesión <HiArrowRight/></button></section>:<><header><span>Invitación de la administración</span><h2>Define tu contraseña</h2><p>Confirma el código de tu invitación y elige tu contraseña.</p></header><WorkflowForm onSubmit={submit}><label><span>Token de invitación</span><input required value={form.token} onChange={event=>setForm({...form,token:event.target.value})}/></label><label><span>Contraseña</span><input required type="password" autoComplete="new-password" value={form.password} onChange={event=>setForm({...form,password:event.target.value})}/></label><label><span>Confirmar contraseña</span><input required type="password" autoComplete="new-password" value={form.confirmation} onChange={event=>setForm({...form,confirmation:event.target.value})}/></label>{error?<p role="alert">{error}</p>:null}<button type="submit" disabled={activating}>{activating?"Activando…":"Activar acceso"} <HiArrowRight/></button></WorkflowForm><footer>¿Ya activaste tu cuenta? <button type="button" onClick={()=>navigate("/portal/acceso")}>Inicia sesión</button></footer></>}</div></section></main>;
}

export function ServiceRegistration(){
  const navigate=useNavigate();
  // Query param, no path param: esta página la renderiza App.jsx DIRECTO
  // (fuera del árbol de <Routes>, igual que ServiceLogin/ServiceInvitation),
  // así que useParams() nunca vería un :token de ruta.
  const token=new URLSearchParams(window.location.search).get("token")||"";
  const [type,setType]=useState("independent");
  const [form,setForm]=useState(emptyApplication);
  const [info,setInfo]=useState(null);
  const [linkError,setLinkError]=useState(null);
  const [fieldErrors,setFieldErrors]=useState({});
  const [retry,setRetry]=useState(0);
  const [loading,setLoading]=useState(Boolean(token));
  const [submitError,setSubmitError]=useState(null);
  const [submitting,setSubmitting]=useState(false);
  const [ack,setAck]=useState(null);
  const [consent,setConsent]=useState(emptyConsent());

  useEffect(()=>{
    if(!token){setLoading(false);return;}
    let active=true;setLoading(true);setLinkError(null);
    propertiesService.serviceNetwork.public.info(token)
      .then(result=>{if(active)setInfo(result);})
      .catch(error=>{if(active)setLinkError(parseApiError(error,"Este enlace de inscripción no es válido."));})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[token,retry]);

  const toggleSpecialty=id=>setForm(current=>({...current,specialtyIds:current.specialtyIds.includes(id)?current.specialtyIds.filter(item=>item!==id):[...current.specialtyIds,id]}));

  const submit=async event=>{
    event.preventDefault();
    const errors={};
    if(!form.name.trim())errors.name="Escribe tu nombre o razón social.";
    if(type==="company"&&!form.representativeName.trim())errors.representativeName="Escribe el nombre del representante.";
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))errors.email="Escribe un correo válido.";
    if(!form.phone.trim())errors.phone="Escribe un teléfono de contacto.";
    setFieldErrors(errors);setSubmitError(null);
    if(Object.keys(errors).length)return;
    if(!isConsentValid(consent)){setSubmitError({message:"Acepta el Aviso de Privacidad y los términos y condiciones para enviar la solicitud."});return;}
    setSubmitting(true);
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
        ...buildConsentBooleans(consent),
      });
      setAck(result);
    }catch(error){
      setSubmitError(parseApiError(error,"No pudimos enviar tu solicitud. Intenta de nuevo."));
    }finally{
      setSubmitting(false);
    }
  };

  if(!token) return <main className="service-registration-page"><header><ServiceBrand/><button type="button" onClick={()=>navigate("/portal/acceso")}>Ya tengo cuenta</button></header><section className="service-registration-card"><aside><span>Red de servicio</span><h1>Falta el enlace de inscripción.</h1><p>Pide a la administración el enlace de inscripción de proveedores — este formulario no acepta registros sin uno.</p></aside></section></main>;

  if(loading) return <main className="service-registration-page"><section className="service-registration-card"><aside><span>Red de servicio</span><h1 role="status">Cargando formulario…</h1></aside></section></main>;

  if(linkError) return <main className="service-registration-page"><header><ServiceBrand/></header><section className="service-registration-card"><aside><span>Red de servicio</span><h1>No pudimos abrir el formulario.</h1><InlineError error={linkError}/><p>Si el enlace venció o fue revocado, pide uno nuevo a la administración.</p><button type="button" onClick={()=>setRetry(value=>value+1)}>Reintentar</button></aside></section></main>;

  return <main className="service-registration-page"><header><ServiceBrand/><button type="button" onClick={()=>navigate("/portal/acceso")}>Ya tengo cuenta</button></header><section className="service-registration-card"><aside><span>Red de servicio{info?.organization_name?` de ${info.organization_name}`:""}</span><h1>Ofrece tus servicios profesionales.</h1><p>Crea una solicitud para colaborar en mantenimientos y operaciones inmobiliarias. La administración revisará tu perfil antes de habilitar asignaciones.</p><ol><li><strong>1</strong><span>Completa tu perfil y cobertura.</span></li><li><strong>2</strong><span>La administración revisa tu solicitud.</span></li><li><strong>3</strong><span>Si es aprobada, la administración te integra a su red.</span></li></ol><small>Registrarte no da acceso automático a propiedades ni información privada.</small></aside><div>{!ack?<><header><span>Solicitud de colaboración</span><h2>Cuéntanos quién eres</h2></header><div className="registration-types"><button type="button" aria-pressed={type==="independent"} className={type==="independent"?"active":""} onClick={()=>setType("independent")}><HiUser/><span><strong>Profesional independiente</strong><small>Trabajo por cuenta propia.</small></span></button><button type="button" aria-pressed={type==="company"} className={type==="company"?"active":""} onClick={()=>setType("company")}><HiBuildingOffice2/><span><strong>Empresa proveedora</strong><small>Tengo coordinadores o técnicos.</small></span></button></div><WorkflowForm noValidate onSubmit={submit}><label><span>{type==="company"?"Razón social":"Nombre completo"}</span><input aria-invalid={Boolean(fieldErrors.name)} required value={form.name} onChange={event=>setForm({...form,name:event.target.value})} placeholder={type==="company"?"Nombre legal de la empresa":"Tu nombre y apellidos"}/><FieldError msg={fieldErrors.name}/></label>{type==="company"?<label><span>Representante</span><input aria-invalid={Boolean(fieldErrors.representativeName)} required value={form.representativeName} onChange={event=>setForm({...form,representativeName:event.target.value})} placeholder="Nombre del contacto principal"/><FieldError msg={fieldErrors.representativeName}/></label>:null}<label><span>Correo</span><input aria-invalid={Boolean(fieldErrors.email)} autoComplete="email" required type="email" value={form.email} onChange={event=>setForm({...form,email:event.target.value})} placeholder="contacto@correo.mx"/><FieldError msg={fieldErrors.email}/></label><label><span>WhatsApp</span><input aria-invalid={Boolean(fieldErrors.phone)} type="tel" autoComplete="tel" required value={form.phone} onChange={event=>setForm({...form,phone:event.target.value})} placeholder="+52 55 0000 0000"/><FieldError msg={fieldErrors.phone}/></label><fieldset className="wide service-specialty-field"><legend>Especialidades</legend><div className="registration-specialties">{(info?.specialties||[]).map(specialty=><label key={specialty.id} className="registration-specialty-chip"><input type="checkbox" checked={form.specialtyIds.includes(specialty.id)} onChange={()=>toggleSpecialty(specialty.id)}/> {specialty.label}</label>)}</div></fieldset><label><span>Zona de cobertura</span><input value={form.coverage} onChange={event=>setForm({...form,coverage:event.target.value})} placeholder="Municipios, ciudades o colonias"/></label><label className="wide"><span>Experiencia y servicios</span><textarea rows="3" value={form.experience} onChange={event=>setForm({...form,experience:event.target.value})} placeholder="Describe brevemente qué trabajos realizas…"/></label><p className="wide registration-confirm-note">Confirmo que la información proporcionada es correcta y acepto que la administración revise mi solicitud.</p><div className="wide"><PrivacyConsent value={consent} onChange={setConsent} idPrefix="service-registration-consent"/></div><InlineError error={submitError}/><button type="submit" disabled={submitting||!isConsentValid(consent)}>{submitting?"Enviando…":"Enviar solicitud para revisión"} <HiArrowRight/></button></WorkflowForm></>:<section className="registration-sent" role="status"><HiCheckCircle/><span>Solicitud {ack.folio}</span><h2>Tu perfil está en revisión.</h2><p>Recibimos tu información. Conserva tu folio y consulta el seguimiento con la administración. Enviar la solicitud no habilita acceso a la comunidad.</p><div><small>Estado actual</small><strong>Pendiente de revisión</strong></div><button type="button" onClick={()=>navigate("/portal/acceso")}>Ir al inicio de sesión</button></section>}</div></section><footer>Registro administrado por OwnTerra · Servicio</footer></main>;
}
