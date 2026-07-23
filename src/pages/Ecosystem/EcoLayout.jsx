import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiBars3 } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import EcoSprite from "./EcoSprite";
import "@/styles/ecosystem.css";
import CoreTopbarActions from "@/components/layout/CoreTopbarActions";
import Toast from "@/components/shared/Toast";
import useEscapeKey from "@/hooks/useEscapeKey";

/* Layout compartido del hub Aurora: sidebar + topbar + área de scroll.
   `active` marca el item activo del menú. */
function EcoLayout({ active = "panel", title, subtitle, onGuide, children }) {
  const navigate = useNavigate();
  const { currentUser, canAccessApp, canUseFeature, showToast } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEscapeKey(() => setSidebarOpen(false), sidebarOpen);

  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const goTo = (path) => {
    setSidebarOpen(false);
    navigate(path);
  };

  const navItem = (key, label, icon, onClick, disabled) => (
    <button
      className={`nav-item ${active === key ? "active" : ""}`}
      onClick={disabled ? () => showToast("Tu usuario no tiene acceso a esta sección", "warning") : onClick}
      style={disabled ? { opacity: 0.5, cursor: "default" } : undefined}
      title={disabled ? "Sin acceso para tu rol actual" : undefined}
    >
      <span className="ni-ico"><svg><use href={`#${icon}`} /></svg></span> {label}
    </button>
  );

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

          <div className="nav-group">
            <div className="nav-label">Núcleo central</div>
            {navItem("miday", "Mi Día", "eco-n-sun", () => goTo("/ecosistema/mi-dia"))}
            {navItem("agenda", "Agenda", "eco-n-calendar", () => goTo("/ecosistema/agenda"))}
            {navItem("panel", "Panel General", "eco-n-grid", () => goTo("/ecosistema"))}
            {navItem("vault", "OwnTerra Vault", "eco-n-vault", () => goTo("/ecosistema/documentos"), !canUseFeature("core.vault"))}
            {navItem("formularios", "Formularios", "eco-n-forms", () => goTo("/ecosistema/formularios"))}
            {navItem("users", "Clientes del core", "eco-n-users", () => goTo("/ecosistema/clientes"), !canUseFeature("core.clients"))}
            {navItem("team", "Equipo", "eco-n-shield", () => goTo("/ecosistema/equipo"), !canUseFeature("core.team"))}
            {navItem("fin", "Estados Financieros", "eco-n-chart", () => goTo("/ecosistema/finanzas"), !canUseFeature("core.finance"))}
          </div>

          <div className="nav-group">
            <div className="nav-label">Aplicaciones</div>
            <button
              className="nav-item"
              onClick={() => canAccessApp("lands") ? goTo("/dashboard") : showToast("Tu usuario no tiene acceso a OwnTerra Lands", "warning")}
              style={!canAccessApp("lands") ? { opacity: 0.5, cursor: "default" } : undefined}
            >
              <span className="nav-mini ic-lands"><svg width="14" height="14"><use href="#eco-g-lands" /></svg></span> OwnTerra Lands
            </button>
            <button className="nav-item" style={{ opacity: 0.5, cursor: "not-allowed", pointerEvents: "none" }} tabIndex={-1} aria-disabled="true">
              <span className="nav-mini ic-neighb"><svg width="14" height="14"><use href="#eco-g-neighb" /></svg></span> Properties
            </button>
            <button className="nav-item" style={{ opacity: 0.5, cursor: "not-allowed", pointerEvents: "none" }} tabIndex={-1} aria-disabled="true">
              <span className="nav-mini ic-homes"><svg width="14" height="14"><use href="#eco-g-homes" /></svg></span> OwnTerra Homes
            </button>
          </div>

          <div className="nav-group">
            <div className="nav-label">Sistema</div>
            {navItem("config", "Configuración", "eco-n-gear", () => {}, true)}
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

        <div className="scroll-area">{children}</div>
      </div>
      <Toast />
    </div>
  );
}

export default EcoLayout;
