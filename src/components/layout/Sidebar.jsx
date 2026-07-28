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
import { useLocale } from "@/i18n";
import useEscapeKey from "@/hooks/useEscapeKey";

const NAV_ITEMS = [
  { path: "/ecosistema",        icon: HiRectangleGroup,     section: "General" },
  { path: "/ecosistema/mi-dia", icon: HiSun,                section: "General" },
  { path: "/ecosistema/agenda", icon: HiCalendarDays,       section: "General" },
  { path: "/dashboard",         icon: HiHome,               section: "General" },
  { path: "/lotes",             icon: HiOutlineSquares2X2,  section: "Propiedades" },
  { path: "/fraccionamientos",  icon: HiMap,                section: "Propiedades" },
  { path: "/clientes",          icon: HiOutlineUserGroup,   section: "Gestion" },
  { path: "/contratos",         icon: HiWallet,             section: "Gestion" },
  { path: "/pagos",             icon: HiBellAlert,          section: "Gestion" },
  { path: "/documentos",        icon: HiDocumentDuplicate,  section: "Gestion" },
  { path: "/calculadora",       icon: HiCalculator,         section: "Gestion" },
  { path: "/reportes",          icon: HiChartBarSquare,     section: "Gestion" },
  { path: "/configuracion",     icon: HiCog6Tooth,          section: "Sistema" },
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
  const {
    ui, closeSidebar, fracs, clients, payments, documents,
    notificationCount, logout, currentUser,
    canAccessApp, canUseFeature, resetFracsView, setDraftProject,
  } = useAppContext();
  const { t } = useLocale();
  useEscapeKey(closeSidebar, ui.sidebarOpen);

  const handleLogout = () => {
    if (window.confirm(t("nav.logoutConfirm"))) logout();
  };

  let lastSection = "";

  return (
    <>
      <div className={`sidebar-backdrop ${ui.sidebarOpen ? "show" : ""}`} onClick={closeSidebar} />
      <aside className={`sb app-sidebar ${ui.sidebarOpen ? "open" : ""}`}>
        <Logo />
        <div className="sb-nav">
          {NAV_ITEMS.filter((item) => {
            if (item.path.startsWith("/ecosistema")) return true;
            if (item.path === "/configuracion") return canUseFeature("core.config");
            if (item.path === "/clientes") return canUseFeature("lands.clients");
            if (item.path === "/contratos") return canUseFeature("lands.sales");
            if (item.path === "/documentos") return canUseFeature("lands.documents");
            if (item.path === "/pagos") return canUseFeature("lands.payments");
            if (item.path === "/reportes") return canUseFeature("lands.reports");
            return canAccessApp("lands");
          }).map((item) => {
            const Icon = item.icon;
            const label = t(`routes.${item.path}`, item.path);
            const section = t(`sidebar.sections.${item.section}`, item.section);
            const shouldRenderSection = item.section !== lastSection;
            lastSection = item.section;

            let badge = null;
            if (item.path === "/fraccionamientos" && fracs.length) badge = fracs.length;
            if (item.path === "/clientes" && clients.length) badge = clients.length;
            if (item.path === "/pagos") badge = payments.filter((p) => p.status === "overdue").length;
            if (item.path === "/documentos" && documents.length) badge = documents.length;

            return (
              <div key={item.path}>
                {shouldRenderSection ? <div className="sb-sec">{section}</div> : null}
                <NavLink
                  to={item.path}
                  onClick={() => {
                    closeSidebar();
                    if (item.path === "/fraccionamientos") resetFracsView();
                    if (item.path === "/lotes") setDraftProject({ mode: "selector", name: "Nuevo Fraccionamiento", mapUrl: "", sections: [], cadProcessing: false });
                  }}
                  className={({ isActive }) => `sb-btn ${isActive ? "active" : ""}`}
                >
                  <span className="sb-ico"><Icon /></span>
                  <span>{label}</span>
                  {badge ? <span className={`sb-bdg ${item.path === "/pagos" ? "sb-bdg-red" : ""}`}>{badge}</span> : null}
                </NavLink>
              </div>
            );
          })}
        </div>
        <div className="sb-foot">
          <button onClick={handleLogout} className="sb-foot-item" style={{
            border: "none", background: "transparent", width: "100%", textAlign: "left",
            fontFamily: "inherit", cursor: "pointer",
          }}>
            <span className="sb-foot-ico"><HiArrowLeftOnRectangle /></span>
            <span>{t("nav.logout")}</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
