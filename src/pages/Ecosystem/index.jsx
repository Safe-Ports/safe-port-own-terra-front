import { useState } from "react";
import GuideModal from "@/components/shared/GuideModal";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { dashboardService } from "@/services/dashboardService";
import EcoLayout from "./EcoLayout";

function fmtK(n) {
  if (!n && n !== 0) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function RevenueChart({ labels, revenue }) {
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
        <linearGradient id="hub-gInc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6FAF6B" stopOpacity=".32" />
          <stop offset="100%" stopColor="#6FAF6B" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke="rgba(67,69,63,.10)" strokeWidth="1">
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <line key={r} x1={pad} y1={H - 20 - r * (H - 40)} x2={W - pad} y2={H - 20 - r * (H - 40)} />
        ))}
      </g>
      <path d={area} fill="url(#hub-gInc)" />
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

function EcosystemHub() {
  const navigate = useNavigate();
  const { canAccessApp, canUseFeature, showToast } = useAppContext();
  const [period, setPeriod]   = useState("month");
  const [showGuide, setShowGuide] = useState(false);

  const openLands = () => canAccessApp("lands")
    ? navigate("/dashboard")
    : showToast("Tu usuario no tiene acceso a OwnTerra Lands", "warning");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", period],
    queryFn: () => dashboardService.stats(period),
  });

  const periodLabel = { month: "Este mes", quarter: "Este trimestre", year: "Este año" };
  const ticket = stats?.sales_count > 0 ? stats.revenue / stats.sales_count : null;

  const salesBars = stats?.chart_data?.sales ?? [];
  const maxSales = Math.max(...salesBars, 1);

  return (
    <EcoLayout active="panel" title="Ecosistema Inmobiliario" onGuide={() => setShowGuide(true)}>

      {/* APP LAUNCHER */}
      <div className="section-head">
        <h3>Tus aplicaciones</h3>
      </div>
      <div className="app-launcher">

        <div className={`app-card ${!canAccessApp("lands") ? "is-disabled" : ""}`} style={{ "--glow": "rgba(111,175,107,.1)" }} onClick={openLands} role="button" tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openLands()}>
          <div className="app-top">
            <div className="app-icon ic-lands"><svg><use href="#eco-g-lands" /></svg></div>
            <span className="app-status st-active">Activo</span>
          </div>
          <div className="app-name">OwnTerra Lands</div>
          <div className="app-handle">terra.lands</div>
          <div className="app-desc">Lotificación, trazo y subdivisión de terrenos con planos topográficos y control de preventas.</div>
          <div className="app-tags"><span className="atag">Planos DWG/PDF</span><span className="atag">Compraventa</span><span className="atag">Enganches</span></div>
          <div className="app-cta">
            <span className={`app-open ${!canAccessApp("lands") ? "disabled" : ""}`}>{canAccessApp("lands") ? "Ingresar al módulo" : "Sin acceso asignado"}</span>
            <span className={`app-arrow ${!canAccessApp("lands") ? "disabled" : ""}`}>→</span>
          </div>
        </div>

        <div className="app-card is-disabled" style={{ "--glow": "rgba(53,94,59,.1)", pointerEvents: "none", userSelect: "none" }} aria-disabled="true" tabIndex={-1}>
          <div className="app-top">
            <div className="app-icon ic-neighb"><svg><use href="#eco-g-neighb" /></svg></div>
            <span className="app-status st-soon">Próximamente</span>
          </div>
          <div className="app-name">OwnTerra Properties</div>
          <div className="app-handle">terra.properties</div>
          <div className="app-desc">Departamentos y fraccionamientos residenciales: cuotas de mantenimiento y normativa de colonos.</div>
          <div className="app-tags"><span className="atag">Cuotas</span><span className="atag">Amenidades</span><span className="atag">Reglamento</span></div>
          <div className="app-cta">
            <span className="app-open disabled">En desarrollo</span>
            <span className="app-arrow disabled">→</span>
          </div>
        </div>

        <div className="app-card is-disabled" style={{ "--glow": "rgba(167,203,161,.14)", pointerEvents: "none", userSelect: "none" }} aria-disabled="true" tabIndex={-1}>
          <div className="app-top">
            <div className="app-icon ic-homes"><svg><use href="#eco-g-homes" /></svg></div>
            <span className="app-status st-soon">Próximamente</span>
          </div>
          <div className="app-name">OwnTerra Homes</div>
          <div className="app-handle">terra.homes</div>
          <div className="app-desc">Construcción y desarrollos habitacionales: avance de obra, acabados, garantías y postventa.</div>
          <div className="app-tags"><span className="atag">Avance de obra</span><span className="atag">Acabados</span><span className="atag">Postventa</span></div>
          <div className="app-cta">
            <span className="app-open disabled">En desarrollo</span>
            <span className="app-arrow disabled">→</span>
          </div>
        </div>

      </div>

      {/* PANEL FINANCIERO */}
      <div className="section-head">
        <h3>Finanzas del ecosistema</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="seg">
            {["month", "quarter", "year"].map((p) => (
              <span key={p} className={period === p ? "on" : ""} onClick={() => setPeriod(p)}>
                {periodLabel[p]}
              </span>
            ))}
          </div>
          <button
            className="sh-link"
            onClick={() => canUseFeature("core.finance") ? navigate("/ecosistema/finanzas") : showToast("Tu usuario no tiene acceso a Finanzas", "warning")}
          >
            Ver estados financieros →
          </button>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">Ingresos del periodo</span></div>
          <div className="kpi-val">{isLoading ? "—" : fmtK(stats?.revenue)}</div>
          <div className="kpi-foot">{periodLabel[period]} · OwnTerra Lands</div>
        </div>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">Ventas cerradas</span></div>
          <div className="kpi-val">{isLoading ? "—" : (stats?.sales_count ?? "—")}</div>
          <div className="kpi-foot">Contratos del periodo</div>
        </div>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">Ticket promedio</span></div>
          <div className="kpi-val">{isLoading ? "—" : (ticket ? fmtK(ticket) : "—")}</div>
          <div className="kpi-foot">Por contrato</div>
        </div>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">Tasa de cobranza</span></div>
          <div className="kpi-val">{isLoading ? "—" : (stats ? `${(stats.collection_rate * 100).toFixed(0)}%` : "—")}</div>
          <div className="kpi-foot">Cobrado / facturado</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-head">
            <div>
              <div className="chart-title">Ingresos del periodo</div>
              <div className="chart-sub">OwnTerra Lands · {periodLabel[period]}</div>
            </div>
            <div className="legend">
              <div className="lg"><span className="lg-dot" style={{ background: "#6FAF6B" }} />Ingresos</div>
            </div>
          </div>
          {stats?.chart_data ? (
            <RevenueChart labels={stats.chart_data.labels} revenue={stats.chart_data.revenue} />
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 13 }}>
              {isLoading ? "Cargando datos…" : "Sin datos para el periodo"}
            </div>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-head">
            <div>
              <div className="chart-title">Ventas cerradas por periodo</div>
              <div className="chart-sub">Contratos · {periodLabel[period]}</div>
            </div>
            <div className="legend">
              <div className="lg"><span className="lg-dot" style={{ background: "linear-gradient(180deg,#6FAF6B,#355E3B)" }} />Cerradas</div>
            </div>
          </div>
          {salesBars.length > 0 ? (
            <div className="bars">
              {stats.chart_data.labels.map((label, i) => {
                const pct = Math.round((salesBars[i] / maxSales) * 100);
                return (
                  <div key={label} className="bar-col">
                    <div className="bar-track">
                      <div className="bar" style={{ height: `${Math.max(pct, 2)}%`, animationDelay: `${i * 0.05}s` }}>
                        <span className="bar-val">{salesBars[i]}</span>
                      </div>
                    </div>
                    <span className="bar-x">{label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 13 }}>
              {isLoading ? "Cargando datos…" : "Sin datos para el periodo"}
            </div>
          )}
        </div>
      </div>

      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Ecosistema OwnTerra"
        subtitle="Hub central de todas las aplicaciones verticales del ecosistema."
        steps={[
          { title: "Lanzador de apps", text: "Las tarjetas muestran las apps disponibles. OwnTerra Lands está activo. Properties y Homes están en desarrollo (próximamente)." },
          { title: "Ingresar a Lands", text: "Haz clic en la tarjeta de OwnTerra Lands para acceder al módulo de gestión de lotes, clientes y cobranza de fraccionamientos." },
          { title: "KPIs del período", text: "Los indicadores muestran ingresos, ventas, tasa de cobranza y ticket promedio del período seleccionado (mes, trimestre o año)." },
          { title: "Cambiar período", text: "Usa los botones 'Este mes', 'Este trimestre' o 'Este año' para cambiar el período de análisis de los KPIs y gráficas." },
          { title: "Gráficas de ingresos", text: "Visualiza la tendencia de ingresos y contratos cerrados durante el período. Úsalas para identificar meses pico o caídas en ventas." },
        ]}
      />
    </EcoLayout>
  );
}

export default EcosystemHub;
