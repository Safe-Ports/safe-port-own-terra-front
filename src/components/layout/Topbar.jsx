import { HiArrowLeftOnRectangle, HiBars3, HiBell, HiMagnifyingGlass } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";

const titleMap = {
  "/dashboard": "Dashboard",
  "/lotes": "Carga de Lotes",
  "/fraccionamientos": "Fraccionamientos",
  "/clientes": "Clientes & CRM",
  "/ventas": "Contratos",
  "/contratos": "Contratos",
  "/documentos": "Gestión Documental",
  "/pagos": "Control de Pagos",
  "/calculadora": "Calculadora de Amortización",
  "/alertas": "Alertas",
  "/perfil": "Perfil",
  "/configuracion": "Configuración",
};

const subtitleMap = {
  "/dashboard": "OwnTerra Lands · Resumen comercial",
  "/lotes": "OwnTerra Lands · Inventario territorial",
  "/fraccionamientos": "OwnTerra Lands · Fraccionamiento activo",
  "/clientes": "OwnTerra Lands · CRM conectado al core",
  "/ventas": "OwnTerra Lands · Contratos y cierres",
  "/contratos": "OwnTerra Lands · Contratos y cierres",
  "/documentos": "OwnTerra Vault · Documentos de operación",
  "/pagos": "OwnTerra Lands · Cobranza y cartera",
  "/calculadora": "OwnTerra Lands · Cotizador comercial",
  "/alertas": "OwnTerra Core · Seguimiento operativo",
  "/perfil": "Cuenta y preferencias",
  "/configuracion": "Configuración del espacio Lands",
};

function Topbar({ pathname }) {
  const navigate = useNavigate();
  const {
    openModal,
    toggleSidebar,
    currentUser,
    showToast,
    startNewProject,
    draftProject,
    saveFrac,
    openContractCreate,
    notificationCount,
    markAllNotificationsRead,
    logout,
  } = useAppContext();
  const draftLotCount = draftProject.sections.reduce((sum, section) => sum + section.lots.length, 0);
  const handleLogout = () => {
    if (window.confirm("¿Cerrar sesión?")) logout();
  };

  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <button className="mobile-menu-btn" onClick={toggleSidebar} aria-label="Abrir menú">
          <HiBars3 />
        </button>
        <div className="topbar-heading">
          <div className="topbar-title">{titleMap[pathname] || "OwnTerra Lands"}</div>
          <div className="topbar-sub">{subtitleMap[pathname] || "Lotificación y venta de terrenos"}</div>
        </div>
      </div>
      <div className="topbar-r">
        <button className="tb-src" onClick={() => openModal("globalSearch")}>
          <span style={{ color: "var(--mu)" }}>
            <HiMagnifyingGlass />
          </span>
          <span className="flex-1 text-left">Buscar en todo el sistema...</span>
          <span className="tb-shortcut">⌘K</span>
        </button>

        <button
          title="Notificaciones"
          onClick={() => { markAllNotificationsRead(); navigate("/alertas"); }}
          style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, border: "1px solid var(--bd)", background: "var(--sf2)", color: "var(--tx2)", cursor: "pointer" }}
        >
          <HiBell />
          {notificationCount > 0 && (
            <span style={{ position: "absolute", top: -4, right: -4, background: "var(--danger)", color: "#fff", fontSize: "0.55rem", fontWeight: 800, borderRadius: 999, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </button>

        <div className="topbar-user">
          <div className="topbar-role">{currentUser?.role || "Usuario"}</div>
          <div className="topbar-name">{currentUser?.name || "Perfil"}</div>
        </div>

        <button className="topbar-logout" onClick={handleLogout} title="Cerrar sesión">
          <HiArrowLeftOnRectangle />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
}

export default Topbar;
