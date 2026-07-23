import { useNavigate } from "react-router-dom";
import { HiOutlineQuestionMarkCircle } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import EcoSprite from "./EcoSprite";
import "@/styles/ecosystem.css";
import Avatar from "@/components/Avatar";
import Toast from "@/components/shared/Toast";
import SubscriptionBanner from "@/components/shared/SubscriptionBanner";

/* Layout compartido del hub Aurora: sidebar + topbar + área de scroll.
   `active` marca el item activo del menú. */
function EcoLayout({ active = "panel", title, subtitle, onGuide, children }) {
  const navigate = useNavigate();
  const { currentUser, logout, notificationCount, canAccessApp, canUseFeature, showToast } = useAppContext();

  const initials = (currentUser?.name || "Usuario")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const handleLogout = () => {
    if (window.confirm("¿Cerrar sesión?")) logout();
  };

  const navItem = (key, label, icon, onClick, disabled) => (
    <button
      className={`nav-item ${active === key ? "active" : ""}`}
      onClick={disabled ? () => showToast("Tu usuario no tiene acceso a esta sección") : onClick}
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
      <aside className="sidebar">
        <div className="sidebar-inner">
          <div className="brand">
            <div className="brand-logo"><img src="/ownterra ecosistem.png" alt="OwnTerra Ecosistem" /></div>
          </div>

          <div className="nav-group">
            <div className="nav-label">Núcleo central</div>
            {navItem("miday", "Mi Día", "eco-n-sun", () => navigate("/ecosistema/mi-dia"))}
            {navItem("agenda", "Agenda", "eco-n-calendar", () => navigate("/ecosistema/agenda"))}
            {navItem("panel", "Panel General", "eco-n-grid", () => navigate("/ecosistema"))}
            {navItem("vault", "OwnTerra Vault", "eco-n-vault", () => navigate("/ecosistema/documentos"), !canUseFeature("core.vault"))}
            {navItem("formularios", "Formularios", "eco-n-forms", () => navigate("/ecosistema/formularios"))}
            {navItem("users", "Clientes del core", "eco-n-users", () => navigate("/ecosistema/clientes"), !canUseFeature("core.clients"))}
            {navItem("team", "Equipo", "eco-n-shield", () => navigate("/ecosistema/equipo"), !canUseFeature("core.team"))}
            {navItem("fin", "Estados Financieros", "eco-n-chart", () => navigate("/ecosistema/finanzas"), !canUseFeature("core.finance"))}
          </div>

          <div className="nav-group">
            <div className="nav-label">Aplicaciones</div>
            <button
              className="nav-item"
              onClick={() => canAccessApp("lands") ? navigate("/dashboard") : showToast("Tu usuario no tiene acceso a OwnTerra Lands")}
              style={!canAccessApp("lands") ? { opacity: 0.5, cursor: "default" } : undefined}
            >
              <span className="nav-mini ic-lands"><svg width="14" height="14"><use href="#eco-g-lands" /></svg></span> OwnTerra Lands
            </button>
            <button className="nav-item" style={{ opacity: 0.5, cursor: "not-allowed", pointerEvents: "none" }} tabIndex={-1} aria-disabled="true">
              <span className="nav-mini ic-neighb"><svg width="14" height="14"><use href="#eco-g-neighb" /></svg></span> Neighborhoods
            </button>
            <button className="nav-item" style={{ opacity: 0.5, cursor: "not-allowed", pointerEvents: "none" }} tabIndex={-1} aria-disabled="true">
              <span className="nav-mini ic-homes"><svg width="14" height="14"><use href="#eco-g-homes" /></svg></span> OwnTerra Homes
            </button>
          </div>

          <div className="nav-group">
            <div className="nav-label">Sistema</div>
            {navItem("config", "Configuración", "eco-n-gear", () => navigate("/configuracion"), !canUseFeature("core.config"))}
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
          <div>
            <div className="topbar-title">{title}</div>
            <div className="topbar-sub">{subtitle || `Bienvenido · Hoy, ${today}`}</div>
          </div>
          <div className="topbar-right">
            {onGuide && (
              <button
                type="button"
                className="tb-btn topbar-help"
                onClick={onGuide}
                aria-label="Abrir guías de esta sección"
                aria-haspopup="dialog"
                title="Abrir guías"
              >
                <HiOutlineQuestionMarkCircle aria-hidden="true" />
                <span>Guías</span>
              </button>
            )}
            <button className="tb-btn" onClick={() => navigate("/ecosistema/mi-dia")}>
              Mi Día
              {notificationCount > 0 && (
                <span style={{ background: "var(--leaf)", color: "var(--deep)", borderRadius: 10, fontSize: 10, padding: "1px 7px", fontWeight: 600 }}>
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </button>
            <button className="tb-btn" onClick={() => navigate("/ecosistema/agenda")}>Calendario</button>
            <Avatar name={currentUser?.name || "Usuario"} size={36} />
            <button className="tb-btn eco-logout" onClick={handleLogout}>Cerrar sesión</button>
          </div>
        </div>

        <SubscriptionBanner />
        <div className="scroll-area">{children}</div>
      </div>
      <Toast />
    </div>
  );
}

export default EcoLayout;
