import { HiBars3 } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import CoreTopbarActions from "./CoreTopbarActions";

const titleMap = {
  "/finanzas": "Dashboard",
  "/finanzas/transacciones": "Transacciones",
  "/finanzas/cuentas-por-cobrar": "Cuentas por Cobrar",
  "/finanzas/cuentas-por-pagar": "Cuentas por Pagar",
  "/finanzas/nomina": "Nómina",
  "/finanzas/reportes": "Reportes",
};

function FinanceTopbar({ pathname }) {
  const { toggleSidebar } = useAppContext();

  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <button className="mobile-menu-btn" onClick={toggleSidebar} aria-label="Abrir menú">
          <HiBars3 />
        </button>
        <div className="topbar-heading">
          <div className="topbar-title">{titleMap[pathname] || "Finanzas"}</div>
          <div className="topbar-sub">Ingresos y egresos de todo el ecosistema</div>
        </div>
      </div>
      <div className="topbar-r">
        <CoreTopbarActions />
      </div>
    </header>
  );
}

export default FinanceTopbar;
