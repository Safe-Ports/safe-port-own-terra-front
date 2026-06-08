import { HiArrowLeftOnRectangle, HiBars3, HiCalendarDays, HiMagnifyingGlass, HiOutlineQuestionMarkCircle, HiSun } from "react-icons/hi2";
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

function Topbar({ pathname, onGuide }) {
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

        {onGuide && (
          <button
            type="button"
            className="topbar-core-link topbar-help"
            onClick={onGuide}
            aria-label="Abrir guías de esta sección"
            aria-haspopup="dialog"
            title="Abrir guías"
          >
            <HiOutlineQuestionMarkCircle aria-hidden="true" />
            <span>Guías</span>
          </button>
        )}

        <button className="topbar-core-link" onClick={() => navigate("/ecosistema/mi-dia")}>
          <HiSun />
          <span>Mi Día</span>
        </button>

        <button className="topbar-core-link" onClick={() => navigate("/ecosistema/agenda")}>
          <HiCalendarDays />
          <span>Calendario</span>
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
