import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportService } from "@/services/reportService";
import { currency, compactCurrency } from "@/services/formatters";

/* ── helpers ─────────────────────────────────────────────────── */
const today = () => new Date().toISOString().split("T")[0];
const yearStart = () => `${new Date().getFullYear()}-01-01`;

function pct(n) {
  if (n == null) return "—";
  return `${(Number(n) * 100).toFixed(1)}%`;
}

function KpiCard({ label, value, sub, danger }) {
  return (
    <div className="card" style={{
      flex: 1, minWidth: 160, padding: "18px 20px",
      borderLeft: danger ? "3px solid var(--danger, #c0392b)" : undefined,
    }}>
      <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--mu)", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "1.4rem", fontWeight: 700, color: danger ? "var(--danger)" : "var(--deep)" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: ".75rem", color: "var(--mu)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function EmptyReport() {
  return (
    <div style={{ padding: "48px 0", textAlign: "center", color: "var(--mu)", fontSize: 13 }}>
      Sin datos para los filtros seleccionados.
    </div>
  );
}

/* ══ TAB: VENTAS ══════════════════════════════════════════════ */
function TabVentas() {
  const [from, setFrom] = useState(yearStart());
  const [to, setTo] = useState(today());
  const [groupBy, setGroupBy] = useState("month");
  const [downloading, setDownloading] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["report-sales", from, to, groupBy],
    queryFn: () => reportService.sales({ from, to, group_by: groupBy }),
    enabled: !!from && !!to,
  });

  const handleDownload = async (format) => {
    setDownloading(format);
    try {
      const blob = await reportService.downloadSales({ from, to, group_by: groupBy, format });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_ventas.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  const totals = data?.totals;
  const groups = data?.groups ?? [];

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 20 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: ".78rem", fontWeight: 600, color: "var(--mu)" }}>
          Desde
          <input type="date" className="fi" style={{ width: 150 }} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: ".78rem", fontWeight: 600, color: "var(--mu)" }}>
          Hasta
          <input type="date" className="fi" style={{ width: 150 }} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: ".78rem", fontWeight: 600, color: "var(--mu)" }}>
          Agrupar por
          <select className="fi" style={{ width: 180 }} value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="month">Mes</option>
            <option value="week">Semana</option>
            <option value="seller">Vendedor</option>
            <option value="fraccionamiento">Fraccionamiento</option>
          </select>
        </label>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn-s" onClick={() => handleDownload("csv")} disabled={!!downloading}>
            {downloading === "csv" ? "Descargando…" : "↓ CSV"}
          </button>
          <button className="btn-s" onClick={() => handleDownload("xlsx")} disabled={!!downloading}>
            {downloading === "xlsx" ? "Descargando…" : "↓ Excel"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiCard label="Ventas" value={isLoading ? "—" : (totals?.sales_count ?? "—")} sub="Contratos cerrados" />
        <KpiCard label="Ingresos" value={isLoading ? "—" : compactCurrency(totals?.revenue ?? 0)} sub="Monto total" />
        <KpiCard label="Ticket promedio" value={isLoading ? "—" : compactCurrency(totals?.average_ticket ?? 0)} sub="Por contrato" />
        <KpiCard label="Comisiones" value={isLoading ? "—" : compactCurrency(totals?.commissions ?? 0)} sub="Total del periodo" />
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: "var(--mu)", fontSize: 13 }}>Cargando…</div>
      ) : groups.length === 0 ? <EmptyReport /> : (
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Grupo</th>
                <th style={{ textAlign: "right" }}>Ventas</th>
                <th style={{ textAlign: "right" }}>Ingresos</th>
                <th style={{ textAlign: "right" }}>Comisiones</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.label}>
                  <td>{g.label}</td>
                  <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>{g.sales_count}</td>
                  <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>{currency(g.revenue)}</td>
                  <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>{currency(g.commissions)}</td>
                </tr>
              ))}
            </tbody>
            {groups.length > 1 && totals && (
              <tfoot>
                <tr style={{ fontWeight: 700 }}>
                  <td>Total</td>
                  <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>{totals.sales_count}</td>
                  <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>{currency(totals.revenue)}</td>
                  <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>{currency(totals.commissions)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

/* ══ TAB: COBRANZA ════════════════════════════════════════════ */
function TabCobranza() {
  const [period, setPeriod] = useState("month");
  const periodLabel = { month: "Este mes", quarter: "Este trimestre", year: "Este año" };

  const { data, isLoading } = useQuery({
    queryKey: ["report-collection", period],
    queryFn: () => reportService.collection({ period }),
  });

  const ageBuckets = [
    { key: "1_7_days",    label: "1–7 días",   color: "#F5A623" },
    { key: "8_30_days",   label: "8–30 días",  color: "#E67E22" },
    { key: "31_60_days",  label: "31–60 días", color: "#C0392B" },
    { key: "more_60_days",label: "+60 días",   color: "#7B241C" },
  ];

  const overdue = data?.overdue;
  const maxBucket = overdue ? Math.max(...ageBuckets.map((b) => overdue.by_age[b.key] ?? 0), 1) : 1;

  return (
    <div>
      {/* Filtros */}
      <div style={{ marginBottom: 20 }}>
        <div className="seg">
          {["month", "quarter", "year"].map((p) => (
            <span key={p} className={period === p ? "on" : ""} onClick={() => setPeriod(p)}>
              {periodLabel[p]}
            </span>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiCard label="Esperado" value={isLoading ? "—" : compactCurrency(data?.expected ?? 0)} sub="Pagos del periodo" />
        <KpiCard label="Cobrado" value={isLoading ? "—" : compactCurrency(data?.collected ?? 0)} sub="Pagos confirmados" />
        <KpiCard label="Tasa de cobranza" value={isLoading ? "—" : pct(data?.collection_rate)} sub="Cobrado / esperado" />
        <KpiCard
          label="Total vencido"
          value={isLoading ? "—" : compactCurrency(overdue?.amount ?? 0)}
          sub={`${overdue?.count ?? 0} pagos en mora`}
          danger={(overdue?.count ?? 0) > 0}
        />
      </div>

      {/* Aging buckets */}
      {!isLoading && overdue && (
        <div className="card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--deep)", marginBottom: 16 }}>
            Antigüedad de la cartera vencida
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {ageBuckets.map((b) => {
              const count = overdue.by_age[b.key] ?? 0;
              const barPct = Math.round((count / maxBucket) * 100);
              return (
                <div key={b.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".78rem", marginBottom: 5 }}>
                    <span style={{ color: "var(--mu)" }}>{b.label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "var(--deep)" }}>
                      {count} pago{count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 6, background: "var(--bg2)" }}>
                    <div style={{
                      height: 8, borderRadius: 6, background: b.color,
                      width: `${barPct}%`, transition: "width .4s ease",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
          {overdue.count === 0 && (
            <div style={{ paddingTop: 8, fontSize: 13, color: "var(--mu)", textAlign: "center" }}>
              Sin pagos vencidos en el periodo. 🎉
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══ TAB: INVENTARIO ══════════════════════════════════════════ */
function TabInventario() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-inventory"],
    queryFn: () => reportService.inventory(),
  });

  const byFrac = data?.by_fraccionamiento ?? [];
  const byStatus = data?.by_status ?? {};

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiCard label="Fraccionamientos" value={isLoading ? "—" : (data?.total_fraccionamientos ?? "—")} />
        <KpiCard label="Total lotes" value={isLoading ? "—" : (data?.total_lots ?? "—")} sub={`${byStatus.available ?? 0} disponibles`} />
        <KpiCard label="Vendidos" value={isLoading ? "—" : (byStatus.sold ?? "—")} sub={`${byStatus.reserved ?? 0} apartados`} />
        <KpiCard label="Precio prom. contado" value={isLoading ? "—" : compactCurrency(data?.average_price_contado ?? 0)} sub="Por lote" />
        <KpiCard label="Rotación" value={isLoading ? "—" : pct(data?.rotation_rate)} sub="Lotes vendidos / total" />
      </div>

      {/* Estado global */}
      {!isLoading && data && (
        <div className="card" style={{ padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--mu)", marginBottom: 12, textTransform: "uppercase", letterSpacing: ".1em" }}>
            Estado del inventario
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "Disponible", count: byStatus.available, color: "#6FAF6B" },
              { label: "Apartado",   count: byStatus.reserved,  color: "#B98C58" },
              { label: "Vendido",    count: byStatus.sold,       color: "#C0392B" },
            ].map(({ label, count, color }) => {
              const total = data.total_lots || 1;
              const w = Math.round((count / total) * 100);
              return (
                <div key={label} style={{ flex: 1, background: "var(--bg2)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: ".75rem", color: "var(--mu)" }}>{label}</span>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "1.3rem", fontWeight: 700, color: "var(--deep)" }}>
                    {count}
                  </div>
                  <div style={{ height: 4, borderRadius: 4, background: "var(--border)", marginTop: 8 }}>
                    <div style={{ height: 4, borderRadius: 4, background: color, width: `${w}%` }} />
                  </div>
                  <div style={{ fontSize: ".7rem", color: "var(--mu)", marginTop: 4 }}>{w}% del total</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabla por fraccionamiento */}
      {isLoading ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: "var(--mu)", fontSize: 13 }}>Cargando…</div>
      ) : byFrac.length === 0 ? <EmptyReport /> : (
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Fraccionamiento</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th style={{ textAlign: "right" }}>Disponible</th>
                <th style={{ textAlign: "right" }}>Apartado</th>
                <th style={{ textAlign: "right" }}>Vendido</th>
                <th style={{ textAlign: "right" }}>% Vendido</th>
              </tr>
            </thead>
            <tbody>
              {byFrac.map((f) => (
                <tr key={f.name}>
                  <td style={{ fontWeight: 600 }}>{f.name}</td>
                  <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>{f.total}</td>
                  <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono',monospace", color: "#2D6A26" }}>{f.available}</td>
                  <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono',monospace", color: "#856404" }}>{f.reserved}</td>
                  <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono',monospace", color: "#7B241C" }}>{f.sold}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                      <div style={{ width: 60, height: 6, borderRadius: 4, background: "var(--bg2)" }}>
                        <div style={{ height: 6, borderRadius: 4, background: "#355E3B", width: `${Math.round(f.sell_rate * 100)}%` }} />
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: ".8rem" }}>
                        {Math.round(f.sell_rate * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══ PÁGINA PRINCIPAL ════════════════════════════════════════ */
const TABS = [
  { key: "ventas",     label: "Ventas" },
  { key: "cobranza",   label: "Cobranza" },
  { key: "inventario", label: "Inventario" },
];

function ReportsPage() {
  const [tab, setTab] = useState("ventas");

  return (
    <div className="card">
      <div className="card-hd">
        <div className="card-title">📊 Reportes</div>
      </div>
      <div className="card-body">

        {/* Tabs */}
        <div className="seg" style={{ marginBottom: 24 }}>
          {TABS.map((t) => (
            <span key={t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
              {t.label}
            </span>
          ))}
        </div>

        {tab === "ventas"     && <TabVentas />}
        {tab === "cobranza"   && <TabCobranza />}
        {tab === "inventario" && <TabInventario />}

      </div>
    </div>
  );
}

export default ReportsPage;
