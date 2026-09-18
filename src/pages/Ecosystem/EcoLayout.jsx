import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HiArrowLeft, HiBars3, HiBuildingOffice2, HiCalendarDays, HiHomeModern, HiTicket } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import EcoSprite from "./EcoSprite";
import "@/styles/ecosystem.css";
import CoreTopbarActions from "@/components/layout/CoreTopbarActions";
import Toast from "@/components/shared/Toast";
import SubscriptionBanner from "@/components/shared/SubscriptionBanner";
import useEscapeKey from "@/hooks/useEscapeKey";
import PropertiesLogo from "@/apps/properties/components/PropertiesLogo";

/* Layout compartido del hub Aurora: sidebar + topbar + área de scroll.
   `active` marca el item activo del menú. */
function EcoLayout({ active = "panel", title, subtitle, onGuide, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, canUseFeature, showToast } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEscapeKey(() => setSidebarOpen(false), sidebarOpen);

  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const goTo = (path) => {
    setSidebarOpen(false);
    navigate(path);
  };

  // Todas las pantallas que se abren desde una tarjeta de la galería (Vault,
  // Formularios, Clientes, Proveedores, Agenda, Mi Día) resaltan el mismo ítem
  // "Hub de aplicaciones": son destinos de la galería, no secciones propias del
  // sidebar.
  const HUB_ACTIVE_KEYS = ["panel", "vault", "formularios", "users", "providers", "agenda", "miday"];

  const navItem = (key, label, icon, onClick, disabled) => {
    const isActive = key === "panel" ? HUB_ACTIVE_KEYS.includes(active) : active === key;
    return (
      <button
        // Ancla para el tutorial guiado (src/tours/definitions.js): se apoya en esta
        // clave, no en las clases CSS, que cambian con cualquier rediseño.
        data-tour={`nav-${key}`}
        className={`nav-item ${isActive ? "active" : ""}`}
        onClick={disabled ? () => showToast("Tu usuario no tiene acceso a esta sección", "warning") : onClick}
        style={disabled ? { opacity: 0.5, cursor: "default" } : undefined}
        title={disabled ? "Sin acceso para tu rol actual" : undefined}
      >
        <span className="ni-ico"><svg><use href={`#${icon}`} /></svg></span> {label}
      </button>
    );
  };

  return (
    <div className={`eco-root ${active === "properties" ? "properties-focus" : ""}`}>
      <EcoSprite />

      {/* SIDEBAR */}
      <button
        type="button"
        className={`eco-sidebar-backdrop ${sidebarOpen ? "show" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-label="Cerrar menú"
      />
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-inner">
          {active === "properties" ? (
            <nav className="properties-focus-rail" aria-label="Navegación de Properties">
              <button className="focus-brand" type="button" onClick={() => goTo("/properties")} aria-label="Inicio de Properties"><PropertiesLogo compact /><span><strong>Properties</strong><small>Centro de operación</small></span></button>
              <div className="focus-rail-nav">
                <small className="focus-rail-group">TRABAJO</small>
                <button type="button" aria-label="Inicio" className={location.pathname === "/properties" ? "active" : ""} onClick={() => goTo("/properties")}><HiHomeModern /><span>Inicio</span></button>
                <button type="button" aria-label="Mi Día" onClick={() => goTo("/ecosistema/mi-dia")}><HiCalendarDays /><span>Mi Día</span></button>
                <small className="focus-rail-group">CONTROL</small>
                <button type="button" aria-label="Portafolio" className={location.pathname.startsWith("/properties/portafolio") ? "active" : ""} onClick={() => goTo("/properties/portafolio")}><HiBuildingOffice2 /><span>Portafolio</span></button>
                <button type="button" aria-label="Pendientes" className={location.pathname.startsWith("/properties/tickets") ? "active" : ""} onClick={() => goTo("/properties/tickets")}><HiTicket /><span>Pendientes</span><i>3</i></button>
              </div>
              <button type="button" className="focus-exit" aria-label="Volver al ecosistema" onClick={() => goTo("/ecosistema")}><HiArrowLeft /><span>Ecosistema</span></button>
            </nav>
          ) : null}
          <div className="brand">
            <button
              type="button"
              className="brand-logo"
              onClick={() => goTo("/ecosistema")}
              aria-label="Ir al Ecosistema OwnTerra"
              title="Volver al Ecosistema"
            >
              <img src="/ownterra_land.png" alt="OwnTerra Lands" />
            </button>
          </div>

          {/* Sidebar reducido a 3 destinos: la galería de apps y los dos paneles
              de administración. Vault, Formularios, Clientes, Proveedores,
              Agenda y Mi Día viven ahora como tarjetas dentro del Hub, no como
              renglones fijos aquí. */}
          <div className="nav-group">
            {navItem("panel", "Hub de aplicaciones", "eco-n-grid", () => goTo("/ecosistema"))}
            {navItem("team", "Equipo", "eco-n-shield", () => goTo("/ecosistema/equipo"), !canUseFeature("core.team"))}
            {navItem("config", "Configuración", "eco-n-gear", () => goTo("/ecosistema/configuracion"), !canUseFeature("core.config"))}
          </div>

          <div style={{ marginTop: "auto" }} />
          <div className="tenant-selector">
            <div className="ts-label">Organización activa</div>
            <div className="ts-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentUser?.organization?.name || currentUser?.organization || "Mi organización"}
            </div>
            <div className="ts-schema">
              {currentUser?.name ? `Hola, ${currentUser.name.split(" ")[0]} 👋` : "OwnTerra Platform"}
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main">
        <div className="topbar">
          <div className="eco-topbar-heading">
            <button
              type="button"
              className="eco-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <HiBars3 aria-hidden="true" />
            </button>
            <div>
              <div className="topbar-title">{title}</div>
              <div className="topbar-sub">{subtitle || `Bienvenido · Hoy, ${today}`}</div>
            </div>
          </div>
          <CoreTopbarActions onGuide={onGuide} className="topbar-right" />
        </div>

        <SubscriptionBanner />
        <div className="scroll-area">{children}</div>
      </div>
      <Toast />
    </div>
  );
}

export default EcoLayout;
