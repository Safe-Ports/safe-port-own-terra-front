import { useMemo, useState } from "react";
import { HiArrowLeft, HiBanknotes, HiBolt, HiBuildingOffice2, HiExclamationTriangle, HiHomeModern, HiMagnifyingGlass, HiUserGroup } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import { UNIT_STATUS_LABEL, UNIT_TYPE_LABEL } from "../units/unitModel";
import { buildUnitMonitorRows } from "./unitMonitoringModel";
import "./unit-monitoring.css";

const money = (value) => new Intl.NumberFormat("es-MX", { style:"currency", currency:"MXN", maximumFractionDigits:0 }).format(value || 0);
const stateLabel = (value) => ({ paid:"Pagado", pending:"Pendiente", overdue:"Vencido", due_soon:"Por vencer", pending_evidence:"Sin evidencia", open:"Abierto", in_progress:"En progreso", resolved:"Resuelto" }[value] || value);

export default function UnitMonitoringPage() {
  const navigate = useNavigate();
  const data = usePropertiesData();
  const [propertyId, setPropertyId] = useState("all");
  const [query, setQuery] = useState("");
  const rows = useMemo(() => buildUnitMonitorRows(data), [data]);
  const propertiesById = useMemo(() => Object.fromEntries(data.properties.map((item) => [item.id, item])), [data.properties]);
  const visible = rows.filter((row) => (propertyId === "all" || row.propertyId === propertyId) && `${row.identifier} ${propertiesById[row.propertyId]?.name || ""}`.toLowerCase().includes(query.toLowerCase()));
  const [selectedId, setSelectedId] = useState("");
  const selected = visible.find((row) => row.id === selectedId) || visible[0];

  return <EcoLayout active="properties" title="Monitoreo" subtitle="OwnTerra Properties · Unidad por unidad"><main className="unit-monitor-page">
    <button className="unit-monitor-back" type="button" onClick={() => navigate("/properties/operacion")}><HiArrowLeft/> Centro de operación</button>
    <header className="unit-monitor-heading"><div><span>Monitoreo atómico</span><h1>Cada unidad, con todo su contexto.</h1><p>Ocupantes, responsables, pendientes de pago, servicios e incidencias en una sola matriz.</p></div><div><strong>{visible.length}</strong><span>unidades visibles</span></div></header>
    <section className="unit-monitor-toolbar"><label><HiMagnifyingGlass/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar unidad o inmueble"/></label><select value={propertyId} onChange={(event) => { setPropertyId(event.target.value); setSelectedId(""); }}><option value="all">Todos los inmuebles</option>{data.properties.filter((item) => item.status !== "archived").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></section>
    <section className="unit-monitor-workspace">
      <div className="unit-monitor-matrix"><header><span>Unidad</span><span>Habitante actual</span><span>Cargos</span><span>Servicios</span><span>Atención</span></header>{visible.map((row) => <button type="button" className={selected?.id === row.id ? "active" : ""} key={row.id} onClick={() => setSelectedId(row.id)}><span><strong>{row.identifier}</strong><small>{propertiesById[row.propertyId]?.name} · {UNIT_TYPE_LABEL[row.type]}</small></span><span><strong>{row.occupants.map((item) => item.name).join(", ") || "Sin habitante"}</strong><small>{UNIT_STATUS_LABEL[row.status]}</small></span><span><strong>{money(row.openChargeAmount)}</strong><small>{row.charges.length} movimientos</small></span><span><strong>{money(row.openServiceAmount)}</strong><small>{row.services.length} servicios</small></span><span className={row.openTickets ? "attention" : "ok"}><strong>{row.openTickets}</strong><small>incidencias abiertas</small></span></button>)}</div>
      {selected ? <aside className="unit-monitor-detail"><header><span><HiHomeModern/></span><div><small>{propertiesById[selected.propertyId]?.name}</small><h2>{selected.identifier}</h2><p>{UNIT_STATUS_LABEL[selected.status]} · {selected.area || 0} m²</p></div></header><div className="unit-monitor-cards"><article><HiUserGroup/><span><small>Habitante actual</small><strong>{selected.occupants.map((item) => item.name).join(", ") || "Sin asignar"}</strong><em>Responsable: {selected.responsible.map((item) => item.name).join(", ") || "Sin asignar"}</em></span></article><article><HiBanknotes/><span><small>Cargos pendientes</small><strong>{money(selected.openChargeAmount)}</strong><em>{selected.charges.length} movimientos registrados</em></span></article><article><HiBolt/><span><small>Servicios pendientes</small><strong>{money(selected.openServiceAmount)}</strong><em>{selected.services.length} servicios vinculados</em></span></article><article><HiExclamationTriangle/><span><small>Atención operativa</small><strong>{selected.openTickets} abiertas</strong><em>{selected.tickets.length} incidencias históricas</em></span></article></div><section><h3>Movimientos recientes</h3>{selected.movements.length ? selected.movements.map((item) => <article key={item.id}><i>{item.type[0]}</i><span><strong>{item.title}</strong><small>{item.type} · {stateLabel(item.state)}</small></span><time>{String(item.date).slice(0, 10)}</time></article>) : <p>Esta unidad aún no tiene movimientos.</p>}</section></aside> : <aside className="unit-monitor-detail empty"><HiBuildingOffice2/><h2>Sin unidades</h2><p>Ajusta los filtros para continuar.</p></aside>}
    </section>
    <aside className="unit-monitor-demo">Vista frontend de validación. Los importes de servicios son informativos y los cambios permanecen en la sesión.</aside>
  </main></EcoLayout>;
}
