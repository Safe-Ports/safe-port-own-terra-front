import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expenseService, CAT_LABEL } from "@/services/expenseService";
import { financeService } from "@/services/financeService";
import { currency } from "@/services/formatters";
import { useFinancePeriod } from "@/context/FinanceContext";
import { useAppContext } from "@/context/AppContext";

const fmtD = (iso) => (!iso ? "—" : new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }));
const ESTADO_LABEL = { ok: "Al día", soon: "Próximo", late: "Atrasado" };

function estadoFor(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((new Date(`${dueDate}T12:00:00`) - today) / 86400000);
  if (days < 0) return "late";
  if (days <= 5) return "soon";
  return "ok";
}

function FinanceCuentasPorPagar() {
  const { period } = useFinancePeriod();
  const { showToast, showError } = useAppContext();
  const qc = useQueryClient();

  const { data: summary } = useQuery({
    queryKey: ["finance-summary", period],
    queryFn: () => financeService.summary(period),
  });

  const { data: pendingData, isLoading: loadingPending } = useQuery({
    queryKey: ["expenses", "pending", "payables"],
    queryFn: () => expenseService.list({ status: "pending", limit: 200 }),
  });
  const { data: overdueData, isLoading: loadingOverdue } = useQuery({
    queryKey: ["expenses", "overdue", "payables"],
    queryFn: () => expenseService.list({ status: "overdue", limit: 200 }),
  });
  const isLoading = loadingPending || loadingOverdue;

  const markPaid = useMutation({
    mutationFn: (id) => expenseService.markPaid(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      showToast("Pago registrado");
    },
    onError: (err) => showError(err, "Error al registrar el pago"),
  });

  const rows = useMemo(() => {
    const items = [...(pendingData?.items ?? []), ...(overdueData?.items ?? [])];
    const byPayee = {};
    for (const e of items) {
      const key = e.employee_id ? `employee:${e.employee_id}` : e.provider_id ? `provider:${e.provider_id}` : "sin-asignar";
      const name = e.employee_name || e.provider_name || "Sin asignar";
      (byPayee[key] ||= { key, name, items: [] }).items.push(e);
    }
    return Object.values(byPayee)
      .map((g) => {
        const sorted = g.items.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        const oldest = sorted[0];
        const total = g.items.reduce((s, e) => s + Number(e.monto || 0), 0);
        const categorias = [...new Set(g.items.map((e) => CAT_LABEL[e.categoria] || e.categoria))];
        return {
          key: g.key,
          name: g.name,
          categorias: categorias.join(", "),
          venc: oldest.due_date,
          total,
          estado: estadoFor(oldest.due_date),
          oldestId: oldest.id,
        };
      })
      .sort((a, b) => new Date(a.venc) - new Date(b.venc));
  }, [pendingData, overdueData]);

  return (
    <div>
      <div className="ot-page-head">
        <div className="ot-page-heading">
          <h1 className="ot-page-title">Cuentas por Pagar</h1>
          <p className="ot-page-sub">
            Nómina, proveedores y servicios pendientes de pago — {summary ? currency(summary.accounts_payable) : "…"} por pagar.
          </p>
        </div>
      </div>

      <div className="ot-card">
        <div style={{ overflowX: "auto" }}>
          <table className="fin-table">
            <thead>
              <tr>
                <th>Colaborador / Proveedor</th>
                <th>Categoría</th>
                <th>Vencimiento más antiguo</th>
                <th>Monto</th>
                <th>Estado</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="fin-empty">Cargando…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={6} className="fin-empty">Sin cuentas por pagar. 🎉</td></tr>
              )}
              {!isLoading && rows.map((r) => (
                <tr key={r.key}>
                  <td className="fin-cli">{r.name}</td>
                  <td className="fin-prop">{r.categorias}</td>
                  <td className={`fin-venc ${r.estado === "late" ? "late" : ""}`}>{fmtD(r.venc)}</td>
                  <td className="fin-amt">{currency(r.total)}</td>
                  <td><span className={`fin-badge ${r.estado}`}>{ESTADO_LABEL[r.estado]}</span></td>
                  <td>
                    <div className="fin-acts">
                      <button
                        className="fin-ico pay"
                        title="Marcar pagado (más antiguo)"
                        disabled={markPaid.isPending}
                        onClick={() => markPaid.mutate(r.oldestId)}
                      >
                        ＄
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default FinanceCuentasPorPagar;
