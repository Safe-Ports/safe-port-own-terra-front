import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HiOutlineDocumentArrowDown } from "react-icons/hi2";
import Button from "@/components/Button";
import { financeService } from "@/services/financeService";
import { CAT_LABEL } from "@/services/expenseService";
import { useFinancePeriod } from "@/context/FinanceContext";
import { useAppContext } from "@/context/AppContext";
import { currency } from "@/services/formatters";
import FinanceToolbar from "@/components/finance/FinanceToolbar";

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

function BudgetRow({ item, periodMonth, canEdit }) {
  const qc = useQueryClient();
  const { showToast, showError } = useAppContext();
  const [value, setValue] = useState(String(item.budgeted));

  const save = useMutation({
    mutationFn: (monto) => financeService.upsertBudget({ period_month: periodMonth, categoria: item.categoria, monto }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-budgets", periodMonth] });
      showToast("Presupuesto guardado");
    },
    onError: (err) => showError(err, "Error al guardar el presupuesto"),
  });

  const variacion = item.budgeted > 0 ? ((item.actual - item.budgeted) / item.budgeted) * 100 : null;

  return (
    <tr>
      <td>{CAT_LABEL[item.categoria] || item.categoria}</td>
      <td>
        {canEdit ? (
          <input
            className="fin-budget-input"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => { const n = Number(value) || 0; if (n !== item.budgeted) save.mutate(n); }}
          />
        ) : currency(item.budgeted)}
      </td>
      <td>{currency(item.actual)}</td>
      <td style={{ color: variacion == null ? "var(--mu)" : variacion > 0 ? "var(--danger, #C0392B)" : "#2F6A38", fontWeight: 700 }}>
        {variacion == null ? "—" : `${variacion > 0 ? "+" : ""}${variacion.toFixed(0)}%`}
      </td>
    </tr>
  );
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function FinanceReportes() {
  const { period } = useFinancePeriod();
  const { showError, showToast, canUseFeature } = useAppContext();
  const [busy, setBusy] = useState(null); // "csv" | "xlsx" | null
  const periodMonth = monthStart();
  const canEditBudget = canUseFeature("finanzas.write");

  const { data: budgets } = useQuery({
    queryKey: ["finance-budgets", periodMonth],
    queryFn: () => financeService.budgets(periodMonth),
  });

  const handleExport = async (format) => {
    setBusy(format);
    try {
      const blob = await financeService.exportTransactions({ period, format });
      downloadBlob(blob, `transacciones.${format}`);
      showToast("Reporte descargado");
    } catch (err) {
      showError(err, "Error al exportar el reporte");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="ot-page-head">
        <div className="ot-page-heading">
          <h1 className="ot-page-title">Reportes</h1>
          <p className="ot-page-sub">Exporta las transacciones del período seleccionado.</p>
        </div>
        <div className="ot-head-actions">
          <FinanceToolbar />
        </div>
      </div>

      <div className="ot-card ot-card-pad" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
        <div>
          <div className="fin-card-title">Transacciones (Ingresos + Egresos)</div>
          <div className="fin-card-sub">Fecha, concepto, categoría, tipo, monto y estado de cada movimiento del período.</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }} disabled={busy === "csv"} onClick={() => handleExport("csv")}>
            <HiOutlineDocumentArrowDown /> {busy === "csv" ? "Exportando..." : "Exportar CSV"}
          </Button>
          <Button variant="secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }} disabled={busy === "xlsx"} onClick={() => handleExport("xlsx")}>
            <HiOutlineDocumentArrowDown /> {busy === "xlsx" ? "Exportando..." : "Exportar Excel"}
          </Button>
        </div>
      </div>

      <div className="ot-card ot-card-pad" style={{ marginTop: 16, maxWidth: 640 }}>
        <div className="fin-card-title">Presupuesto vs. Real (mes actual)</div>
        <div className="fin-card-sub" style={{ marginBottom: 12 }}>
          {canEditBudget ? "Da clic en un monto presupuestado para editarlo." : "Solo un admin puede editar el presupuesto."}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="fin-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Presupuestado</th>
                <th>Real</th>
                <th>Variación</th>
              </tr>
            </thead>
            <tbody>
              {!budgets && <tr><td colSpan={4} className="fin-empty">Cargando…</td></tr>}
              {budgets?.map((item) => (
                <BudgetRow key={item.categoria} item={item} periodMonth={periodMonth} canEdit={canEditBudget} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default FinanceReportes;
