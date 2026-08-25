import { useState } from "react";
import { HiArrowRight, HiBuildingOffice2, HiHomeModern, HiKey, HiOutlineSquares2X2, HiTag, HiUserGroup } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import "./properties-dashboard.css";

const paths = [
  { key:"communities", number:"01", label:"Condominios", caption:"Comunidad y operación", description:"Coordina unidades, atención, accesos y servicios del condominio.", action:"Abrir condominios", icon:HiBuildingOffice2, tone:"community", status:"Disponible", journey:["Configura","Conecta personas","Opera cuotas","Atiende"] },
  { key:"rentals", number:"02", label:"Rentas", caption:"Ocupación e ingresos", description:"Administra disponibilidad, contratos, cobranza y renovaciones.", action:"Abrir rentas", icon:HiKey, tone:"rentals", status:"Operativo", journey:["Prepara","Publica","Firma","Cobra"] },
  { key:"sales", number:"03", label:"Venta", caption:"Comercialización", description:"Prepara inmuebles, publicaciones, prospectos, visitas y ofertas.", action:"Abrir ventas", icon:HiTag, tone:"sales", status:"Vista previa", journey:["Prepara","Atrae","Visita","Negocia"] },
];

function PropertyPathCard({ path, onOpen, preview, dimmed, onPreview }) {
  const Icon=path.icon;
  return <button type="button" className={`property-path-card ${path.tone} ${preview?"is-preview":""} ${dimmed?"is-dimmed":""}`} onClick={onOpen} onMouseEnter={()=>onPreview(path.key)} onMouseLeave={()=>onPreview(null)} onFocus={()=>onPreview(path.key)} onBlur={()=>onPreview(null)} aria-label={`${path.action}: ${path.label}`}>
    <span className="property-path-number" aria-hidden="true">{path.number}</span>
    <span className="property-path-intro"><span className="property-path-icon"><Icon/></span><span className="property-path-copy"><small>{path.caption}</small><strong>{path.label}</strong><em>{path.description}</em></span></span>
    <span className="property-path-journey" aria-hidden="true"><small>Flujo principal</small><span>{path.journey.map((stage,index)=><i key={stage} style={{"--stage":index}}><b>{index+1}</b>{stage}</i>)}</span></span>
    <span className="property-path-foot"><i>{path.status}</i><b>{path.action} <HiArrowRight/></b></span>
  </button>;
}

function PropertiesDashboard(){
  const navigate=useNavigate();
  const {currentUser}=useAppContext();
  const {properties,units}=usePropertiesData();
  const [previewPath,setPreviewPath]=useState(null);
  const organizationName=currentUser?.organization?.name||currentUser?.organization||"Tu organización";
  const firstName=currentUser?.name?.split(" ")[0]||"equipo";
  const activeProperties=properties.filter(property=>property.status!=="archived").length;
  const activeUnits=units.filter(unit=>unit.status!=="archived");
  const occupiedUnits=activeUnits.filter(unit=>unit.status==="rented").length;
  const attentionUnits=activeUnits.filter(unit=>unit.status==="maintenance").length;
  const occupancy=activeUnits.length?`${Math.round(occupiedUnits/activeUnits.length*100)}%`:"—";
  const openPath=(key)=>{
    if(key==="rentals")return navigate("/properties/rentas");
    if(key==="sales")return navigate("/properties/modulos/publicaciones");
    return navigate("/properties/condominios");
  };
  return <EcoLayout active="properties" title="OwnTerra Properties" subtitle={`${organizationName} · Todo en su lugar`}>
    <main className="properties-dashboard">
      <section className="properties-hero"><div><span className="properties-eyebrow"><HiHomeModern/> Resumen operativo</span><h1>Buen día, {firstName}.</h1><p>Revisa el estado del portafolio y entra al área que requiere tu atención.</p></div><div className="properties-pulse" aria-label="Resumen del portafolio"><div><strong>{activeProperties}</strong><span>Propiedades</span></div><div><strong>{occupancy}</strong><span>Ocupación</span></div><div><strong>{attentionUnits}</strong><span>Por atender</span></div></div></section>
      <section className={`property-paths journey-${previewPath||"idle"}`} aria-labelledby="property-paths-title"><header><div><span>Áreas de trabajo</span><h2 id="property-paths-title">Selecciona una operación</h2></div><p>{previewPath?"Vista previa del flujo operativo.":"Condominios, rentas y venta comparten el mismo portafolio."}</p></header><div className="property-paths-grid">{paths.map(path=><PropertyPathCard key={path.key} path={path} preview={previewPath===path.key} dimmed={Boolean(previewPath&&previewPath!==path.key)} onPreview={setPreviewPath} onOpen={()=>openPath(path.key)}/>)}</div></section>
      <footer className="properties-continuity properties-first-level-note"><HiOutlineSquares2X2/><p><strong>Contexto compartido.</strong> Propiedades, unidades y personas permanecen conectadas entre áreas.</p><span><HiUserGroup/> Equipo conectado</span></footer>
    </main>
  </EcoLayout>;
}
export default PropertiesDashboard;
