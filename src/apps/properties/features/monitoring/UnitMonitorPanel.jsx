import { useMemo, useState } from "react";
import { HiArrowRight, HiBanknotes, HiBolt, HiBuildingOffice2, HiExclamationTriangle, HiHomeModern, HiMagnifyingGlass, HiUserPlus } from "react-icons/hi2";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import { PROPERTIES_MVP_SCOPE } from "../../mvpScope";
import { PERSON_UNIT_ROLE_LABEL } from "../community/communityModel";
import { UNIT_STATUS_LABEL, UNIT_TYPE_LABEL } from "../units/unitModel";
import { buildUnitMonitorRows } from "./unitMonitoringModel";
import "./unit-monitoring.css";

const money = (value) => new Intl.NumberFormat("es-MX", { style:"currency", currency:"MXN", maximumFractionDigits:0 }).format(value || 0);
const stateLabel = (value) => ({ paid:"Pagado", partial:"Pago parcial", pending:"Pendiente", overdue:"Vencido", waived:"Condonado", due_soon:"Por vencer", pending_evidence:"Sin evidencia", open:"Abierto", in_progress:"En progreso", resolved:"Resuelto" }[value] || value);
const initials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("") || "?";

/* Pestaña Unidades de una comunidad: aquí vive la pieza central de Properties,
   el vínculo persona–unidad. Cada unidad muestra quién es dueño, quién vive y
   quién paga, con su saldo, y desde aquí se agrega a alguien en un solo paso.
   Servicios e incidencias sólo aparecen cuando esos módulos tengan backend
   (mvpScope.later): hoy son datos demo. */
function UnitMonitorPanel({ community, unitId, onSelectUnit, onAddMember, onUnlink, onOpenCharges, canWrite = false }) {
  const data = usePropertiesData();
  const [query, setQuery] = useState("");
  const withDemoModules = PROPERTIES_MVP_SCOPE.later;
  const rows = useMemo(() => buildUnitMonitorRows({
    units: data.units.filter((unit) => unit.propertyId === community?.propertyId),
    people: data.communityPeople,
    relations: data.personUnitRelations,
    charges: data.condoCharges,
    utilityServices: withDemoModules ? data.utilityServices : [],
    tickets: withDemoModules ? data.tickets : [],
  }), [data.units, data.communityPeople, data.personUnitRelations, data.condoCharges, data.utilityServices, data.tickets, community?.propertyId, withDemoModules]);
  const peopleById = useMemo(() => Object.fromEntries(data.communityPeople.map((person) => [person.id, person])), [data.communityPeople]);
  const visible = rows.filter((row) => `${row.identifier} ${row.occupants.map((item) => item.name).join(" ")} ${row.responsible.map((item) => item.name).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = visible.find((row) => row.id === unitId) || visible[0];
  const links = selected ? data.personUnitRelations.filter((relation) => relation.unitId === selected.id && relation.status !== "archived") : [];
  const withoutPeople = rows.filter((row) => !data.personUnitRelations.some((relation) => relation.unitId === row.id && relation.status !== "archived")).length;

  if (!rows.length) return <section className="community-panel unit-monitor-empty"><HiBuildingOffice2/><h2>Esta comunidad aún no tiene unidades</h2><p>Registra sus departamentos, casas o locales para asignarles personas.</p></section>;

  return <section className="community-panel unit-monitor-panel">
    <header><div><span>Unidades y personas</span><h2>Quién vive, quién paga y cuánto debe.</h2><p>{withoutPeople ? `${withoutPeople} de ${rows.length} unidades aún no tienen a nadie asignado.` : `Las ${rows.length} unidades tienen al menos una persona asignada.`}</p></div><label className="unit-monitor-search"><HiMagnifyingGlass/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar unidad o persona"/></label></header>
    <div className={`unit-monitor-workspace ${withDemoModules ? "" : "is-compact"}`}>
      <div className="unit-monitor-matrix">
        <header><span>Unidad</span><span>Personas</span><span>Saldo pendiente</span>{withDemoModules ? <><span>Servicios</span><span>Atención</span></> : null}</header>
        {visible.map((row) => {
          const names = [...new Map([...row.responsible, ...row.occupants].map((person) => [person.id, person])).values()].map((person) => person.name);
          return <button type="button" className={selected?.id === row.id ? "active" : ""} aria-pressed={selected?.id === row.id} key={row.id} onClick={() => onSelectUnit(row.id)}>
            <span><strong>{row.identifier}</strong><small>{UNIT_TYPE_LABEL[row.type] || "Unidad"} · {UNIT_STATUS_LABEL[row.status]}</small></span>
            <span>{names.length ? <><strong>{names.join(", ")}</strong><small>{row.responsible.length ? `Paga: ${row.responsible.map((item) => item.name).join(", ")}` : "Sin responsable de pago"}</small></> : <><strong className="unit-monitor-unassigned">Sin personas</strong><small>Agrega a quien vive o es dueño</small></>}</span>
            <span className={row.openChargeAmount ? "attention" : "ok"}><strong>{money(row.openChargeAmount)}</strong><small>{row.charges.length} movimientos</small></span>
            {withDemoModules ? <><span><strong>{money(row.openServiceAmount)}</strong><small>{row.services.length} servicios</small></span><span className={row.openTickets ? "attention" : "ok"}><strong>{row.openTickets}</strong><small>incidencias abiertas</small></span></> : null}
          </button>;
        })}
        {!visible.length ? <p className="unit-monitor-none">Ninguna unidad o persona coincide con “{query}”.</p> : null}
      </div>
      {selected ? <aside className="unit-monitor-detail">
        <header><span><HiHomeModern/></span><div><small>{community?.name}</small><h2>{selected.identifier}</h2><p>{UNIT_STATUS_LABEL[selected.status]} · {selected.area || 0} m²</p></div></header>

        <section className="unit-members" aria-label={`Personas de ${selected.identifier}`}>
          <header><h3>Personas de la unidad</h3>{canWrite ? <button type="button" className="unit-members-add" onClick={() => onAddMember(selected.id)}><HiUserPlus/> Agregar persona</button> : null}</header>
          {links.length ? links.map((link) => {
            const person = peopleById[link.personId];
            const perms = [link.isPaymentResponsible && "Paga", link.canVote && "Vota", link.amenityAccess && "Amenidades"].filter(Boolean);
            return <article key={link.id}>
              <span className="unit-members-avatar">{initials(person?.name)}</span>
              <span><strong>{person?.name || "Persona archivada"}</strong><small>{PERSON_UNIT_ROLE_LABEL[link.role] || link.role}{link.isPrimary ? " · Contacto principal" : ""}</small><em>{perms.length ? perms.map((perm) => <i key={perm}>{perm}</i>) : <i className="muted">Sin permisos</i>}</em></span>
              {canWrite ? <button type="button" className="unit-members-unlink" onClick={() => onUnlink(link)} aria-label={`Quitar a ${person?.name || "esta persona"} de ${selected.identifier}`}>Quitar</button> : null}
            </article>;
          }) : <div className="unit-members-empty"><p>Nadie está asignado a esta unidad. Sin una persona que pague, no se le pueden generar cuotas ni votar.</p>{canWrite ? <button type="button" onClick={() => onAddMember(selected.id)}><HiUserPlus/> Agregar la primera persona</button> : null}</div>}
        </section>

        <div className="unit-monitor-cards">
          <article><HiBanknotes/><span><small>Saldo pendiente</small><strong>{money(selected.openChargeAmount)}</strong><em>{selected.charges.length} movimientos registrados</em></span></article>
          {withDemoModules ? <><article><HiBolt/><span><small>Servicios pendientes</small><strong>{money(selected.openServiceAmount)}</strong><em>{selected.services.length} servicios vinculados</em></span></article><article><HiExclamationTriangle/><span><small>Atención operativa</small><strong>{selected.openTickets} abiertas</strong><em>{selected.tickets.length} incidencias históricas</em></span></article></> : null}
        </div>
        <nav className="unit-monitor-actions" aria-label={`Acciones para ${selected.identifier}`}>
          <button type="button" onClick={onOpenCharges}><HiBanknotes/> Ver cuotas y adeudos <HiArrowRight/></button>
        </nav>
        <section><h3>Movimientos recientes</h3>{selected.movements.length ? selected.movements.map((item) => <article key={item.id}><i>{item.type[0]}</i><span><strong>{item.title}</strong><small>{item.type} · {stateLabel(item.state)}</small></span><time>{String(item.date).slice(0, 10)}</time></article>) : <p>Esta unidad aún no tiene movimientos.</p>}</section>
      </aside> : null}
    </div>
  </section>;
}

export default UnitMonitorPanel;
