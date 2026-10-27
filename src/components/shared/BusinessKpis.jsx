import { useQuery } from "@tanstack/react-query";
import { HiOutlineBanknotes } from "react-icons/hi2";
import { dashboardService } from "@/services/dashboardService";

/* Cobrado del mes, junto al saludo de la Actividad de Lands. La cifra viene
   agregada del backend: calcularla sumando las listas que el front trae
   paginadas la dejaba corta en cuanto la organización pasaba el tope de cada
   consulta. Ventas, lotes e inventario salieron de aquí: el inventario se ve en
   Fraccionamientos y el saludo resume lo que pide atención. */

const money = (n) =>
  Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 1 });

const ESTILOS = `
  .biz-kpi { display:flex; gap:12px; height:100%; box-sizing:border-box; background:var(--sf);
    border:1px solid var(--bd); border-radius:24px; padding:22px 24px; box-shadow:var(--sh); min-width:0; }
  .biz-kpi-ico { width:38px; height:38px; border-radius:11px; display:grid;
    place-items:center; font-size:1.1rem; flex-shrink:0; }
  .biz-kpi-body { display:flex; flex-direction:column; justify-content:center; min-width:0; flex:1; }
  .biz-kpi-lbl { font-size:.66rem; font-weight:700; letter-spacing:.08em;
    text-transform:uppercase; color:var(--mu); }
  .biz-kpi-val { font-size:2rem; font-weight:800; color:var(--tx); line-height:1.15;
    margin-top:4px; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
  .biz-kpi-sub { font-size:.78rem; color:var(--mu); }
  .biz-kpi-delta { display:inline-flex; align-items:center; gap:4px; align-self:flex-start;
    margin-top:8px; padding:2px 8px; border-radius:999px; font-size:.7rem; font-weight:700;
    font-variant-numeric:tabular-nums; }
  .biz-kpi-delta.up { background:rgba(111,175,107,.16); color:#2F6A38; }
  .biz-kpi-delta.down { background:rgba(201,138,43,.16); color:#b0791f; }
  .biz-kpi-delta.flat { background:var(--sf2); color:var(--mu); }
  .biz-kpis-msg { display:grid; place-items:center; height:100%; min-height:120px; box-sizing:border-box;
    background:var(--sf); border:1px solid var(--bd); border-radius:24px; color:var(--mu); font-size:.82rem; }
`;

function Spark({ serie = [], tono }) {
  if (serie.length < 2) return null;
  const W = 200, H = 22, P = 2;
  const max = Math.max(...serie), min = Math.min(...serie);
  const rango = max - min || 1;
  const x = (i) => P + (i * (W - P * 2)) / (serie.length - 1);
  const y = (v) => H - P - ((v - min) / rango) * (H - P * 2);
  const d = serie.map((v, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="40" preserveAspectRatio="none"
         aria-hidden="true" style={{ display: "block", marginTop: 14 }}>
      <path d={d} fill="none" stroke={tono} strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(serie.length - 1) - 1} cy={y(serie[serie.length - 1])} r="2.5" fill={tono} />
    </svg>
  );
}

function Card({ icono, tono, label, valor, detalle, delta, serie, invertido }) {
  const hay = delta !== null && delta !== undefined && isFinite(delta);
  const sube = hay && delta > 0.05;
  const baja = hay && delta < -0.05;
  const bueno = invertido ? baja : sube;

  return (
    <div className="biz-kpi">
      <span className="biz-kpi-ico" style={{ background: `${tono}22`, color: tono }}>{icono}</span>
      <div className="biz-kpi-body">
        <span className="biz-kpi-lbl">{label}</span>
        <span className="biz-kpi-val">{valor}</span>
        <span className="biz-kpi-sub">{detalle}</span>
        {hay && (
          <span className={`biz-kpi-delta ${!sube && !baja ? "flat" : bueno ? "up" : "down"}`}
            title="Contra el mes anterior">
            {sube ? "▲" : baja ? "▼" : "—"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        <Spark serie={serie} tono={tono} />
      </div>
    </div>
  );
}

export default function BusinessKpis() {
  const { data, isError, isPending } = useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: () => dashboardService.kpis(6),
    retry: (n, err) => err?.response?.status !== 403 && n < 2,
  });

  if (isPending) return <><style>{ESTILOS}</style><div className="biz-kpis-msg">Cargando cifras…</div></>;
  // Un cero es indistinguible de "no hay nada": si falló, se dice.
  if (isError || !data) return <><style>{ESTILOS}</style><div className="biz-kpis-msg">No se pudieron cargar las cifras.</div></>;

  return (
    <>
    <style>{ESTILOS}</style>
    <Card icono={<HiOutlineBanknotes />} tono="#6FAF6B" label="Cobrado del mes"
      valor={money(data.revenue.value)} detalle={data.revenue.detail}
      delta={data.revenue.delta} serie={data.revenue.series} />
    </>
  );
}
