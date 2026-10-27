import { LuArrowRight, LuBath, LuBedDouble, LuBuilding2, LuCircleCheck, LuHouse, LuLayers, LuMegaphone, LuPackage, LuReceipt, LuRuler, LuVote, LuWallet } from "react-icons/lu";
import SkyScene from "@/components/shared/SkyScene";
import { reportForCharge, reportNotices } from "../features/collections/collectionsModel";
import { dayPeriod, firstName, greeting, homeFacts, homeKind, todayItems } from "./portalHomeModel";
import "./portal-home.css";

const ITEM_ICON = { charge: LuReceipt, notice: LuMegaphone, package: LuPackage, vote: LuVote };
const FACT_ICON = { bed: LuBedDouble, bath: LuBath, area: LuRuler, floor: LuLayers };

function PortalHome({ reports = [], me, units, relations, statement, announcements, votes, packages, onOpen, now = new Date() }) {
  const unit = units[0];
  const relation = relations.find((item) => item.property_id === unit?.id);
  const roleLabels = { owner: "Propietario", resident: "Residente", tenant: "Inquilino", board_member: "Comité" };
  const period = dayPeriod(now.getHours());
  const name = firstName(me?.nombre);
  // Un cargo con su comprobante en revisión ya no se presenta como "pago vencido".
  const charges = (statement?.open_charges || []).filter((charge) => reportForCharge(reports, charge.id)?.status !== "submitted");
  const items = [...todayItems({ charges, packages, announcements, votes }, now), ...reportNotices(reports, now)].sort((a, b) => a.rank - b.rank);
  const facts = homeFacts(unit);
  const due = Number(statement?.total_due) || 0;
  const waiting = packages.filter((item) => item.status !== "delivered").length;
  const unread = announcements.filter((item) => !item.read_at).length;
  const today = now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  const shortcuts = [
    ["charges", LuWallet, "Estado de cuenta", due ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(due) : "Al corriente"],
    ["notices", LuMegaphone, "Comunicados", unread ? `${unread} sin leer` : "Todo leído"],
    ["packages", LuPackage, "Paquetería", waiting ? `${waiting} en recepción` : "Sin paquetes"],
    ["votes", LuVote, "Votaciones", votes.some((item) => item.status === "open") ? "Hay una abierta" : "Sin votaciones"],
  ];

  return <div className="portal-home">
    <section className={`portal-home-hero sky-host is-${period}`} aria-label="Bienvenida">
      <SkyScene period={period} kind={homeKind(unit)}/>
      <div className="portal-home-hero-copy">
        <small>{today}</small>
        <h2>{greeting(now.getHours())}{name ? `, ${name}` : ""}</h2>
        <p>{unit ? "Qué gusto tenerte en casa. Esto es lo que pasa hoy en tu hogar." : "Tu administración aún no te asigna una unidad."}</p>
        {unit ? <div className="portal-home-chips">
          <span>{homeKind(unit) === "house" ? <LuHouse/> : <LuBuilding2/>} {units.length > 1 ? "Mis unidades" : unit.label}</span>
          {relation && !relation.via_grant ? (relation.roles || []).map((role) => <span key={role}>{roleLabels[role] || role}</span>) : null}
        </div> : null}
        <em>{units.length} {units.length === 1 ? "unidad visible" : "unidades visibles"} según tus relaciones y permisos.</em>
      </div>
    </section>

    <div className="portal-home-grid">
      <section className="portal-home-today" aria-label="Hoy en tu hogar">
        <header><h3>Hoy en tu hogar</h3>{items.length ? <span>{items.length} {items.length === 1 ? "pendiente" : "pendientes"}</span> : null}</header>
        {items.length ? <ul>{items.map((item) => {
          const Icon = ITEM_ICON[item.icon];
          return <li key={item.key}><button type="button" className={`is-${item.tone}`} onClick={() => onOpen(item.section)}>
            <i><Icon/></i><span><small>{item.label}</small><strong>{item.title}</strong><em>{item.detail}</em></span><LuArrowRight className="portal-home-go"/>
          </button></li>;
        })}</ul> : <div className="portal-home-calm"><LuCircleCheck/><strong>Todo en orden en casa</strong><p>No tienes pagos, paquetes ni avisos pendientes. Disfruta tu día.</p></div>}
      </section>

      <aside className="portal-home-side">
        {unit ? <section className="portal-home-place" aria-label="Tu hogar">
          <h3>Tu hogar</h3>
          <strong>{unit.label}</strong>
          {facts.length ? <ul>{facts.filter((fact) => fact.icon !== "type").map((fact) => {
            const Icon = FACT_ICON[fact.icon];
            return <li key={fact.icon}><Icon/>{fact.label}</li>;
          })}</ul> : <p>La administración aún no registra los datos de tu unidad.</p>}
          <button type="button" onClick={() => onOpen("unit")}>Ver mi unidad <LuArrowRight/></button>
        </section> : null}
        <nav className="portal-home-shortcuts" aria-label="Atajos">
          {shortcuts.map(([key, Icon, label, hint]) => <button type="button" key={key} onClick={() => onOpen(key)} aria-label={`Ir a ${label}`}><i><Icon/></i><span><strong>{label}</strong><small>{hint}</small></span></button>)}
        </nav>
      </aside>
    </div>
  </div>;
}

export default PortalHome;
