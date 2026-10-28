import { useState } from "react";
import { HiArrowLeft, HiBanknotes, HiBolt, HiBuildingStorefront, HiChartBar, HiChevronDown, HiHomeModern, HiMegaphone, HiScale, HiSquares2X2, HiUserGroup, HiWrenchScrewdriver } from "react-icons/hi2";
import { useLocation } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { usePropertiesData } from "../data/PropertiesDataContext";

const OPERATIONS = "/properties/comunidades/operacion";

/* Menú lateral de Properties: accesos directos a lo que se usa todos los días.
   Lo general (Mi Día, calendario, perfil, apps) ya vive en la barra superior,
   así que aquí no se repite. Los contadores salen de datos que persisten en
   properties-back; los módulos con datos demo (tickets, servicios) no cuentan. */
function PropertiesQuickNav({ goTo }) {
  const { pathname, search } = useLocation();
  const { canUseFeature } = useAppContext();
  const { condoCharges, votes, serviceApplications } = usePropertiesData();
  const module = pathname === OPERATIONS ? new URLSearchParams(search).get("module") || "charges" : null;
  const [operationsOpen, setOperationsOpen] = useState(false);

  const counts = {
    charges: condoCharges.filter((charge) => charge.status === "overdue").length,
    committee: votes.filter((item) => item.status === "open").length,
    applications: (serviceApplications || []).length,
  };

  // Las seis pestañas de Operación diaria vivían repetidas: como fila
  // horizontal dentro de esa pantalla Y como accesos sueltos (Cobranza,
  // Comunicación) en este menú. Ahora son una sola lista, acá, que se
  // despliega bajo "Operaciones"; la pantalla ya no trae su propia nav.
  const operationModules = [
    { key: "charges", label: "Cuotas y adeudos", icon: HiBanknotes, to: `${OPERATIONS}?module=charges`, count: counts.charges, tone: "danger", hint: ["cargo vencido", "cargos vencidos"] },
    { key: "utilities", label: "Gastos de servicios", icon: HiBolt, to: `${OPERATIONS}?module=utilities` },
    { key: "communications", label: "Comunicados", icon: HiMegaphone, to: `${OPERATIONS}?module=communications` },
    { key: "amenities", label: "Amenidades", icon: HiBuildingStorefront, to: `${OPERATIONS}?module=amenities` },
    { key: "committee", label: "Comité y votaciones", icon: HiScale, to: `${OPERATIONS}?module=committee`, count: counts.committee, hint: ["votación abierta", "votaciones abiertas"] },
    { key: "reports", label: "Reportes", icon: HiChartBar, to: `${OPERATIONS}?module=reports` },
  ];
  const operationsPending = counts.charges + counts.committee;
  const operationsExpanded = operationsOpen || module !== null;

  const item = ({ key, label, icon: Icon, to, active, count, tone, hint }) => {
    const detail = count ? `${count} ${hint[count === 1 ? 0 : 1]}` : "";
    return <button type="button" key={key} aria-label={detail ? `${label}: ${detail}` : label} title={detail || undefined} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => goTo(to)}>
      <Icon aria-hidden="true" /><span>{label}</span>{count ? <i className={tone || ""}>{count > 9 ? "9+" : count}</i> : null}
    </button>;
  };

  const canReadCommunities = canUseFeature("properties.properties.read");

  return <nav className="properties-focus-rail" aria-label="Navegación de Properties">
    <button className="focus-brand is-logo-only" type="button" onClick={() => goTo("/properties")} aria-label="Inicio de Properties"><img src="/brand/properties-mark-color.svg" alt="" aria-hidden="true" /></button>
    <div className="focus-rail-nav">
      {item({ key: "home", label: "Actividad", icon: HiHomeModern, to: "/properties", active: pathname === "/properties" })}
      {canReadCommunities ? item({ key: "communities", label: "Comunidades", icon: HiUserGroup, to: "/properties/comunidades", active: pathname.startsWith("/properties/comunidades") && !module }) : null}
      {canReadCommunities ? <div className="focus-rail-expandable">
        <button type="button" aria-label={!operationsExpanded && operationsPending ? `Operaciones: ${operationsPending} pendientes` : "Operaciones"} className={`focus-rail-expand-toggle ${module !== null ? "active" : ""}`} aria-expanded={operationsExpanded} onClick={() => setOperationsOpen((open) => !open)}>
          <HiSquares2X2 aria-hidden="true" /><span>Operaciones</span>
          {!operationsExpanded && operationsPending ? <i className="danger">{operationsPending > 9 ? "9+" : operationsPending}</i> : null}
          <HiChevronDown aria-hidden="true" className={`focus-rail-chevron ${operationsExpanded ? "is-open" : ""}`} />
        </button>
        {operationsExpanded ? <div className="focus-rail-submenu">
          {operationModules.map((entry) => item({ ...entry, active: module === entry.key }))}
        </div> : null}
      </div> : null}
      {canReadCommunities ? item({ key: "services", label: "Servicios", icon: HiWrenchScrewdriver, to: "/properties/tickets", active: pathname.startsWith("/properties/responsables") || pathname.startsWith("/properties/tickets"), count: counts.applications, hint: ["solicitud por revisar", "solicitudes por revisar"] }) : null}
    </div>
    <div className="focus-rail-foot">
      {item({ key: "tools", label: "Todas las herramientas", icon: HiSquares2X2, to: "/properties/operacion", active: pathname.startsWith("/properties/operacion") || pathname.startsWith("/properties/modulos") || pathname.startsWith("/properties/portafolio") || pathname.startsWith("/properties/inmuebles") || pathname.startsWith("/properties/unidades") || pathname.startsWith("/properties/propietarios") || pathname.startsWith("/properties/accesos") })}
      <button type="button" className="focus-exit" aria-label="Volver al ecosistema" onClick={() => goTo("/ecosistema")}><HiArrowLeft /><span>Ecosistema</span></button>
    </div>
  </nav>;
}

export default PropertiesQuickNav;
