import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import FinanceSidebar from "@/components/layout/FinanceSidebar";
import FinanceTopbar from "@/components/layout/FinanceTopbar";
import Toast from "@/components/shared/Toast";
import { FinanceContext } from "@/context/FinanceContext";
import "@/styles/finance.css";

/* Shell propio de Finanzas — no reutiliza el AppShell de Lands (ese está
   hardcodeado a sus rutas/modales), mismo criterio que ya usa Construct. */
function FinanceShell() {
  const location = useLocation();
  const [period, setPeriod] = useState("month");

  return (
    <FinanceContext.Provider value={{ period, setPeriod }}>
      <div className="app-shell finance-shell">
        <FinanceSidebar />
        <div className="main">
          <FinanceTopbar pathname={location.pathname} />
          <div className="content">
            <div className="view active">
              <div className="view-scroll">
                <Outlet />
              </div>
            </div>
          </div>
        </div>
        <Toast />
      </div>
    </FinanceContext.Provider>
  );
}

export default FinanceShell;
