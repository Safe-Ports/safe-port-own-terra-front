import { HiArrowLeft, HiBanknotes, HiBuildingOffice2, HiBuildingStorefront, HiHomeModern, HiInboxStack, HiMegaphone, HiScale, HiSquares2X2, HiUserGroup, HiUsers } from "react-icons/hi2";
import { useLocation } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { usePropertiesData } from "../data/PropertiesDataContext";
import PropertiesLogo from "./PropertiesLogo";

const OPERATIONS = "/properties/comunidades/operacion";

/* Menú lateral de Properties: accesos directos a lo que se usa todos los días.
   Lo general (Mi Día, calendario, perfil, apps) ya vive en la barra superior,
   así que aquí no se repite. Los contadores salen de datos que persisten en
   properties-back; los módulos con datos demo (tickets, servicios) no cuentan. */
function PropertiesQuickNav({ goTo }) {
  const { pathname, search } = useLocation();
  const tab = pathname === "/properties/comunidades" ? new URLSearchParams(search).get("tab") : null;
  const { canUseFeature } = useAppContext();
  const { condoCharges, packages, reservations, votes } = usePropertiesData();
  const module = pathname === OPERATIONS ? new URLSearchParams(search).get("module") || "charges" : null;

  const counts = {
    charges: condoCharges.filter((charge) => charge.status === "overdue").length,
    packages: packages.filter((item) => item.status === "pending").length,
    amenities: reservations.filter((item) => item.status === "requested").length,
    committee: votes.filter((item) => item.status === "open").length,
  };

  const groups = [
    ["DÍA A DÍA", [
      { key: "communities", label: "Comunidades", icon: HiUserGroup, to: "/properties/comunidades", active: pathname === "/properties/comunidades" && !["units", "monitoring", "relations"].includes(tab), feature: "properties.properties.read" },
      { key: "units", label: "Unidades y residentes", icon: HiUsers, to: "/properties/comunidades?tab=units", active: ["units", "monitoring", "relations"].includes(tab), feature: "properties.units.read" },
      { key: "charges", label: "Cuotas y adeudos", icon: HiBanknotes, to: `${OPERATIONS}?module=charges`, active: module === "charges", count: counts.charges, tone: "danger", hint: ["cargo vencido", "cargos vencidos"], feature: "properties.properties.read" },
      { key: "packages", label: "Paquetería", icon: HiInboxStack, to: "/properties/accesos", active: pathname.startsWith("/properties/accesos"), count: counts.packages, hint: ["paquete en recepción", "paquetes en recepción"], feature: "properties.units.read" },
      { key: "amenities", label: "Amenidades", icon: HiBuildingStorefront, to: `${OPERATIONS}?module=amenities`, active: module === "amenities", count: counts.amenities, hint: ["reserva por aprobar", "reservas por aprobar"], feature: "properties.properties.read" },
      { key: "communications", label: "Comunicados", icon: HiMegaphone, to: `${OPERATIONS}?module=communications`, active: module === "communications", feature: "properties.properties.read" },
      { key: "committee", label: "Votaciones", icon: HiScale, to: `${OPERATIONS}?module=committee`, active: module === "committee", count: counts.committee, hint: ["votación abierta", "votaciones abiertas"], feature: "properties.properties.read" },
    ]],
    ["PORTAFOLIO", [
      { key: "portfolio", label: "Inmuebles y unidades", icon: HiBuildingOffice2, to: "/properties/portafolio", active: ["/properties/portafolio", "/properties/inmuebles", "/properties/unidades", "/properties/propietarios"].some((path) => pathname.startsWith(path)), feature: "properties.properties.read" },
      { key: "tools", label: "Todas las herramientas", icon: HiSquares2X2, to: "/properties/operacion", active: pathname.startsWith("/properties/operacion") },
    ]],
  ];

  const item = ({ key, label, icon: Icon, to, active, count, tone, hint }) => {
    const detail = count ? `${count} ${hint[count === 1 ? 0 : 1]}` : "";
    return <button type="button" key={key} aria-label={detail ? `${label}: ${detail}` : label} title={detail || undefined} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => goTo(to)}>
      <Icon aria-hidden="true" /><span>{label}</span>{count ? <i className={tone || ""}>{count > 9 ? "9+" : count}</i> : null}
    </button>;
  };

  return <nav className="properties-focus-rail" aria-label="Navegación de Properties">
    <button className="focus-brand" type="button" onClick={() => goTo("/properties")} aria-label="Inicio de Properties"><PropertiesLogo compact /><span><strong>Properties</strong><small>Centro de operación</small></span></button>
    <div className="focus-rail-nav">
      {item({ key: "home", label: "Inicio", icon: HiHomeModern, to: "/properties", active: pathname === "/properties" })}
      {groups.map(([title, items]) => {
        const visible = items.filter((entry) => !entry.feature || canUseFeature(entry.feature));
        return visible.length ? [<small className="focus-rail-group" key={title}>{title}</small>, ...visible.map(item)] : null;
      })}
    </div>
    <button type="button" className="focus-exit" aria-label="Volver al ecosistema" onClick={() => goTo("/ecosistema")}><HiArrowLeft /><span>Ecosistema</span></button>
  </nav>;
}

export default PropertiesQuickNav;
