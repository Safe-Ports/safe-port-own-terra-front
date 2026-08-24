import { useQuery } from "@tanstack/react-query";
import { paymentService } from "@/services/paymentService";

/* Lo que "Mi Día" le debe a OwnTerra Lands (cobranza de lotes) vive aquí, no
   en Dia.jsx: Mi Día es transversal — la usa cualquier rol de cualquier app —
   así que solo debe conocer generalidades (agenda, tareas, notificaciones).
   Cada vertical aporta sus propias tarjetas, y Dia.jsx las monta solo si el
   usuario tiene acceso a esa app (canAccessApp). Cuando Construction/Properties
   tengan su propio "Mi Día", siguen este mismo patrón: un archivo aparte bajo
   verticals/, nunca mezclado en el componente compartido. */

export function useLandsOverdue(enabled) {
  const { data } = useQuery({
    queryKey: ["payments-overdue"],
    queryFn: () => paymentService.overdue(),
    enabled,
  });
  const overdueItems = enabled ? data?.items ?? [] : [];
  const totalOverdue = overdueItems.reduce((s, o) => s + Number(o.amount || 0), 0);
  return { overdueItems, totalOverdue };
}

export function LandsOverdueKpi({ overdueItems, totalOverdue, onReview }) {
  return (
    <div className="md-kpi danger">
      {overdueItems.length > 0 && <span className="md-kpi-badge">Urgente</span>}
      <span className="md-kpi-ico">⚠️</span>
      <div className="md-kpi-body">
        <div className="md-kpi-label">Pagos vencidos</div>
        <div className="md-kpi-val">{overdueItems.length}</div>
        <div className="md-kpi-sub">${totalOverdue.toLocaleString("en-US", { minimumFractionDigits: 0 })} por cobrar</div>
        <button className="md-kpi-cta" onClick={onReview}>Revisar ahora</button>
      </div>
    </div>
  );
}

export function LandsOverdueCard({ overdueItems, onSeeAll }) {
  return (
    <div className="md-card">
      <div className="md-card-head">
        <div className="md-card-title">Pagos vencidos</div>
        <button className="sh-link" onClick={onSeeAll}>Ver cobranza →</button>
      </div>
      {overdueItems.slice(0, 4).map((o) => (
        <div key={o.id} className="md-row">
          <span className="md-row-ico" style={{ background: "#FDECEA" }}>💳</span>
          <div className="md-row-info">
            <div className="md-row-name">{o.client?.name || "—"}</div>
            <div className="md-row-meta">
              {o.lot?.code ? `${o.lot.code} · ` : ""}Pago {o.installment_n}
            </div>
          </div>
          <span className="md-late">{o.days_late} días</span>
          <span className="md-amount">${Number(o.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
        </div>
      ))}
      {overdueItems.length === 0 && (
        <div style={{ padding: "16px 0", color: "var(--text3)", fontSize: 13 }}>Sin pagos vencidos. 🎉</div>
      )}
    </div>
  );
}
