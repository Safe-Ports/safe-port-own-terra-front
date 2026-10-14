import { LuArrowRight, LuBath, LuBedDouble, LuBuilding2, LuCircleCheck, LuHouse, LuLayers, LuMegaphone, LuPackage, LuReceipt, LuRuler, LuVote, LuWallet } from "react-icons/lu";
import { dayPeriod, firstName, greeting, homeFacts, homeKind, todayItems } from "./portalHomeModel";
import "./portal-home.css";

const ITEM_ICON = { charge: LuReceipt, notice: LuMegaphone, package: LuPackage, vote: LuVote };
const FACT_ICON = { bed: LuBedDouble, bath: LuBath, area: LuRuler, floor: LuLayers };

/* Ilustración del encabezado: el cielo cambia con la hora y la silueta es una casa o un
   edificio según la unidad. Al atardecer y de noche las ventanas se encienden. */
function HomeScene({ period, kind }) {
  const lit = period === "dusk" || period === "night";
  const windowFill = lit ? "#f6cf84" : "#dbe8f4";
  const stars = [[520,40],[600,90],[690,36],[760,110],[930,48],[860,150],[640,150],[980,120]];
  return <svg className="portal-home-scene" viewBox="0 0 1000 300" aria-hidden="true" preserveAspectRatio="xMaxYMax slice">
    {period === "night" ? <><circle cx="900" cy="70" r="24" fill="#f3ead6"/><circle cx="911" cy="63" r="22" fill="var(--sky-top)"/>{stars.map(([x,y])=><circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill="#f3ead6" opacity=".8"/>)}</>
      : <circle cx="900" cy={period === "day" ? 70 : 150} r={period === "day" ? 30 : 38} fill={period === "day" ? "#fbe7b5" : "#f7c58f"} opacity=".95"/>}
    <path d="M0 236 C160 208 300 226 460 210 C620 194 760 220 1000 196 L1000 300 L0 300Z" fill="var(--hill-far)"/>
    <path d="M0 262 C200 244 380 258 560 246 C720 236 860 252 1000 242 L1000 300 L0 300Z" fill="var(--hill-near)"/>
    {kind === "house" ? <g transform="translate(748 150)">
      <rect x="112" y="6" width="14" height="30" fill="var(--roof)"/>
      <path d="M0 50 L80 0 L160 50Z" fill="var(--roof)"/>
      <rect x="14" y="46" width="132" height="92" rx="4" fill="var(--wall)"/>
      <rect x="66" y="84" width="28" height="54" rx="3" fill="var(--door)"/>
      <circle cx="88" cy="113" r="2.2" fill={windowFill}/>
      <rect x="28" y="66" width="26" height="24" rx="3" fill={windowFill}/>
      <rect x="106" y="66" width="26" height="24" rx="3" fill={windowFill}/>
    </g> : <g transform="translate(770 70)">
      <rect x="-6" y="-8" width="132" height="12" rx="4" fill="var(--roof)"/>
      <rect x="0" y="0" width="120" height="196" rx="5" fill="var(--wall)"/>
      {[0,1,2,3,4,5].map(row=>[0,1,2].map(col=><rect key={`${row}-${col}`} x={14+col*34} y={16+row*27} width="22" height="16" rx="2" fill={windowFill} opacity={lit && (row+col)%3===1 ? .45 : 1}/>))}
      <rect x="47" y="176" width="26" height="20" rx="2" fill="var(--door)"/>
    </g>}
    <g fill="var(--tree)"><circle cx="700" cy="250" r="20"/><circle cx="682" cy="260" r="13"/><rect x="698" y="258" width="5" height="22"/><circle cx="960" cy="262" r="15"/><circle cx="120" cy="270" r="14"/><circle cx="104" cy="276" r="9"/></g>
  </svg>;
}

function PortalHome({ me, units, relations, statement, announcements, votes, packages, onOpen, now = new Date() }) {
  const unit = units[0];
  const relation = relations.find((item) => item.property_id === unit?.id);
  const roleLabels = { owner: "Propietario", resident: "Residente", tenant: "Inquilino", board_member: "Comité" };
  const period = dayPeriod(now.getHours());
  const name = firstName(me?.nombre);
  const items = todayItems({ charges: statement?.open_charges || [], packages, announcements, votes }, now);
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
    <section className={`portal-home-hero is-${period}`} aria-label="Bienvenida">
      <HomeScene period={period} kind={homeKind(unit)}/>
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
