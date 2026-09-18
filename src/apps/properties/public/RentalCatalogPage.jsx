import { useMemo, useState } from "react";
import {
  HiAdjustmentsHorizontal, HiArrowLeft, HiArrowsPointingOut, HiBuildingOffice2,
  HiBuildingStorefront, HiCheck, HiChevronDown, HiHeart, HiHome, HiHomeModern,
  HiMagnifyingGlass, HiMap, HiMapPin, HiOutlineHeart, HiShare,
  HiSparkles, HiSquares2X2, HiXMark,
} from "react-icons/hi2";
import { useLocation, useNavigate } from "react-router-dom";
import { demoProperties, demoUnits } from "../data/demoPropertiesData";
import RentalPhoto, { RENTAL_PHOTO_POSITIONS } from "../features/listings/RentalPhoto";
import { readRentalListings, recordRentalInquiry } from "../features/listings/listingModel";
import { UNIT_TYPE_LABEL } from "../features/units/unitModel";
import "./rental-catalog.css";

const FAVORITES_KEY = "ot_rental_catalog_favorites_v1";
const money = (value) => new Intl.NumberFormat("es-MX", { style:"currency", currency:"MXN", maximumFractionDigits:0 }).format(value || 0);
const date = (value) => new Intl.DateTimeFormat("es-MX", { day:"numeric", month:"long", year:"numeric" }).format(new Date(`${value}T12:00:00`));
const positions = { "listing-olivo":[22,57], "listing-j401":[28,35], "listing-a3":[70,68], "listing-p2":[62,30], "listing-niebla":[32,70] };

function readFavorites() {
  try { return JSON.parse(globalThis.localStorage?.getItem(FAVORITES_KEY) || "[]"); } catch { return []; }
}

export default function RentalCatalogPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [listings] = useState(() => readRentalListings());
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("all");
  const [type, setType] = useState("all");
  const [maxRent, setMaxRent] = useState("all");
  const [bedrooms, setBedrooms] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [moreFilters, setMoreFilters] = useState({ furnished:false, pets:false, parking:false });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapView, setMapView] = useState(false);
  const [favorites, setFavorites] = useState(readFavorites);
  const [favoritesOnly, setFavoritesOnly] = useState(() => location.search.includes("favorites=1"));
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [inquiry, setInquiry] = useState({ name:"", phone:"", email:"", message:"" });
  const [formError, setFormError] = useState("");
  const propertyById = useMemo(() => Object.fromEntries(demoProperties.map((item) => [item.id,item])), []);
  const unitById = useMemo(() => Object.fromEntries(demoUnits.map((item) => [item.id,item])), []);
  const published = listings.filter((item) => item.status === "published").map((listing) => {
    const unit=unitById[listing.unitId]; const property=propertyById[unit?.propertyId]; return { ...listing, unit, property };
  }).filter((item) => item.unit && item.property);
  const slug = location.pathname.startsWith("/rentas/") ? decodeURIComponent(location.pathname.slice(8)) : "";
  const selected = published.find((item) => item.slug === slug);
  const filtered = published.filter((item) => {
    const haystack=`${item.title} ${item.summary} ${item.property.city} ${item.property.state} ${item.unit.identifier}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase()) && (city==="all"||item.property.city===city) && (type==="all"||item.unit.type===type) && (maxRent==="all"||item.monthlyRent<=Number(maxRent)) && (bedrooms==="all"||item.unit.bedrooms>=Number(bedrooms)) && (!moreFilters.furnished||item.furnished) && (!moreFilters.pets||item.petPolicy==="Se aceptan mascotas") && (!moreFilters.parking||item.parkingSpaces>0) && (!favoritesOnly||favorites.includes(item.id));
  }).sort((a,b)=>sort==="low"?a.monthlyRent-b.monthlyRent:sort==="high"?b.monthlyRent-a.monthlyRent:sort==="recent"?String(b.publishedAt).localeCompare(String(a.publishedAt)):Number(b.featured)-Number(a.featured)||a.monthlyRent-b.monthlyRent);
  const cities=[...new Set(published.map((item)=>item.property.city))].sort();
  const types=[...new Set(published.map((item)=>item.unit.type))];
  const toggleFavorite = (id) => {
    const next=favorites.includes(id)?favorites.filter((item)=>item!==id):[...favorites,id];
    setFavorites(next); try { localStorage.setItem(FAVORITES_KEY,JSON.stringify(next)); } catch { /* opcional */ }
  };
  const openDetail = (item) => { setSent(false); setInquiryOpen(false); navigate(`/rentas/${item.slug}`); };
  const share = async (item) => {
    const url=`${window.location.origin}/rentas/${item.slug}`;
    try { if(navigator.share) await navigator.share({ title:item.title, url }); else await navigator.clipboard?.writeText(url); } catch { /* la persona canceló */ }
  };
  const submitInquiry = (event) => {
    event.preventDefault();
    try { recordRentalInquiry({ listing:selected, ...inquiry }); setSent(true); setFormError(""); }
    catch(error){ setFormError(error.message); }
  };

  if (slug && !selected) return <div className="market-shell"><MarketHeader navigate={navigate} onFavorites={()=>navigate("/rentas?favorites=1")}/><main className="market-not-found"><HiHomeModern/><h1>Este inmueble ya no está disponible.</h1><p>La publicación pudo pausarse o la unidad ya fue rentada.</p><button onClick={()=>navigate("/rentas")}>Ver inmuebles disponibles</button></main></div>;
  if (selected) return <div className="market-shell"><MarketHeader navigate={navigate} onFavorites={()=>navigate("/rentas?favorites=1")}/><main className="market-detail">
    <nav className="market-detail-nav"><button onClick={()=>navigate("/rentas")}><HiArrowLeft/> Todos los inmuebles</button><div><button onClick={()=>share(selected)}><HiShare/> Compartir</button><button onClick={()=>toggleFavorite(selected.id)}>{favorites.includes(selected.id)?<HiHeart/>:<HiOutlineHeart/>} Guardar</button></div></nav>
    <section className="market-gallery"><RentalPhoto position={selected.photoPosition} imageUrl={selected.photoUrl}/>{RENTAL_PHOTO_POSITIONS.filter((item)=>item!==selected.photoPosition).slice(0,3).map((position)=><RentalPhoto position={position} key={position}/>) }<button onClick={()=>setGalleryOpen(true)}><HiSquares2X2/> Ver todas las fotos</button></section>
    <section className="market-detail-layout"><article className="market-detail-copy"><span className="market-eyebrow">{UNIT_TYPE_LABEL[selected.unit.type]} en renta</span><h1>{selected.title}</h1><p className="market-location"><HiMapPin/> {selected.property.city}, {selected.property.state} · Ubicación aproximada</p><div className="market-detail-facts"><span><strong>{selected.unit.bedrooms}</strong> recámaras</span><span><strong>{selected.unit.bathrooms}</strong> baños</span><span><strong>{selected.unit.area}</strong> m²</span><span><strong>{selected.parkingSpaces}</strong> estacionamientos</span></div><hr/><h2>Lo que hace especial este espacio</h2><p className="market-description">{selected.description}</p><div className="market-host"><span><HiBuildingOffice2/></span><div><strong>Administrado en OwnTerra</strong><small>Información verificada con el inventario del administrador.</small></div></div><hr/><h2>Amenidades</h2><div className="market-amenities">{selected.amenities.map((item)=><span key={item}><HiCheck/>{item}</span>)}<span><HiCheck/>{selected.furnished?"Amueblado":"Sin amueblar"}</span><span><HiCheck/>{selected.petPolicy}</span></div><hr/><h2>Zona del inmueble</h2><div className="market-detail-map"><HiMapPin/><strong>{selected.property.city}, {selected.property.state}</strong><span>La dirección exacta se comparte al confirmar una visita.</span></div></article>
      <aside className="market-contact-card"><header><strong>{money(selected.monthlyRent)} <small>MXN / mes</small></strong><span>Disponible desde {date(selected.availableFrom)}</span></header><div><p><span>Estancia mínima</span><strong>{selected.minimumTerm} meses</strong></p><p><span>Depósito informado</span><strong>{money(selected.deposit)}</strong></p></div><button onClick={()=>{setInquiryOpen(true);setSent(false)}}>Solicitar información</button><small>No se realizará ningún cargo.</small></aside>
    </section>
  </main>{inquiryOpen?<InquirySheet listing={selected} inquiry={inquiry} setInquiry={setInquiry} submit={submitInquiry} close={()=>setInquiryOpen(false)} sent={sent} error={formError}/>:null}{galleryOpen?<GalleryViewer listing={selected} close={()=>setGalleryOpen(false)}/>:null}<MarketFooter/></div>;

  return <div className="market-shell"><MarketHeader navigate={navigate} favoritesOnly={favoritesOnly} onExplore={()=>{navigate("/rentas");setFavoritesOnly(false)}} onFavorites={()=>setFavoritesOnly((value)=>!value)}/><main className="market-home">
    <section className="market-hero"><div><span>Rentas seleccionadas por administradores locales</span><h1>Encuentra un lugar que sí se siente tuyo.</h1><p>Información clara, inventario disponible y contacto directo para agendar una visita.</p></div><form onSubmit={(event)=>event.preventDefault()}><label><HiMapPin/><span><small>¿Dónde?</small><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Ciudad, zona o inmueble"/></span></label><button><HiMagnifyingGlass/> Buscar</button></form></section>
    <section className="market-category-row" aria-label="Tipos de inmueble"><button className={type==="all"?"active":""} onClick={()=>setType("all")}><HiSparkles/>Todos</button>{types.map((value)=><button className={type===value?"active":""} onClick={()=>setType(value)} key={value}><CategoryIcon type={value}/>{UNIT_TYPE_LABEL[value]}</button>)}</section>
    <section className="market-filters"><div><select value={city} onChange={(event)=>setCity(event.target.value)}><option value="all">Cualquier ubicación</option>{cities.map((value)=><option key={value}>{value}</option>)}</select><select value={maxRent} onChange={(event)=>setMaxRent(event.target.value)}><option value="all">Cualquier precio</option><option value="15000">Hasta $15,000</option><option value="20000">Hasta $20,000</option><option value="25000">Hasta $25,000</option></select><select value={bedrooms} onChange={(event)=>setBedrooms(event.target.value)}><option value="all">Recámaras</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option></select><button className={filtersOpen?"active":""} onClick={()=>setFiltersOpen((value)=>!value)}><HiAdjustmentsHorizontal/> Más filtros</button></div><button className="market-map-toggle" onClick={()=>setMapView((value)=>!value)}>{mapView?<HiSquares2X2/>:<HiMap/>}{mapView?"Ver lista":"Ver mapa"}</button></section>
    {filtersOpen?<section className="market-more-filters"><strong>Preferencias</strong>{[["furnished","Amueblado"],["pets","Acepta mascotas"],["parking","Con estacionamiento"]].map(([key,label])=><label key={key}><input type="checkbox" checked={moreFilters[key]} onChange={(event)=>setMoreFilters((current)=>({...current,[key]:event.target.checked}))}/><span>{label}</span></label>)}<button onClick={()=>setMoreFilters({furnished:false,pets:false,parking:false})}>Limpiar</button></section>:null}
    <header className="market-results-heading"><div><span>{favoritesOnly?"Tus favoritos":"Marketplace OwnTerra"}</span><h2>{filtered.length} {filtered.length===1?"inmueble disponible":"inmuebles disponibles"}</h2></div><label>Ordenar por <select value={sort} onChange={(event)=>setSort(event.target.value)}><option value="recommended">Recomendados</option><option value="low">Menor precio</option><option value="high">Mayor precio</option><option value="recent">Más recientes</option></select><HiChevronDown/></label></header>
    <section className={`market-results ${mapView?"with-map":""}`}><div className="market-card-grid">{filtered.map((item)=><ListingCard item={item} key={item.id} favorite={favorites.includes(item.id)} toggleFavorite={toggleFavorite} openDetail={openDetail}/>) }{!filtered.length?<div className="market-no-results"><HiMagnifyingGlass/><h2>{favoritesOnly?"Aún no guardas inmuebles":"No encontramos coincidencias"}</h2><p>{favoritesOnly?"Usa el corazón de cada publicación para crear tu selección.":"Prueba otra ciudad, precio o tipo de inmueble."}</p><button onClick={()=>{setQuery("");setCity("all");setType("all");setMaxRent("all");setBedrooms("all");setFavoritesOnly(false);setMoreFilters({furnished:false,pets:false,parking:false})}}>Limpiar filtros</button></div>:null}</div>{mapView?<MarketMap rows={filtered} openDetail={openDetail}/>:null}</section>
  </main><MarketFooter/></div>;
}

function MarketHeader({ navigate, onFavorites, favoritesOnly=false, onExplore }) { const explore=onExplore||(()=>navigate("/rentas")); return <header className="market-header"><button className="market-brand" onClick={explore}><span><strong>OwnTerra</strong><small>Properties</small></span></button><nav><button onClick={explore}>Explorar</button><button className={favoritesOnly?"active":""} onClick={onFavorites}>Favoritos</button><a href="/">Acceso administradores</a></nav></header>; }
function MarketFooter(){return <footer className="market-footer"><p>Catálogo demostrativo de inmuebles administrados con OwnTerra Properties.</p><span>© 2026 OwnTerra</span></footer>}
function CategoryIcon({type}){return type==="house"?<HiHome/>:type==="commercial_unit"?<HiBuildingStorefront/>:type==="cabin"?<HiHomeModern/>:<HiBuildingOffice2/>}
function ListingCard({item,favorite,toggleFavorite,openDetail}){return <article className="market-card"><button className="market-card-photo-button" onClick={()=>openDetail(item)} aria-label={`Ver ${item.title}`}><RentalPhoto position={item.photoPosition} imageUrl={item.photoUrl} className="market-card-photo">{item.featured?<span>Recomendado</span>:null}</RentalPhoto></button><button className="market-favorite" aria-label={favorite?"Quitar de favoritos":"Guardar en favoritos"} onClick={()=>toggleFavorite(item.id)}>{favorite?<HiHeart/>:<HiOutlineHeart/>}</button><button className="market-card-copy" onClick={()=>openDetail(item)}><span>{UNIT_TYPE_LABEL[item.unit.type]} · {item.property.city}</span><h3>{item.title}</h3><p>{item.unit.bedrooms} rec. · {item.unit.bathrooms} baños · {item.unit.area} m²</p><strong>{money(item.monthlyRent)} <small>MXN / mes</small></strong><em>Disponible {date(item.availableFrom)}</em></button></article>}
function MarketMap({rows,openDetail}){return <aside className="market-map"><div className="market-map-roads"/><header><HiMapPin/> Vista de zona <small>Referencia visual demo</small></header>{rows.map((item,index)=>{const point=positions[item.id]||[25+index*16,28+index*12];return <button key={item.id} style={{left:`${point[0]}%`,top:`${point[1]}%`}} onClick={()=>openDetail(item)}>{money(item.monthlyRent).replace(".00","")}</button>})}<footer><HiArrowsPointingOut/> Mueve el mapa para explorar esta zona</footer></aside>}
function GalleryViewer({listing,close}){const positions=[listing.photoPosition,...RENTAL_PHOTO_POSITIONS.filter((item)=>item!==listing.photoPosition)];return <div className="market-gallery-backdrop" onClick={close}><section className="market-gallery-viewer" role="dialog" aria-modal="true" aria-label={`Fotos de ${listing.title}`} onClick={(event)=>event.stopPropagation()}><header><div><small>Galería</small><h2>{listing.title}</h2></div><button onClick={close} aria-label="Cerrar galería"><HiXMark/></button></header><div>{positions.map((position,index)=><RentalPhoto position={position} imageUrl={index===0?listing.photoUrl:""} key={`${position}-${index}`}/>)}</div></section></div>}
function InquirySheet({listing,inquiry,setInquiry,submit,close,sent,error}){const update=(field,value)=>setInquiry((current)=>({...current,[field]:value}));return <div className="market-inquiry-backdrop" onClick={close}><section className="market-inquiry" role="dialog" aria-modal="true" aria-label="Solicitar información" onClick={(event)=>event.stopPropagation()}><header><div><span>Solicitar información</span><h2>{listing.title}</h2></div><button onClick={close} aria-label="Cerrar"><HiXMark/></button></header>{sent?<div className="market-inquiry-success"><HiCheck/><h3>Recibimos tu interés</h3><p>La consulta quedó registrada como prospecto para que el administrador pueda darle seguimiento.</p><button onClick={close}>Listo</button></div>:<form onSubmit={submit}><label>Nombre *<input autoFocus value={inquiry.name} onChange={(event)=>update("name",event.target.value)}/></label><div><label>Teléfono<input value={inquiry.phone} onChange={(event)=>update("phone",event.target.value)}/></label><label>Correo<input type="email" value={inquiry.email} onChange={(event)=>update("email",event.target.value)}/></label></div><label>Mensaje<textarea rows="4" value={inquiry.message} onChange={(event)=>update("message",event.target.value)} placeholder="Quiero conocer disponibilidad y agendar una visita."/></label>{error?<p role="alert">{error}</p>:null}<button type="submit">Enviar solicitud</button><small>Necesitamos teléfono o correo para responderte.</small></form>}</section></div>}
