import { useState } from "react";
import { HiPlus } from "react-icons/hi2";
import { useFinancePeriod } from "@/context/FinanceContext";
import NuevoMovimientoModal from "@/components/finance/NuevoMovimientoModal";
import Button from "@/components/Button";

const PERIOD_LABEL = { month: "Este mes", quarter: "Este trimestre", year: "Año a la fecha" };

/* Selector de período + "Nuevo Movimiento" — vive dentro del contenido de
   cada página (junto al título), no en la barra superior fija de la app. */
function FinanceToolbar() {
  const { period, setPeriod } = useFinancePeriod();
  const [showNuevo, setShowNuevo] = useState(false);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 2, background: "var(--bg2)", border: "1px solid var(--bd)", borderRadius: 9, padding: 3 }}>
        {["month", "quarter", "year"].map((p) => (
          <span
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: "6px 12px", borderRadius: 7, fontSize: ".78rem", fontWeight: 600,
              cursor: "pointer", whiteSpace: "nowrap",
              background: period === p ? "var(--forest)" : "transparent",
              color: period === p ? "#fff" : "var(--tx2)",
            }}
          >
            {PERIOD_LABEL[p]}
          </span>
        ))}
      </div>
      <Button variant="primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }} onClick={() => setShowNuevo(true)}>
        <HiPlus /> Nuevo Movimiento
      </Button>
      {showNuevo && <NuevoMovimientoModal onClose={() => setShowNuevo(false)} />}
    </div>
  );
}

export default FinanceToolbar;
