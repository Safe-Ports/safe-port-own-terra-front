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
        <div className="topbar-title">{titleMap[pathname] || "LoteManager"}</div>
      </div>
      <div className="topbar-r">
        <button className="tb-src" onClick={() => openModal("globalSearch")}>
          <span style={{ color: "var(--mu)" }}>
            <HiMagnifyingGlass />
          </span>
          <span className="flex-1 text-left">Buscar en todo el sistema...</span>
          <span className="tb-shortcut">⌘K</span>
        </button>

        {pathname === "/lotes" ? (
          <>
            <span id="lotCnt" className="lot-count-chip">{draftLotCount} lotes</span>
            <button className="tb-btn tb-s" onClick={() => showToast("Usa 'Cargar demo', 'Nuevo proyecto' o agrega secciones para construir la matriz.")}>
              Ayuda
            </button>
            <button className="tb-btn tb-s" onClick={startNewProject}>
              Nuevo plano
            </button>
            <button className="tb-btn tb-p" onClick={() => saveFrac(draftProject)}>
              Crear fraccionamiento
            </button>
          </>
        ) : null}

        {pathname === "/clientes" ? (
          <button className="tb-btn tb-s" onClick={() => openModal("clientModal")}>
            + Nuevo Cliente
          </button>
        ) : null}

        {pathname === "/ventas" || pathname === "/contratos" ? (
          <button className="tb-btn tb-p" onClick={() => openContractCreate()}>
            + Generar Contrato
          </button>
        ) : null}

        {pathname === "/pagos" ? (
          <button className="tb-btn tb-p" onClick={() => openModal("paymentModal")}>
            + Registrar Pago
          </button>
        ) : null}

        {pathname === "/documentos" ? (
          <button className="tb-btn tb-p" onClick={() => openModal("documentModal")}>
            ⬆ Subir Documento
          </button>
        ) : null}

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

        <div className="hidden rounded-xl border border-line bg-[#F1EEE6] px-3 py-2 md:block">
          <div className="text-[0.62rem] uppercase tracking-[0.2em] text-[#83867C]">{currentUser?.role}</div>
          <div className="text-sm font-semibold text-[#1E3D2B]">{currentUser?.name}</div>
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
