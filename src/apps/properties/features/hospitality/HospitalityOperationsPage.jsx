import { useMemo, useState } from "react";
import { HiArrowLeft, HiBanknotes, HiCalendarDays, HiCheckCircle, HiClock, HiHomeModern, HiMinus, HiMoon, HiPlus, HiSparkles, HiUserGroup } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import FieldError from "@/components/shared/FieldError";
import Modal from "@/components/ui/Modal";
import { useAppContext } from "@/context/AppContext";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import { demoHospitalityRates, demoHospitalityReservations, demoHousekeeping } from "./demoHospitalityData";
import { EMPTY_HOSPITALITY_RESERVATION, HOUSEKEEPING_STATUS_LABEL, RESERVATION_STATUS_LABEL, createHospitalityReservation, nextHousekeepingStatus, nextReservationStatus, validateHospitalityReservation } from "./hospitalityModel";
import "./hospitality-operations.css";

const tabs = [
  ["overview", "Hoy"], ["calendar", "Calendario"], ["reservations", "Reservaciones"],
  ["guests", "Huéspedes"], ["housekeeping", "Limpieza"], ["rates", "Tarifas"], ["payments", "Cobros"],
];
const money = (value) => new Intl.NumberFormat("es-MX", { style:"currency", currency:"MXN", maximumFractionDigits:0 }).format(value || 0);
const dayList = ["26 ago", "27 ago", "28 ago", "29 ago", "30 ago", "31 ago", "01 sep"];

function HospitalityOperationsPage() {
  const navigate = useNavigate();
  const { showToast } = useAppContext();
  const { properties, units } = usePropertiesData();
  const property = properties.find((item) => item.id === "prop-bosque") || properties.find((item) => item.status !== "archived");
  const lodgingUnits = units.filter((item) => item.propertyId === property?.id && item.status !== "archived");
  const unitById = useMemo(() => Object.fromEntries(units.map((unit) => [unit.id, unit])), [units]);
  const [activeTab, setActiveTab] = useState("overview");
  const [reservations, setReservations] = useState(demoHospitalityReservations);
  const [housekeeping, setHousekeeping] = useState(demoHousekeeping);
  const [rates, setRates] = useState(demoHospitalityRates);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ ...EMPTY_HOSPITALITY_RESERVATION, unitId: lodgingUnits[0]?.id || "" });
  const [errors, setErrors] = useState({});
  const activeStays = reservations.filter((item) => item.status === "checked_in");
  const arrivals = reservations.filter((item) => item.checkIn === "2026-08-26" && ["pending", "confirmed"].includes(item.status));
  const departures = reservations.filter((item) => item.checkOut === "2026-08-26" && item.status === "checked_in");
  const totalRevenue = reservations.reduce((sum, item) => sum + item.total, 0);
  const collected = reservations.reduce((sum, item) => sum + item.paid, 0);
  const occupancy = lodgingUnits.length ? Math.round((activeStays.length / lodgingUnits.length) * 100) : 0;

  const openCreate = () => {
    setDraft({ ...EMPTY_HOSPITALITY_RESERVATION, unitId: lodgingUnits[0]?.id || "" });
    setErrors({}); setCreating(true);
  };
  const saveReservation = (event) => {
    event.preventDefault();
    const nextErrors = validateHospitalityReservation(draft, reservations);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setReservations((current) => [createHospitalityReservation(draft, current), ...current]);
    setCreating(false); showToast("Reservación demo creada para esta sesión", "success");
  };
  const advanceStay = (id) => setReservations((current) => current.map((item) => item.id === id ? { ...item, status:nextReservationStatus(item.status) } : item));
  const advanceCleaning = (id) => setHousekeeping((current) => current.map((item) => item.id === id ? { ...item, status:nextHousekeepingStatus(item.status) } : item));
  const updateRate = (id, field, value) => setRates((current) => current.map((item) => item.id === id ? { ...item, [field]:Number(value) || 0 } : item));
  const collectBalance = (id) => setReservations((current) => current.map((item) => item.id === id ? { ...item, paid:item.total } : item));

  return <EcoLayout active="properties" title="OwnTerra Properties" subtitle="Rentas · Hospedaje">
    <main className="hospitality-page">
      <header className="hospitality-heading">
        <button type="button" onClick={() => navigate("/properties/rentas")}><HiArrowLeft/> Rentas</button>
        <div><span>Operación de corta estancia</span><h1>Hospedaje</h1><p>{property?.name} · Reservaciones, huéspedes y rotación de unidades.</p></div>
        <button type="button" className="hospitality-primary" onClick={openCreate}><HiPlus/> Nueva reservación</button>
      </header>
      <aside className="hospitality-demo-note"><strong>Escenario demostrativo.</strong> La información vive únicamente durante esta sesión y todavía no se conecta a canales ni cobros reales.</aside>
      <section className="hospitality-context"><div><small>Complejo</small><strong>{property?.name}</strong></div><div><small>Unidades</small><strong>{lodgingUnits.length} cabañas</strong></div><div><small>Ocupación actual</small><strong>{occupancy}%</strong></div><div><small>Zona horaria</small><strong>Centro de México</strong></div></section>
      <nav className="hospitality-tabs" aria-label="Operación de hospedaje">{tabs.map(([key,label]) => <button type="button" key={key} className={activeTab === key ? "active" : ""} onClick={() => setActiveTab(key)}>{label}</button>)}</nav>

      {activeTab === "overview" && <><section className="hospitality-kpis"><article><HiCalendarDays/><div><small>Llegadas hoy</small><strong>{arrivals.length}</strong><span>{arrivals[0]?.guestName || "Sin llegadas"}</span></div></article><article><HiArrowLeft/><div><small>Salidas hoy</small><strong>{departures.length}</strong><span>Preparar limpieza</span></div></article><article><HiHomeModern/><div><small>Hospedadas</small><strong>{activeStays.length}/{lodgingUnits.length}</strong><span>{occupancy}% de ocupación</span></div></article><article><HiSparkles/><div><small>Por preparar</small><strong>{housekeeping.filter((item) => item.status !== "ready").length}</strong><span>Limpieza e inspección</span></div></article></section><section className="hospitality-today"><div><header><span>Recepción</span><h2>Movimientos de hoy</h2></header>{reservations.filter((item) => item.checkIn === "2026-08-26" || item.checkOut === "2026-08-26" || item.status === "checked_in").map((item) => <article key={item.id}><span className={`stay-state ${item.status}`}><HiClock/></span><div><strong>{item.guestName}</strong><small>{unitById[item.unitId]?.identifier} · {item.folio}</small></div><div><small>{item.checkIn} → {item.checkOut}</small><strong>{RESERVATION_STATUS_LABEL[item.status]}</strong></div>{["pending","confirmed","checked_in"].includes(item.status) && <button type="button" onClick={() => advanceStay(item.id)}>{item.status === "checked_in" ? "Registrar salida" : item.status === "confirmed" ? "Hacer check-in" : "Confirmar"}</button>}</article>)}</div><aside><header><span>Operación</span><h2>Prioridades</h2></header><p><HiSparkles/><span><strong>{housekeeping.filter((item) => item.status === "dirty").length} unidades por limpiar</strong><small>Coordina antes de las próximas llegadas.</small></span></p><p><HiBanknotes/><span><strong>{money(totalRevenue-collected)} por cobrar</strong><small>Saldos de las reservaciones activas.</small></span></p><p><HiCheckCircle/><span><strong>Accesos contextualizados</strong><small>Cada huésped conserva unidad y vigencia.</small></span></p></aside></section></>}

      {activeTab === "calendar" && <section className="hospitality-calendar"><header><div><span>Semana operativa</span><h2>Disponibilidad por unidad</h2></div><strong>26 ago — 01 sep 2026</strong></header><div className="calendar-grid"><div className="calendar-corner">Unidad</div>{dayList.map((day) => <div className="calendar-day" key={day}>{day}</div>)}{lodgingUnits.map((unit) => <div className="calendar-row" key={unit.id}><div className="calendar-unit"><strong>{unit.identifier}</strong><small>{unit.bedrooms} rec. · hasta {rates.find((item) => item.unitId === unit.id)?.capacity || 2}</small></div>{dayList.map((day, index) => {const iso = `2026-${index < 6 ? "08" : "09"}-${String(index < 6 ? 26+index : 1).padStart(2,"0")}`;const stay=reservations.find((item) => item.unitId === unit.id && iso >= item.checkIn && iso < item.checkOut && item.status !== "cancelled");return <button type="button" className={stay ? `occupied ${stay.status}` : "available"} key={day} title={stay ? `${stay.guestName} · ${stay.folio}` : "Disponible"}>{stay ? stay.guestName.split(" ")[0] : ""}</button>})}</div>)}</div></section>}

      {activeTab === "reservations" && <section className="hospitality-list"><header><div><span>Control de estancias</span><h2>Reservaciones</h2></div><button type="button" onClick={openCreate}><HiPlus/> Agregar</button></header>{reservations.map((item) => <article key={item.id}><div><small>{item.folio} · {item.channel}</small><strong>{item.guestName}</strong><span>{item.guests} huéspedes · {unitById[item.unitId]?.identifier}</span></div><div><small>Estancia</small><strong>{item.checkIn} → {item.checkOut}</strong><span>{item.nights} noches</span></div><div><small>Total</small><strong>{money(item.total)}</strong><span>{item.paid >= item.total ? "Pagado" : `${money(item.total-item.paid)} pendiente`}</span></div><i className={item.status}>{RESERVATION_STATUS_LABEL[item.status]}</i>{["pending","confirmed","checked_in"].includes(item.status) ? <button type="button" onClick={() => advanceStay(item.id)}>Avanzar</button> : <span/>}</article>)}</section>}

      {activeTab === "guests" && <section className="hospitality-guests"><header><span>Directorio temporal</span><h2>Huéspedes y contexto de estancia</h2></header>{reservations.map((item) => <article key={item.id}><span>{item.guestName.split(" ").map((part) => part[0]).slice(0,2).join("")}</span><div><strong>{item.guestName}</strong><small>{item.guestEmail} · {item.guestPhone}</small><p>{item.notes || "Sin indicaciones adicionales."}</p></div><div><small>Acceso autorizado</small><strong>{unitById[item.unitId]?.identifier}</strong><em>{item.checkIn} → {item.checkOut}</em></div></article>)}</section>}

      {activeTab === "housekeeping" && <section className="housekeeping-board"><header><div><span>Rotación</span><h2>Limpieza e inspección</h2></div><p>Salida → limpieza → inspección → lista</p></header><div>{Object.keys(HOUSEKEEPING_STATUS_LABEL).map((status) => <article key={status}><header><strong>{HOUSEKEEPING_STATUS_LABEL[status]}</strong><span>{housekeeping.filter((item) => item.status === status).length}</span></header>{housekeeping.filter((item) => item.status === status).map((item) => <div key={item.id}><HiSparkles/><strong>{unitById[item.unitId]?.identifier}</strong><small>{item.assignee} · {item.due}</small><p>{item.note}</p>{status !== "ready" && <button type="button" onClick={() => advanceCleaning(item.id)}>Avanzar tarea</button>}</div>)}</article>)}</div></section>}

      {activeTab === "rates" && <section className="hospitality-rates"><header><span>Inventario comercial</span><h2>Tarifas y capacidad</h2><p>Ajustes demostrativos por unidad; aún sin sincronización con canales externos.</p></header>{rates.map((rate) => <article key={rate.id}><div><HiMoon/><span><strong>{unitById[rate.unitId]?.identifier}</strong><small>Capacidad máxima</small></span></div><label>Entre semana <span><b>$</b><input type="number" value={rate.weekday} onChange={(event) => updateRate(rate.id,"weekday",event.target.value)}/></span></label><label>Fin de semana <span><b>$</b><input type="number" value={rate.weekend} onChange={(event) => updateRate(rate.id,"weekend",event.target.value)}/></span></label><label>Estancia mínima <span><button type="button" onClick={() => updateRate(rate.id,"minNights",Math.max(1,rate.minNights-1))}><HiMinus/></button><strong>{rate.minNights} noches</strong><button type="button" onClick={() => updateRate(rate.id,"minNights",rate.minNights+1)}><HiPlus/></button></span></label><label>Huéspedes <span><HiUserGroup/><strong>{rate.capacity}</strong></span></label></article>)}</section>}

      {activeTab === "payments" && <section className="hospitality-payments"><header><div><span>Cobranza de hospedaje</span><h2>Pagos y saldos</h2></div><strong>{money(totalRevenue-collected)} pendiente</strong></header>{reservations.map((item) => <article key={item.id}><div><strong>{item.guestName}</strong><small>{item.folio} · {unitById[item.unitId]?.identifier}</small></div><div><small>Total</small><strong>{money(item.total)}</strong></div><div><small>Recibido</small><strong>{money(item.paid)}</strong></div><div><small>Saldo</small><strong>{money(item.total-item.paid)}</strong></div>{item.paid < item.total ? <button type="button" onClick={() => collectBalance(item.id)}>Registrar pago demo</button> : <i><HiCheckCircle/> Pagado</i>}</article>)}</section>}
    </main>

    <Modal open={creating} onClose={() => setCreating(false)} title="Nueva reservación" subtitle={`${property?.name} · Datos demo de esta sesión`} icon={<HiCalendarDays/>} width="max-w-[720px]" footer={<><button type="button" onClick={() => setCreating(false)}>Cancelar</button><button type="submit" form="hospitality-reservation-form">Crear reservación</button></>}>
      <form id="hospitality-reservation-form" className="properties-form" onSubmit={saveReservation} noValidate><section className="properties-form-section"><div className="properties-form-grid"><label className="properties-form-wide"><span>Nombre del huésped *</span><input value={draft.guestName} onChange={(e) => setDraft({...draft,guestName:e.target.value})}/><FieldError msg={errors.guestName}/></label><label><span>Correo</span><input type="email" value={draft.guestEmail} onChange={(e) => setDraft({...draft,guestEmail:e.target.value})}/></label><label><span>Teléfono</span><input value={draft.guestPhone} onChange={(e) => setDraft({...draft,guestPhone:e.target.value})}/></label><label><span>Unidad *</span><select value={draft.unitId} onChange={(e) => setDraft({...draft,unitId:e.target.value})}>{lodgingUnits.map((unit) => <option value={unit.id} key={unit.id}>{unit.identifier}</option>)}</select><FieldError msg={errors.unitId}/></label><label><span>Canal</span><select value={draft.channel} onChange={(e) => setDraft({...draft,channel:e.target.value})}><option>Directa</option><option>Airbnb</option><option>Booking</option><option>Expedia</option><option>Otro</option></select></label><label><span>Llegada *</span><input type="date" value={draft.checkIn} onChange={(e) => setDraft({...draft,checkIn:e.target.value})}/><FieldError msg={errors.checkIn}/></label><label><span>Salida *</span><input type="date" value={draft.checkOut} onChange={(e) => setDraft({...draft,checkOut:e.target.value})}/><FieldError msg={errors.checkOut}/></label><label><span>Huéspedes</span><input type="number" min="1" value={draft.guests} onChange={(e) => setDraft({...draft,guests:e.target.value})}/></label><label><span>Tarifa por noche</span><input type="number" min="0" value={draft.nightlyRate} onChange={(e) => setDraft({...draft,nightlyRate:e.target.value})}/></label><label><span>Anticipo</span><input type="number" min="0" value={draft.deposit} onChange={(e) => setDraft({...draft,deposit:e.target.value})}/></label><label className="properties-form-wide"><span>Indicaciones</span><textarea rows="3" value={draft.notes} onChange={(e) => setDraft({...draft,notes:e.target.value})}/></label></div></section></form>
    </Modal>
  </EcoLayout>;
}

export default HospitalityOperationsPage;
