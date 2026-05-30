import { useState } from "react";
import { useNavigate } from "react-router-dom";
import EcoLayout from "./EcoLayout";

const APP_META = {
  lands: { name: "OwnTerra Lands", short: "Lands", handle: "terra.lands", icon: "eco-g-lands", cls: "ic-lands", color: "#6FAF6B", live: true },
  neighb: { name: "OwnTerra Neighborhoods", short: "Neighborhoods", handle: "terra.neighborhoods", icon: "eco-g-neighb", cls: "ic-neighb", color: "#355E3B", live: false },
  homes: { name: "OwnTerra Homes", short: "Homes", handle: "terra.homes", icon: "eco-g-homes", cls: "ic-homes", color: "#A7CBA1", live: false },
};

/* Mock front — finanzas consolidadas del ecosistema. */
const APP_FIN = [
  { key: "lands", receivable: "$180k", overdue: "$37.1k", rate: 94 },
  { key: "neighb", receivable: "$92k", overdue: "$15.3k", rate: 89 },
  { key: "homes", receivable: "$40k", overdue: "$22.4k", rate: 85 },
];

const OVERDUE = [
  { who: "Carlos Ramírez Soto", concept: "Lote 7 · Mz 1, Las Palmas · Pago 8/36", amount: "$12,500", late: 3, app: "lands" },
  { who: "Pedro Díaz Núñez", concept: "Lote 3 · Mz 9, Riberas · Pago 11/24", amount: "$24,600", late: 9, app: "lands" },
  { who: "Laura Sánchez Mora", concept: "Casa 4 · Frac. Los Cedros · Pago 6/84", amount: "$15,300", late: 5, app: "neighb" },
  { who: "Jorge Méndez Lara", concept: "Casa 8 · Desarrollo Altavista · Pago 3/120", amount: "$22,400", late: 2, app: "homes" },
];

function AppTag({ app }) {
  const a = APP_META[app];
  return <span className="md-tag"><span className="dot" style={{ background: a.color }} />{a.short}</span>;
}

function EcosystemFinanzas() {
  const navigate = useNavigate();
  const [appFilter, setAppFilter] = useState("all");

  const cobrar = (app) => APP_META[app]?.live && navigate("/pagos");
  const shownOverdue = OVERDUE.filter((o) => appFilter === "all" || o.app === appFilter);

  return (
    <EcoLayout active="fin" title="Estados Financieros" subtitle="Tesorería y cobranza consolidada del ecosistema">

      <div className="section-head">
        <h3>Tesorería del ecosistema</h3>
        <a className="sh-link" href="#">Exportar reporte →</a>
      </div>

      {/* KPIs */}
      <div className="kpi-row" style={{ marginBottom: 22 }}>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">Ingresos del mes</span><span className="kpi-trend tr-up">▲ 18.2%</span></div>
          <div className="kpi-val">$1.34M</div>
          <div className="kpi-foot">Mayo 2026 · todas las apps</div>
        </div>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">Cartera por cobrar</span></div>
          <div className="kpi-val">$312k</div>
          <div className="kpi-foot">Saldo pendiente total</div>
        </div>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">Pagos vencidos</span><span className="kpi-trend tr-down">▲ urgente</span></div>
          <div className="kpi-val" style={{ color: "#C0392B" }}>$74.8k</div>
          <div className="kpi-foot">{OVERDUE.length} operaciones en mora</div>
        </div>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">Tasa de cobranza</span><span className="kpi-trend tr-up">▲ 1.4%</span></div>
          <div className="kpi-val">92%</div>
          <div className="kpi-foot">Cobrado / facturado</div>
        </div>
      </div>

      {/* Flujo + Donut */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-head">
            <div>
              <div className="chart-title">Ingresos vs Egresos</div>
              <div className="chart-sub">Últimos 6 meses · miles de MXN · consolidado</div>
            </div>
            <div className="seg"><span className="on">Mensual</span><span>Trimestral</span></div>
          </div>
          <div className="legend" style={{ marginBottom: 14 }}>
            <div className="lg"><span className="lg-dot" style={{ background: "#6FAF6B" }} />Ingresos</div>
            <div className="lg"><span className="lg-dot" style={{ background: "#43453F" }} />Egresos</div>
          </div>
          <svg className="area-svg" viewBox="0 0 560 240" preserveAspectRatio="none">
            <defs>
              <linearGradient id="fin-gInc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6FAF6B" stopOpacity=".32" />
                <stop offset="100%" stopColor="#6FAF6B" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="fin-gEg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#43453F" stopOpacity=".16" />
                <stop offset="100%" stopColor="#43453F" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g stroke="rgba(67,69,63,.10)" strokeWidth="1">
              <line x1="40" y1="200" x2="540" y2="200" /><line x1="40" y1="140" x2="540" y2="140" />
              <line x1="40" y1="80" x2="540" y2="80" /><line x1="40" y1="20" x2="540" y2="20" />
            </g>
            <g fill="#83867C" fontSize="10" fontFamily="'JetBrains Mono',monospace">
              <text x="34" y="203" textAnchor="end">$0</text><text x="34" y="143" textAnchor="end">$.5M</text>
              <text x="34" y="83" textAnchor="end">$1M</text><text x="34" y="23" textAnchor="end">$1.5M</text>
            </g>
            <path d="M40,150.8 L140,144.8 L240,140 L340,135.2 L440,125.6 L540,130.4 L540,200 L40,200 Z" fill="url(#fin-gEg)" />
            <polyline points="40,150.8 140,144.8 240,140 340,135.2 440,125.6 540,130.4" fill="none" stroke="#43453F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" opacity=".6" />
            <path d="M40,101.6 L140,87.2 L240,94.4 L340,65.6 L440,70.4 L540,39.2 L540,200 L40,200 Z" fill="url(#fin-gInc)" />
            <polyline points="40,101.6 140,87.2 240,94.4 340,65.6 440,70.4 540,39.2" fill="none" stroke="#6FAF6B" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <g fill="#fff" stroke="#6FAF6B" strokeWidth="2.4">
              <circle cx="40" cy="101.6" r="3.4" /><circle cx="140" cy="87.2" r="3.4" /><circle cx="240" cy="94.4" r="3.4" />
              <circle cx="340" cy="65.6" r="3.4" /><circle cx="440" cy="70.4" r="3.4" /><circle cx="540" cy="39.2" r="4.4" />
            </g>
            <g fill="#83867C" fontSize="11" fontFamily="'Outfit',sans-serif" textAnchor="middle">
              <text x="40" y="224">Dic</text><text x="140" y="224">Ene</text><text x="240" y="224">Feb</text>
              <text x="340" y="224">Mar</text><text x="440" y="224">Abr</text><text x="540" y="224">May</text>
            </g>
          </svg>
        </div>

        <div className="chart-card">
          <div className="chart-head">
            <div>
              <div className="chart-title">Ingresos por aplicación</div>
              <div className="chart-sub">Distribución mayo 2026</div>
            </div>
          </div>
          <div className="donut-wrap">
            <div style={{ position: "relative", width: 160, height: 160 }}>
              <svg className="donut-svg" width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="54" fill="none" stroke="var(--bg2)" strokeWidth="20" />
                <circle cx="80" cy="80" r="54" fill="none" stroke="#6FAF6B" strokeWidth="20" strokeLinecap="round" strokeDasharray="210.4 339.3" strokeDashoffset="0" />
                <circle cx="80" cy="80" r="54" fill="none" stroke="#355E3B" strokeWidth="20" strokeLinecap="round" strokeDasharray="78 339.3" strokeDashoffset="-211" />
                <circle cx="80" cy="80" r="54" fill="none" stroke="#A7CBA1" strokeWidth="20" strokeLinecap="round" strokeDasharray="50.9 339.3" strokeDashoffset="-290" />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: "var(--deep)", lineHeight: 1 }}>$1.34M</div>
                <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".1em", marginTop: 3 }}>TOTAL</div>
              </div>
            </div>
            <div className="donut-legend">
              <div className="dl-row"><span className="lg-dot" style={{ background: "#6FAF6B" }} /><span className="dl-name">Lands</span><span className="dl-val">62% · $831k</span></div>
              <div className="dl-row"><span className="lg-dot" style={{ background: "#355E3B" }} /><span className="dl-name">Neighborhoods</span><span className="dl-val">23% · $308k</span></div>
              <div className="dl-row"><span className="lg-dot" style={{ background: "#A7CBA1" }} /><span className="dl-name">Homes</span><span className="dl-val">15% · $201k</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Cartera por app */}
      <div className="section-head" style={{ marginTop: 8 }}>
        <h3>Cartera por aplicación</h3>
      </div>
      <div className="fin-apps">
        {APP_FIN.map((f) => {
          const a = APP_META[f.key];
          return (
            <div key={f.key} className="fin-appcard">
              <div className="fin-appcard-top">
                <span className={`fin-appcard-ico app-icon ${a.cls}`}><svg><use href={`#${a.icon}`} /></svg></span>
                <div>
                  <div className="fin-appcard-name">{a.short}</div>
                  <div className="fin-appcard-handle">{a.handle}</div>
                </div>
              </div>
              <div className="fin-metrics">
                <div><div className="fin-metric-l">Por cobrar</div><div className="fin-metric-v">{f.receivable}</div></div>
                <div><div className="fin-metric-l">Vencido</div><div className="fin-metric-v red">{f.overdue}</div></div>
              </div>
              <div className="fin-bar"><div className="fin-bar-fill" style={{ width: `${f.rate}%` }} /></div>
              <div className="fin-bar-meta"><span>Tasa de cobranza</span><span>{f.rate}%</span></div>
            </div>
          );
        })}
      </div>

      {/* Cobranza vencida consolidada */}
      <div className="md-card" style={{ marginBottom: 30, marginTop: 16 }}>
        <div className="md-card-head" style={{ marginBottom: 14 }}>
          <div>
            <div className="md-card-title">Cobranza vencida · todas las apps</div>
            <div className="md-card-sub">prioriza y entra a la app a cobrar</div>
          </div>
          <a className="sh-link" href="#">Ver toda la cartera →</a>
        </div>

        <div className="usr-fil-row" style={{ marginBottom: 6 }}>
          <span className="usr-fil-lbl">App:</span>
          <button className={`usr-fil ${appFilter === "all" ? "on" : ""}`} onClick={() => setAppFilter("all")}>Todas</button>
          {Object.entries(APP_META).map(([k, a]) => (
            <button key={k} className={`usr-fil ${appFilter === k ? "on" : ""}`} onClick={() => setAppFilter(k)}>
              <span className="usr-fil-dot" style={{ background: a.color }} />{a.short}
            </button>
          ))}
        </div>

        {shownOverdue.length ? shownOverdue.map((o, i) => (
          <div key={i} className="md-row">
            <span className="md-row-ico" style={{ background: "#FDECEA" }}>💳</span>
            <div className="md-row-info">
              <div className="md-row-name">{o.who}</div>
              <div className="md-row-meta">{o.concept}</div>
            </div>
            <AppTag app={o.app} />
            <span className="md-late">{o.late} días vencido</span>
            <span className="md-amount">{o.amount}</span>
            {APP_META[o.app].live
              ? <span className="md-open" onClick={() => cobrar(o.app)}>Cobrar →</span>
              : <span className="md-open" style={{ opacity: .5, cursor: "default" }}>Próximamente</span>}
          </div>
        )) : <div className="md-empty">Sin pagos vencidos en esta app. 🎉</div>}
      </div>
    </EcoLayout>
  );
}

export default EcosystemFinanzas;
