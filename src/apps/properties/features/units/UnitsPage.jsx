import { useEffect, useMemo, useState } from "react";
import { HiArchiveBox, HiArrowLeft, HiArrowRight, HiHomeModern, HiMagnifyingGlass, HiPencilSquare, HiPlus, HiQueueList, HiViewColumns } from "react-icons/hi2";
import { useNavigate, useSearchParams } from "react-router-dom";
import FieldError from "@/components/shared/FieldError";
import Modal from "@/components/ui/Modal";
import { useAppContext } from "@/context/AppContext";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import { EMPTY_UNIT, UNIT_STATUS_LABEL, UNIT_TYPE_LABEL, validateUnit } from "./unitModel";
import "./units.css";
import "./unit-status-board.css";

const money = (value) => value ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value) : "Sin definir";
const STATUS_ORDER = ["available", "rented", "maintenance", "archived"];

function UnitsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canUseFeature, showToast } = useAppContext();
  const { owners, properties, units, addUnit, updateUnit, archiveUnit, changeUnitStatus } = usePropertiesData();
  const canWrite = canUseFeature("properties.units.write") || canUseFeature("properties.write");
  const activeProperties = properties.filter((property) => property.status === "active");
  const activeOwners = owners.filter((owner) => owner.status === "active");
  const propertyById = useMemo(() => Object.fromEntries(properties.map((property) => [property.id, property])), [properties]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const requestedPropertyId = searchParams.get("propertyId");
  const [propertyFilter, setPropertyFilter] = useState(requestedPropertyId || "all");
  const [view, setView] = useState(() => (searchParams.get("view") === "board" ? "board" : "list"));
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_UNIT);
  const [errors, setErrors] = useState({});

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return units.filter((unit) => {
      const propertyName = propertyById[unit.propertyId]?.name || "";
      const matchesText = !normalized || unit.identifier.toLowerCase().includes(normalized) || propertyName.toLowerCase().includes(normalized);
      return matchesText && (statusFilter === "all" || unit.status === statusFilter) && (propertyFilter === "all" || unit.propertyId === propertyFilter);
    });
  }, [units, propertyById, query, statusFilter, propertyFilter]);

  const boardCounts = useMemo(() => Object.fromEntries(STATUS_ORDER.map((status) => [status, filtered.filter((unit) => unit.status === status).length])), [filtered]);

  const changeView = (next) => {
    setView(next);
    const params = new URLSearchParams(searchParams);
    if (next === "board") params.set("view", "board"); else params.delete("view");
    setSearchParams(params, { replace: true });
  };

  const openCreate = (propertyId = requestedPropertyId) => {
    if (!activeProperties.length) {
      showToast("Primero registra una propiedad activa", "warning");
      navigate("/properties/inmuebles");
      return;
    }
    setEditingId("new");
    const selectedProperty = activeProperties.find((property) => property.id === propertyId) || activeProperties[0];
    setDraft({ ...EMPTY_UNIT, propertyId: selectedProperty.id, ownerId: selectedProperty.ownerId || "" });
    setErrors({});
  };

  const openEdit = (unit) => {
    setEditingId(unit.id);
    setDraft({ propertyId: unit.propertyId, ownerId: unit.ownerId || "", identifier: unit.identifier, type: unit.type, floor: unit.floor, area: String(unit.area || ""), bedrooms: String(unit.bedrooms || ""), bathrooms: String(unit.bathrooms || ""), suggestedRent: String(unit.suggestedRent || ""), status: unit.status, description: unit.description });
    setErrors({});
  };

  const closeModal = () => { setEditingId(null); setErrors({}); };
  const updateDraft = (field, value) => { setDraft((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: undefined })); };

  const saveUnit = (event) => {
    event.preventDefault();
    const nextErrors = validateUnit(draft, units, editingId === "new" ? null : editingId);
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    if (editingId === "new") { addUnit(draft); showToast("Unidad agregada a esta sesión de frontend", "success"); }
    else { updateUnit(editingId, draft); showToast("Unidad actualizada", "success"); }
    closeModal();
  };

  const handleArchive = (unit) => {
    archiveUnit(unit.id);
    showToast("Unidad archivada", "success");
  };

  useEffect(() => {
    if (searchParams.get("create") !== "1" || !requestedPropertyId || editingId !== null) return;
    openCreate(requestedPropertyId);
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    setSearchParams(next, { replace: true });
  }, [editingId, requestedPropertyId, searchParams, setSearchParams]);

  return (
    <EcoLayout active="properties" title="Unidades" subtitle="OwnTerra Properties · Inventario rentable">
      <main className="units-page">
        <button className="units-back" type="button" onClick={() => navigate("/properties")}><HiArrowLeft /> Volver a Properties</button>
        <header className="units-header"><div><span>Operación interna</span><h1>Unidades</h1><p>Espacios rentables dentro de cada propiedad administrada.</p></div><button className="units-primary" type="button" onClick={openCreate} disabled={!canWrite}><HiPlus /> Nueva unidad</button></header>
        <aside className="units-prototype-note">El estado es operativo. Más adelante “Rentada” será determinado por contratos vigentes y la disponibilidad para estancias cortas tendrá su propio calendario.</aside>

        <section className="units-toolbar" aria-label="Filtros de unidades">
          <label className="units-search"><HiMagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar unidad o propiedad" /></label>
          <select value={propertyFilter} onChange={(event) => setPropertyFilter(event.target.value)}><option value="all">Todas las propiedades</option>{activeProperties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select>
          {view === "list" ? <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos los estados</option>{Object.entries(UNIT_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> : null}
          <div className="units-view-toggle" role="tablist" aria-label="Vista de unidades">
            <button type="button" role="tab" aria-selected={view === "list"} className={view === "list" ? "active" : ""} onClick={() => changeView("list")}><HiQueueList /> Lista</button>
            <button type="button" role="tab" aria-selected={view === "board"} className={view === "board" ? "active" : ""} onClick={() => changeView("board")}><HiViewColumns /> Tablero</button>
          </div>
        </section>

        {filtered.length ? (
          view === "list" ? (
          <section className="units-list" aria-label="Listado de unidades">
            <div className="units-table-head"><span>Unidad</span><span>Propiedad</span><span>Características</span><span>Renta sugerida</span><span>Estado</span><span /></div>
            {filtered.map((unit) => (
              <article className="unit-row" key={unit.id}>
                <div className="unit-identity"><span><HiHomeModern /></span><div><strong>{unit.identifier}</strong><small>{UNIT_TYPE_LABEL[unit.type]}</small></div></div>
                <div className="unit-property"><strong>{propertyById[unit.propertyId]?.name || "Propiedad no disponible"}</strong><small>{unit.floor ? `Piso ${unit.floor}` : "Sin piso asignado"}</small></div>
                <div className="unit-features"><strong>{unit.area ? `${unit.area} m²` : "Sin superficie"}</strong><small>{unit.bedrooms || 0} rec. · {unit.bathrooms || 0} baños</small></div>
                <div className="unit-rent"><strong>{money(unit.suggestedRent)}</strong><small>Referencia mensual</small></div>
                {canWrite && unit.status !== "archived" ? <select className={`unit-status-select ${unit.status}`} value={unit.status} onChange={(event) => changeUnitStatus(unit.id, event.target.value)}>{Object.entries(UNIT_STATUS_LABEL).filter(([value]) => value !== "archived").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> : <span className={`unit-status-badge ${unit.status}`}>{UNIT_STATUS_LABEL[unit.status]}</span>}
                {canWrite && unit.status !== "archived" ? <div className="unit-actions"><button type="button" onClick={() => openEdit(unit)} aria-label={`Editar ${unit.identifier}`}><HiPencilSquare /></button><button type="button" onClick={() => handleArchive(unit)} aria-label={`Archivar ${unit.identifier}`}><HiArchiveBox /></button></div> : <span />}
              </article>
            ))}
          </section>
          ) : (
          <section className="unit-board" aria-label="Unidades por estatus">
            {STATUS_ORDER.map((status) => (
              <article className={`unit-board-column ${status}`} key={status}>
                <header><div><span className="unit-status-dot" /><h2>{UNIT_STATUS_LABEL[status]}</h2></div><strong>{boardCounts[status]}</strong></header>
                <div className="unit-board-cards">
                  {filtered.filter((unit) => unit.status === status).map((unit) => (
                    <div className="unit-board-card" key={unit.id}>
                      <button type="button" onClick={() => openEdit(unit)}>
                        <span className="unit-card-icon"><HiHomeModern /></span>
                        <span className="unit-card-copy"><strong>{unit.identifier}</strong><small>{UNIT_TYPE_LABEL[unit.type]} · {propertyById[unit.propertyId]?.name || "Sin propiedad"}</small><em>{unit.area ? `${unit.area} m² · ` : ""}{money(unit.suggestedRent)}</em></span>
                        <HiArrowRight />
                      </button>
                      <button type="button" className="unit-ticket-action" onClick={() => navigate(`/properties/tickets?unitId=${unit.id}&create=1`)}>Crear ticket</button>
                    </div>
                  ))}
                  {!boardCounts[status] ? <p>Sin unidades en este estado.</p> : null}
                </div>
              </article>
            ))}
          </section>
          )
        ) : (
          <section className="units-empty"><span><HiHomeModern /></span><h2>{units.length ? "No encontramos unidades" : activeProperties.length ? "Registra la primera unidad" : "Primero necesitamos una propiedad"}</h2><p>{units.length ? "Cambia la búsqueda o los filtros seleccionados." : activeProperties.length ? "Crea los espacios que se administran y comercializan individualmente dentro del inmueble." : "Toda unidad debe pertenecer a una propiedad activa."}</p>{canWrite ? <button type="button" onClick={activeProperties.length ? openCreate : () => navigate("/properties/inmuebles")}><HiPlus /> {activeProperties.length ? "Crear primera unidad" : "Registrar propiedad"}</button> : null}</section>
        )}
      </main>

      <Modal open={editingId !== null} onClose={closeModal} title={editingId === "new" ? "Nueva unidad" : "Editar unidad"} subtitle="Características y estado del espacio rentable." icon={<HiHomeModern />} width="max-w-[720px]" footer={<><button className="units-secondary" type="button" onClick={closeModal}>Cancelar</button><button className="units-primary" type="submit" form="unit-form">Guardar unidad</button></>}>
        <form id="unit-form" className="properties-form" onSubmit={saveUnit} noValidate>
          <section className="properties-form-section">
            <header><span className="properties-form-step">01</span><div><h3>Identificación</h3><p>Ubica la unidad dentro de su propiedad.</p></div></header>
            <div className="properties-form-grid">
              <label><span>Propiedad <b>*</b></span><select value={draft.propertyId} onChange={(event) => updateDraft("propertyId", event.target.value)} aria-invalid={Boolean(errors.propertyId)}>{activeProperties.map((property) => <option value={property.id} key={property.id}>{property.name}</option>)}</select><FieldError msg={errors.propertyId} /></label>
              <label><span>Identificador <b>*</b></span><input value={draft.identifier} onChange={(event) => updateDraft("identifier", event.target.value)} placeholder="Ej. 101, Local A" aria-invalid={Boolean(errors.identifier)} /><FieldError msg={errors.identifier} /></label>
              <label className="properties-form-wide"><span>Propietario de la unidad <small>Opcional</small></span><select value={draft.ownerId} onChange={(event) => updateDraft("ownerId", event.target.value)}><option value="">Sin propietario asignado</option>{activeOwners.map((owner) => <option value={owner.id} key={owner.id}>{owner.name}</option>)}</select></label>
              <label><span>Tipo de unidad</span><select value={draft.type} onChange={(event) => updateDraft("type", event.target.value)}>{Object.entries(UNIT_TYPE_LABEL).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label><span>Piso o nivel <small>Opcional</small></span><input value={draft.floor} onChange={(event) => updateDraft("floor", event.target.value)} placeholder="Ej. 2" /></label>
            </div>
          </section>
          <section className="properties-form-section">
            <header><span className="properties-form-step">02</span><div><h3>Características</h3><p>Dimensiones y distribución del espacio.</p></div></header>
            <div className="properties-form-grid is-three">
              <label><span>Superficie</span><div className="properties-input-suffix"><input type="number" min="0" value={draft.area} onChange={(event) => updateDraft("area", event.target.value)} aria-invalid={Boolean(errors.area)} /><i>m²</i></div><FieldError msg={errors.area} /></label>
              <label><span>Recámaras</span><input type="number" min="0" value={draft.bedrooms} onChange={(event) => updateDraft("bedrooms", event.target.value)} placeholder="0" /></label>
              <label><span>Baños</span><input type="number" min="0" step="0.5" value={draft.bathrooms} onChange={(event) => updateDraft("bathrooms", event.target.value)} placeholder="0" /></label>
            </div>
          </section>
          <section className="properties-form-section">
            <header><span className="properties-form-step">03</span><div><h3>Operación</h3><p>Referencia económica y disponibilidad actual.</p></div></header>
            <div className="properties-form-grid">
              <label><span>Renta mensual sugerida</span><div className="properties-input-prefix"><i>$</i><input type="number" min="0" value={draft.suggestedRent} onChange={(event) => updateDraft("suggestedRent", event.target.value)} placeholder="0" aria-invalid={Boolean(errors.suggestedRent)} /></div><FieldError msg={errors.suggestedRent} /></label>
              <label><span>Estado operativo</span><select value={draft.status} onChange={(event) => updateDraft("status", event.target.value)}>{Object.entries(UNIT_STATUS_LABEL).filter(([value]) => value !== "archived").map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label className="properties-form-wide"><span>Descripción <small>Opcional</small></span><textarea rows="3" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} placeholder="Amenidades, distribución o indicaciones internas…" /></label>
            </div>
          </section>
        </form>
      </Modal>
    </EcoLayout>
  );
}

export default UnitsPage;
