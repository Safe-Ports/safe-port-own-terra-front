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
import { useLocale } from "@/i18n";

/* Layout compartido del hub Aurora: sidebar + topbar + área de scroll.
   `active` marca el item activo del menú. */
function EcoLayout({ active = "panel", title, subtitle, onGuide, children }) {
  const navigate = useNavigate();
  const { currentUser, canAccessApp, canUseFeature, showToast } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t, format } = useLocale();
  useEscapeKey(() => setSidebarOpen(false), sidebarOpen);

  const today = format.date(new Date(), { day: "numeric", month: "long", year: "numeric" });
  const goTo = (path) => {
    setSidebarOpen(false);
    navigate(path);
  };

  const navItem = (key, label, icon, onClick, disabled) => (
    <button
      className={`nav-item ${active === key ? "active" : ""}`}
      onClick={disabled ? () => showToast(t("ecosystem.noAccess"), "warning") : onClick}
      style={disabled ? { opacity: 0.5, cursor: "default" } : undefined}
      title={disabled ? t("ecosystem.noRoleAccess") : undefined}
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
        aria-label={t("ecosystem.closeMenu")}
      />
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-inner">
          <div className="brand">
            <div className="brand-logo"><img src="/ownterra ecosistem.png" alt="OwnTerra Ecosistem" /></div>
          </div>

          <div className="nav-group">
            <div className="nav-label">{t("ecosystem.core")}</div>
            {navItem("miday", t("nav.myDay"), "eco-n-sun", () => goTo("/ecosistema/mi-dia"))}
            {navItem("agenda", t("ecosystem.agenda"), "eco-n-calendar", () => goTo("/ecosistema/agenda"))}
            {navItem("panel", t("ecosystem.overview"), "eco-n-grid", () => goTo("/ecosistema"))}
            {navItem("vault", "OwnTerra Vault", "eco-n-vault", () => goTo("/ecosistema/documentos"), !canUseFeature("core.vault"))}
            {navItem("formularios", t("ecosystem.forms"), "eco-n-forms", () => goTo("/ecosistema/formularios"))}
            {navItem("users", t("ecosystem.coreClients"), "eco-n-users", () => goTo("/ecosistema/clientes"), !canUseFeature("core.clients"))}
            {navItem("team", t("ecosystem.team"), "eco-n-shield", () => goTo("/ecosistema/equipo"), !canUseFeature("core.team"))}
            {navItem("fin", t("ecosystem.financials"), "eco-n-chart", () => goTo("/ecosistema/finanzas"), !canUseFeature("core.finance"))}
          </div>

          <div className="nav-group">
            <div className="nav-label">{t("ecosystem.applications")}</div>
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
            <div className="nav-label">{t("ecosystem.system")}</div>
            {navItem("config", t("ecosystem.settings"), "eco-n-gear", () => navigate("/configuracion"), !canUseFeature("core.config"))}
          </div>

          <div style={{ marginTop: "auto" }} />
          <div className="tenant-selector">
            <div className="ts-label">{t("ecosystem.activeOrg")}</div>
            <div className="ts-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentUser?.organization?.name || currentUser?.organization || t("ecosystem.myOrg")}
            </div>
            <div className="ts-schema">
              {currentUser?.name ? `${t("ecosystem.hello")}, ${currentUser.name.split(" ")[0]} 👋` : "OwnTerra Platform"}
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
              aria-label={t("ecosystem.openMenu")}
            >
              <HiBars3 aria-hidden="true" />
            </button>
            <div>
              <div className="topbar-title">{title}</div>
              <div className="topbar-sub">{subtitle || t("ecosystem.welcomeToday").replace("{date}", today)}</div>
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
