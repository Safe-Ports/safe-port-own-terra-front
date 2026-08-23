import { createContext, useContext } from "react";

/* Selector de período global de la app de Finanzas — vive en el shell
   (FinanceShell) para que las 5 páginas lo compartan sin duplicar estado. */
export const FinanceContext = createContext({ period: "month", setPeriod: () => {} });

export function useFinancePeriod() {
  return useContext(FinanceContext);
}
