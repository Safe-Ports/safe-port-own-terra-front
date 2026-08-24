import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/services/financeService";
import { CAT_LABEL, CAT_STYLE } from "@/services/expenseService";
import { useFinancePeriod } from "@/context/FinanceContext";
import { currency } from "@/services/formatters";
import CashPositionModal from "@/components/finance/CashPositionModal";
import FinanceToolbar from "@/components/finance/FinanceToolbar";

function fmtK(n) {
  if (!n && n !== 0) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

const ESTADO_LABEL = { paid: "Pagado", pending: "Pendiente", overdue: "Atrasado" };
const ESTADO_COLOR = { paid: "#2F6A38", pending: "#9D6B18", overdue: "#C0392B" };

function KpiCard({ label, value, valueColor, sub, onClick }) {
  return (
    <div className="ot-card ot-card-pad" onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <div className="fin-kpi-label">{label}</div>
      <div className="fin-kpi-value" style={valueColor ? { color: valueColor } : undefined}>{value}</div>
      <div className="fin-kpi-sub">{sub}</div>
    </div>
  );
}

/* Gráfica de barras — colores sólidos y contrastantes a propósito, nada de
   degradados que puedan distorsionar la lectura de los datos. */
function TrendBarChart({ labels, revenue, expenses }) {
  if (!labels?.length) return null;
  const max = Math.max(...revenue, ...expenses, 1);
  const H = 220;
  const W = 640;
  const padL = 6;
  const padB = 28;
  const groupW = (W - padL) / labels.length;
  const barW = Math.min(28, groupW * 0.32);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      <g stroke="rgba(67,69,63,.12)" strokeWidth="1">
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <line key={r} x1={padL} y1={H - padB - r * (H - padB - 14)} x2={W} y2={H - padB - r * (H - padB - 14)} />
        ))}
      </g>
      {labels.map((l, i) => {
        const cx = padL + i * groupW + groupW / 2;
        const revH = (revenue[i] / max) * (H - padB - 14);
        const expH = (expenses[i] / max) * (H - padB - 14);
        return (
          <g key={l}>
            <rect x={cx - barW - 2} y={H - padB - revH} width={barW} height={revH} rx="3" fill="#3B6EA5" />
            <rect x={cx + 2} y={H - padB - expH} width={barW} height={expH} rx="3" fill="#C0392B" />
            <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill="#83867C" fontFamily="Inter, system-ui, sans-serif">{l}</text>
          </g>
        );
      })}
    </svg>
  );
}

function FinanceDashboard() {
  const navigate = useNavigate();
  const { period } = useFinancePeriod();
  const [showCash, setShowCash] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ["finance-summary", period],
    queryFn: () => financeService.summary(period),
  });

  const { data: recentData } = useQuery({
    queryKey: ["finance-transactions", period, "preview"],
    queryFn: () => financeService.transactions({ period, page: 1, limit: 8 }),
  });
  const recent = recentData?.items ?? [];
  const net = summary?.net ?? 0;
  const cash = summary?.cash_position;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <FinanceToolbar />
      </div>

      <div className="fin-kpi-grid">
        <KpiCard label="Ingresos Totales" value={summary ? fmtK(summary.revenue) : "—"} sub="Todas las apps del ecosistema" />
        <KpiCard label="Gastos Totales" value={summary ? fmtK(summary.expenses_total) : "—"} sub={summary ? `${fmtK(summary.expenses_pending)} por pagar` : "—"} />
        <KpiCard
          label="Liquidez (Flujo de Caja)"
          value={summary ? fmtK(net) : "—"}
          valueColor={summary ? (net >= 0 ? "#2F6A38" : "#C0392B") : undefined}
          sub={summary?.margin != null ? `${(summary.margin * 100).toFixed(1)}% margen` : "Sin ingresos en el período"}
        />
        <KpiCard
          label="Saldo de Caja"
          value={cash ? fmtK(cash.balance) : "—"}
          valueColor={cash ? (cash.balance >= 0 ? "#2F6A38" : "#C0392B") : undefined}
          sub="Saldo real, arrastrado →"
          onClick={() => setShowCash(true)}
        />
        <KpiCard
          label="Cuentas por Cobrar"
          value={summary ? fmtK(summary.accounts_receivable) : "—"}
          valueColor={summary?.accounts_receivable > 0 ? "#9D6B18" : undefined}
          sub="Ver cartera →"
          onClick={() => navigate("/finanzas/cuentas-por-cobrar")}
        />
        <KpiCard
          label="Cuentas por Pagar"
          value={summary ? fmtK(summary.accounts_payable) : "—"}
          valueColor={summary?.accounts_payable > 0 ? "#9D6B18" : undefined}
          sub="Ver por pagar →"
          onClick={() => navigate("/finanzas/cuentas-por-pagar")}
        />
      </div>

      {showCash && <CashPositionModal cashPosition={cash} onClose={() => setShowCash(false)} />}

      <div className="fin-charts-grid">
        <div className="ot-card ot-card-pad">
          <div className="fin-card-head">
            <div>
              <div className="fin-card-title">Ingresos vs. Egresos</div>
              <div className="fin-card-sub">Tendencia del período</div>
            </div>
          </div>
          <div className="fin-legend">
            <div className="fin-legend-item"><span className="fin-legend-dot" style={{ background: "#3B6EA5" }} />Ingresos</div>
            <div className="fin-legend-item"><span className="fin-legend-dot" style={{ background: "#C0392B" }} />Egresos</div>
          </div>
          {(summary?.revenue_capital > 0 || summary?.revenue_interest > 0) && (
            <div className="fin-card-sub" style={{ marginBottom: 10 }}>
              De los ingresos: {currency(summary.revenue_capital)} capital · {currency(summary.revenue_interest)} interés
            </div>
          )}
          {summary?.chart_data ? (
            <TrendBarChart labels={summary.chart_data.labels} revenue={summary.chart_data.revenue} expenses={summary.chart_data.expenses} />
          ) : (
            <div className="fin-empty">Cargando datos…</div>
          )}
        </div>

        <div className="ot-card ot-card-pad">
          <div className="fin-card-head">
            <div>
              <div className="fin-card-title">Egresos por categoría</div>
              <div className="fin-card-sub">Período seleccionado</div>
            </div>
          </div>
          {summary ? (
            summary.expenses_by_category.length ? (
              summary.expenses_by_category.map((c) => (
                <div key={c.categoria} className="fin-row">
                  <span className="fin-tag" style={{ background: CAT_STYLE[c.categoria]?.bg, color: CAT_STYLE[c.categoria]?.color }}>
                    {CAT_LABEL[c.categoria] || c.categoria}
                  </span>
                  <div className="fin-row-info" />
                  <span className="fin-row-amount">{fmtK(c.monto)}</span>
                </div>
              ))
            ) : (
              <div className="fin-empty">Sin egresos pagados en el período.</div>
            )
          ) : (
            <div className="fin-empty">Cargando…</div>
          )}
        </div>
      </div>

      <div className="ot-card ot-card-pad">
        <div className="fin-card-head">
          <div>
            <div className="fin-card-title">Transacciones recientes</div>
            <div className="fin-card-sub">Últimos movimientos del período</div>
          </div>
          <span className="fin-link" onClick={() => navigate("/finanzas/transacciones")}>Ver todas →</span>
        </div>
        {recent.length ? recent.map((t) => (
          <div key={t.id} className="fin-row">
            <span className="fin-row-ico" style={{ background: t.tipo === "ingreso" ? "#e8f7ee" : "#FDECEA" }}>
              {t.tipo === "ingreso" ? "💰" : "💸"}
            </span>
            <div className="fin-row-info">
              <div className="fin-row-name">{t.concepto}</div>
              <div className="fin-row-meta">{CAT_LABEL[t.categoria] || t.categoria} · {new Date(t.date).toLocaleDateString("es-MX")}</div>
            </div>
            <span className="fin-tag" style={{ color: ESTADO_COLOR[t.estado], background: "transparent" }}>{ESTADO_LABEL[t.estado] || t.estado}</span>
            <span className="fin-row-amount" style={{ color: t.tipo === "ingreso" ? "#2F6A38" : "#C0392B" }}>
              {t.tipo === "ingreso" ? "+" : "−"}{fmtK(t.monto)}
            </span>
          </div>
        )) : (
          <div className="fin-empty">Sin movimientos en este período.</div>
        )}
      </div>
    </div>
  );
}

export default FinanceDashboard;
