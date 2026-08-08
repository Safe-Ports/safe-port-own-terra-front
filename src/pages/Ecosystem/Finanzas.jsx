import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GuideModal from "@/components/shared/GuideModal";
import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboardService";
import { paymentService } from "@/services/paymentService";
import EcoLayout from "./EcoLayout";
import { useLocale } from "@/i18n";

const APP_META = {
  lands: { name: "OwnTerra Lands", short: "Lands", handle: "terra.lands", icon: "eco-g-lands", cls: "ic-lands", color: "#6FAF6B", live: true },
  neighb: { name: "OwnTerra Properties", short: "Properties", handle: "terra.properties", icon: "eco-g-neighb", cls: "ic-neighb", color: "#355E3B", live: false },
  homes: { name: "OwnTerra Homes", short: "Homes", handle: "terra.homes", icon: "eco-g-homes", cls: "ic-homes", color: "#A7CBA1", live: false },
};

function fmtK(n, format) {
  if (!n && n !== 0) return "—";
  return format.currency(n, "MXN", {
    notation: Math.abs(n) >= 1_000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(n) >= 1_000_000 ? 2 : 0,
  });
}

function AppTag({ app }) {
  const a = APP_META[app] || APP_META.lands;
  return <span className="md-tag"><span className="dot" style={{ background: a.color }} />{a.short}</span>;
}

function BarChart({ labels, revenue }) {
  if (!labels?.length) return null;
  const max = Math.max(...revenue, 1);
  const H = 200;
  const W = 560;
  const pad = 40;
  const step = (W - pad * 2) / (labels.length - 1 || 1);
  const pts = labels.map((_, i) => [pad + i * step, H - 20 - ((revenue[i] / max) * (H - 40))]);
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `M${pts.map(([x, y]) => `${x},${y}`).join(" L")} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;
  return (
    <svg className="area-svg" viewBox={`0 0 ${W} ${H + 24}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="fin-gInc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6FAF6B" stopOpacity=".32" />
          <stop offset="100%" stopColor="#6FAF6B" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke="rgba(67,69,63,.10)" strokeWidth="1">
        {[0.25, 0.5, 0.75, 1].map((r) => <line key={r} x1={pad} y1={H - 20 - (r * (H - 40))} x2={W - pad} y2={H - 20 - (r * (H - 40))} />)}
      </g>
      <path d={area} fill="url(#fin-gInc)" />
      <polyline points={polyline} fill="none" stroke="#6FAF6B" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 4.4 : 3.4} fill="#fff" stroke="#6FAF6B" strokeWidth="2.4" />
      ))}
      <g fill="#83867C" fontSize="11" fontFamily="'Outfit',sans-serif" textAnchor="middle">
        {labels.map((l, i) => <text key={i} x={pad + i * step} y={H + 18}>{l}</text>)}
      </g>
    </svg>
  );
}

function EcosystemFinanzas() {
  const navigate = useNavigate();
  const [period, setPeriod]       = useState("month");
  const [showGuide, setShowGuide] = useState(false);
  const { format, t, localeTag } = useLocale();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", period],
    queryFn: () => dashboardService.stats(period),
  });

  const { data: overdueData } = useQuery({
    queryKey: ["payments-overdue"],
    queryFn: () => paymentService.overdue(),
  });
  const overdueItems = overdueData?.items ?? [];

  const cobrar = (app) => APP_META[app]?.live && navigate("/pagos");

  const periodLabel = { month: t("financials.periods.month"), quarter: t("financials.periods.quarter"), year: t("financials.periods.year") };

  return (
    <EcoLayout active="fin" title={t("financials.title")} subtitle={t("financials.subtitle")} onGuide={() => setShowGuide(true)}>

      <div className="section-head">
        <h3>{t("financials.heading")}</h3>
        <div className="seg" style={{ marginLeft: "auto" }}>
          {["month", "quarter", "year"].map((p) => (
            <span key={p} className={period === p ? "on" : ""} onClick={() => setPeriod(p)}>{periodLabel[p]}</span>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-row" style={{ marginBottom: 22 }}>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">{t("financials.revenuePeriod")}</span></div>
          <div className="kpi-val">{stats ? fmtK(stats.revenue, format) : "—"}</div>
          <div className="kpi-foot">{periodLabel[period]} · OwnTerra Lands</div>
        </div>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">{t("financials.collectionRate")}</span></div>
          <div className="kpi-val">{stats ? `${(stats.collection_rate * 100).toFixed(0)}%` : "—"}</div>
          <div className="kpi-foot">{t("financials.collectedBilled")}</div>
        </div>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">{t("financials.overduePayments")}</span>{overdueItems.length > 0 && <span className="kpi-trend tr-down">▲ {t("financials.urgent")}</span>}</div>
          <div className="kpi-val" style={{ color: overdueItems.length > 0 ? "#C0392B" : undefined }}>
            {fmtK(overdueItems.reduce((s, o) => s + Number(o.amount || 0), 0), format)}
          </div>
          <div className="kpi-foot">{t("financials.overdueOperations").replace("{count}", overdueItems.length)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">{t("financials.periodSales")}</span></div>
          <div className="kpi-val">{stats?.sales_count ?? "—"}</div>
          <div className="kpi-foot">{t("financials.closedContracts")}</div>
        </div>
      </div>

      {/* Gráfica */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-head">
            <div>
              <div className="chart-title">{t("financials.revenuePeriod")}</div>
              <div className="chart-sub">OwnTerra Lands · {periodLabel[period]}</div>
            </div>
          </div>
          <div className="legend" style={{ marginBottom: 14 }}>
            <div className="lg"><span className="lg-dot" style={{ background: "#6FAF6B" }} />{t("financials.revenue")}</div>
          </div>
          {stats?.chart_data ? (
            <BarChart labels={stats.chart_data.labels} revenue={stats.chart_data.revenue} />
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)" }}>
              {t("financials.loadingData")}
            </div>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-head">
            <div>
              <div className="chart-title">{t("financials.periodSummary")}</div>
              <div className="chart-sub">{periodLabel[period]} · OwnTerra Lands</div>
            </div>
          </div>
          {stats ? (
            <div style={{ padding: "12px 0", display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                [t("financials.totalRevenue"), fmtK(stats.revenue, format)],
                [t("financials.newClients"), stats.new_clients],
                [t("financials.newLeads"), stats.new_leads],
                [t("financials.collectionRate"), `${(stats.collection_rate * 100).toFixed(1)}%`],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
                  <span style={{ color: "var(--text2)" }}>{label}</span>
                  <b style={{ color: "var(--deep)", fontFamily: "'JetBrains Mono',monospace" }}>{val}</b>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text3)" }}>{t("financials.loading")}</div>
          )}
        </div>
      </div>

      {/* Cobranza vencida */}
      <div className="md-card" style={{ marginBottom: 30, marginTop: 16 }}>
        <div className="md-card-head" style={{ marginBottom: 14 }}>
          <div>
            <div className="md-card-title">{t("financials.overdueCollections")}</div>
            <div className="md-card-sub">{t("financials.prioritize")}</div>
          </div>
          <span className="sh-link" style={{ cursor: "pointer" }} onClick={() => navigate("/pagos")}>{t("financials.viewPortfolio")}</span>
        </div>

        {overdueItems.length ? overdueItems.map((o) => (
          <div key={o.id} className="md-row">
            <span className="md-row-ico" style={{ background: "#FDECEA" }}>💳</span>
            <div className="md-row-info">
              <div className="md-row-name">{o.client?.name || "—"}</div>
              <div className="md-row-meta">
                {o.lot?.code ? `${o.lot.code} · ` : ""}{t("financials.payment").replace("{number}", o.installment_n)} · {t("financials.due").replace("{date}", o.due_date ? new Date(o.due_date).toLocaleDateString(localeTag) : "—")}
              </div>
            </div>
            <AppTag app="lands" />
            <span className="md-late">{t("financials.daysOverdue").replace("{days}", o.days_late)}</span>
            <span className="md-amount">{format.currency(o.amount || 0, "MXN", { maximumFractionDigits: 0 })}</span>
            <span className="md-open" onClick={() => cobrar("lands")} style={{ cursor: "pointer" }}>{t("financials.collect")}</span>
          </div>
        )) : (
          <div className="md-empty">{t("financials.noOverdue")}</div>
        )}
      </div>
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title={t("financials.title")}
        subtitle={t("financials.guideSubtitle")}
        steps={[
          { title: t("financials.guide.kpiTitle"), text: t("financials.guide.kpiText") },
          { title: t("financials.guide.periodTitle"), text: t("financials.guide.periodText") },
          { title: t("financials.guide.overdueTitle"), text: t("financials.guide.overdueText") },
          { title: t("financials.guide.collectTitle"), text: t("financials.guide.collectText") },
        ]}
      />
    </EcoLayout>
  );
}

export default EcosystemFinanzas;
