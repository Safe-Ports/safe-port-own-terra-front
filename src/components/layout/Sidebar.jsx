import { NavLink } from "react-router-dom";
import {
  HiArrowLeftOnRectangle,
  HiBellAlert,
  HiCalculator,
  HiCalendarDays,
  HiChartBarSquare,
  HiCog6Tooth,
  HiDocumentDuplicate,
  HiHome,
  HiMap,
  HiOutlineSquares2X2,
  HiOutlineUserGroup,
  HiRectangleGroup,
  HiSun,
  HiWallet,
} from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import useEscapeKey from "@/hooks/useEscapeKey";

const items = [
  { label: "Ecosistema", to: "/ecosistema", icon: HiRectangleGroup, section: "General" },
  { label: "Mi Día", to: "/ecosistema/mi-dia", icon: HiSun, section: "General" },
  { label: "Calendario", to: "/ecosistema/agenda", icon: HiCalendarDays, section: "General" },
  { label: "Dashboard", to: "/dashboard", icon: HiHome, section: "General" },
  { label: "Carga de Lotes", to: "/lotes", icon: HiOutlineSquares2X2, section: "Propiedades" },
  { label: "Fraccionamientos", to: "/fraccionamientos", icon: HiMap, section: "Propiedades" },
  { label: "Clientes & CRM", to: "/clientes", icon: HiOutlineUserGroup, section: "Gestion" },
  { label: "Contratos", to: "/contratos", icon: HiWallet, section: "Gestion" },
  { label: "Pagos", to: "/pagos", icon: HiBellAlert, section: "Gestion" },
  { label: "Documentos", to: "/documentos", icon: HiDocumentDuplicate, section: "Gestion" },
  { label: "Calculadora", to: "/calculadora", icon: HiCalculator, section: "Gestion" },
  { label: "Reportes", to: "/reportes", icon: HiChartBarSquare, section: "Sistema" },
  { label: "Configuracion", to: "/configuracion", icon: HiCog6Tooth, section: "Sistema" },
];

function Logo() {
  return (
    <div className="sb-logo">
      <div className="sb-logo-mark">
        <img src="/ownterra_land.png" alt="" />
      </div>
    </div>
  );
}

function Sidebar() {
  const { ui, closeSidebar, fracs, clients, payments, documents, notificationCount, logout, currentUser, canAccessApp, canUseFeature, resetFracsView, setDraftProject } = useAppContext();
  useEscapeKey(closeSidebar, ui.sidebarOpen);

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
          {items.filter((item) => {
            if (item.to.startsWith("/ecosistema")) return true;
            if (item.to === "/configuracion") return canUseFeature("core.config");
            if (item.to === "/clientes") return canUseFeature("lands.clients");
            if (item.to === "/ventas" || item.to === "/contratos") return canUseFeature("lands.sales");
            if (item.to === "/documentos") return canUseFeature("lands.documents");
            if (item.to === "/pagos") return canUseFeature("lands.payments");
            if (item.to === "/reportes") return canUseFeature("lands.reports");
            return canAccessApp("lands");
          }).map((item) => {
            const Icon = item.icon;
            const shouldRenderSection = item.section !== lastSection;
            lastSection = item.section;

            let badge = null;
            if (item.to === "/fraccionamientos" && fracs.length) badge = fracs.length;
            if (item.to === "/clientes" && clients.length) badge = clients.length;
            if (item.to === "/pagos") badge = payments.filter((p) => p.status === "overdue").length;
            if (item.to === "/documentos" && documents.length) badge = documents.length;

            return (
              <div key={item.to}>
                {shouldRenderSection ? <div className="sb-sec">{item.section}</div> : null}
                <NavLink
                  to={item.to}
                  onClick={() => {
                    closeSidebar();
                    if (item.to === "/fraccionamientos") resetFracsView();
                    if (item.to === "/lotes") setDraftProject({ mode: "selector", name: "Nuevo Fraccionamiento", mapUrl: "", sections: [], cadProcessing: false });
                  }}
                  className={({ isActive }) => `sb-btn ${isActive ? "active" : ""}`}
                >
                  <span className="sb-ico">
                    <Icon />
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
            fontFamily: "var(--font-body)", cursor: "pointer", marginTop: 4,
          }}>
            <span className="sb-foot-ico"><HiArrowLeftOnRectangle /></span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
