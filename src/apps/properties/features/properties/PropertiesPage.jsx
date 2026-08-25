import { useMemo, useState } from "react";
import {
  HiArchiveBox,
  HiArrowLeft,
  HiBuildingOffice2,
  HiMagnifyingGlass,
  HiMapPin,
  HiPencilSquare,
  HiPlus,
} from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import FieldError from "@/components/shared/FieldError";
import Modal from "@/components/ui/Modal";
import { useAppContext } from "@/context/AppContext";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import { EMPTY_PROPERTY, PROPERTY_TYPE_LABEL, validateProperty } from "./propertyModel";
import "./properties.css";

const containerTypes = new Set(["apartment_building", "commercial", "office", "warehouse", "industrial", "mixed"]);

function PropertiesPage() {
  const navigate = useNavigate();
  const { canUseFeature, showToast } = useAppContext();
  const { owners, properties, units, addProperty, updateProperty, archiveProperty, addUnit, updateUnit } = usePropertiesData();
  const canWrite = canUseFeature("properties.properties.write") || canUseFeature("properties.write");
  const activeOwners = owners.filter((owner) => owner.status === "active");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_PROPERTY);
  const [errors, setErrors] = useState({});
  const draftIsContainer = containerTypes.has(draft.type);

  const ownerById = useMemo(() => Object.fromEntries(owners.map((owner) => [owner.id, owner])), [owners]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return properties.filter((property) => {
      const ownerName = ownerById[property.ownerId]?.name || "";
      const matchesStatus = status === "all" || property.status === status;
      const matchesText = !normalized || [property.name, property.address, property.city, ownerName].some((value) => value.toLowerCase().includes(normalized));
      return matchesStatus && matchesText;
    });
  }, [properties, ownerById, query, status]);

  const openCreate = () => {
    setEditingId("new");
    setDraft(EMPTY_PROPERTY);
    setErrors({});
  };

  const openEdit = (property) => {
    const primaryUnit = units.find((unit) => unit.propertyId === property.id && unit.status !== "archived");
    setEditingId(property.id);
    setDraft({ name: property.name, ownerId: property.ownerId, type: property.type, address: property.address, city: property.city, state: property.state, description: property.description, area:primaryUnit?.area||"", bedrooms:primaryUnit?.bedrooms||"", bathrooms:primaryUnit?.bathrooms||"", suggestedRent:primaryUnit?.suggestedRent||"", unitStatus:primaryUnit?.status||"available" });
    setErrors({});
  };

  const closeModal = () => {
    setEditingId(null);
    setErrors({});
  };

  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const saveProperty = (event) => {
    event.preventDefault();
    const nextErrors = validateProperty(draft);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    if (editingId === "new") {
      const property = addProperty(draft);
      if (!draftIsContainer) {
        addUnit({propertyId:property.id,ownerId:draft.ownerId,identifier:property.name,type:draft.type==="apartment"?"apartment":draft.type==="house"?"house":"other",floor:"",area:draft.area,bedrooms:draft.bedrooms,bathrooms:draft.bathrooms,suggestedRent:draft.suggestedRent,status:draft.unitStatus,description:draft.description});
        showToast("Inmueble individual listo para operar", "success");
        closeModal();
        navigate("/properties/portafolio");
        return;
      }
      showToast("Inmueble creado. Ahora define sus unidades.", "success");
      closeModal();
      navigate(`/properties/unidades?propertyId=${property.id}&create=1`);
      return;
    } else {
      updateProperty(editingId, draft);
      if (!draftIsContainer) {
        const primaryUnit=units.find((unit)=>unit.propertyId===editingId&&unit.status!=="archived");
        const unitDraft={propertyId:editingId,ownerId:draft.ownerId,identifier:draft.name,type:draft.type==="apartment"?"apartment":draft.type==="house"?"house":"other",floor:"",area:draft.area,bedrooms:draft.bedrooms,bathrooms:draft.bathrooms,suggestedRent:draft.suggestedRent,status:draft.unitStatus,description:draft.description};
        if(primaryUnit) updateUnit(primaryUnit.id,unitDraft); else addUnit(unitDraft);
      }
      showToast("Inmueble actualizado", "success");
    }
    closeModal();
  };

  const handleArchive = (property) => {
    const activeUnits = units.filter((unit) => unit.propertyId === property.id && unit.status !== "archived").length;
    if (activeUnits > 0) {
      showToast(`No puedes archivarla: tiene ${activeUnits} ${activeUnits === 1 ? "unidad activa" : "unidades activas"}`, "warning");
      return;
    }
    archiveProperty(property.id);
    showToast("Inmueble archivado", "success");
  };

  return (
    <EcoLayout active="properties" title="Propiedades" subtitle="OwnTerra Properties · Portafolio administrado">
      <main className="property-page">
        <button className="property-back" type="button" onClick={() => navigate("/properties")}><HiArrowLeft /> Volver a Properties</button>

        <header className="property-header">
          <div><span>Operación interna</span><h1>Propiedades</h1><p>Inmuebles bajo administración y su estructura de unidades.</p></div>
          <button className="property-primary" type="button" onClick={openCreate} disabled={!canWrite}><HiPlus /> Nueva propiedad</button>
        </header>

        <aside className="property-prototype-note">Los inmuebles y propietarios permanecen disponibles mientras navegas en Properties, pero todavía no se guardan en el backend.</aside>

        <section className="property-toolbar" aria-label="Filtros de propiedades">
          <label className="property-search"><HiMagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar inmueble, ubicación o propietario" /></label>
          <div className="property-segments">
            {[["active", "Activas"], ["archived", "Archivadas"], ["all", "Todas"]].map(([value, label]) => <button type="button" key={value} className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{label}</button>)}
          </div>
        </section>

        {filtered.length ? (
          <section className="property-grid" aria-label="Listado de propiedades">
            {filtered.map((property) => (
              (() => {
                const propertyUnits = units.filter((unit) => unit.propertyId === property.id && unit.status !== "archived");
                const occupiedUnits = propertyUnits.filter((unit) => unit.status === "rented").length;
                const occupancy = propertyUnits.length ? Math.round((occupiedUnits / propertyUnits.length) * 100) : null;
                return (
              <article className="property-card" key={property.id}>
                <div className="property-card-visual"><HiBuildingOffice2 /><span>{PROPERTY_TYPE_LABEL[property.type]}</span></div>
                <div className="property-card-body">
                  <div className="property-card-title"><div><h2>{property.name}</h2><p><HiMapPin /> {property.address}, {property.city}, {property.state}</p></div><span className={`property-status ${property.status}`}>{property.status === "active" ? "Activa" : "Archivada"}</span></div>
                  <div className="property-owner"><span>Propietario</span><strong>{ownerById[property.ownerId]?.name || "Sin propietario asignado"}</strong></div>
                  <div className="property-metrics"><div><strong>{propertyUnits.length}</strong><span>Unidades</span></div><div><strong>{occupiedUnits}</strong><span>Ocupadas</span></div><div><strong>{occupancy === null ? "—" : `${occupancy}%`}</strong><span>Ocupación</span></div></div>
                  {canWrite && property.status === "active" ? <div className="property-actions"><button type="button" onClick={() => openEdit(property)}><HiPencilSquare /> Editar</button><button type="button" onClick={() => handleArchive(property)}><HiArchiveBox /> Archivar</button></div> : null}
                </div>
              </article>
                );
              })()
            ))}
          </section>
        ) : (
          <section className="property-empty">
            <span><HiBuildingOffice2 /></span>
            <h2>{properties.length ? "No encontramos propiedades" : "Registra tu primera propiedad"}</h2>
            <p>{properties.length ? "Prueba con otra búsqueda o cambia el filtro." : "Crea el inmueble primero. Podrás asignar un propietario ahora o hacerlo más adelante."}</p>
            {canWrite ? <button type="button" onClick={openCreate}><HiPlus /> Crear primera propiedad</button> : null}
          </section>
        )}
      </main>

      <Modal open={editingId !== null} onClose={closeModal} title={editingId === "new" ? "Nueva propiedad" : "Editar propiedad"} subtitle="Información general del inmueble administrado." icon={<HiBuildingOffice2 />} width="max-w-[680px]" footer={<><button className="property-secondary" type="button" onClick={closeModal}>Cancelar</button><button className="property-primary" type="submit" form="property-form">Guardar propiedad</button></>}>
        <form id="property-form" className="properties-form" onSubmit={saveProperty} noValidate>
          <section className="properties-form-section">
            <header><span className="properties-form-step">01</span><div><h3>Información general</h3><p>El nombre de la propiedad inicia el expediente. El propietario puede asignarse después.</p></div></header>
            <div className="properties-form-grid">
              <label><span>Nombre del inmueble <b>*</b></span><input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder="Ej. Torre Norte" aria-invalid={Boolean(errors.name)} /><FieldError msg={errors.name} /></label>
              <label><span>Propietario <small>Opcional</small></span><select value={draft.ownerId} onChange={(event) => updateDraft("ownerId", event.target.value)}><option value="">Sin propietario asignado</option>{activeOwners.map((owner) => <option value={owner.id} key={owner.id}>{owner.name}</option>)}</select></label>
              <label className="properties-form-wide"><span>Tipo de propiedad</span><select value={draft.type} onChange={(event) => updateDraft("type", event.target.value)}>{Object.entries(PROPERTY_TYPE_LABEL).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            </div>
          </section>
          {!draftIsContainer?<section className="properties-form-section">
            <header><span className="properties-form-step">03</span><div><h3>Operación del activo</h3><p>Como se administra completo, no tendrás que crear una unidad adicional.</p></div></header>
            <div className="properties-form-grid">
              <label><span>Superficie m²</span><input type="number" min="0" value={draft.area} onChange={(event)=>updateDraft("area",event.target.value)} placeholder="Ej. 120"/></label>
              <label><span>Renta mensual sugerida</span><input type="number" min="0" value={draft.suggestedRent} onChange={(event)=>updateDraft("suggestedRent",event.target.value)} placeholder="Ej. 25000"/></label>
              {draft.type!=="land"?<><label><span>Recámaras</span><input type="number" min="0" value={draft.bedrooms} onChange={(event)=>updateDraft("bedrooms",event.target.value)} placeholder="Ej. 3"/></label><label><span>Baños</span><input type="number" min="0" step="0.5" value={draft.bathrooms} onChange={(event)=>updateDraft("bathrooms",event.target.value)} placeholder="Ej. 2.5"/></label></>:null}
              <label className="properties-form-wide"><span>Disponibilidad</span><select value={draft.unitStatus} onChange={(event)=>updateDraft("unitStatus",event.target.value)}><option value="available">Disponible</option><option value="rented">Rentada</option><option value="maintenance">En mantenimiento</option></select></label>
            </div>
          </section>:<aside className="property-structure-note"><strong>Inmueble con múltiples unidades</strong><span>Al guardar, continuarás a la estructura de departamentos, locales, oficinas o espacios.</span></aside>}
          <section className="properties-form-section">
            <header><span className="properties-form-step">02</span><div><h3>Ubicación</h3><p>Dirección operativa que verá el equipo.</p></div></header>
            <div className="properties-form-grid">
              <label className="properties-form-wide"><span>Dirección <b>*</b></span><input value={draft.address} onChange={(event) => updateDraft("address", event.target.value)} placeholder="Calle, número exterior e interior" aria-invalid={Boolean(errors.address)} /><FieldError msg={errors.address} /></label>
              <label><span>Ciudad o municipio <b>*</b></span><input value={draft.city} onChange={(event) => updateDraft("city", event.target.value)} placeholder="Ej. Mérida" aria-invalid={Boolean(errors.city)} /><FieldError msg={errors.city} /></label>
              <label><span>Estado <b>*</b></span><input value={draft.state} onChange={(event) => updateDraft("state", event.target.value)} placeholder="Ej. Yucatán" aria-invalid={Boolean(errors.state)} /><FieldError msg={errors.state} /></label>
            </div>
          </section>
          <section className="properties-form-section is-compact"><div className="properties-form-grid"><label className="properties-form-wide"><span>Descripción <small>Opcional</small></span><textarea rows="3" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} placeholder="Características generales, accesos o contexto del inmueble…" /></label></div></section>
        </form>
      </Modal>
    </EcoLayout>
  );
}

export default PropertiesPage;
