import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HiPlus } from "react-icons/hi2";
import Button from "@/components/Button";
import { financeService } from "@/services/financeService";
import { useFinancePeriod } from "@/context/FinanceContext";
import NuevoMovimientoModal from "@/components/finance/NuevoMovimientoModal";

function fmt(n) {
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function FinanceNomina() {
  const { period } = useFinancePeriod();
  const [modalEmployee, setModalEmployee] = useState(null); // null | {id, name} | "new"

  const { data: summary, isLoading } = useQuery({
    queryKey: ["finance-summary", period],
    queryFn: () => financeService.summary(period),
  });
  const payroll = (summary?.expenses_by_payee ?? []).filter((p) => p.type === "employee");
  const total = payroll.reduce((s, p) => s + p.monto, 0);

  return (
    <div>
      <div className="ot-page-head">
        <div className="ot-page-heading">
          <h1 className="ot-page-title">Nómina</h1>
          <p className="ot-page-sub">Pagos a colaboradores en el período — {fmt(total)} pagado.</p>
        </div>
        <div className="ot-head-actions">
          <Button variant="primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setModalEmployee("new")}>
            <HiPlus /> Registrar pago
          </Button>
        </div>
      </div>

      <div className="ot-card ot-card-pad">
        {isLoading && <div className="fin-empty">Cargando…</div>}
        {!isLoading && payroll.length === 0 && (
          <div className="fin-empty">Sin pagos de nómina vinculados a un colaborador en este período.</div>
        )}
        {!isLoading && payroll.map((p) => (
          <div key={p.id} className="fin-row">
            <span className="fin-row-ico" style={{ background: "#e8f7ee" }}>🧑</span>
            <div className="fin-row-info">
              <div className="fin-row-name">{p.name}</div>
              <div className="fin-row-meta">Personal</div>
            </div>
            <span className="fin-row-amount">{fmt(p.monto)}</span>
            <Button variant="secondary" style={{ marginLeft: 12 }} onClick={() => setModalEmployee({ id: p.id, name: p.name })}>
              Registrar pago
            </Button>
          </div>
        ))}
      </div>

      {modalEmployee && (
        <NuevoMovimientoModal
          onClose={() => setModalEmployee(null)}
          initialCategoria="nomina"
          initialEmployeeId={modalEmployee === "new" ? "" : modalEmployee.id}
        />
      )}
    </div>
  );
}

export default FinanceNomina;
