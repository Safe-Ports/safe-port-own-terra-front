import { HiBars3, HiMagnifyingGlass } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import CoreTopbarActions from "./CoreTopbarActions";

const titleMap = {
  "/dashboard": "Dashboard",
  "/lotes": "Carga de Lotes",
  "/fraccionamientos": "Fraccionamientos",
  "/track-lotes": "Track de Lotes",
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
  const { openModal, toggleSidebar } = useAppContext();

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

        <CoreTopbarActions onGuide={onGuide} />
      </div>
    </header>
  );
}

export default Topbar;
