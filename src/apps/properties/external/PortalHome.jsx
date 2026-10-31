import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LuArrowRight, LuBath, LuBedDouble, LuBuilding2, LuCar, LuChevronRight, LuCircleCheck, LuClock, LuCreditCard, LuFileText, LuHouse, LuLayers, LuMegaphone, LuPackage, LuPawPrint, LuReceipt, LuRuler, LuShieldCheck, LuSofa, LuUserCheck, LuUsers, LuVote, LuWarehouse, LuWrench } from "react-icons/lu";
import propertiesPortalService from "@/services/propertiesPortalService";
import SkyScene from "@/components/shared/SkyScene";
import { reportForCharge, reportNotices } from "../features/collections/collectionsModel";
import { TICKET_STATUS_LABEL } from "../features/tickets/ticketModel";
import { dayPeriod, firstName, greeting, homeKind, nextCharge, noticeImage, recentActivity, todayItems, unitHighlights } from "./portalHomeModel";
import "./portal-home.css";

const ROLE_LABEL = { owner: "Propietario", resident: "Residente", tenant: "Inquilino", board_member: "Comité" };
const FACT_ICON = { area: LuRuler, floor: LuLayers, bed: LuBedDouble, bath: LuBath, parking: LuCar, storage: LuWarehouse, pets: LuPawPrint, furnished: LuSofa };
const ACTIVITY_ICON = { paid: LuCircleCheck, charge: LuReceipt, ticket: LuWrench, package: LuPackage, notice: LuMegaphone };
const TODAY_ICON = { charge: LuReceipt, notice: LuMegaphone, package: LuPackage, vote: LuVote };
const money = (value, currency = "MXN") => new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value) || 0);
const dueDate = (value) => new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
const yesNo = (value) => (value ? "Sí" : "No");

/** Inicio del inquilino ("Mi hogar"): pagos, unidad, contrato y lo que pasa en la comunidad. */
function PortalHome({ reports = [], me, units, relations, statement, announcements, votes, packages, reportable = [], onOpen, onReport, actions = null, now = new Date() }) {
  const unit = units[0];
  const relation = relations.find((item) => item.property_id === unit?.id);
  const roles = relation && !relation.via_grant ? (relation.roles || []).map((role) => ROLE_LABEL[role] || role) : [];
  const period = dayPeriod(now.getHours());
  const name = firstName(me?.nombre);
  const today = now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  const tickets = useQuery({ queryKey: ["portal-tickets"], queryFn: propertiesPortalService.tickets, retry: false });

  // Un cargo con su comprobante en revisión ya no se presenta como pendiente de pago.
  const allCharges = statement?.open_charges || [];
  const charges = allCharges.filter((charge) => reportForCharge(reports, charge.id)?.status !== "submitted");
  const next = nextCharge(charges);
  const due = Number(statement?.total_due) || 0;
  const overdue = charges.some((charge) => charge.status === "overdue");
  const nextOverdue = next && (next.status === "overdue" || new Date(`${String(next.due_date).slice(0, 10)}T23:59:59`) < now);

  const { main, extra } = unitHighlights(unit);
  const activity = recentActivity({ reports, tickets: tickets.data || [], packages, announcements, statusLabel: TICKET_STATUS_LABEL });
  const pendingItems = [...todayItems({ charges: [], packages, announcements, votes }, now), ...reportNotices(reports, now)].sort((a, b) => a.rank - b.rank);
  const notices = [...announcements].sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at)).slice(0, 4);
  const [slide, setSlide] = useState(0);
  const notice = notices[Math.min(slide, notices.length - 1)];
  const cover = noticeImage(notice);

  const quick = [
    ["charges", LuCreditCard, "Estado de cuenta", "Consulta y reporta tus pagos"],
    ["tickets", LuWrench, "Reportar mantenimiento", "Crea una nueva solicitud"],
    ["visitors", LuUsers, "Registrar visita", "Autoriza a tus visitantes"],
    ["packages", LuPackage, "Paquetería", "Revisa tus entregas"],
  ];
  const flags = relation?.flags || {};
  const contract = [
    [LuUserCheck, "Tu relación con la unidad", roles.length ? roles.join(" · ") : relation?.via_grant ? "Acceso de consulta" : "Sin relación registrada"],
    [LuReceipt, "Responsable de pago", yesNo(flags.is_payment_responsible)],
    [LuVote, "Voto en asamblea", yesNo(flags.can_vote)],
    [LuShieldCheck, "Acceso a amenidades", yesNo(flags.has_amenity_access)],
  ];

  return <div className="portal-home">
    {actions ? <div className="portal-home-actions">{actions}</div> : null}
    <div className="portal-home-top">
      <section className={`portal-home-hero sky-host is-${period}`} aria-label="Bienvenida">
        <SkyScene period={period} kind={homeKind(unit)}/>
        <div className="portal-home-hero-copy">
          <small>{today}</small>
          <h1>{greeting(now.getHours())}{name ? `, ${name}` : ""}</h1>
          <p>{unit ? "Qué gusto tenerte en casa. Esto es lo que pasa hoy en tu hogar." : "Tu administración aún no te asigna una unidad."}</p>
          {unit ? <div className="portal-home-chips">
            <span>{homeKind(unit) === "house" ? <LuHouse/> : <LuBuilding2/>} {units.length > 1 ? "Mis unidades" : unit.label}</span>
            {roles.length ? <span className="is-status is-active"><i/>{roles.join(" · ")}</span> : null}
            <span className={`is-status ${overdue ? "is-alert" : due ? "is-warm" : "is-ok"}`}><i/>{overdue ? "Pago vencido" : due ? "Saldo pendiente" : "Al corriente"}</span>
          </div> : null}
          <em>{units.length} {units.length === 1 ? "unidad visible" : "unidades visibles"} según tus relaciones y permisos.</em>
        </div>
      </section>

      <div className="portal-home-money">
      <section className={`portal-home-pay${nextOverdue ? " is-alert" : ""}`} aria-label="Próximo pago">
        <i><LuCreditCard/></i>
        <div>
          <small>{nextOverdue ? "Pago vencido" : "Próximo pago"}</small>
          {next ? <><strong>{money(Number(next.amount) - Number(next.paid_amount || 0), next.currency)}</strong><em>{next.concept} · {nextOverdue ? "venció" : "vence"} {dueDate(next.due_date)}</em></> : <><strong>Sin pagos</strong><em>No tienes cargos por pagar.</em></>}
          {next && reportable.some((charge) => charge.id === next.id) ? <button type="button" onClick={() => onReport([next.id])}>Reportar pago</button> : null}
        </div>
      </section>

      <section className="portal-home-balance" aria-label="Saldo actual">
        <i><LuClock/></i>
        <div>
          <small>Saldo actual</small>
          <strong>{money(due)}</strong>
          <em>{due ? `${allCharges.length} ${allCharges.length === 1 ? "cargo abierto" : "cargos abiertos"}` : "No tienes pagos pendientes"}</em>
          <button type="button" onClick={() => onOpen("charges")}>Ver estado de cuenta <LuArrowRight/></button>
        </div>
      </section>

      </div>
    </div>

    <section className="portal-home-quick" aria-label="Acciones rápidas">
      <h2>Acciones rápidas</h2>
      <div>{quick.map(([key, Icon, label, hint]) => <button type="button" key={key} onClick={() => onOpen(key)}>
        <i><Icon/></i><span><strong>{label}</strong><small>{hint}</small></span><LuChevronRight/>
      </button>)}</div>
    </section>

    <div className="portal-home-middle">
      <section className="portal-home-card portal-home-unit" aria-label="Mi unidad">
        <h3>Mi {homeKind(unit) === "house" ? "casa" : "departamento"}</h3>
        {unit ? <div className="portal-home-unit-body">
          <div className="portal-home-unit-info">
            <strong>{unit.label}</strong>
            <span>{units.length > 1 ? `Una de tus ${units.length} unidades` : "Tu unidad"}</span>
            {main.length ? <ul className="portal-home-facts">{main.map((fact) => { const Icon = FACT_ICON[fact.icon]; return <li key={fact.icon}><i><Icon/></i><span><b>{fact.value}</b><small>{fact.label}</small></span></li>; })}</ul> : <p>La administración aún no registra la ficha de tu unidad.</p>}
            {extra.length ? <ul className="portal-home-facts is-extra">{extra.map((fact) => { const Icon = FACT_ICON[fact.icon]; return <li key={fact.icon}><i><Icon/></i><span><small>{fact.label}</small><b>{fact.value}</b></span></li>; })}</ul> : null}
            <button type="button" className="portal-home-link-box" onClick={() => onOpen("unit")}>Ver todos los detalles de mi unidad <LuArrowRight/></button>
          </div>
        </div> : <p className="portal-home-empty">Tu administración aún no te asigna una unidad.</p>}
      </section>

      <section className="portal-home-card portal-home-contract" aria-label="Mi contrato">
        <h3>Mi contrato</h3>
        <ul>{contract.map(([Icon, label, value]) => <li key={label}><i><Icon/></i><span><small>{label}</small><b>{value}</b></span></li>)}</ul>
        <p><LuFileText/> La vigencia, la renta y el depósito aparecerán aquí cuando la administración registre tu contrato.</p>
      </section>
    </div>

    <div className="portal-home-bottom">
      <section className="portal-home-card portal-home-activity" aria-label="Actividad reciente">
        <header><h3>Actividad reciente</h3></header>
        {activity.length ? <ul>{activity.map((item) => { const Icon = ACTIVITY_ICON[item.icon]; return <li key={item.key}><button type="button" className={`is-${item.tone}`} onClick={() => onOpen(item.section)}>
          <i><Icon/></i><span><strong>{item.title}</strong><small>{item.detail}</small></span><time>{item.date}</time><LuChevronRight/>
        </button></li>; })}</ul> : <p className="portal-home-empty">Aquí verás tus pagos, solicitudes y paquetes conforme sucedan.</p>}
      </section>

      <section className="portal-home-card portal-home-community" aria-label="Comunidad">
        <header><h3>Comunidad</h3><button type="button" onClick={() => onOpen("notices")}>Ver todos <LuArrowRight/></button></header>
        {notice ? <>
          <button type="button" className="portal-home-notice" onClick={() => onOpen("notices")}>
            <span className={`portal-home-notice-cover${cover ? "" : ` sky-host is-${period}`}`}>{cover ? <img src={cover} alt=""/> : <SkyScene period={period} kind={homeKind(unit)}/>}</span>
            <em className={notice.is_urgent ? "is-urgent" : ""}>{notice.is_urgent ? "Urgente" : "Aviso"}</em>
            <strong>{notice.title}</strong>
            <small>{notice.body}</small>
            <time>{dueDate(notice.published_at || notice.created_at)}</time>
          </button>
          {notices.length > 1 ? <nav className="portal-home-dots" aria-label="Más avisos">{notices.map((item, index) => <button type="button" key={item.id} className={item === notice ? "active" : ""} aria-label={`Ver aviso ${index + 1}`} onClick={() => setSlide(index)}/>)}</nav> : null}
        </> : <p className="portal-home-empty"><LuMegaphone/> Cuando la administración publique un aviso lo verás aquí.</p>}
      </section>

      <section className="portal-home-card portal-home-pending" aria-label="Por atender">
        <header><h3>Por atender</h3>{pendingItems.length ? <span>{pendingItems.length}</span> : null}</header>
        {pendingItems.length ? <ul>{pendingItems.slice(0, 3).map((item) => { const Icon = TODAY_ICON[item.icon]; return <li key={item.key}><button type="button" className={`is-${item.tone}`} onClick={() => onOpen(item.section)}>
          <i><Icon/></i><span><small>{item.label}</small><strong>{item.title}</strong></span>
        </button></li>; })}</ul> : <div className="portal-home-calm"><LuCircleCheck/><strong>Todo en orden</strong><p>Sin avisos, paquetes ni votaciones pendientes.</p></div>}
        <button type="button" className="portal-home-help" onClick={() => onOpen("tickets")}><LuWrench/> ¿Algo no está bien? Escríbele a tu administración</button>
      </section>
    </div>
  </div>;
}

export default PortalHome;
