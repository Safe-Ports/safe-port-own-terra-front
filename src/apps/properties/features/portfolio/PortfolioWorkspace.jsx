import { useEffect, useMemo, useState } from "react";
import { HiArrowLeft, HiArrowRight, HiBuildingOffice2, HiMagnifyingGlass, HiPlus } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import { PROPERTY_TYPE_LABEL } from "../properties/propertyModel";
import "./portfolio-workspace.css";

const containerTypes=new Set(["apartment_building","commercial","office","warehouse","industrial","mixed"]);

function PortfolioWorkspace(){
  const navigate=useNavigate();
  const {properties,units,owners}=usePropertiesData();
  const activeProperties=useMemo(()=>properties.filter(property=>property.status!=="archived"),[properties]);
  const [query,setQuery]=useState("");
  const [selectedId,setSelectedId]=useState(activeProperties[0]?.id||null);
  const filtered=useMemo(()=>activeProperties.filter(property=>[property.name,property.city,property.address].join(" ").toLowerCase().includes(query.toLowerCase())),[activeProperties,query]);
  useEffect(()=>{if(!selectedId&&activeProperties[0])setSelectedId(activeProperties[0].id)},[activeProperties,selectedId]);
  const selected=activeProperties.find(property=>property.id===selectedId)||filtered[0];
  const selectedUnits=selected?units.filter(unit=>unit.propertyId===selected.id&&unit.status!=="archived"):[];
  const owner=selected?owners.find(item=>item.id===selected.ownerId):null;
  const occupied=selectedUnits.filter(unit=>unit.status==="rented").length;
  const isContainer=selected?containerTypes.has(selected.type):false;

  return <EcoLayout active="properties" title="OwnTerra Properties" subtitle="Portafolio · Una fuente de verdad"><main className="portfolio-workspace">
    <header className="portfolio-heading"><button type="button" onClick={()=>navigate("/properties")}><HiArrowLeft/> Properties</button><div><span>Portafolio vivo</span><h1>Inmueble, personas y espacios.</h1><p>Selecciona una propiedad. Todo lo relacionado permanece en la misma vista.</p></div><button type="button" className="portfolio-create" onClick={()=>navigate("/properties/inmuebles")}><HiPlus/> Agregar inmueble</button></header>
    {!activeProperties.length?<section className="portfolio-zero"><span><HiBuildingOffice2/></span><h2>Tu portafolio comienza con un inmueble.</h2><p>Después podrás sumar unidades, propietario, documentos y operación sin volver a capturar el contexto.</p><button type="button" onClick={()=>navigate("/properties/inmuebles")}><HiPlus/> Crear primer inmueble</button></section>:
    <section className="portfolio-cell">
      <aside className="portfolio-index"><label><HiMagnifyingGlass/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar inmueble"/></label><div>{filtered.map(property=><button type="button" className={selected?.id===property.id?"active":""} key={property.id} onClick={()=>setSelectedId(property.id)}><span><strong>{property.name}</strong><small>{property.city}</small></span><HiArrowRight/></button>)}</div></aside>
      {selected?<article className="portfolio-detail"><header><div><span>{PROPERTY_TYPE_LABEL[selected.type]||selected.type}</span><h2>{selected.name}</h2><p>{selected.address} · {selected.city}, {selected.state}</p></div><button type="button" onClick={()=>navigate("/properties/inmuebles")}>Editar</button></header><div className="portfolio-vitals"><div><small>Propietario</small><strong>{owner?.name||"Sin asignar"}</strong></div><div><small>{isContainer?"Unidades":"Modalidad"}</small><strong>{isContainer?selectedUnits.length:"Renta completa"}</strong></div><div><small>Ocupación</small><strong>{selectedUnits.length?`${Math.round(occupied/selectedUnits.length*100)}%`:"—"}</strong></div></div><section><div className="portfolio-section-title"><div><span>{isContainer?"Espacios":"Operación"}</span><h3>{isContainer?"Unidades dentro del inmueble":"Información de la unidad administrada"}</h3></div>{isContainer?<button type="button" onClick={()=>navigate(`/properties/unidades?propertyId=${selected.id}&create=1`)}><HiPlus/> Agregar unidad</button>:!selectedUnits.length?<button type="button" onClick={()=>navigate(`/properties/unidades?propertyId=${selected.id}&create=1`)}>Completar información</button>:null}</div>{selectedUnits.length?<div className="portfolio-units">{selectedUnits.map(unit=><button type="button" key={unit.id} onClick={()=>navigate("/properties/unidades")}><span><strong>{isContainer?unit.identifier:selected.name}</strong><small>{unit.area||0} m² · {unit.bedrooms||0} rec.</small></span><em>{unit.status}</em><HiArrowRight/></button>)}</div>:<p className="portfolio-no-units">{isContainer?"Aún no hay unidades dentro de este inmueble.":"Completa superficie, distribución, renta y disponibilidad sin crear un espacio adicional."}</p>}</section></article>:null}
    </section>}
  </main></EcoLayout>;
}
export default PortfolioWorkspace;
