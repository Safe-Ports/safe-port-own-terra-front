import { NavLink } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";

const items = [
  { label: "Ecosistema", to: "/ecosistema", emoji: "🌐", section: "General" },
  { label: "Dashboard", to: "/dashboard", emoji: "📊", section: "General" },
  { label: "Carga de Lotes", to: "/lotes", emoji: "🗺️", section: "Propiedades" },
  { label: "Fraccionamientos", to: "/fraccionamientos", emoji: "🏘️", section: "Propiedades" },
  { label: "Clientes & CRM", to: "/clientes", emoji: "👥", section: "Gestión" },
  { label: "Contratos", to: "/contratos", emoji: "📄", section: "Gestión" },
  { label: "Pagos", to: "/pagos", emoji: "💳", section: "Gestión" },
  { label: "Documentos", to: "/documentos", emoji: "📁", section: "Gestión" },
  { label: "Calculadora", to: "/calculadora", emoji: "🧮", section: "Gestión" },
  { label: "Reportes", to: "/reportes", emoji: "📊", section: "Sistema" },
  { label: "Alertas", to: "/alertas", emoji: "🔔", section: "Sistema" },
  { label: "Configuración", to: "/configuracion", emoji: "⚙️", section: "Sistema" },
];

function Logo() {
  return (
    <div className="sb-logo">
      <div className="sb-logo-ico">
        {/* OwnTerra: hojas + casita + colinas */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* hoja izquierda */}
          <path d="M6 7c0-1.7 1.3-3 3-3 .3 1.5-.5 3-2 3.5-.5.2-1 .2-1-.5z" fill="white" opacity="0.95"/>
          {/* hoja derecha */}
          <path d="M18 7c0-1.7-1.3-3-3-3-.3 1.5.5 3 2 3.5.5.2 1 .2 1-.5z" fill="white" opacity="0.95"/>
          {/* casita */}
          <path d="M9 12l3-2.5L15 12v4h-2v-2.5h-2V16H9v-4z" fill="white"/>
          {/* colina */}
          <path d="M3 19c2-2 5-3 9-3s7 1 9 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
        </svg>
      </div>
      <div className="sb-logo-nm">
        OwnTerra
        <small>Ecosistem</small>
      </div>
    </div>
  );
}

function Sidebar() {
  const { ui, closeSidebar, fracs, clients, payments, documents, notificationCount, logout, currentUser } = useAppContext();

  const handleLogout = () => {
    if (window.confirm("¿Cerrar sesión?")) logout();
  };

  let lastSection = "";

  return (
    <>
      <div className={`sidebar-backdrop ${ui.sidebarOpen ? "show" : ""}`} onClick={closeSidebar} />
      <aside className={`sb app-sidebar ${ui.sidebarOpen ? "open" : ""}`}>
        <Logo />
        <div className="sb-nav">
          {items.map((item) => {
            const shouldRenderSection = item.section !== lastSection;
            lastSection = item.section;

            let badge = null;
            if (item.to === "/fraccionamientos" && fracs.length) badge = fracs.length;
            if (item.to === "/clientes" && clients.length) badge = clients.length;
            if (item.to === "/pagos") badge = payments.filter((p) => p.status === "overdue").length;
            if (item.to === "/documentos" && documents.length) badge = documents.length;
            if (item.to === "/alertas" && notificationCount > 0) badge = notificationCount;

            return (
              <div key={item.to}>
                {shouldRenderSection ? <div className="sb-sec">{item.section}</div> : null}
                <NavLink
                  to={item.to}
                  onClick={closeSidebar}
                  className={({ isActive }) => `sb-btn ${isActive ? "active" : ""}`}
                >
                  <span className="sb-ico">
                    {item.emoji}
                  </span>
                  <span>{item.label}</span>
                  {badge ? <span className={`sb-bdg ${item.to === "/pagos" ? "sb-bdg-red" : ""}`}>{badge}</span> : null}
                </NavLink>
              </div>
            );
          })}
        </div>
        <div className="sb-foot">
          <NavLink to="/perfil" onClick={closeSidebar} className="sb-foot-item" style={{ textDecoration: "none" }}>
            <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--forest)",
              color: "#fff", fontWeight: 800, fontSize: ".68rem",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {(currentUser?.name || "U").charAt(0).toUpperCase()}
            </span>
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.85)", fontWeight: 600,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentUser?.name || "Perfil"}
              </div>
              <div style={{ fontSize: ".64rem", color: "rgba(255,255,255,.4)" }}>Ver perfil</div>
            </div>
          </NavLink>
          <button onClick={handleLogout} className="sb-foot-item" style={{
            border: "none", background: "transparent", width: "100%", textAlign: "left",
            fontFamily: "inherit", cursor: "pointer", marginTop: 4,
          }}>
            <span style={{ fontSize: ".95rem" }}>🚪</span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
