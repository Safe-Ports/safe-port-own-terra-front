import { HiArrowLeft, HiBanknotes, HiWrenchScrewdriver, HiHomeModern, HiMegaphone, HiSquares2X2, HiUserGroup } from "react-icons/hi2";
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
  const { condoCharges, votes, serviceApplications } = usePropertiesData();
  const module = pathname === OPERATIONS ? new URLSearchParams(search).get("module") || "charges" : null;

  const counts = {
    charges: condoCharges.filter((charge) => charge.status === "overdue").length,
    committee: votes.filter((item) => item.status === "open").length,
    applications: (serviceApplications || []).length,
  };

  // Cinco destinos. El menú anterior tenía once y repetía lo que ya vive
  // dentro de Operación diaria; la portada es la que ahora avisa qué requiere
  // atención, así que el menú sólo tiene que llevarte, no alertarte.
  // Lo que no está aquí (paquetería, amenidades, votaciones, proveedores,
  // portafolio) sigue completo en "Todas las herramientas", abajo.
  const groups = [
    [null, [
      { key: "communities", label: "Comunidades", icon: HiUserGroup, to: "/properties/comunidades", active: pathname.startsWith("/properties/comunidades") && !module, feature: "properties.properties.read" },
      { key: "charges", label: "Cobranza", icon: HiBanknotes, to: `${OPERATIONS}?module=charges`, active: module === "charges", count: counts.charges, tone: "danger", hint: ["cargo vencido", "cargos vencidos"], feature: "properties.properties.read" },
      { key: "services", label: "Servicios", icon: HiWrenchScrewdriver, to: `${OPERATIONS}?module=utilities`, active: module === "utilities" || pathname.startsWith("/properties/responsables") || pathname.startsWith("/properties/tickets"), count: counts.applications, hint: ["solicitud por revisar", "solicitudes por revisar"], feature: "properties.properties.read" },
      { key: "communications", label: "Comunicación", icon: HiMegaphone, to: `${OPERATIONS}?module=communications`, active: module === "communications" || module === "committee", count: counts.committee, hint: ["votación abierta", "votaciones abiertas"], feature: "properties.properties.read" },
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
      {item({ key: "home", label: "Hoy", icon: HiHomeModern, to: "/properties", active: pathname === "/properties" || pathname === "/properties/guia" })}
      {groups.map(([title, items]) => {
        const visible = items.filter((entry) => !entry.feature || canUseFeature(entry.feature));
        return visible.length ? [title ? <small className="focus-rail-group" key={title}>{title}</small> : null, ...visible.map(item)] : null;
      })}
    </div>
    <div className="focus-rail-foot">
      {item({ key: "tools", label: "Todas las herramientas", icon: HiSquares2X2, to: "/properties/operacion", active: pathname.startsWith("/properties/operacion") || pathname.startsWith("/properties/modulos") || pathname.startsWith("/properties/portafolio") || pathname.startsWith("/properties/inmuebles") || pathname.startsWith("/properties/unidades") || pathname.startsWith("/properties/propietarios") || pathname.startsWith("/properties/accesos") })}
      <button type="button" className="focus-exit" aria-label="Volver al ecosistema" onClick={() => goTo("/ecosistema")}><HiArrowLeft /><span>Ecosistema</span></button>
    </div>
  </nav>;
}

export default PropertiesQuickNav;
