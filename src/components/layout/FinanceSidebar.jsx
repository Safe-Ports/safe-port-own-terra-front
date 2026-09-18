import { NavLink } from "react-router-dom";
import {
  HiArrowLeftOnRectangle,
  HiArrowTrendingUp,
  HiBanknotes,
  HiCreditCard,
  HiDocumentChartBar,
  HiOutlineSquares2X2,
  HiRectangleGroup,
  HiUserGroup,
} from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import useEscapeKey from "@/hooks/useEscapeKey";

const items = [
  { label: "Dashboard", to: "/finanzas", icon: HiOutlineSquares2X2 },
  { label: "Transacciones", to: "/finanzas/transacciones", icon: HiArrowTrendingUp },
  { label: "Cuentas por Cobrar", to: "/finanzas/cuentas-por-cobrar", icon: HiBanknotes },
  { label: "Cuentas por Pagar", to: "/finanzas/cuentas-por-pagar", icon: HiCreditCard },
  { label: "Nómina", to: "/finanzas/nomina", icon: HiUserGroup, soon: true },
  { label: "Reportes", to: "/finanzas/reportes", icon: HiDocumentChartBar },
];

function Logo() {
  return (
    <div className="sb-logo">
      <div className="sb-logo-mark">
        <img src="/icons/app-finanzas.png" alt="" />
      </div>
    </div>
  );
}

function FinanceSidebar() {
  const { ui, closeSidebar, logout, currentUser, showToast } = useAppContext();
  useEscapeKey(closeSidebar, ui.sidebarOpen);

  const handleLogout = () => {
    if (window.confirm("¿Cerrar sesión?")) logout();
  };

  return (
    <>
      <div className={`sidebar-backdrop ${ui.sidebarOpen ? "show" : ""}`} onClick={closeSidebar} />
      <aside className={`sb app-sidebar ${ui.sidebarOpen ? "open" : ""}`}>
        <Logo />
        <div className="sb-nav">
          <div className="sb-sec">General</div>
          <NavLink to="/ecosistema" onClick={closeSidebar} className={({ isActive }) => `sb-btn ${isActive ? "active" : ""}`}>
            <span className="sb-ico"><HiRectangleGroup /></span>
            <span>Ecosistema</span>
          </NavLink>
          <div className="sb-sec">Finanzas</div>
          {items.map((item) => {
            const Icon = item.icon;
            if (item.soon) {
              return (
                <button
                  key={item.to}
                  type="button"
                  className="sb-btn"
                  onClick={() => showToast(`${item.label} — próximamente`, "info")}
                  style={{ opacity: 0.45, cursor: "default" }}
                  title="Próximamente"
                >
                  <span className="sb-ico"><Icon /></span>
                  <span>{item.label}</span>
                  <span className="sb-bdg">Próx.</span>
                </button>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/finanzas"}
                onClick={closeSidebar}
                className={({ isActive }) => `sb-btn ${isActive ? "active" : ""}`}
              >
                <span className="sb-ico"><Icon /></span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
        <div className="sb-foot">
          {/* Al del Core, no al de Lands: el perfil es transversal y desde acá
              Lands es otra vertical, no la casa común (ver CoreTopbarActions). */}
          <NavLink to="/ecosistema/perfil" onClick={closeSidebar} className="sb-foot-item" style={{ textDecoration: "none" }}>
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

export default FinanceSidebar;
