import { HiBars3, HiMagnifyingGlass } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";

const titleMap = {
  "/mi-dia": "Mi Día",
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
  "/perfil": "Perfil"
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
    openContractCreate
  } = useAppContext();
  const draftLotCount = draftProject.sections.reduce((sum, section) => sum + section.lots.length, 0);

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
              ❓ Ayuda
            </button>
            <button className="tb-btn tb-s" onClick={startNewProject}>
              🗂 Nuevo Plano
            </button>
            <button className="tb-btn tb-p" onClick={() => saveFrac(draftProject)}>
              🏘️ Crear Fraccionamiento
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

        <div className="hidden rounded-xl border border-line bg-[#f0ede5] px-3 py-2 md:block">
          <div className="text-[0.62rem] uppercase tracking-[0.2em] text-[#8C8070]">{currentUser?.role}</div>
          <div className="text-sm font-semibold text-[#1A1410]">{currentUser?.name}</div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
