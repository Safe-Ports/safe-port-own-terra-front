import { useMemo, useState } from "react";
import { HiArrowLeft, HiArrowRight, HiBanknotes, HiBuildingOffice2, HiCheckCircle, HiHomeModern, HiKey, HiLink, HiMegaphone, HiScale, HiSquares2X2, HiTicket, HiUserGroup } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import "./properties-guide.css";

// Cada paso se marca solo con los datos reales de la organización: `done` lee
// del contexto, no de un check que el usuario pueda palomear sin haberlo hecho.
// `state` distingue lo que el backend ya persiste de lo que todavía es
// prototipo con datos demo, para no prometer de más (ver AGENTS.md).
function buildStages(d){
  const activeUnits=d.units.filter(unit=>unit.status!=="archived");
  const people=d.communityPeople.filter(person=>person.status!=="archived");
  const relations=d.personUnitRelations.filter(rel=>rel.status!=="archived");
  return [
    {id:"base", title:"Poner el lugar en el sistema", caption:"Sin esto, ningún otro módulo puede funcionar.", icon:HiBuildingOffice2, steps:[
      {id:"community", label:"Crea tu primera comunidad", state:"live", to:"/properties/comunidades", cta:"Abrir Comunidades",
       done:d.communities.length>0, count:`${d.communities.length} creada${d.communities.length===1?"":"s"}`,
       what:"El asistente de tres pasos registra el inmueble y su comunidad en una sola operación.",
       how:["Entra a Comunidades. Si no tienes ninguna, el asistente aparece solo.","Paso 1: nombre, tipo de régimen y dirección.","Paso 2: indica si administra una o varias unidades.","Paso 3: cuota base, día de cobro y reglamento. Los tres son opcionales."]},
      {id:"units", label:"Registra las unidades", state:"live", to:"/properties/unidades", cta:"Abrir Unidades",
       done:activeUnits.length>0, count:`${activeUnits.length} unidad${activeUnits.length===1?"":"es"}`,
       what:"Departamentos, casas, locales o bodegas. Todo lo que se cobra, se reserva o se habita cuelga de una unidad.",
       how:["Botón Nueva unidad.","Elige la propiedad a la que pertenece y ponle identificador (Depto 301, Local A).","Si vas a cobrar por indiviso, captura el porcentaje en los atributos."]},
      {id:"people", label:"Da de alta a las personas", state:"live", to:"/properties/comunidades", cta:"Abrir directorio",
       done:people.length>0, count:`${people.length} persona${people.length===1?"":"s"}`,
       what:"Propietarios, residentes, inquilinos y comité. Las personas son de la organización, no de una sola comunidad.",
       how:["Comunidades, pestaña Directorio, botón Agregar persona.","Marca sus roles generales: propietario, residente, comité.","Aparecerá como Sin unidad hasta que la vincules en el paso siguiente."]},
      {id:"relations", label:"Vincula personas con unidades", state:"live", to:"/properties/comunidades", cta:"Abrir relaciones",
       done:relations.length>0, count:`${relations.length} vínculo${relations.length===1?"":"s"}`,
       what:"Este es el paso que desbloquea todo lo demás. Cuotas, votaciones, amenidades y portal dependen de él.",
       how:["Comunidades, pestaña Personas y unidades, botón Vincular persona.","Elige persona, unidad y el rol que tiene en ella.","Marca por separado: responsable de pago, derecho de voto, acceso a amenidades y autorizar accesos.","Son permisos independientes: un inquilino puede pagar sin votar."]},
    ]},
    {id:"dinero", title:"Cobrar", caption:"Cuotas recurrentes, cargos, pagos y cartera vencida.", icon:HiBanknotes, steps:[
      {id:"charges", label:"Emite cargos y registra pagos", state:"live", to:"/properties/comunidades/operacion", cta:"Abrir Cuotas y adeudos",
       done:d.condoCharges.length>0, count:`${d.condoCharges.length} cargo${d.condoCharges.length===1?"":"s"}`,
       what:"Cada cargo va contra una unidad y una persona responsable de pago. No existe el cargo a toda la comunidad.",
       how:["Operación diaria, pestaña Cuotas y adeudos.","Nuevo cargo: unidad, concepto, importe y vencimiento.","Registra el pago cuando entre, o condónalo con motivo si así se acordó.","Si una unidad no aparece, es que no tiene responsable de pago en sus relaciones."]},
      {id:"plans", label:"Define planes de cuota recurrente", state:"live", to:"/properties/comunidades/operacion", cta:"Abrir Planes de cuota",
       done:d.quotaPlans.length>0, count:`${d.quotaPlans.length} plan${d.quotaPlans.length===1?"":"es"}`,
       what:"Cuota ordinaria o extraordinaria, mensual o anual, plana o repartida por indiviso, con recargo por mora. Genera los cargos de todo el periodo de una vez.",
       how:["Operación diaria, pestaña Cuotas y adeudos, panel Planes de cuota.","Nuevo plan: concepto, importe, periodicidad y cómo se reparte.","Ya con el plan, botón Generar periodo: elige fechas y pulsa Simular.","La simulación te dice cuántos cargos saldrían, por cuánto, y qué unidades quedan fuera y por qué. No escribe nada.","Confirma solo si el resultado te cuadra. Repetir el mismo periodo no duplica cargos."]},
    ]},
    {id:"convivencia", title:"Comunicar y convivir", caption:"Avisos, espacios comunes y decisiones de la comunidad.", icon:HiMegaphone, steps:[
      {id:"announcements", label:"Publica comunicados", state:"live", to:"/properties/comunidades/operacion", cta:"Abrir Comunicados",
       done:d.announcements.length>0, count:`${d.announcements.length} comunicado${d.announcements.length===1?"":"s"}`,
       what:"Se guardan como borrador y se publican aparte. Un borrador no le llega a nadie.",
       how:["Operación diaria, pestaña Comunicados.","Escribe título y cuerpo, y elige la audiencia: todos, propietarios, residentes, inquilinos o comité.","Publícalo. Hasta entonces no aparece en el portal del residente.","Después puedes consultar quién lo leyó y cuándo."]},
      {id:"amenities", label:"Registra amenidades y sus reglas", state:"live", to:"/properties/comunidades/operacion", cta:"Abrir Amenidades",
       done:d.amenities.length>0, count:`${d.amenities.length} amenidad${d.amenities.length===1?"":"es"}`,
       what:"Salón, alberca, asador, cancha. Primero la amenidad con sus reglas; sin ella no hay nada que reservar.",
       how:["Operación diaria, pestaña Amenidades.","Captura capacidad, anticipación mínima, ventana de cancelación, costo y si requiere aprobación.","Ya con la amenidad creada puedes registrar reservaciones y confirmarlas o cancelarlas."]},
      {id:"votes", label:"Levanta una votación", state:"live", to:"/properties/comunidades/operacion", cta:"Abrir Comité y votaciones",
       done:d.votes.length>0, count:`${d.votes.length} votación${d.votes.length===1?"":"es"}`,
       what:"Borrador, abrir, recibir votos y cerrar. El cierre es manual: no hay cierre programado.",
       how:["Operación diaria, pestaña Comité y votaciones.","Escribe la pregunta y sus opciones.","Ábrela para que se pueda votar. Solo vota quien tiene derecho de voto en su relación.","Ciérrala tú mismo: ahí se calcula el quórum y se revelan los resultados."]},
    ]},
    {id:"acceso", title:"Recepción y portal", caption:"Paquetería y el acceso de los residentes a su propia información.", icon:HiKey, steps:[
      {id:"packages", label:"Controla la paquetería", state:"live", to:"/properties/accesos", cta:"Abrir Recepción",
       done:d.packages.length>0, count:`${d.packages.length} paquete${d.packages.length===1?"":"s"}`,
       what:"Registro de recepción y entrega con evidencia de quién recibió.",
       how:["Accesos, panel Paquetería. Registrar paquete: unidad, paquetería y guía.","Queda en Pendientes de entrega hasta que alguien lo recoja.","Botón Entregar: elige quién recibe de entre las personas vinculadas a esa unidad.","Los pases de visita que salen más abajo en esa pantalla siguen siendo prototipo: el backend no los tiene."]},
      {id:"portal", label:"Invita residentes al portal", state:"live", to:"/properties/comunidades", cta:"Abrir directorio",
       done:(d.portalIdentities||[]).length>0, count:`${(d.portalIdentities||[]).length} identidad${(d.portalIdentities||[]).length===1?"":"es"}`,
       what:"El residente entra con su propia cuenta y ve solo sus unidades, su saldo, sus avisos, sus votaciones y sus paquetes.",
       how:["Comunidades, pestaña Directorio. En la ficha de la persona, el botón de la llave.","Crea la invitación con su correo. Como todavía no hay envío de correo, copia el enlace y pásaselo tú.","Dale acceso a sus unidades: solo aparecen aquellas donde ya tiene relación.","Sin acceso otorgado entra al portal pero no ve nada.","Suspender corta su sesión de inmediato."]},
    ]},
    {id:"prototipo", title:"Todavía prototipo", caption:"Se ven completas, pero no hay backend detrás: los datos no se guardan.", icon:HiTicket, steps:[
      {id:"rentals", label:"Rentas, publicaciones y hospedaje", state:"demo", to:"/properties/rentas", cta:"Ver Rentas",
       done:false, count:"Datos demo",
       what:"Contratos, prospectos, publicaciones y reservas de hospedaje. Cero endpoints en el backend.",
       how:["Úsalo para enseñar la idea, nunca para operar.","Lo que captures aquí se pierde al recargar.","No lo presentes a un cliente como funcionalidad lista."]},
      {id:"tickets", label:"Tickets y servicios", state:"demo", to:"/properties/tickets", cta:"Ver Tickets",
       done:false, count:"Datos demo",
       what:"Incidencias, mantenimiento y medidores de servicios. Tampoco tienen contrato de backend.",
       how:["Mismo criterio: demostración, no operación.","Monitoreo por unidad solo puede mostrar datos derivados de los módulos que sí persisten."]},
    ]},
  ];
}

const STATE_LABEL={live:"Funciona completo", backend:"Backend listo, falta pantalla", demo:"Prototipo"};

function PropertiesGuidePage(){
  const navigate=useNavigate();
  const data=usePropertiesData();
  const [openStep,setOpenStep]=useState("community");
  const stages=useMemo(()=>buildStages(data),[data]);
  const steps=stages.flatMap(stage=>stage.steps);
  const real=steps.filter(step=>step.state!=="demo");
  const done=real.filter(step=>step.done).length;
  const next=real.find(step=>!step.done);

  return <EcoLayout active="properties" title="Guía de Properties" subtitle="Cómo dejar la operación lista, paso a paso">
    <main className="guide-page">
      <button className="guide-back" type="button" onClick={()=>navigate("/properties")}><HiArrowLeft/> Volver a Properties</button>

      <header className="guide-hero">
        <div>
          <span>Primeros pasos</span>
          <h1>De un inmueble vacío a una comunidad operando.</h1>
          <p>Cada paso se marca solo cuando tu organización ya tiene esos datos. El orden importa: cobrar, votar y reservar dependen de que antes existan unidades, personas y vínculos entre ellas.</p>
          {next?<button type="button" className="guide-next" onClick={()=>{setOpenStep(next.id);navigate(next.to)}}>Continuar con: {next.label} <HiArrowRight/></button>
            :<p className="guide-complete"><HiCheckCircle/> Tienes cubiertos los {real.length} pasos con backend real.</p>}
        </div>
        <aside className="guide-progress">
          <strong>{done}<span>/{real.length}</span></strong>
          <small>pasos completos</small>
          <div className="guide-bar"><i style={{width:`${real.length?Math.round(done/real.length*100):0}%`}}/></div>
        </aside>
      </header>

      {stages.map(stage=>{
        const Icon=stage.icon;
        return <section className="guide-stage" key={stage.id}>
          <header><span className="guide-stage-ico"><Icon/></span><div><h2>{stage.title}</h2><p>{stage.caption}</p></div></header>
          <ol>
            {stage.steps.map(step=>{
              const open=openStep===step.id;
              return <li key={step.id} className={`${step.done?"done":""} ${open?"open":""} state-${step.state}`}>
                <button type="button" className="guide-step-head" onClick={()=>setOpenStep(open?"":step.id)} aria-expanded={open}>
                  <i className="guide-mark">{step.done?<HiCheckCircle/>:null}</i>
                  <span className="guide-step-name"><strong>{step.label}</strong><small>{step.what}</small></span>
                  <span className="guide-step-meta"><em className={`guide-tag tag-${step.state}`}>{STATE_LABEL[step.state]}</em><b>{step.count}</b></span>
                </button>
                {open?<div className="guide-step-body">
                  <ol className="guide-how">{step.how.map((line,index)=><li key={index}>{line}</li>)}</ol>
                  <button type="button" className="guide-go" onClick={()=>navigate(step.to)}>{step.cta} <HiArrowRight/></button>
                </div>:null}
              </li>;
            })}
          </ol>
        </section>;
      })}

      <section className="guide-map">
        <h2>Dónde está cada cosa</h2>
        <div className="guide-map-grid">
          {[["Portafolio e inmuebles",HiBuildingOffice2,"/properties/portafolio"],
            ["Unidades",HiHomeModern,"/properties/unidades"],
            ["Propietarios",HiUserGroup,"/properties/propietarios"],
            ["Comunidades: configuración, directorio y vínculos",HiLink,"/properties/comunidades"],
            ["Operación diaria: cuotas, avisos, amenidades, comité",HiSquares2X2,"/properties/comunidades/operacion"],
            ["Accesos y recepción",HiKey,"/properties/accesos"],
            ["Monitoreo por unidad",HiScale,"/properties/monitoreo"]].map(([label,Icon,to])=>
            <button type="button" key={to} onClick={()=>navigate(to)}><Icon/><span>{label}</span><HiArrowRight/></button>)}
        </div>
      </section>
    </main>
  </EcoLayout>;
}

export default PropertiesGuidePage;
