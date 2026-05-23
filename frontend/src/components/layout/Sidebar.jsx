import { NavLink } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";

const items = [
  { label: "Dashboard", to: "/dashboard", emoji: "📊", section: "General" },
  { label: "Mi Día", to: "/mi-dia", emoji: "☀️", section: "Inicio" },
  { label: "Carga de Lotes", to: "/lotes", emoji: "🗺️", section: "Propiedades" },
  { label: "Fraccionamientos", to: "/fraccionamientos", emoji: "🏘️", section: "Propiedades" },
  { label: "Clientes & CRM", to: "/clientes", emoji: "👥", section: "Gestión" },
  { label: "Contratos", to: "/contratos", emoji: "📄", section: "Gestión" },
  { label: "Pagos", to: "/pagos", emoji: "💳", section: "Gestión" },
  { label: "Documentos", to: "/documentos", emoji: "📁", section: "Gestión" },
  { label: "Calculadora", to: "/calculadora", emoji: "🧮", section: "Gestión" }
];

function Logo() {
  return (
    <div className="sb-logo">
      <div className="sb-logo-ico">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2 15L9 3L16 15Z" fill="none" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M6 15h6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="9" cy="10.5" r="1.8" fill="white" />
        </svg>
      </div>
      <div className="sb-logo-nm">
        LoteManager
        <small>Sistema Inmobiliario</small>
      </div>
    </div>
  );
}

function Sidebar() {
  const { ui, closeSidebar, fracs, clients, payments, documents } = useAppContext();

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
            if (item.to === "/pagos") badge = payments.filter((payment) => payment.status === "overdue").length;
            if (item.to === "/documentos" && documents.length) badge = documents.length;

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
          <div className="sb-foot-item">⚙️ &nbsp;Configuración</div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
