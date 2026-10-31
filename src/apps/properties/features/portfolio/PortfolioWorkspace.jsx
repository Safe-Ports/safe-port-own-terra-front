import { useEffect, useMemo, useState } from "react";
import { HiArrowRight, HiBuildingOffice2, HiMagnifyingGlass, HiPlus } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import { PROPERTY_TYPE_LABEL } from "../properties/propertyModel";
import { UNIT_STATUS_LABEL } from "../units/unitModel";
import "./portfolio-workspace.css";

const containerTypes=new Set(["apartment_building","commercial","office","warehouse","industrial","mixed"]);
// Recámaras y baños solo dicen algo en vivienda: en una bodega o un local
// "0 rec." es ruido que ocupa el renglón sin informar nada.
const livingTypes=new Set(["apartment","house","cabin","room","studio","penthouse"]);
const statusTone={rented:"ocupada",available:"libre",maintenance:"atencion"};

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
  const liveUnits=useMemo(()=>units.filter(unit=>unit.status!=="archived"&&activeProperties.some(property=>property.id===unit.propertyId)),[units,activeProperties]);
  const portfolio=useMemo(()=>{
    const rented=liveUnits.filter(unit=>unit.status==="rented").length;
    const attention=liveUnits.filter(unit=>unit.status==="maintenance").length;
    return {
      properties:activeProperties.length,
      units:liveUnits.length,
      occupancy:liveUnits.length?Math.round(rented/liveUnits.length*100):null,
      available:liveUnits.filter(unit=>unit.status==="available").length,
      attention,
    };
  },[activeProperties,liveUnits]);

  return <EcoLayout active="properties" title="Portafolio" subtitle="Portafolio · Una fuente de verdad"><main className="portfolio-workspace">
    <header className="portfolio-heading">
      <h1>Portafolio</h1>
      <button type="button" className="portfolio-create" onClick={()=>navigate("/properties/inmuebles")}><HiPlus/> Agregar inmueble</button>
    </header>
    {activeProperties.length?<section className="portfolio-pulse" aria-label="Estado de la cartera">
      <div><strong>{portfolio.properties}</strong><span>{portfolio.properties===1?"inmueble":"inmuebles"}</span></div>
      <div><strong>{portfolio.units}</strong><span>{portfolio.units===1?"unidad":"unidades"}</span></div>
      <div><strong>{portfolio.occupancy===null?"—":`${portfolio.occupancy}%`}</strong><span>ocupación</span></div>
      <div><strong>{portfolio.available}</strong><span>{portfolio.available===1?"disponible":"disponibles"}</span></div>
      <div className={portfolio.attention?"needs-attention":""}><strong>{portfolio.attention}</strong><span>{portfolio.attention===1?"en mantenimiento":"en mantenimiento"}</span></div>
    </section>:null}
    {!activeProperties.length?<section className="portfolio-zero"><span><HiBuildingOffice2/></span><h2>Tu portafolio comienza con un inmueble.</h2><p>Después podrás sumar unidades, propietario, documentos y operación sin volver a capturar el contexto.</p><button type="button" onClick={()=>navigate("/properties/inmuebles")}><HiPlus/> Crear primer inmueble</button></section>:
    <section className="portfolio-cell">
      <aside className="portfolio-index"><label><HiMagnifyingGlass/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar inmueble"/></label><div>{filtered.map(property=><button type="button" className={selected?.id===property.id?"active":""} key={property.id} onClick={()=>setSelectedId(property.id)}><span><strong>{property.name}</strong><small>{property.city}</small></span><HiArrowRight/></button>)}</div></aside>
      {selected?<article className="portfolio-detail"><header><div><h2>{selected.name}</h2><p><i className="portfolio-kind">{PROPERTY_TYPE_LABEL[selected.type]||selected.type}</i>{selected.address} · {selected.city}, {selected.state}</p></div><button type="button" onClick={()=>navigate("/properties/inmuebles")}>Editar</button></header><div className="portfolio-vitals"><div><small>Propietario</small><strong className={owner?"":"is-empty"}>{owner?.name||"Sin asignar"}</strong></div><div><small>{isContainer?"Unidades":"Modalidad"}</small><strong>{isContainer?selectedUnits.length:"Renta completa"}</strong></div><div><small>Ocupación</small><strong className={selectedUnits.length?(occupied===selectedUnits.length?"is-full":occupied?"is-partial":"is-empty"):""}>{selectedUnits.length?`${Math.round(occupied/selectedUnits.length*100)}%`:"—"}</strong></div></div><section><div className="portfolio-section-title"><div><h3>{isContainer?"Unidades dentro del inmueble":"Información de la unidad administrada"}</h3></div>{isContainer?<button type="button" onClick={()=>navigate(`/properties/unidades?propertyId=${selected.id}&create=1`)}><HiPlus/> Agregar unidad</button>:!selectedUnits.length?<button type="button" onClick={()=>navigate(`/properties/unidades?propertyId=${selected.id}&create=1`)}>Completar información</button>:null}</div>{selectedUnits.length?<div className="portfolio-units">{selectedUnits.map(unit=><button type="button" key={unit.id} onClick={()=>navigate("/properties/unidades")}><span><strong>{isContainer?unit.identifier:selected.name}</strong><small>{[unit.area?`${unit.area} m²`:null,livingTypes.has(unit.type)&&unit.bedrooms?`${unit.bedrooms} rec.`:null].filter(Boolean).join(" · ")||"Sin ficha"}</small></span><em className={statusTone[unit.status]||""}>{UNIT_STATUS_LABEL[unit.status]||unit.status}</em><HiArrowRight/></button>)}</div>:<p className="portfolio-no-units">{isContainer?"Aún no hay unidades dentro de este inmueble.":"Completa superficie, distribución, renta y disponibilidad sin crear un espacio adicional."}</p>}</section></article>:null}
    </section>}
  </main></EcoLayout>;
}
export default PortfolioWorkspace;
