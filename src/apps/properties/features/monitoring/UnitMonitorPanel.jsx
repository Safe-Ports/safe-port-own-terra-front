import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HiArrowRight, HiBanknotes, HiBellAlert, HiBolt, HiBuildingOffice2, HiCreditCard, HiDocumentText, HiEyeDropper, HiFire, HiHomeModern, HiIdentification, HiKey, HiMagnifyingGlass, HiPencilSquare, HiQrCode, HiUserPlus, HiWifi } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";
import VisitorPassForm from "../access/VisitorPassForm";
import UnitAccountCard from "./UnitAccountCard";
import UnitOperationsCard from "./UnitOperationsCard";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import { PROPERTIES_MVP_SCOPE } from "../../mvpScope";
import { PERSON_UNIT_ROLE_LABEL } from "../community/communityModel";
import { UTILITY_STATUS_LABEL, UTILITY_TYPE_LABEL } from "../condo/condoOperationsModel";
import MediaGallery, { useEntityMedia } from "../media/MediaGallery";
import SpecSheet from "../specs/SpecSheet";
import { unitSpecSheet } from "../specs/specModel";
import { UNIT_STATUS_LABEL, UNIT_TYPE_LABEL } from "../units/unitModel";
import { buildUnitMonitorRows } from "./unitMonitoringModel";
import "./unit-monitoring.css";

const money = (value) => new Intl.NumberFormat("es-MX", { style:"currency", currency:"MXN", maximumFractionDigits:0 }).format(value || 0);
const shortDate = (value) => value ? new Date(String(value).length === 10 ? `${value}T12:00:00` : value).toLocaleDateString("es-MX", { day:"numeric", month:"short", year:"numeric" }) : "";
const stateLabel = (value) => ({ paid:"Pagado", partial:"Pago parcial", pending:"Pendiente", overdue:"Vencido", waived:"Condonado", due_soon:"Por vencer", pending_evidence:"Sin evidencia", open:"Abierto", in_progress:"En progreso", resolved:"Resuelto" }[value] || value);
// Qué tan urgente es cada estado de servicio, para colorear su pastilla.
const UTILITY_TYPES = ["water", "electricity", "internet", "gas"];
const UTILITY_ICON = { water:HiEyeDropper, electricity:HiBolt, internet:HiWifi, gas:HiFire };
const UTILITY_TONE = { overdue:"danger", disputed:"danger", due_soon:"warn", pending_evidence:"warn", reported_paid:"warn", verified:"ok", suspended:"muted" };
// Vigencia de la relación persona–unidad, si se capturó.
const vigencia = (link) => link.endsAt ? `Vigente hasta ${shortDate(link.endsAt)}` : link.startsAt ? `Vigente desde ${shortDate(link.startsAt)}` : null;
// Miniatura del encabezado: la portada de la unidad o, sin fotos, su ícono.
function UnitCover({ unitId }) {
  const { images } = useEntityMedia("property", unitId);
  return <span className={images[0] ? "has-photo" : ""}>{images[0] ? <img src={images[0].url} alt="" /> : <HiHomeModern />}</span>;
}
// Datos clave de la unidad en el encabezado; sólo los que estén capturados.
const unitFacts = (unit, row) => [
  UNIT_TYPE_LABEL[row.type] || "Unidad",
  UNIT_STATUS_LABEL[row.status],
  unit?.area ? `${unit.area} m²` : null,
  unit?.floor != null && unit.floor !== "" ? `Piso ${unit.floor}` : null,
  unit?.bedrooms ? `${unit.bedrooms} recámara${Number(unit.bedrooms) === 1 ? "" : "s"}` : null,
  unit?.bathrooms ? `${unit.bathrooms} baño${Number(unit.bathrooms) === 1 ? "" : "s"}` : null,
].filter(Boolean);
// Estado de la cuenta de portal de cada persona, para saber de un vistazo
// quién ya puede entrar y a quién falta invitar.
const PORTAL_STATUS = { active:["Portal activo", "ok"], invited:["Invitación pendiente", "warn"], suspended:["Acceso suspendido", "danger"] };
const portalStatus = (identity) => PORTAL_STATUS[identity?.status] || ["Dar acceso", "muted"];
const initials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("") || "?";

/* Pestaña Unidades de una comunidad: aquí vive la pieza central de Properties,
   el vínculo persona–unidad. Cada unidad muestra quién es dueño, quién vive y
   quién paga, con su saldo, y desde aquí se agrega a alguien en un solo paso.
   Servicios e incidencias sólo aparecen cuando esos módulos tengan backend
   (mvpScope.later): hoy son datos demo. */
function UnitMonitorPanel({ community, unitId, onSelectUnit, onAddUnit, onEditUnit, onAddMember, onUnlink, onOpenCharges, onOpenAccess, onBackToUnits, onBackToCommunities, canWrite = false }) {
  const data = usePropertiesData();
  const { showToast } = useAppContext();
  const [query, setQuery] = useState("");
  const [visitOpen, setVisitOpen] = useState(false);
  const identityByPerson = useMemo(() => Object.fromEntries((data.portalIdentities || []).map((identity) => [identity.persona_id, identity])), [data.portalIdentities]);
  const withDemoModules = PROPERTIES_MVP_SCOPE.later;
  const rows = useMemo(() => buildUnitMonitorRows({
    units: data.units.filter((unit) => unit.propertyId === community?.propertyId),
    people: data.communityPeople,
    relations: data.personUnitRelations,
    charges: data.condoCharges,
    // Igual que en Cobros: los servicios ya se muestran sin esconderse detrás
    // de `later`, aunque la matriz de unidades conserve esa bandera para sus
    // columnas de servicios/incidencias.
    utilityServices: data.utilityServices,
    tickets: withDemoModules ? data.tickets : [],
  }), [data.units, data.communityPeople, data.personUnitRelations, data.condoCharges, data.utilityServices, data.tickets, community?.propertyId, withDemoModules]);
  const peopleById = useMemo(() => Object.fromEntries(data.communityPeople.map((person) => [person.id, person])), [data.communityPeople]);
  const visible = rows.filter((row) => `${row.identifier} ${row.occupants.map((item) => item.name).join(" ")} ${row.responsible.map((item) => item.name).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  // Sin `unitId` se ve el catálogo; con él, solo la ficha de esa unidad (sin autoseleccionar la primera).
  const selected = unitId ? rows.find((row) => row.id === unitId) : null;
  const links = selected ? data.personUnitRelations.filter((relation) => relation.unitId === selected.id && relation.status !== "archived") : [];
  const selectedUnit = selected ? data.units.find((unit) => unit.id === selected.id) : null;
  const spec = selectedUnit ? unitSpecSheet({ ...(selectedUnit.attributes || {}), type: selectedUnit.type, floor: selectedUnit.floor, area: selectedUnit.area, bedrooms: selectedUnit.bedrooms, bathrooms: selectedUnit.bathrooms, description: selectedUnit.description }) : null;
  const withoutPeople = rows.filter((row) => !data.personUnitRelations.some((relation) => relation.unitId === row.id && relation.status !== "archived")).length;
  const ownerLink = selected ? links.find((link) => link.role === "owner") : null;
  const ownerPerson = ownerLink ? peopleById[ownerLink.personId] : null;
  const remindResponsible = () => showToast(selected?.responsible.length ? `Vista previa: en producción avisaríamos a ${selected.responsible.map((person) => person.name).join(", ")}.` : "Esta unidad no tiene un responsable de pago asignado.", "info");
  const generateDebtReport = () => showToast("Generar reporte de deuda estará disponible próximamente.", "info");

  if (!rows.length) return <section id="community-unit-workspace" className="community-panel unit-monitor-empty" aria-label={`Unidades de ${community?.name}`}><HiBuildingOffice2/><h2>Esta comunidad aún no tiene unidades</h2><p>Agrega sus casas, departamentos o espacios; quedarán vinculados a {community?.name}.</p>{canWrite&&onAddUnit?<button type="button" className="community-add-unit" onClick={onAddUnit}><HiHomeModern/> Agregar unidad</button>:null}</section>;

  return <section id="community-unit-workspace" className="community-panel unit-monitor-panel unit-floating-catalog" aria-label={`Unidades de ${community?.name}`}>
    {selected ? null : <header><div><h2>Unidades de {community?.name}</h2><p>Elige una casa, departamento o espacio para abrir su ficha.</p><p>{withoutPeople ? `${withoutPeople} de ${rows.length} unidades aún no tienen a nadie asignado.` : rows.length===1?"La unidad tiene al menos una persona asignada.":`Las ${rows.length} unidades tienen al menos una persona asignada.`}</p></div><label className="unit-monitor-search"><HiMagnifyingGlass/><input aria-label="Buscar unidad o persona" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar unidad o persona"/></label>{canWrite&&onAddUnit?<button type="button" className="community-add-unit" onClick={onAddUnit}><HiHomeModern/> Agregar unidad</button>:null}</header>}
    {selected ? <nav className="community-catalog-back unit-view-back" aria-label="Navegación de unidades"><button type="button" onClick={onBackToUnits}>← Volver a unidades</button><ol className="unit-view-crumbs">{onBackToCommunities ? <li><button type="button" onClick={onBackToCommunities}>Comunidades</button></li> : null}<li><button type="button" onClick={onBackToUnits}>{community?.name}</button></li><li aria-current="page">{selected.identifier}</li></ol></nav> : null}
    <div className={`unit-monitor-workspace ${withDemoModules ? "" : "is-compact"}`}>
      {selected ? null : <div className="unit-monitor-matrix">
        <header><span>Unidad</span><span>Personas</span><span>Saldo pendiente</span>{withDemoModules ? <><span>Servicios</span><span>Atención</span></> : null}</header>
        {visible.map((row) => {
          const names = [...new Map([...row.responsible, ...row.occupants].map((person) => [person.id, person])).values()].map((person) => person.name);
          return <button type="button" className={selected?.id === row.id ? "active" : ""} aria-pressed={selected?.id === row.id} aria-label={`Abrir ${row.identifier}`} key={row.id} onClick={() => onSelectUnit(row.id)}>
            <span className="unit-floating-identity"><i className="unit-floating-icon" aria-hidden="true"><HiHomeModern/></i><strong>{row.identifier}</strong><small>{UNIT_TYPE_LABEL[row.type] || "Unidad"} · {UNIT_STATUS_LABEL[row.status]}</small></span>
            <span>{names.length ? <><strong>{names.join(", ")}</strong><small>{row.responsible.length ? `Paga: ${row.responsible.map((item) => item.name).join(", ")}` : "Sin responsable de pago"}</small></> : <strong className="unit-monitor-unassigned">Sin personas</strong>}</span>
            <span className={row.openChargeAmount ? "attention" : "ok"}><strong>{money(row.openChargeAmount)}</strong>{row.charges.length ? <small>{row.charges.length} movimientos</small> : null}</span>
            {withDemoModules ? <><span><strong>{money(row.openServiceAmount)}</strong><small>{row.services.length} servicios</small></span><span className={row.openTickets ? "attention" : "ok"}><strong>{row.openTickets}</strong><small>incidencias abiertas</small></span></> : null}
          </button>;
        })}
        {!visible.length ? <p className="unit-monitor-none">Ninguna unidad o persona coincide con “{query}”.</p> : null}
      </div>}
      {selected ? <aside id="community-unit-detail" className="unit-monitor-detail unit-page" aria-label={`Detalle de ${selected.identifier}`}>
        <header className="unit-page-hero">
          <UnitCover unitId={selected.id}/>
          <div><h2>{selected.identifier}</h2><p className="unit-page-facts">{unitFacts(selectedUnit, selected).map((fact) => <span key={fact}>{fact}</span>)}</p></div>
          {canWrite && onEditUnit ? <button type="button" className="unit-monitor-edit" onClick={() => onEditUnit(selected.id)} aria-label={`Editar ${selected.identifier}`}><HiPencilSquare/> Editar</button> : null}
        </header>

        <div className="unit-page-layout">
          <div className="unit-page-main">
            <UnitAccountCard unit={selected} community={community} canWrite={canWrite} hasPayer={selected.responsible.length > 0} onOpenCommunityCharges={onOpenCharges}/>

            <section className="unit-members unit-page-card" aria-label={`Personas de ${selected.identifier}`}>
              <header><h3>Personas de la unidad</h3>{canWrite && links.length ? <button type="button" className="unit-members-add" onClick={() => onAddMember(selected.id)}><HiUserPlus/> Agregar persona</button> : null}</header>
              {links.length ? links.map((link) => {
                const person = peopleById[link.personId];
                const perms = [link.isPaymentResponsible && "Paga", link.canVote && "Vota", link.amenityAccess && "Amenidades"].filter(Boolean);
                const meta = [PERSON_UNIT_ROLE_LABEL[link.role] || link.role, link.isPrimary ? "Contacto principal" : null, person?.phone || null, vigencia(link)].filter(Boolean).join(" · ");
                return <article key={link.id}>
                  <span className="unit-members-avatar">{initials(person?.name)}</span>
                  <span><strong>{person?.name || "Persona archivada"}</strong><small>{meta}</small><em>{perms.length ? perms.map((perm) => <i key={perm}>{perm}</i>) : <i className="muted">Sin permisos</i>}</em></span>
                  {onOpenAccess && person ? (() => { const [label, tone] = portalStatus(identityByPerson[person.id]); return <button type="button" className={`unit-members-access tone-${tone}`} onClick={() => onOpenAccess(person)} aria-label={`Acceso al portal de ${person.name}: ${label}`}><HiKey/> {label}</button>; })() : null}
                  {canWrite ? <button type="button" className="unit-members-unlink" onClick={() => onUnlink(link)} aria-label={`Quitar a ${person?.name || "esta persona"} de ${selected.identifier}`}>Quitar</button> : null}
                </article>;
              }) : <div className="unit-members-empty"><p>Nadie está asignado a esta unidad. Sin una persona que pague, no se le pueden generar cuotas ni votar.</p>{canWrite ? <button type="button" onClick={() => onAddMember(selected.id)}><HiUserPlus/> Agregar la primera persona</button> : null}</div>}
            </section>

            <UnitOperationsCard unit={selected} community={community} canWrite={canWrite} people={links.map((link) => peopleById[link.personId]).filter(Boolean)}/>

            <section className="unit-page-card unit-service-card" aria-label={`Estado de servicios de ${selected.identifier}`}>
              <h3>Estado de servicios</h3>
              <ul className="unit-service-list">
                {UTILITY_TYPES.map((type) => {
                  const service = selected.services.find((item) => item.type === type);
                  const Icon = UTILITY_ICON[type];
                  const tone = service ? UTILITY_TONE[service.status] || "muted" : "muted";
                  const pillText = !service ? "Sin registro" : (tone === "danger" || tone === "warn") && service.amount ? `${UTILITY_STATUS_LABEL[service.status] || service.status} · ${money(service.amount)}` : UTILITY_STATUS_LABEL[service.status] || service.status;
                  return <li key={type} className="unit-service-row">
                    <i className={`unit-service-ico tone-${tone}`}><Icon/></i>
                    <span className="unit-service-label"><strong>{UTILITY_TYPE_LABEL[type]}</strong><small>{service?.name || "Sin periodo registrado"}</small></span>
                    <span className={`unit-service-pill tone-${tone}`}>{pillText}</span>
                  </li>;
                })}
              </ul>
              <Link to={`/properties/comunidades/operacion?module=utilities&community=${community?.id || ""}`} className="unit-service-link">Ver todos los servicios de la comunidad <HiArrowRight/></Link>
            </section>

            <section className="unit-page-card unit-fact-card" aria-label={`Datos de ${selected.identifier}`}>
              <h3>Datos de la unidad</h3>
              <ul className="unit-fact-list">
                <li><HiIdentification/><span><strong>{ownerPerson?.name || "Sin propietario asignado"}</strong><small>Propietario</small></span></li>
                <li><HiBanknotes/><span><strong>{money(selected.openChargeAmount)}</strong><small>{selected.openChargeAmount ? `${selected.charges.length} movimiento${selected.charges.length === 1 ? "" : "s"} pendientes` : "Sin adeudo de cuotas"}</small></span></li>
              </ul>
              <div className="unit-fact-specs">
                <h4>Ficha técnica</h4>
                <SpecSheet {...spec} label={`Ficha técnica de ${selected.identifier}`} emptyText={canWrite ? "Sin ficha técnica. Complétala desde Editar." : "Sin ficha técnica."}/>
              </div>
            </section>
          </div>

          <div className="unit-actions-rail" aria-label="Acciones sobre la unidad">
            {data.backendLive ? <>
              <p className="unit-actions-label">Accesos</p>
              <button type="button" className="unit-action is-primary" onClick={() => setVisitOpen(true)} disabled={!canWrite}>
                <HiQrCode/>
                <span><strong>Pase para visita</strong><small>Un QR provisional para entrar a {selected.identifier}</small></span>
              </button>
              {canWrite ? <button type="button" className="unit-action" onClick={() => onAddMember(selected.id)}>
                <HiUserPlus/>
                <span><strong>Agregar persona con acceso</strong><small>La vincula a la unidad y la invita al portal</small></span>
              </button> : null}
            </> : null}
            <p className="unit-actions-label">Cobranza</p>
            <button type="button" className={`unit-action ${data.backendLive ? "" : "is-primary"}`} onClick={remindResponsible} disabled={!selected.responsible.length}>
              <HiBellAlert/>
              <span><strong>Enviar recordatorio</strong><small>{selected.responsible.length ? `Avisa a ${selected.responsible.map((person) => person.name).join(", ")} de lo pendiente` : "Asigna primero un responsable de pago"}</small></span>
            </button>
            <button type="button" className="unit-action" onClick={() => document.getElementById("unit-account")?.scrollIntoView({ behavior:"smooth", block:"start" })}>
              <HiCreditCard/>
              <span><strong>Registrar pago</strong><small>{selected.openChargeAmount ? `${money(selected.openChargeAmount)} pendientes en su cuenta` : "Su cuenta está al corriente"}</small></span>
            </button>
            <button type="button" className="unit-action" onClick={generateDebtReport}>
              <HiDocumentText/>
              <span><strong>Generar reporte de deuda</strong><small>Un PDF con cuotas y servicios pendientes</small></span>
            </button>
          </div>
        </div>

        <div className="unit-page-grid unit-page-grid-secondary">
          <section className="unit-page-card unit-page-movements"><h3>Movimientos recientes</h3>{selected.movements.length ? selected.movements.map((item) => <article key={item.id}><i>{item.type[0]}</i><span><strong>{item.title}</strong><small>{item.type} · {stateLabel(item.state)}</small></span><time>{String(item.date).slice(0, 10)}</time></article>) : <p>Esta unidad aún no tiene movimientos.</p>}</section>
          <section className="unit-page-card"><h3>Fotos</h3><MediaGallery entityType="property" entityId={selected.id} label={`Fotos de ${selected.identifier}`} emptyText={canWrite ? "Sin fotos. Agrégalas desde Editar." : "Sin fotos."}/></section>
        </div>
      </aside> : null}
    </div>
    {selected ? <Modal open={visitOpen} onClose={() => setVisitOpen(false)} title={`Pase para visita a ${selected.identifier}`} subtitle={`${community?.name || ""} · El QR se muestra una sola vez: compártelo o guárdalo al crearlo.`} icon={<HiQrCode/>} width="max-w-[620px]">
      <VisitorPassForm key={selected.id} communityId={community?.id} fixedUnit={selectedUnit || { id:selected.id, identifier:selected.identifier }} canWrite={canWrite} onDone={() => setVisitOpen(false)}/>
    </Modal> : null}
  </section>;
}

export default UnitMonitorPanel;
