import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import EcoSprite from "./EcoSprite";
import "@/styles/ecosystem.css";

/* Layout compartido del hub Aurora: sidebar + topbar + área de scroll.
   `active` marca el item activo del menú. */
function EcoLayout({ active = "panel", title, subtitle, children }) {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();

  const initials = (currentUser?.name || "Usuario")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  const navItem = (key, label, icon, onClick, disabled) => (
    <button
      className={`nav-item ${active === key ? "active" : ""}`}
      onClick={disabled ? undefined : onClick}
      style={disabled ? { opacity: 0.5, cursor: "default" } : undefined}
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
            <div className="brand-logo"><svg><use href="#eco-brand" /></svg></div>
            <div>
              <div className="brand-name">Own<span>Terra</span></div>
              <div className="brand-tag">Ecosistem Platform</div>
            </div>
          </div>

          <div className="nav-group">
            <div className="nav-label">Núcleo central</div>
            {navItem("miday", "Mi Día", "eco-n-sun", () => navigate("/ecosistema/mi-dia"))}
            {navItem("panel", "Panel General", "eco-n-grid", () => navigate("/ecosistema"))}
            {navItem("vault", "OwnTerra Vault", "eco-n-vault", () => navigate("/ecosistema/documentos"))}
            {navItem("users", "Clientes del core", "eco-n-users", () => navigate("/ecosistema/clientes"))}
            {navItem("fin", "Estados Financieros", "eco-n-chart", () => navigate("/ecosistema/finanzas"))}
          </div>

          <div className="nav-group">
            <div className="nav-label">Aplicaciones</div>
            <button className="nav-item" onClick={() => navigate("/dashboard")}>
              <span className="nav-mini ic-lands"><svg width="14" height="14"><use href="#eco-g-lands" /></svg></span> OwnTerra Lands
            </button>
            <button className="nav-item" style={{ opacity: 0.5, cursor: "default" }}>
              <span className="nav-mini ic-neighb"><svg width="14" height="14"><use href="#eco-g-neighb" /></svg></span> Neighborhoods
            </button>
            <button className="nav-item" style={{ opacity: 0.5, cursor: "default" }}>
              <span className="nav-mini ic-homes"><svg width="14" height="14"><use href="#eco-g-homes" /></svg></span> OwnTerra Homes
            </button>
          </div>

          <div className="nav-group">
            <div className="nav-label">Sistema</div>
            {navItem("rbac", "Seguridad & RBAC", "eco-n-shield", () => {}, true)}
            {navItem("config", "Configuración", "eco-n-gear", () => {}, true)}
          </div>

          <div style={{ marginTop: "auto" }} />
          <div className="tenant-selector">
            <div className="ts-label">Empresa activa</div>
            <div className="ts-name">Fraccionamientos del Norte</div>
            <div className="ts-schema">schema: frac_norte · 4 fraccs</div>
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
            <button className="tb-btn">Alertas <span style={{ background: "var(--leaf)", color: "var(--deep)", borderRadius: 10, fontSize: 10, padding: "1px 7px", fontWeight: 600 }}>3</span></button>
            <button className="tb-btn primary">+ Nuevo documento</button>
            <div className="avatar">{initials}</div>
          </div>
        </div>

        <div className="scroll-area">{children}</div>
      </div>
    </div>
  );
}

export default EcoLayout;
