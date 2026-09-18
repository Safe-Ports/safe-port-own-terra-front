import { useMemo, useState } from "react";
import {
  HiArrowPath, HiBanknotes, HiCalendarDays, HiCheckCircle,
  HiClipboardDocumentCheck, HiDocumentText, HiExclamationTriangle,
  HiBuildingStorefront, HiHomeModern, HiIdentification, HiKey, HiMagnifyingGlass, HiPlus, HiUserGroup,
} from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import FieldError from "@/components/shared/FieldError";
import Modal from "@/components/ui/Modal";
import { useAppContext } from "@/context/AppContext";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import { PROPERTY_ACTION_ICONS } from "../../components/propertiesIconCatalog";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import {
  RENTAL_INSPECTION_STATUS, RENTAL_LEASE_STATUS, RENTAL_PAYMENT_STATUS,
  RENTAL_PROSPECT_STATUS, rentalCollectionSummary, validateRentalLease,
  validateRentalProspect, validateRentalTenant,
} from "./rentalModel";
import "./rent-operations.css";

const { back: HiArrowLeft } = PROPERTY_ACTION_ICONS;
const money = (value) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value || 0);
const shortDate = (value) => value ? new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "Sin fecha";
const activeLeaseStatuses = new Set(["active", "upcoming"]);
const today = new Date("2026-09-03T12:00:00");
const emptyDrafts = {
  prospect: { name:"", phone:"", email:"", unitId:"", source:"Directo", budget:"", desiredMoveIn:"", notes:"" },
  tenant: { personType:"individual", name:"", phone:"", email:"", emergencyContact:"", documentSummary:"" },
  lease: { tenantId:"", unitId:"", startDate:"", endDate:"", rent:"", deposit:"", dueDay:"5", includedServices:"", signedDocumentName:"", status:"active" },
  payment: { leaseId:"", period:"2026-09", amount:"", dueDate:"2026-09-05", paidAt:"2026-09-03", method:"transfer", evidenceName:"", status:"paid", note:"" },
  inspection: { leaseId:"", unitId:"", type:"periodic", scheduledAt:"", checklist:"", notes:"" },
  renewal: { leaseId:"", endDate:"", rent:"" }, completion: { inspectionId:"", evidenceCount:"0" },
};
const tabs = [
  ["overview", "Resumen", HiHomeModern], ["prospects", "Prospectos", HiMagnifyingGlass],
  ["tenants", "Inquilinos", HiUserGroup], ["leases", "Contratos", HiDocumentText],
  ["collection", "Cobranza", HiBanknotes], ["inspections", "Inspecciones", HiClipboardDocumentCheck],
];

function EmptyState({ icon: Icon, title, text, action, canWrite }) {
  return <section className="rent-empty"><span><Icon /></span><h2>{title}</h2><p>{text}</p>{canWrite && action ? <button type="button" onClick={action.onClick}><HiPlus /> {action.label}</button> : null}</section>;
}
function Status({ value, labels }) { return <span className={`rent-status ${value}`}>{labels[value] || value}</span>; }

function RentOperationsPage() {
  const navigate = useNavigate();
  const { canUseFeature, showToast } = useAppContext();
  const canWrite = canUseFeature("properties.rent.write") || canUseFeature("properties.write");
  const data = usePropertiesData();
  const { owners, properties, units, rentalProspects, rentalTenants, rentalLeases, rentalPayments, rentalInspections } = data;
  const [view, setView] = useState("overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const [draft, setDraft] = useState(emptyDrafts.prospect);
  const [errors, setErrors] = useState({});
  const propertyById = useMemo(() => Object.fromEntries(properties.map((item) => [item.id, item])), [properties]);
  const unitById = useMemo(() => Object.fromEntries(units.map((item) => [item.id, item])), [units]);
  const tenantById = useMemo(() => Object.fromEntries(rentalTenants.map((item) => [item.id, item])), [rentalTenants]);
  const leaseById = useMemo(() => Object.fromEntries(rentalLeases.map((item) => [item.id, item])), [rentalLeases]);
  const collection = useMemo(() => rentalCollectionSummary(rentalLeases, rentalPayments, "2026-09"), [rentalLeases, rentalPayments]);
  const expiringLeases = useMemo(() => rentalLeases.filter((lease) => activeLeaseStatuses.has(lease.status)).map((lease) => ({ ...lease, days: Math.ceil((new Date(`${lease.endDate}T12:00:00`) - today) / 86400000) })).filter((lease) => lease.days <= 90).sort((a, b) => a.days - b.days), [rentalLeases]);
  const normalizedQuery = query.trim().toLowerCase();
  const matches = (...values) => !normalizedQuery || values.some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
  const openModal = (type, seed = {}) => { setModal(type); setDraft({ ...emptyDrafts[type], ...seed }); setErrors({}); };
  const closeModal = () => { setModal(null); setErrors({}); };
  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, contact: undefined, form: undefined }));
  };

  const save = (event) => {
    event.preventDefault();
    try {
      if (modal === "prospect") {
        const next = validateRentalProspect(draft); if (Object.keys(next).length) return setErrors(next);
        data.addRentalProspect(draft); showToast("Prospecto agregado a la sesión", "success");
      } else if (modal === "tenant") {
        const next = validateRentalTenant(draft); if (Object.keys(next).length) return setErrors(next);
        data.addRentalTenant(draft); showToast("Expediente de inquilino creado", "success");
      } else if (modal === "lease") {
        const next = validateRentalLease(draft, rentalLeases); if (Object.keys(next).length) return setErrors(next);
        data.addRentalLease(draft); showToast("Contrato registrado en esta sesión", "success");
      } else if (modal === "payment") {
        data.addRentalPayment(draft); showToast("Movimiento registrado; no se procesó dinero en OwnTerra", "success");
      } else if (modal === "inspection") {
        data.addRentalInspection(draft); showToast("Inspección programada", "success");
      } else if (modal === "renewal") {
        const lease = leaseById[draft.leaseId];
        if (!lease || !draft.endDate || draft.endDate <= lease.endDate) return setErrors({ endDate:"La nueva vigencia debe terminar después del contrato actual." });
        data.renewRentalLease(draft.leaseId, draft); showToast("Vigencia actualizada", "success");
      } else if (modal === "completion") {
        data.completeRentalInspection(draft.inspectionId, draft.evidenceCount); showToast("Inspección completada con su evidencia", "success");
      }
      closeModal();
    } catch (error) { setErrors({ form: error.message || "No se pudo guardar el registro." }); }
  };

  const modalMeta = {
    prospect:["Nuevo prospecto", "Captura interés, presupuesto y unidad.", HiMagnifyingGlass],
    tenant:["Nuevo inquilino", "Expediente mínimo de persona o empresa.", HiIdentification],
    lease:["Nuevo contrato", "Registra la relación; no genera cláusulas legales.", HiDocumentText],
    payment:["Registrar movimiento", "Evidencia manual; OwnTerra no procesa el dinero.", HiBanknotes],
    inspection:["Programar inspección", "Entrada, revisión periódica o salida.", HiClipboardDocumentCheck],
    renewal:["Renovar vigencia", "Actualiza fecha e importe acordados.", HiArrowPath],
    completion:["Completar inspección", "Registra cuántas evidencias quedaron anexadas.", HiCheckCircle],
  };
  const ownerPerformance = owners.map((owner) => {
    const ids = new Set(properties.filter((property) => property.ownerId === owner.id).map((property) => property.id));
    const leases = rentalLeases.filter((lease) => ids.has(unitById[lease.unitId]?.propertyId) && lease.status === "active");
    return { owner, leases, monthly:leases.reduce((sum, lease) => sum + lease.rent, 0) };
  }).filter((row) => row.leases.length);

  return <EcoLayout active="properties" title="OwnTerra Properties" subtitle="Operación · Rentas">
    <main className="rent-page">
      <button className="rent-back" type="button" onClick={() => navigate("/properties")}><HiArrowLeft /> Volver a Properties</button>
      <header className="rent-heading"><div><span>Rentas de largo y mediano plazo</span><h1>Operación de rentas</h1><p>Prospectos, expedientes, contratos, cobranza e inspecciones conectados al mismo portafolio.</p></div><div className="rent-heading-actions"><button type="button" className="rent-hospitality-link" onClick={() => navigate("/properties/publicaciones")}><HiBuildingStorefront /> Marketplace</button><button type="button" className="rent-hospitality-link" onClick={() => navigate("/properties/rentas/hospedaje")}><HiHomeModern /> Abrir Hospedaje</button></div></header>
      <aside className="rent-prototype-note"><strong>Frontend funcional de sesión.</strong> Estos registros son demostrativos y se restablecen al recargar. Cobranza registra evidencia; no mueve dinero ni calcula recargos o liquidaciones.</aside>
      {!canWrite ? <aside className="rent-readonly"><HiKey /> Estás en modo de consulta. Las altas y actualizaciones requieren permiso de operación de rentas.</aside> : null}
      <nav className="rent-view-tabs" aria-label="Secciones de rentas">{tabs.map(([value, label, Icon]) => <button type="button" key={value} className={view === value ? "active" : ""} onClick={() => { setView(value); setStatusFilter("all"); }}><Icon /> {label}</button>)}</nav>

      {view === "overview" ? <>
        <section className="rent-kpis" aria-label="Resumen de rentas"><article><small>Contratos activos</small><strong>{rentalLeases.filter((item) => item.status === "active").length}</strong><span>{units.filter((item) => item.status === "available").length} unidades disponibles</span></article><article className="positive"><small>Registrado en septiembre</small><strong>{money(collection.collected)}</strong><span>de {money(collection.expected)} esperados</span></article><article className="warning"><small>Por documentar</small><strong>{money(collection.outstanding)}</strong><span>Pagos pendientes o parciales</span></article><article className="danger"><small>Vencido</small><strong>{money(collection.overdue)}</strong><span>{expiringLeases.length} contratos vencen en 90 días</span></article></section>
        <section className="rent-overview-grid"><article className="rent-panel"><header><div><span>Atención</span><h2>Próximos vencimientos</h2></div><button type="button" onClick={() => setView("leases")}>Ver contratos</button></header>{expiringLeases.length ? <div className="rent-alert-list">{expiringLeases.map((lease) => <div key={lease.id}><i className={lease.days <= 15 ? "urgent" : "soon"}><HiCalendarDays /></i><span><strong>{tenantById[lease.tenantId]?.name}</strong><small>{unitById[lease.unitId]?.identifier} · {propertyById[unitById[lease.unitId]?.propertyId]?.name}</small></span><b>{lease.days < 0 ? `Venció hace ${Math.abs(lease.days)} días` : `En ${lease.days} días`}</b></div>)}</div> : <p className="rent-panel-empty">Sin vencimientos en los próximos 90 días.</p>}</article><article className="rent-panel"><header><div><span>Propietarios</span><h2>Portafolio en renta</h2></div></header><div className="rent-owner-list">{ownerPerformance.map(({ owner, leases, monthly }) => <div key={owner.id}><span>{owner.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{owner.name}</strong><small>{leases.length} {leases.length === 1 ? "contrato activo" : "contratos activos"}</small></div><b>{money(monthly)}<small>/ mes</small></b></div>)}</div></article></section>
        <section className="rent-decisions"><HiExclamationTriangle /><div><strong>Decisiones pendientes de producto</strong><p>Comisión, custodia de depósitos, recargos, autorizaciones de mantenimiento y liquidación al propietario todavía requieren definición. El módulo no inventa esas reglas.</p></div></section>
      </> : null}

      {view !== "overview" ? <section className="rent-toolbar"><label><HiMagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar en ${tabs.find(([value]) => value === view)?.[1].toLowerCase()}`} /></label><div>{view === "prospects" ? Object.entries({ all:"Todos", ...RENTAL_PROSPECT_STATUS }).map(([value, label]) => <button type="button" className={statusFilter === value ? "active" : ""} key={value} onClick={() => setStatusFilter(value)}>{label}</button>) : null}</div>{canWrite ? <button type="button" className="rent-primary" onClick={() => openModal(view === "prospects" ? "prospect" : view === "tenants" ? "tenant" : view === "leases" ? "lease" : view === "collection" ? "payment" : "inspection")}><HiPlus /> {view === "prospects" ? "Prospecto" : view === "tenants" ? "Inquilino" : view === "leases" ? "Contrato" : view === "collection" ? "Movimiento" : "Inspección"}</button> : null}</section> : null}

      {view === "prospects" ? <Prospects rows={rentalProspects.filter((item) => (statusFilter === "all" || item.status === statusFilter) && matches(item.name, item.email, item.phone, unitById[item.unitId]?.identifier))} unitById={unitById} propertyById={propertyById} canWrite={canWrite} changeStatus={data.changeRentalProspectStatus} open={() => openModal("prospect")} /> : null}
      {view === "tenants" ? <Tenants rows={rentalTenants.filter((item) => item.status !== "archived" && matches(item.name, item.email, item.phone))} leases={rentalLeases} unitById={unitById} propertyById={propertyById} canWrite={canWrite} open={() => openModal("tenant")} /> : null}
      {view === "leases" ? <Leases rows={rentalLeases.filter((lease) => matches(tenantById[lease.tenantId]?.name, unitById[lease.unitId]?.identifier, propertyById[unitById[lease.unitId]?.propertyId]?.name))} tenantById={tenantById} unitById={unitById} propertyById={propertyById} canWrite={canWrite} renew={(lease) => openModal("renewal", { leaseId:lease.id, endDate:"", rent:String(lease.rent) })} end={data.changeRentalLeaseStatus} open={() => openModal("lease")} /> : null}
      {view === "collection" ? <Collection rows={rentalPayments.filter((payment) => { const lease = leaseById[payment.leaseId]; return matches(tenantById[lease?.tenantId]?.name, unitById[lease?.unitId]?.identifier, payment.period, payment.evidenceName); })} summary={collection} leaseById={leaseById} tenantById={tenantById} unitById={unitById} canWrite={canWrite} open={() => openModal("payment")} /> : null}
      {view === "inspections" ? <Inspections rows={rentalInspections.filter((item) => { const lease = leaseById[item.leaseId]; return matches(unitById[item.unitId]?.identifier, tenantById[lease?.tenantId]?.name, item.type, item.notes); })} leaseById={leaseById} tenantById={tenantById} unitById={unitById} propertyById={propertyById} canWrite={canWrite} complete={(item) => openModal("completion", { inspectionId:item.id, evidenceCount:"0" })} open={() => openModal("inspection")} /> : null}
    </main>
    <RentalModal modal={modal} meta={modalMeta[modal]} draft={draft} errors={errors} updateDraft={updateDraft} close={closeModal} save={save} units={units} properties={propertyById} tenants={rentalTenants} leases={rentalLeases} tenantById={tenantById} unitById={unitById} />
  </EcoLayout>;
}

function Prospects({ rows, unitById, propertyById, canWrite, changeStatus, open }) {
  if (!rows.length) return <EmptyState icon={HiMagnifyingGlass} title="Sin prospectos" text="Registra interesados y vincúlalos con una unidad disponible." canWrite={canWrite} action={{ label:"Crear prospecto", onClick:open }} />;
  return <section className="rent-list" aria-label="Prospectos de renta">{rows.map((item) => <article key={item.id}><div className="rent-avatar">{item.name.slice(0, 2).toUpperCase()}</div><div className="rent-list-main"><small>{item.source}</small><h2>{item.name}</h2><p>{item.phone || item.email} · Mudanza {shortDate(item.desiredMoveIn)}</p></div><div><small>Unidad de interés</small><strong>{unitById[item.unitId]?.identifier}</strong><span>{propertyById[unitById[item.unitId]?.propertyId]?.name}</span></div><div><small>Presupuesto</small><strong>{money(item.budget)}</strong><span>{item.notes || "Sin notas"}</span></div>{canWrite ? <select aria-label={`Etapa de ${item.name}`} value={item.status} onChange={(event) => changeStatus(item.id, event.target.value)}>{Object.entries(RENTAL_PROSPECT_STATUS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select> : <Status value={item.status} labels={RENTAL_PROSPECT_STATUS} />}</article>)}</section>;
}
function Tenants({ rows, leases, unitById, propertyById, canWrite, open }) {
  if (!rows.length) return <EmptyState icon={HiUserGroup} title="Sin inquilinos" text="Crea el expediente antes de registrar un contrato." canWrite={canWrite} action={{ label:"Crear inquilino", onClick:open }} />;
  return <section className="rent-list" aria-label="Expedientes de inquilinos">{rows.map((item) => { const current = leases.find((lease) => lease.tenantId === item.id && activeLeaseStatuses.has(lease.status)); return <article key={item.id}><div className="rent-avatar"><HiIdentification /></div><div className="rent-list-main"><small>{item.personType === "company" ? "Persona moral" : "Persona física"}</small><h2>{item.name}</h2><p>{item.email || item.phone}</p></div><div><small>Contrato vigente</small><strong>{current ? unitById[current.unitId]?.identifier : "Sin contrato"}</strong><span>{current ? propertyById[unitById[current.unitId]?.propertyId]?.name : "Disponible para vincular"}</span></div><div><small>Expediente</small><strong>{item.documentSummary || "Sin documentos"}</strong><span>{item.emergencyContact || "Sin contacto de emergencia"}</span></div><Status value={item.status} labels={{ active:"Activo", archived:"Archivado" }} /></article>; })}</section>;
}
function Leases({ rows, tenantById, unitById, propertyById, canWrite, renew, end, open }) {
  if (!rows.length) return <EmptyState icon={HiDocumentText} title="Sin contratos" text="Los contratos siempre deben vincular una unidad y un inquilino." canWrite={canWrite} action={{ label:"Registrar contrato", onClick:open }} />;
  return <section className="rent-list rent-leases" aria-label="Contratos de renta">{rows.map((lease) => <article key={lease.id}><div className="rent-avatar"><HiDocumentText /></div><div className="rent-list-main"><small>{lease.signedDocumentName || "Documento pendiente"}</small><h2>{tenantById[lease.tenantId]?.name}</h2><p>{unitById[lease.unitId]?.identifier} · {propertyById[unitById[lease.unitId]?.propertyId]?.name}</p></div><div><small>Vigencia</small><strong>{shortDate(lease.startDate)} – {shortDate(lease.endDate)}</strong><span>Pago cada día {lease.dueDay}</span></div><div><small>Renta y depósito</small><strong>{money(lease.rent)} / mes</strong><span>Depósito registrado: {money(lease.deposit)}</span></div><Status value={lease.status} labels={RENTAL_LEASE_STATUS} />{canWrite && lease.status === "active" ? <div className="rent-row-actions"><button type="button" onClick={() => renew(lease)}><HiArrowPath /> Renovar</button><button type="button" onClick={() => end(lease.id, "ended")}>Terminar</button></div> : null}</article>)}</section>;
}
function Collection({ rows, summary, leaseById, tenantById, unitById, canWrite, open }) {
  return <><section className="rent-kpis compact"><article><small>Esperado</small><strong>{money(summary.expected)}</strong></article><article className="positive"><small>Registrado</small><strong>{money(summary.collected)}</strong></article><article className="warning"><small>Pendiente</small><strong>{money(summary.outstanding)}</strong></article><article className="danger"><small>Vencido</small><strong>{money(summary.overdue)}</strong></article></section>{rows.length ? <section className="rent-list" aria-label="Cobranza de renta">{rows.map((payment) => { const lease = leaseById[payment.leaseId]; return <article key={payment.id}><div className="rent-avatar"><HiBanknotes /></div><div className="rent-list-main"><small>Periodo {payment.period}</small><h2>{tenantById[lease?.tenantId]?.name}</h2><p>{unitById[lease?.unitId]?.identifier} · vence {shortDate(payment.dueDate)}</p></div><div><small>Importe registrado</small><strong>{money(payment.amount)}</strong><span>{payment.method.toUpperCase()}</span></div><div><small>Evidencia</small><strong>{payment.evidenceName || "Pendiente"}</strong><span>{payment.note || "Sin notas"}</span></div><Status value={payment.status} labels={RENTAL_PAYMENT_STATUS} /></article>; })}</section> : <EmptyState icon={HiBanknotes} title="Sin movimientos" text="Registra pagos y comprobantes manuales por contrato y periodo." canWrite={canWrite} action={{ label:"Registrar movimiento", onClick:open }} />}</>;
}
function Inspections({ rows, leaseById, tenantById, unitById, propertyById, canWrite, complete, open }) {
  if (!rows.length) return <EmptyState icon={HiClipboardDocumentCheck} title="Sin inspecciones" text="Programa una revisión de entrada, periódica o de salida." canWrite={canWrite} action={{ label:"Programar inspección", onClick:open }} />;
  return <section className="rent-list" aria-label="Inspecciones de renta">{rows.map((item) => { const lease = leaseById[item.leaseId]; return <article key={item.id}><div className="rent-avatar"><HiClipboardDocumentCheck /></div><div className="rent-list-main"><small>{item.type === "entry" ? "Entrada" : item.type === "exit" ? "Salida" : "Periódica"}</small><h2>{unitById[item.unitId]?.identifier}</h2><p>{propertyById[unitById[item.unitId]?.propertyId]?.name} · {tenantById[lease?.tenantId]?.name}</p></div><div><small>Fecha</small><strong>{shortDate(item.scheduledAt)}</strong><span>{item.checklist || "Checklist general"}</span></div><div><small>Evidencia</small><strong>{item.evidenceCount} archivos</strong><span>{item.notes || "Sin notas"}</span></div><Status value={item.status} labels={RENTAL_INSPECTION_STATUS} />{canWrite && item.status === "scheduled" ? <button className="rent-complete" type="button" onClick={() => complete(item)}><HiCheckCircle /> Completar</button> : null}</article>; })}</section>;
}

function RentalModal({ modal, meta, draft, errors, updateDraft, close, save, units, properties, tenants, leases, tenantById, unitById }) {
  if (!modal || !meta) return null;
  const [title, subtitle, Icon] = meta;
  const activeLeases = leases.filter((lease) => lease.status === "active");
  const selectedLease = leases.find((lease) => lease.id === draft.leaseId);
  const field = (name, label, input) => <label><span>{label}</span>{input}<FieldError msg={errors[name]} /></label>;
  return <Modal open onClose={close} title={title} subtitle={subtitle} icon={<Icon />} width="max-w-[760px]" footer={<><button className="rent-secondary" type="button" onClick={close}>Cancelar</button><button className="rent-primary" type="submit" form="rental-form">Guardar</button></>}><form id="rental-form" className="properties-form rental-form" onSubmit={save} noValidate><FieldError msg={errors.form || errors.contact} /><div className="properties-form-grid">
    {modal === "prospect" ? <>{field("name", "Nombre *", <input autoFocus value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} aria-invalid={Boolean(errors.name)} />)}{field("unitId", "Unidad de interés *", <select value={draft.unitId} onChange={(e) => updateDraft("unitId", e.target.value)} aria-invalid={Boolean(errors.unitId)}><option value="">Selecciona</option>{units.filter((unit) => unit.status === "available").map((unit) => <option value={unit.id} key={unit.id}>{properties[unit.propertyId]?.name} · {unit.identifier}</option>)}</select>)}{field("phone", "Teléfono", <input value={draft.phone} onChange={(e) => updateDraft("phone", e.target.value)} />)}{field("email", "Correo", <input type="email" value={draft.email} onChange={(e) => updateDraft("email", e.target.value)} />)}{field("budget", "Presupuesto mensual *", <input type="number" min="1" value={draft.budget} onChange={(e) => updateDraft("budget", e.target.value)} />)}{field("desiredMoveIn", "Fecha deseada *", <input type="date" value={draft.desiredMoveIn} onChange={(e) => updateDraft("desiredMoveIn", e.target.value)} />)}{field("source", "Fuente", <select value={draft.source} onChange={(e) => updateDraft("source", e.target.value)}><option>Directo</option><option>Marketplace</option><option>Referido</option><option>Redes sociales</option></select>)}{field("notes", "Notas", <textarea rows="3" value={draft.notes} onChange={(e) => updateDraft("notes", e.target.value)} />)}</> : null}
    {modal === "tenant" ? <>{field("personType", "Tipo", <select value={draft.personType} onChange={(e) => updateDraft("personType", e.target.value)}><option value="individual">Persona física</option><option value="company">Persona moral</option></select>)}{field("name", "Nombre o razón social *", <input autoFocus value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} />)}{field("phone", "Teléfono", <input value={draft.phone} onChange={(e) => updateDraft("phone", e.target.value)} />)}{field("email", "Correo", <input type="email" value={draft.email} onChange={(e) => updateDraft("email", e.target.value)} />)}{field("emergencyContact", "Contacto de emergencia", <input value={draft.emergencyContact} onChange={(e) => updateDraft("emergencyContact", e.target.value)} />)}{field("documentSummary", "Documentos registrados", <input value={draft.documentSummary} onChange={(e) => updateDraft("documentSummary", e.target.value)} placeholder="Ej. Identidad y comprobantes" />)}</> : null}
    {modal === "lease" ? <>{field("tenantId", "Inquilino *", <select value={draft.tenantId} onChange={(e) => updateDraft("tenantId", e.target.value)}><option value="">Selecciona</option>{tenants.filter((tenant) => tenant.status === "active").map((tenant) => <option value={tenant.id} key={tenant.id}>{tenant.name}</option>)}</select>)}{field("unitId", "Unidad *", <select value={draft.unitId} onChange={(e) => { const unit = units.find((item) => item.id === e.target.value); updateDraft("unitId", e.target.value); if (unit) updateDraft("rent", String(unit.suggestedRent || "")); }}><option value="">Selecciona</option>{units.filter((unit) => unit.status === "available").map((unit) => <option value={unit.id} key={unit.id}>{properties[unit.propertyId]?.name} · {unit.identifier}</option>)}</select>)}{field("startDate", "Inicio *", <input type="date" value={draft.startDate} onChange={(e) => updateDraft("startDate", e.target.value)} />)}{field("endDate", "Fin *", <input type="date" value={draft.endDate} onChange={(e) => updateDraft("endDate", e.target.value)} />)}{field("rent", "Renta mensual *", <input type="number" min="1" value={draft.rent} onChange={(e) => updateDraft("rent", e.target.value)} />)}{field("deposit", "Depósito registrado", <input type="number" min="0" value={draft.deposit} onChange={(e) => updateDraft("deposit", e.target.value)} />)}{field("dueDay", "Día de pago (1–28) *", <input type="number" min="1" max="28" value={draft.dueDay} onChange={(e) => updateDraft("dueDay", e.target.value)} />)}{field("signedDocumentName", "Documento firmado", <input value={draft.signedDocumentName} onChange={(e) => updateDraft("signedDocumentName", e.target.value)} />)}<label className="properties-form-wide"><span>Servicios incluidos</span><textarea rows="3" value={draft.includedServices} onChange={(e) => updateDraft("includedServices", e.target.value)} /></label></> : null}
    {modal === "payment" ? <>{field("leaseId", "Contrato *", <select value={draft.leaseId} onChange={(e) => { const lease = leases.find((item) => item.id === e.target.value); updateDraft("leaseId", e.target.value); if (lease) updateDraft("amount", String(lease.rent)); }}><option value="">Selecciona</option>{activeLeases.map((lease) => <option value={lease.id} key={lease.id}>{tenantById[lease.tenantId]?.name} · {unitById[lease.unitId]?.identifier}</option>)}</select>)}{field("period", "Periodo *", <input type="month" value={draft.period} onChange={(e) => updateDraft("period", e.target.value)} />)}{field("amount", "Importe *", <input type="number" min="1" value={draft.amount} onChange={(e) => updateDraft("amount", e.target.value)} />)}{field("status", "Estado", <select value={draft.status} onChange={(e) => updateDraft("status", e.target.value)}>{Object.entries(RENTAL_PAYMENT_STATUS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>)}{field("dueDate", "Vencimiento", <input type="date" value={draft.dueDate} onChange={(e) => updateDraft("dueDate", e.target.value)} />)}{field("paidAt", "Fecha reportada", <input type="date" value={draft.paidAt} onChange={(e) => updateDraft("paidAt", e.target.value)} />)}{field("method", "Método informado", <select value={draft.method} onChange={(e) => updateDraft("method", e.target.value)}><option value="transfer">Transferencia</option><option value="spei">SPEI</option><option value="cash">Efectivo</option><option value="other">Otro</option></select>)}{field("evidenceName", "Comprobante/evidencia", <input value={draft.evidenceName} onChange={(e) => updateDraft("evidenceName", e.target.value)} />)}<label className="properties-form-wide"><span>Nota</span><textarea rows="2" value={draft.note} onChange={(e) => updateDraft("note", e.target.value)} /></label></> : null}
    {modal === "inspection" ? <>{field("leaseId", "Contrato *", <select value={draft.leaseId} onChange={(e) => { const lease = leases.find((item) => item.id === e.target.value); updateDraft("leaseId", e.target.value); updateDraft("unitId", lease?.unitId || ""); }}><option value="">Selecciona</option>{activeLeases.map((lease) => <option value={lease.id} key={lease.id}>{tenantById[lease.tenantId]?.name} · {unitById[lease.unitId]?.identifier}</option>)}</select>)}{field("type", "Tipo", <select value={draft.type} onChange={(e) => updateDraft("type", e.target.value)}><option value="entry">Entrada</option><option value="periodic">Periódica</option><option value="exit">Salida</option></select>)}{field("scheduledAt", "Fecha *", <input type="date" value={draft.scheduledAt} onChange={(e) => updateDraft("scheduledAt", e.target.value)} />)}{field("checklist", "Checklist", <input value={draft.checklist} onChange={(e) => updateDraft("checklist", e.target.value)} />)}<label className="properties-form-wide"><span>Notas de acceso</span><textarea rows="3" value={draft.notes} onChange={(e) => updateDraft("notes", e.target.value)} /></label></> : null}
    {modal === "renewal" ? <><div className="properties-form-wide rental-context"><strong>{tenantById[selectedLease?.tenantId]?.name}</strong><span>{unitById[selectedLease?.unitId]?.identifier} · termina {shortDate(selectedLease?.endDate)}</span></div>{field("endDate", "Nueva fecha final *", <input type="date" value={draft.endDate} onChange={(e) => updateDraft("endDate", e.target.value)} />)}{field("rent", "Nueva renta mensual", <input type="number" min="1" value={draft.rent} onChange={(e) => updateDraft("rent", e.target.value)} />)}</> : null}
    {modal === "completion" ? <>{field("evidenceCount", "Número de evidencias", <input autoFocus type="number" min="0" value={draft.evidenceCount} onChange={(e) => updateDraft("evidenceCount", e.target.value)} />)}<p className="rental-context">Los archivos protegidos requieren la futura integración de backend.</p></> : null}
  </div></form></Modal>;
}

export default RentOperationsPage;
