import { useMemo, useState } from "react";
import {
  HiArrowTopRightOnSquare, HiBuildingStorefront, HiCheckCircle, HiEye,
  HiEyeSlash, HiMagnifyingGlass, HiMapPin, HiPencilSquare, HiPlus,
} from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import FieldError from "@/components/shared/FieldError";
import Modal from "@/components/ui/Modal";
import { useAppContext } from "@/context/AppContext";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import { PROPERTY_ACTION_ICONS } from "../../components/propertiesIconCatalog";
import { UNIT_TYPE_LABEL } from "../units/unitModel";
import RentalPhoto, { RENTAL_PHOTO_POSITIONS } from "./RentalPhoto";
import { EMPTY_RENTAL_LISTING, RENTAL_LISTING_STATUS, validateRentalListing } from "./listingModel";
import "./rental-listings.css";

const { back: HiArrowLeft } = PROPERTY_ACTION_ICONS;
const money = (value) => new Intl.NumberFormat("es-MX", { style:"currency", currency:"MXN", maximumFractionDigits:0 }).format(value || 0);

function draftFrom(listing) {
  if (!listing) return { ...EMPTY_RENTAL_LISTING };
  return { ...listing, amenities: listing.amenities.join(", "), minimumTerm:String(listing.minimumTerm), parkingSpaces:String(listing.parkingSpaces), monthlyRent:String(listing.monthlyRent), deposit:String(listing.deposit) };
}

export default function RentalListingsPage() {
  const navigate = useNavigate();
  const { canUseFeature, showToast } = useAppContext();
  const data = usePropertiesData();
  const { properties, units, rentalListings } = data;
  const canWrite = canUseFeature("properties.rent.write") || canUseFeature("properties.write");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(draftFrom());
  const [errors, setErrors] = useState({});
  const propertyById = useMemo(() => Object.fromEntries(properties.map((item) => [item.id, item])), [properties]);
  const unitById = useMemo(() => Object.fromEntries(units.map((item) => [item.id, item])), [units]);
  const eligibleUnits = units.filter((unit) => unit.status === "available" && !rentalListings.some((item) => item.unitId === unit.id));
  const rows = rentalListings.filter((listing) => {
    const unit = unitById[listing.unitId];
    const property = propertyById[unit?.propertyId];
    const text = `${listing.title} ${unit?.identifier || ""} ${property?.name || ""} ${property?.city || ""}`.toLowerCase();
    return (status === "all" || listing.status === status) && text.includes(query.trim().toLowerCase());
  });
  const stats = {
    published: rentalListings.filter((item) => item.status === "published").length,
    draft: rentalListings.filter((item) => item.status === "draft").length,
    inquiries: rentalListings.reduce((sum, item) => sum + Number(item.inquiries || 0), 0),
  };

  const open = (listing = null) => {
    setEditingId(listing?.id || "new");
    setDraft(draftFrom(listing));
    setErrors({});
  };
  const close = () => { setEditingId(null); setErrors({}); };
  const update = (field, value) => { setDraft((current) => ({ ...current, [field]:value })); setErrors((current) => ({ ...current, [field]:undefined, form:undefined })); };
  const save = (event) => {
    event.preventDefault();
    const next = validateRentalListing(draft, units, rentalListings, editingId === "new" ? null : editingId);
    if (Object.keys(next).length) return setErrors(next);
    try {
      if (editingId === "new") data.addRentalListing(draft);
      else data.updateRentalListing(editingId, draft);
      showToast(editingId === "new" ? "Publicación creada" : "Publicación actualizada", "success");
      close();
    } catch (error) { setErrors({ form:error.message }); }
  };
  const changeStatus = (listing, nextStatus) => {
    try {
      data.changeRentalListingStatus(listing.id, nextStatus);
      showToast(nextStatus === "published" ? "Inmueble visible en el catálogo" : "Publicación actualizada", "success");
    } catch (error) { showToast(error.message, "warning"); }
  };

  return <EcoLayout active="properties" title="Publicaciones" subtitle="OwnTerra Properties · Marketplace de renta">
    <main className="rental-listings-page">
      <button className="rental-listings-back" type="button" onClick={() => navigate("/properties/operacion?section=commercial")}><HiArrowLeft /> Comercial</button>
      <header className="rental-listings-heading"><div><span>Oferta pública</span><h1>Publicaciones de renta</h1><p>Prepara cada anuncio y controla cuándo aparece en el marketplace público.</p></div><div><a href="/rentas" target="_blank" rel="noreferrer"><HiArrowTopRightOnSquare /> Ver catálogo público</a>{canWrite ? <button type="button" onClick={() => open()}><HiPlus /> Nueva publicación</button> : null}</div></header>
      <aside className="rental-listings-note"><strong>Frontend conectado a la sesión.</strong> Publicar muestra el inmueble en <code>/rentas</code> dentro de este dispositivo. Las consultas del catálogo aparecen después como prospectos; la publicación real multiusuario requiere backend.</aside>
      <section className="rental-listings-kpis"><article><small>Publicadas</small><strong>{stats.published}</strong><span>Visibles en marketplace</span></article><article><small>Borradores</small><strong>{stats.draft}</strong><span>Por completar</span></article><article><small>Consultas demo</small><strong>{stats.inquiries}</strong><span>Interés acumulado</span></article><article><small>Inventario elegible</small><strong>{eligibleUnits.length}</strong><span>Unidades disponibles sin anuncio</span></article></section>
      <section className="rental-listings-toolbar"><label><HiMagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar publicación, inmueble o ciudad" /></label><div>{Object.entries({ all:"Todas", ...RENTAL_LISTING_STATUS }).map(([value, label]) => <button type="button" key={value} className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{label}</button>)}</div></section>
      {rows.length ? <section className="rental-publication-grid" aria-label="Publicaciones de renta">{rows.map((listing) => { const unit=unitById[listing.unitId]; const property=propertyById[unit?.propertyId]; const unavailable=unit?.status !== "available"; return <article key={listing.id}>
        <RentalPhoto position={listing.photoPosition} className="rental-publication-photo"><span className={`rental-publication-status ${listing.status}`}>{RENTAL_LISTING_STATUS[listing.status]}</span>{listing.featured ? <i>Destacada</i> : null}</RentalPhoto>
        <div className="rental-publication-body"><header><div><small>{UNIT_TYPE_LABEL[unit?.type] || "Inmueble"}</small><h2>{listing.title}</h2><p><HiMapPin /> {property?.city}, {property?.state}</p></div><strong>{money(listing.monthlyRent)}<small>/mes</small></strong></header><div className="rental-publication-facts"><span>{unit?.area || 0} m²</span><span>{unit?.bedrooms || 0} rec.</span><span>{unit?.bathrooms || 0} baños</span><span>{listing.inquiries || 0} consultas</span></div>{unavailable ? <aside>La unidad ya no está disponible. Pausa la publicación.</aside> : null}<footer>{canWrite ? <><button type="button" onClick={() => open(listing)}><HiPencilSquare /> Editar</button>{listing.status !== "published" ? <button type="button" onClick={() => changeStatus(listing, "published")}><HiEye /> Publicar</button> : <button type="button" onClick={() => changeStatus(listing, "paused")}><HiEyeSlash /> Pausar</button>}</> : <span>Modo consulta</span>}<a href={`/rentas/${listing.slug}`} target="_blank" rel="noreferrer">Vista pública <HiArrowTopRightOnSquare /></a></footer></div>
      </article>; })}</section> : <section className="rental-publication-empty"><HiBuildingStorefront /><h2>Sin publicaciones</h2><p>Crea un anuncio desde una unidad disponible del portafolio.</p>{canWrite ? <button type="button" onClick={() => open()}><HiPlus /> Crear publicación</button> : null}</section>}
    </main>
    <Modal open={editingId !== null} onClose={close} title={editingId === "new" ? "Nueva publicación" : "Editar publicación"} subtitle="Contenido que verá la persona interesada." icon={<HiBuildingStorefront />} width="max-w-[820px]" footer={<><button type="button" className="rental-listing-secondary" onClick={close}>Cancelar</button><button type="submit" className="rental-listing-primary" form="rental-listing-form"><HiCheckCircle /> Guardar</button></>}>
      <form id="rental-listing-form" className="properties-form rental-listing-form" onSubmit={save} noValidate><FieldError msg={errors.form} /><div className="properties-form-grid">
        <label><span>Unidad disponible *</span><select value={draft.unitId} onChange={(event) => { const unit=unitById[event.target.value]; update("unitId",event.target.value); if(unit&&!draft.monthlyRent)update("monthlyRent",String(unit.suggestedRent||"")); }} aria-invalid={Boolean(errors.unitId)}><option value="">Selecciona</option>{editingId!=="new"&&unitById[draft.unitId]?<option value={draft.unitId}>{propertyById[unitById[draft.unitId].propertyId]?.name} · {unitById[draft.unitId].identifier}</option>:null}{eligibleUnits.map((unit)=><option key={unit.id} value={unit.id}>{propertyById[unit.propertyId]?.name} · {unit.identifier}</option>)}</select><FieldError msg={errors.unitId}/></label>
        <label><span>Estado inicial</span><select value={draft.status} onChange={(event)=>update("status",event.target.value)}>{Object.entries(RENTAL_LISTING_STATUS).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
        <label className="properties-form-wide"><span>Título del anuncio *</span><input value={draft.title} onChange={(event)=>update("title",event.target.value)} placeholder="Ej. Departamento luminoso con balcón"/><FieldError msg={errors.title}/></label>
        <label className="properties-form-wide"><span>Resumen *</span><input value={draft.summary} onChange={(event)=>update("summary",event.target.value)} placeholder="La razón principal para abrir el anuncio"/><FieldError msg={errors.summary}/></label>
        <label className="properties-form-wide"><span>Descripción *</span><textarea rows="4" value={draft.description} onChange={(event)=>update("description",event.target.value)} placeholder="Distribución, entorno, condiciones y experiencia del inmueble"/><FieldError msg={errors.description}/></label>
        <label><span>Renta mensual *</span><input type="number" min="1" value={draft.monthlyRent} onChange={(event)=>update("monthlyRent",event.target.value)}/><FieldError msg={errors.monthlyRent}/></label>
        <label><span>Depósito informado</span><input type="number" min="0" value={draft.deposit} onChange={(event)=>update("deposit",event.target.value)}/></label>
        <label><span>Disponible desde *</span><input type="date" value={draft.availableFrom} onChange={(event)=>update("availableFrom",event.target.value)}/><FieldError msg={errors.availableFrom}/></label>
        <label><span>Estancia mínima (meses)</span><input type="number" min="1" value={draft.minimumTerm} onChange={(event)=>update("minimumTerm",event.target.value)}/><FieldError msg={errors.minimumTerm}/></label>
        <label><span>Política de mascotas</span><select value={draft.petPolicy} onChange={(event)=>update("petPolicy",event.target.value)}><option>A consideración</option><option>Se aceptan mascotas</option><option>No se aceptan mascotas</option><option>No aplica</option></select></label>
        <label><span>Estacionamientos</span><input type="number" min="0" value={draft.parkingSpaces} onChange={(event)=>update("parkingSpaces",event.target.value)}/></label>
        <label className="properties-form-wide"><span>Amenidades separadas por coma</span><input value={draft.amenities} onChange={(event)=>update("amenities",event.target.value)} placeholder="Elevador, balcón, vigilancia, estacionamiento"/></label>
        <fieldset className="properties-form-wide rental-photo-picker"><legend>Fotografía principal</legend>{RENTAL_PHOTO_POSITIONS.map((position)=><button type="button" aria-label={`Fotografía ${position}`} className={draft.photoPosition===position?"active":""} onClick={()=>update("photoPosition",position)} key={position}><RentalPhoto position={position}/></button>)}</fieldset>
        <label className="rental-listing-check"><input type="checkbox" checked={draft.furnished} onChange={(event)=>update("furnished",event.target.checked)}/><span>Se renta amueblada</span></label><label className="rental-listing-check"><input type="checkbox" checked={draft.featured} onChange={(event)=>update("featured",event.target.checked)}/><span>Destacar en el catálogo</span></label>
      </div></form>
    </Modal>
  </EcoLayout>;
}
