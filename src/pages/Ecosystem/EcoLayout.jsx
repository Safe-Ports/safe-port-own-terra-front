import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiBars3 } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import EcoSprite from "./EcoSprite";
import "@/styles/ecosystem.css";
import CoreTopbarActions from "@/components/layout/CoreTopbarActions";
import Toast from "@/components/shared/Toast";
import SubscriptionBanner from "@/components/shared/SubscriptionBanner";
import useEscapeKey from "@/hooks/useEscapeKey";

/* Layout compartido del hub Aurora: sidebar + topbar + área de scroll.
   `active` marca el item activo del menú. */
function EcoLayout({ active = "panel", title, subtitle, onGuide, children }) {
  const navigate = useNavigate();
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
    <div className="eco-root">
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
          <div className="brand">
            <div className="brand-logo"><img src="/ownterra ecosistem.png" alt="OwnTerra Ecosistem" /></div>
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
