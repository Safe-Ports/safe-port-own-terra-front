import { useNavigate } from "react-router-dom";
import EcoLayout from "./EcoLayout";

function EcosystemHub() {
  const navigate = useNavigate();
  const openLands = () => navigate("/dashboard");

  return (
    <EcoLayout active="panel" title="Ecosistema Inmobiliario">
      {/* APP LAUNCHER */}
      <div className="section-head">
        <h3>Tus aplicaciones</h3>
        <a className="sh-link" href="#">Ver roadmap →</a>
      </div>
      <div className="app-launcher">

        <div className="app-card" style={{ "--glow": "rgba(111,175,107,.1)" }} onClick={openLands} role="button" tabIndex={0}
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
            <span className="app-open">Ingresar al módulo</span>
            <span className="app-arrow">→</span>
          </div>
        </div>

        <div className="app-card is-disabled" style={{ "--glow": "rgba(53,94,59,.1)" }}>
          <div className="app-top">
            <div className="app-icon ic-neighb"><svg><use href="#eco-g-neighb" /></svg></div>
            <span className="app-status st-soon">Próximamente</span>
          </div>
          <div className="app-name">OwnTerra Neighborhoods</div>
          <div className="app-handle">terra.neighborhoods</div>
          <div className="app-desc">Departamentos y fraccionamientos residenciales: cuotas de mantenimiento y normativa de colonos.</div>
          <div className="app-tags"><span className="atag">Cuotas</span><span className="atag">Amenidades</span><span className="atag">Reglamento</span></div>
          <div className="app-cta">
            <span className="app-open disabled">En desarrollo</span>
            <span className="app-arrow disabled">→</span>
          </div>
        </div>

        <div className="app-card is-disabled" style={{ "--glow": "rgba(167,203,161,.14)" }}>
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
        <a className="sh-link" href="#">Ver estados financieros →</a>
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">Ingresos del mes</span><span className="kpi-trend tr-up">▲ 18.2%</span></div>
          <div className="kpi-val">$1.34M</div>
          <div className="kpi-foot">Mayo 2026 · MXN</div>
          <svg className="kpi-spark" viewBox="0 0 100 34" preserveAspectRatio="none" fill="none">
            <polyline points="0,27 17,23 33,25 50,16 67,18 83,10 100,5" stroke="#6FAF6B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">Ventas cerradas</span><span className="kpi-trend tr-up">▲ 22.7%</span></div>
          <div className="kpi-val">27</div>
          <div className="kpi-foot">Lotes y unidades</div>
          <svg className="kpi-spark" viewBox="0 0 100 34" preserveAspectRatio="none" fill="none">
            <polyline points="0,25 20,21 40,23 60,12 80,15 100,7" stroke="#355E3B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">Ticket promedio</span><span className="kpi-trend tr-up">▲ 3.1%</span></div>
          <div className="kpi-val">$49.6k</div>
          <div className="kpi-foot">Por operación</div>
          <svg className="kpi-spark" viewBox="0 0 100 34" preserveAspectRatio="none" fill="none">
            <polyline points="0,19 25,17 50,18 75,14 100,12" stroke="#6FAF6B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="kpi">
          <div className="kpi-head"><span className="kpi-label">Cartera por cobrar</span><span className="kpi-trend tr-down">▼ 8.0%</span></div>
          <div className="kpi-val">$312k</div>
          <div className="kpi-foot">Saldo pendiente</div>
          <svg className="kpi-spark" viewBox="0 0 100 34" preserveAspectRatio="none" fill="none">
            <polyline points="0,9 25,11 50,14 75,18 100,23" stroke="#A7CBA1" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-head">
            <div>
              <div className="chart-title">Ingresos vs Egresos</div>
              <div className="chart-sub">Últimos 6 meses · miles de MXN</div>
            </div>
            <div className="seg"><span className="on">Mensual</span><span>Trimestral</span></div>
          </div>
          <div className="legend" style={{ marginBottom: 14 }}>
            <div className="lg"><span className="lg-dot" style={{ background: "#6FAF6B" }} />Ingresos</div>
            <div className="lg"><span className="lg-dot" style={{ background: "#43453F" }} />Egresos</div>
          </div>
          <svg className="area-svg" viewBox="0 0 560 240" preserveAspectRatio="none">
            <defs>
              <linearGradient id="eco-gInc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6FAF6B" stopOpacity=".32" />
                <stop offset="100%" stopColor="#6FAF6B" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="eco-gEg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#43453F" stopOpacity=".16" />
                <stop offset="100%" stopColor="#43453F" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g stroke="rgba(67,69,63,.10)" strokeWidth="1">
              <line x1="40" y1="200" x2="540" y2="200" />
              <line x1="40" y1="140" x2="540" y2="140" />
              <line x1="40" y1="80" x2="540" y2="80" />
              <line x1="40" y1="20" x2="540" y2="20" />
            </g>
            <g fill="#83867C" fontSize="10" fontFamily="'JetBrains Mono',monospace">
              <text x="34" y="203" textAnchor="end">$0</text>
              <text x="34" y="143" textAnchor="end">$.5M</text>
              <text x="34" y="83" textAnchor="end">$1M</text>
              <text x="34" y="23" textAnchor="end">$1.5M</text>
            </g>
            <path d="M40,150.8 L140,144.8 L240,140 L340,135.2 L440,125.6 L540,130.4 L540,200 L40,200 Z" fill="url(#eco-gEg)" />
            <polyline points="40,150.8 140,144.8 240,140 340,135.2 440,125.6 540,130.4" fill="none" stroke="#43453F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" opacity=".6" />
            <path d="M40,101.6 L140,87.2 L240,94.4 L340,65.6 L440,70.4 L540,39.2 L540,200 L40,200 Z" fill="url(#eco-gInc)" />
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
                <circle cx="80" cy="80" r="54" fill="none" stroke="#6FAF6B" strokeWidth="20" strokeLinecap="round"
                  strokeDasharray="210.4 339.3" strokeDashoffset="0" />
                <circle cx="80" cy="80" r="54" fill="none" stroke="#355E3B" strokeWidth="20" strokeLinecap="round"
                  strokeDasharray="78 339.3" strokeDashoffset="-211" />
                <circle cx="80" cy="80" r="54" fill="none" stroke="#A7CBA1" strokeWidth="20" strokeLinecap="round"
                  strokeDasharray="50.9 339.3" strokeDashoffset="-290" />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: "var(--deep)", lineHeight: 1 }}>$1.34M</div>
                <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".1em", marginTop: 3 }}>TOTAL</div>
              </div>
            </div>
            <div className="donut-legend">
              <div className="dl-row"><span className="lg-dot" style={{ background: "#6FAF6B" }} /><span className="dl-name">Lands · lotes</span><span className="dl-val">62% · $831k</span></div>
              <div className="dl-row"><span className="lg-dot" style={{ background: "#355E3B" }} /><span className="dl-name">Neighborhoods</span><span className="dl-val">23% · $308k</span></div>
              <div className="dl-row"><span className="lg-dot" style={{ background: "#A7CBA1" }} /><span className="dl-name">Homes</span><span className="dl-val">15% · $201k</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-card" style={{ marginBottom: 30 }}>
        <div className="chart-head">
          <div>
            <div className="chart-title">Ventas cerradas por mes</div>
            <div className="chart-sub">Lotes y unidades · 2026</div>
          </div>
          <div className="legend">
            <div className="lg"><span className="lg-dot" style={{ background: "linear-gradient(180deg,#6FAF6B,#355E3B)" }} />Cerradas</div>
            <div className="lg"><span className="lg-dot" style={{ background: "linear-gradient(180deg,#A7CBA1,#6FAF6B)" }} />Mes actual</div>
          </div>
        </div>
        <div className="bars">
          <div className="bar-col"><div className="bar-track"><div className="bar" style={{ height: "52%", animationDelay: ".05s" }}><span className="bar-val">14</span></div></div><span className="bar-x">Dic</span></div>
          <div className="bar-col"><div className="bar-track"><div className="bar" style={{ height: "67%", animationDelay: ".1s" }}><span className="bar-val">18</span></div></div><span className="bar-x">Ene</span></div>
          <div className="bar-col"><div className="bar-track"><div className="bar" style={{ height: "59%", animationDelay: ".15s" }}><span className="bar-val">16</span></div></div><span className="bar-x">Feb</span></div>
          <div className="bar-col"><div className="bar-track"><div className="bar" style={{ height: "81%", animationDelay: ".2s" }}><span className="bar-val">22</span></div></div><span className="bar-x">Mar</span></div>
          <div className="bar-col"><div className="bar-track"><div className="bar" style={{ height: "74%", animationDelay: ".25s" }}><span className="bar-val">20</span></div></div><span className="bar-x">Abr</span></div>
          <div className="bar-col"><div className="bar-track"><div className="bar muted" style={{ height: "100%", animationDelay: ".3s" }}><span className="bar-val">27</span></div></div><span className="bar-x">May</span></div>
        </div>
      </div>

      {/* TENANTS */}
      <div className="section-head">
        <h3>Empresas clientes activas</h3>
        <a className="sh-link" href="#">Gestionar tenants →</a>
      </div>
      <div className="tenant-grid">
        <div className="tc">
          <div className="tc-top"><div className="tc-badge">FN</div>
            <div><div className="tc-name">Fraccionamientos del Norte</div><div className="tc-schema">frac_norte · 4 fraccs</div></div></div>
          <div className="tc-mods"><span className="tcm tcm-on">Maps</span><span className="tcm tcm-on">Docs</span><span className="tcm tcm-on">CRM</span><span className="tcm tcm-on">Pay</span><span className="tcm tcm-on">Sign</span><span className="tcm tcm-off">Reports</span></div>
        </div>
        <div className="tc">
          <div className="tc-top"><div className="tc-badge">IP</div>
            <div><div className="tc-name">Inmobiliaria Pacífico</div><div className="tc-schema">inmo_pacifico · 2 fraccs</div></div></div>
          <div className="tc-mods"><span className="tcm tcm-on">Maps</span><span className="tcm tcm-on">Docs</span><span className="tcm tcm-on">CRM</span><span className="tcm tcm-off">Pay</span><span className="tcm tcm-off">Sign</span><span className="tcm tcm-off">Reports</span></div>
        </div>
        <div className="tc">
          <div className="tc-top"><div className="tc-badge">DM</div>
            <div><div className="tc-name">Desarrollos Meridiano</div><div className="tc-schema">dev_meridiano · 8 fraccs</div></div></div>
          <div className="tc-mods"><span className="tcm tcm-on">Maps</span><span className="tcm tcm-on">Docs</span><span className="tcm tcm-on">CRM</span><span className="tcm tcm-on">Pay</span><span className="tcm tcm-on">Sign</span><span className="tcm tcm-on">Reports</span></div>
        </div>
      </div>
    </EcoLayout>
  );
}

export default EcosystemHub;
