import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/services/financeService";
import { CAT_LABEL } from "@/services/expenseService";
import { useFinancePeriod } from "@/context/FinanceContext";
import FinanceToolbar from "@/components/finance/FinanceToolbar";

function fmt(n) {
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

const ESTADO_LABEL = { paid: "Pagado", pending: "Pendiente", overdue: "Atrasado" };
const ESTADO_STYLE = {
  paid: { bg: "#e8f7ee", color: "#116b39" },
  pending: { bg: "#fef3e2", color: "#9d6b18" },
  overdue: { bg: "#fdecea", color: "#c0392b" },
};

function FinanceTransacciones() {
  const { period } = useFinancePeriod();
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["finance-transactions", period, page, limit],
    queryFn: () => financeService.transactions({ period, page, limit }),
  });
  const items = data?.items ?? [];

  return (
    <div>
      <div className="ot-page-head">
        <div className="ot-page-heading">
          <h1 className="ot-page-title">Transacciones</h1>
          <p className="ot-page-sub">Ingresos y egresos combinados, ordenados por fecha.</p>
        </div>
        <div className="ot-head-actions">
          <FinanceToolbar />
        </div>
      </div>

      <div className="ot-card">
        <div style={{ overflowX: "auto" }}>
          <table className="fin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Categoría</th>
                <th>Monto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={5} className="fin-empty">Cargando…</td></tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr><td colSpan={5} className="fin-empty">Sin transacciones en este período.</td></tr>
              )}
              {!isLoading && items.map((t) => (
                <tr key={t.id}>
                  <td>{new Date(t.date).toLocaleDateString("es-MX")}</td>
                  <td>{t.concepto}</td>
                  <td>{CAT_LABEL[t.categoria] || t.categoria}</td>
                  <td style={{ fontWeight: 700, color: t.tipo === "ingreso" ? "#2F6A38" : "#C0392B" }}>
                    {t.tipo === "ingreso" ? "+" : "−"}{fmt(t.monto)}
                  </td>
                  <td>
                    <span className="fin-tag" style={{ background: ESTADO_STYLE[t.estado]?.bg, color: ESTADO_STYLE[t.estado]?.color }}>
                      {ESTADO_LABEL[t.estado] || t.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "0 16px 16px" }}>
          <div className="fin-pager">
            <span style={{ fontSize: ".78rem", color: "var(--mu)", marginRight: "auto" }}>
              {data ? `${data.total} transacciones · página ${data.page} de ${Math.max(data.pages, 1)}` : ""}
            </span>
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
            <button disabled={!data || page >= data.pages} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinanceTransacciones;
