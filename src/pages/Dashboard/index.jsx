import { useMemo, useState } from "react";
import GuideModal from "@/components/shared/GuideModal";
import BusinessKpis from "@/components/shared/BusinessKpis";
import QuickSummary from "@/components/shared/QuickSummary";
import LandsGreeting from "./LandsGreeting";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { useLandsGuide } from "@/context/LandsGuideContext";
import { useDashboardQuery } from "@/hooks/queries/useAppQueries";
import { compactCurrency, currency } from "@/services/formatters";
import { expenseService } from "@/services/expenseService";
import { dashboardService } from "@/services/dashboardService";
import {
  HiOutlineSquares2X2, HiOutlineDocumentText,
  HiOutlineChevronDown, HiOutlineArrowRight,
} from "react-icons/hi2";
import { Skeleton } from "@/components/ui/Skeleton";
import { parseApiError } from "@/errors/parseApiError";

/* Paleta de data-viz: ÚNICA fuente para los colores de gráficas. Usa tokens
   donde existen; los categóricos sin token (café/gris) quedan aquí centralizados. */
const VIZ = {
  ingresos:  "var(--mid)",
  egresos:   "#7B5C38",
  contratos: "var(--deep)",
  available: "var(--mid)",
  grid:      "var(--line-soft)",
  axis:      "var(--muted)",
  hover:     "var(--sf2)",
};

/* ── helpers ─────────────────────────────────────────────────── */
const NOW   = new Date();
const CY    = NOW.getFullYear();



function compactNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/* ── Gráfica genérica con tooltip ────────────────────────────── */
// bars = [{ key, color, label, fmt }]
// sharedScale = true → ambas barras usan el mismo máximo (comparable)
function MiniChart({ data, bars, sharedScale = true, H = 120 }) {
  const [hovered, setHovered] = useState(null);
  const maxes    = bars.map(b => Math.max(...data.map(d => d[b.key] || 0), 1));
  const globalMax= sharedScale ? Math.max(...maxes) : null;
  const PAD_L = 52; const PAD_B = 20; const PAD_T = 8;
  const BW = 8; const GAP = 3;
  const GW = BW * bars.length + GAP * (bars.length - 1) + 12;
  const W  = PAD_L + GW * data.length + 8;
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div style={{ position: "relative" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H + PAD_T + PAD_B}`}
        style={{ overflow: "visible", display: "block" }}>
        {yTicks.map(p => {
          const y = PAD_T + H - p * H;
          const maxForLabel = globalMax ?? maxes[0];
          return (
            <g key={p}>
              <line x1={PAD_L} x2={W - 4} y1={y} y2={y} stroke={VIZ.grid} strokeWidth={1} />
              <text x={PAD_L - 6} y={y + 3.5} textAnchor="end" fontSize="9" fill={VIZ.axis}>
                {bars[0].fmt(Math.round(p * maxForLabel))}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = PAD_L + i * GW + 6;
          const isHov = hovered === i;
          return (
            <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}>
              {isHov && (
                <rect x={x - 4} y={PAD_T}
                  width={BW * bars.length + GAP * (bars.length - 1) + 8} height={H}
                  fill={VIZ.hover} rx={4} />
              )}
              {bars.map((b, bi) => {
                const val = d[b.key] || 0;
                const max = sharedScale ? globalMax : maxes[bi];
                const bH  = Math.max((val / max) * H, val > 0 ? 4 : 0);
                return (
                  <rect key={bi} x={x + bi * (BW + GAP)} y={PAD_T + H - bH}
                    width={BW} height={bH} fill={b.color} rx={2}
                    opacity={isHov ? 1 : 0.83} />
                );
              })}
              <text x={x + (BW * bars.length + GAP * (bars.length - 1)) / 2}
                y={H + PAD_T + PAD_B - 2} textAnchor="middle" fontSize="9" fill={VIZ.axis}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hovered !== null && data[hovered] && (
        <div style={{
          position: "absolute", top: 4,
          left: `${Math.min((hovered / data.length) * 100 + 4, 55)}%`,
          transform: hovered > data.length * 0.6 ? "translateX(-110%)" : "none",
          background: "var(--deep)", color: "var(--cream)", borderRadius: 10, padding: "8px 12px",
          fontSize: ".75rem", pointerEvents: "none", zIndex: 10, minWidth: 160,
          boxShadow: "0 4px 16px rgba(0,0,0,.2)",
        }}>
          <div style={{ fontWeight: 700, marginBottom: 5, color: "var(--line-soft)" }}>
            {data[hovered].fullLabel}
          </div>
          {bars.map(b => (
            <div key={b.key} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: 1, background: b.color, flexShrink: 0, display: "inline-block" }} />
              <span style={{ color: "#ccc" }}>{b.label}:</span>
              <strong>{b.fmt(data[hovered][b.key] || 0)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Avatar (top vendedores) ─────────────────────────────────── */
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
/* Reuse shared Avatar component; badge handled inline where needed */

/* ── Skeleton de carga (reemplaza la pantalla en blanco) ─────────── */
function DashboardSkeleton() {
  return (
    <div aria-busy="true">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="ot-card" style={{ padding: "16px 18px" }}>
            <Skeleton w="60%" h={9} />
            <Skeleton w="45%" h={24} style={{ marginTop: 10 }} />
            <Skeleton w="70%" h={9} style={{ marginTop: 10 }} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="ot-card" style={{ padding: 18 }}>
            <Skeleton w="45%" h={11} />
            <Skeleton w="100%" h={140} r={12} style={{ marginTop: 16 }} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="ot-card" style={{ padding: 18 }}>
            <Skeleton w="40%" h={11} />
            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              {Array.from({ length: 4 }).map((__, j) => <Skeleton key={j} w="100%" h={14} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══ PAGE ════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const navigate    = useNavigate();
  const { contracts, payments } = useAppContext();
  const { data, error, retry } = useDashboardQuery();
  const [chartYear] = useState(CY);
  const [showGuide, setShowGuide] = useState(false);
  useLandsGuide(() => setShowGuide(true));

  /* team performance */
  const { data: teamRaw } = useQuery({
    queryKey: ["team-perf-month"],
    queryFn:  () => dashboardService.teamPerformance("month"),
    staleTime: 120_000,
  });
  const teamPerf = teamRaw?.team || [];

  /* egresos para la gráfica de ingresos vs egresos */
  const { data: expRaw } = useQuery({
    queryKey: ["expenses"],
    queryFn:  () => expenseService.list({ limit: 500 }).then(r => r.items),
    staleTime: 60_000,
  });
  const expenses = expRaw || [];

  /* ── KPI calculations ── */
  // El conteo lo hace la base, no el navegador. `contracts` del contexto llega
  // recortado a 100 filas, así que filtrarlo daba menos contratos de los que
  // hubo en el mes y nada lo delataba. Es la misma consulta que ya alimenta el
  // KPI "Ventas del mes" de BusinessKpis.
  const { data: kpisNegocio } = useQuery({
    queryKey: ["dashboard-kpis", 6],
    queryFn: () => dashboardService.kpis(6),
    staleTime: 60_000,
  });
  const salesThisMonth = kpisNegocio?.sales?.value ?? null;

  /* ── Chart data (monthly) ── */
  const monthlyChart = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, m) => ({
      month: m,
      label:     new Date(chartYear, m, 1).toLocaleDateString("es-MX", { month: "short" }),
      fullLabel: new Date(chartYear, m, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" }),
      ingresos: 0, egresos: 0, contratos: 0,
    }));
    contracts.forEach(c => {
      if (!c.contract_date) return;
      const d = new Date(`${c.contract_date}T12:00:00`);
      if (d.getFullYear() === chartYear) months[d.getMonth()].contratos += 1;
    });
    payments.forEach(p => {
      if (p.status !== "paid" || !p.paid_date) return;
      const d = new Date(`${p.paid_date}T12:00:00`);
      if (d.getFullYear() === chartYear) months[d.getMonth()].ingresos += Number(p.amount || 0);
    });
    expenses.filter(e => e.status === "paid").forEach(e => {
      const dateStr = e.paid_date || e.due_date;
      if (!dateStr) return;
      const d = new Date(`${dateStr}T12:00:00`);
      if (d.getFullYear() === chartYear) months[d.getMonth()].egresos += Number(e.monto || 0);
    });
    return months;
  }, [contracts, payments, expenses, chartYear]);

  /* ── Ventas recientes (últimos 5 contratos) ── */
  const recentSales = useMemo(() =>
    [...contracts]
      .filter(c => c.contract_date)
      .sort((a, b) => new Date(b.contract_date) - new Date(a.contract_date))
      .slice(0, 5), [contracts]);

  if (!data && error) {
    const parsed = parseApiError(error, "No se pudo cargar la actividad.");
    return (
      <div role="alert" style={{ padding: "48px 24px", textAlign: "center" }}>
        <h2 style={{ marginBottom: 6 }}>{parsed.title}</h2>
        <p style={{ color: "var(--muted)", marginBottom: 4 }}>{parsed.message}</p>
        <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 16 }}>
          {parsed.code}{parsed.requestId ? ` · Ref ${parsed.requestId}` : ""}
        </p>
        <Button type="button" onClick={retry}>Reintentar</Button>
      </div>
    );
  }
  if (!data) return <DashboardSkeleton />;

  return (
    <>
      <style>{`
        /* El saludo arranca pegado a la barra superior, sin el aire general de las vistas. */
        .view-scroll:has(.db-top) { padding-top:0; }
        .db-top   { display:grid;grid-template-columns:minmax(0,2.2fr) minmax(0,1fr);gap:14px;margin-bottom:14px; }
        .db-charts { display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px; }
        .db-row3  { display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px; }
        .db-card  { background:var(--sf);border:1px solid var(--bd);border-radius:20px;overflow:hidden;box-shadow:var(--sh); }
        .db-card-hd { display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--line-soft); }
        .db-card-title { font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted); }
        .db-ver-todos { font-size:.72rem;font-weight:700;color:var(--forest);background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:3px; }
        .db-ver-todos:hover { text-decoration:underline; }
        .db-accion { display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:14px;border:1.5px solid var(--bd);background:var(--sf);cursor:pointer;transition:all .14s;flex:1;font-family:inherit; }
        .db-accion:hover { border-color:var(--forest);background:var(--tan-lt); }
        .db-accion-ico { width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }

        @media (max-width:900px)  { .db-top,.db-charts,.db-row3 { grid-template-columns:1fr; } }
      `}</style>

      {/* ── Saludo + cobrado del mes ── */}
      <div className="db-top">
        <LandsGreeting />
        <BusinessKpis />
      </div>
      <QuickSummary />

      {/* ── 2 gráficas ── */}
      <div className="db-charts">

        {/* 1. Ingresos vs Egresos */}
        <div className="db-card">
          <div className="db-card-hd">
            <div>
              <div className="db-card-title">Ingresos vs Egresos</div>
              <div style={{ display: "flex", gap: 12, marginTop: 5 }}>
                {[[VIZ.ingresos,"Ingresos"], [VIZ.egresos,"Egresos"]].map(([c,l]) => (
                  <div key={l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:c }} />
                    <span style={{ fontSize:".7rem", color:"var(--mu)" }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize:".7rem", fontWeight:600, color:"var(--mu)",
              background:"var(--sf2)", border:"1px solid var(--bd)", borderRadius:8,
              padding:"4px 9px", display:"flex", alignItems:"center", gap:4 }}>
              {chartYear} <HiOutlineChevronDown style={{ fontSize:".7rem" }} />
            </div>
          </div>
          <div style={{ padding:"12px 16px 10px" }}>
            <MiniChart
              data={monthlyChart}
              bars={[
                { key:"ingresos", color:VIZ.ingresos, label:"Ingresos", fmt: compactCurrency },
                { key:"egresos",  color:VIZ.egresos,  label:"Egresos",  fmt: compactCurrency },
              ]}
              sharedScale={true}
              H={110}
            />
          </div>
        </div>

        {/* 2. Contratos firmados */}
        <div className="db-card">
          <div className="db-card-hd">
            <div>
              <div className="db-card-title">Contratos firmados</div>
              <div style={{ fontSize:".7rem", color:"var(--mu)", marginTop:4 }}>
                Contratos registrados{salesThisMonth !== null && <> · <strong style={{ color:"var(--tx)" }}>{salesThisMonth} este mes</strong></>}
              </div>
            </div>
            <div style={{ fontSize:".7rem", fontWeight:600, color:"var(--mu)",
              background:"var(--sf2)", border:"1px solid var(--bd)", borderRadius:8,
              padding:"4px 9px", display:"flex", alignItems:"center", gap:4 }}>
              {chartYear} <HiOutlineChevronDown style={{ fontSize:".7rem" }} />
            </div>
          </div>
          <div style={{ padding:"12px 16px 10px" }}>
            <MiniChart
              data={monthlyChart}
              bars={[{ key:"contratos", color:VIZ.contratos, label:"Contratos", fmt: n => String(Math.round(n)) }]}
              sharedScale={false}
              H={110}
            />
          </div>
        </div>

      </div>

      {/* ── Ventas recientes + Top vendedores ── */}
      <div className="db-row3">

        {/* Ventas recientes */}
        <div className="db-card">
          <div className="db-card-hd">
            <div className="db-card-title">Ventas recientes</div>
            <button className="db-ver-todos" onClick={() => navigate("/ventas")}>
              Ver todas <HiOutlineArrowRight />
            </button>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Cliente</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "24px 0", color: "var(--mu)", fontSize: ".8rem" }}>
                  Sin ventas recientes
                </td></tr>
              )}
              {recentSales.map(c => (
                <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => navigate("/contratos")}>
                  <td style={{ fontWeight: 700, fontSize: ".8rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: VIZ.available, flexShrink: 0 }} />
                      {c.lot?.sku || c.contract_number}
                    </div>
                  </td>
                  <td style={{ fontSize: ".8rem" }}>{c.client?.name || "—"}</td>
                  <td style={{ fontWeight: 700, fontSize: ".8rem", color: "var(--forest)" }}>{compactCurrency(c.amount)}</td>
                  <td style={{ fontSize: ".75rem", color: "var(--mu)", whiteSpace: "nowrap" }}>
                    {c.contract_date ? new Date(`${c.contract_date}T12:00:00`).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td>
                    <span className={`pc-chip ${c.status === "active" ? "paid" : c.status === "cancelled" ? "overdue" : "pending"}`}
                      style={{ fontSize: ".65rem" }}>
                      {c.status === "active" ? "Activo" : c.status === "cancelled" ? "Cancelado" : "Pendiente"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top vendedores */}
        <div className="db-card">
          <div className="db-card-hd">
            <div className="db-card-title">Top vendedores</div>
            <button className="db-ver-todos" onClick={() => navigate("/reportes")}>
              Ver todas <HiOutlineArrowRight />
            </button>
          </div>
          {teamPerf.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--mu)", fontSize: ".8rem" }}>
              Sin datos de vendedores
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Vendedor</th>
                  <th>Ventas</th>
                  <th>Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {teamPerf.slice(0, 5).map((m, i) => (
                  <tr key={m.user_id}>
                    <td style={{ width: 36 }}>
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <Avatar name={m.name} size={30} />
                        <div style={{ position: "absolute", bottom: -3, right: -3, width: 14, height: 14,
                          borderRadius: "50%", background: (i + 1) === 1 ? "var(--deep)" : (i + 1) === 2 ? "var(--mid)" : (i + 1) === 3 ? "var(--leaf)" : "var(--sf2)",
                          border: "1.5px solid var(--sf)", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "7px", fontWeight: 800, color: (i + 1) <= 3 ? "var(--cream)" : "var(--mu)" }}>
                          {i + 1}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: ".82rem" }}>{m.name}</td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{m.sales_count}</td>
                    <td style={{ fontWeight: 700, color: "var(--forest)", fontSize: ".8rem" }}>{compactCurrency(m.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* ── Acciones rápidas ── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: ".68rem", fontWeight: 800, letterSpacing: ".12em",
          textTransform: "uppercase", color: "var(--mu)", marginBottom: 10 }}>
          Acciones rápidas
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { icon: HiOutlineDocumentText, label: "Generar contrato", path: "/contratos" },
            { icon: HiOutlineSquares2X2,   label: "Ver reportes",     path: "/reportes"  },
          ].map(({ icon: Icon, label, path }) => (
            <button key={label} className="db-accion" onClick={() => navigate(path)}>
              <div className="db-accion-ico" style={{ background: "rgba(111,175,107,.14)" }}>
                <Icon style={{ fontSize: "1rem", color: "var(--mid)" }} />
              </div>
              <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--tx2)" }}>
                + {label}
              </span>
            </button>
          ))}
        </div>
      </div>
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Panel principal"
        subtitle="Vista consolidada de indicadores clave de tu negocio inmobiliario."
        steps={[
          { title: "Saludo del día", text: "Arriba ves cuántas cosas piden tu atención este mes (clientes en mora, apartados por vencer y lo que toca cobrar) y un botón que te lleva a resolver la más urgente. A un lado, lo cobrado en el mes contra el mes anterior." },
          { title: "Gráficas de tendencia", text: "Las gráficas muestran ingresos vs egresos y contratos cerrados mes a mes durante el año. Úsalas para detectar tendencias de cobranza y ventas." },
          { title: "Top vendedores", text: "Ranking mensual del equipo por número de contratos cerrados. Se actualiza en tiempo real con los contratos del mes en curso." },
          { title: "Ventas recientes", text: "Los últimos 5 contratos registrados con su cliente, fraccionamiento, monto y estado. Haz clic en 'Ver todos' para ir al repositorio completo." },
          { title: "Resumen rápido", text: "Debajo de los indicadores, lo que pide acción este mes: cuotas por cobrar, apartados que vencen y clientes en mora. Cada uno lleva a la pantalla donde se resuelve." },
          { title: "Acciones rápidas", text: "Botones directos para registrar los flujos más frecuentes: nuevo contrato, cobro de cliente, egreso operativo e incorporar nuevo cliente." },
        ]}
      />
    </>
  );
}
