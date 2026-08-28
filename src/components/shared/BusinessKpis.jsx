import { useQuery } from "@tanstack/react-query";
import {
  HiOutlineBanknotes, HiOutlineShoppingBag, HiOutlineCube,
  HiOutlineTag, HiOutlineSquare3Stack3D, HiOutlineUserGroup,
} from "react-icons/hi2";
import { dashboardService } from "@/services/dashboardService";

/* Cifras del negocio, compartidas por el dashboard de Lands y el hub. Vienen
   agregadas del backend: calcularlas sumando las listas que el front trae
   paginadas dejaba los totales cortos en cuanto la organización pasaba el tope
   de cada consulta. */

const money = (n) =>
  Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 1 });

const ESTILOS = `
  .biz-kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr));
    gap:12px; margin-bottom:18px; }
  .biz-kpi { display:flex; gap:12px; background:var(--sf); border:1px solid var(--bd);
    border-radius:16px; padding:14px 16px; box-shadow:var(--sh); }
  .biz-kpi-ico { width:40px; height:40px; border-radius:12px; display:grid;
    place-items:center; font-size:1.15rem; flex-shrink:0; }
  .biz-kpi-body { display:flex; flex-direction:column; min-width:0; flex:1; }
  .biz-kpi-lbl { font-size:.66rem; font-weight:700; letter-spacing:.08em;
    text-transform:uppercase; color:var(--mu); }
  .biz-kpi-val { font-size:1.55rem; font-weight:800; color:var(--tx); line-height:1.15;
    margin-top:3px; font-variant-numeric:tabular-nums; }
  .biz-kpi-sub { font-size:.74rem; color:var(--mu); margin-top:2px; }
  .biz-kpi-delta { display:inline-flex; align-items:center; gap:5px; align-self:flex-start;
    margin-top:7px; padding:2px 8px; border-radius:999px; font-size:.68rem; font-weight:700;
    font-variant-numeric:tabular-nums; }
  .biz-kpi-delta em { font-style:normal; font-weight:600; color:var(--mu); font-size:.64rem; }
  .biz-kpi-delta.up { background:rgba(111,175,107,.16); color:#2F6A38; }
  .biz-kpi-delta.down { background:rgba(201,138,43,.16); color:#b0791f; }
  .biz-kpi-delta.flat { background:var(--sf2); color:var(--mu); }
  .biz-kpis-msg { color:var(--mu); font-size:.82rem; margin-bottom:18px; }
  @media (max-width:1100px){ .biz-kpis { grid-template-columns:repeat(3,1fr); } }
  @media (max-width:640px){ .biz-kpis { grid-template-columns:repeat(2,1fr); } }
`;

function Spark({ serie = [], tono }) {
  if (serie.length < 2) return null;
  const W = 200, H = 34, P = 2;
  const max = Math.max(...serie), min = Math.min(...serie);
  const rango = max - min || 1;
  const x = (i) => P + (i * (W - P * 2)) / (serie.length - 1);
  const y = (v) => H - P - ((v - min) / rango) * (H - P * 2);
  const d = serie.map((v, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="34" preserveAspectRatio="none"
         aria-hidden="true" style={{ display: "block", marginTop: 10 }}>
      <path d={d} fill="none" stroke={tono} strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(serie.length - 1)} cy={y(serie[serie.length - 1])} r="3" fill={tono} />
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
          <span className={`biz-kpi-delta ${!sube && !baja ? "flat" : bueno ? "up" : "down"}`}>
            {sube ? "▲" : baja ? "▼" : "—"} {Math.abs(delta).toFixed(1)}%
            <em>vs. mes anterior</em>
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

  const t = { verde: "#6FAF6B", bosque: "#355E3B", ambar: "#C98A2B", azul: "#4B77BE", morado: "#8B72C4" };

  return (
    <>
    <style>{ESTILOS}</style>
    <div className="biz-kpis">
      <Card icono={<HiOutlineBanknotes />} tono={t.verde} label="Ingresos del mes"
        valor={money(data.revenue.value)} detalle={data.revenue.detail}
        delta={data.revenue.delta} serie={data.revenue.series} />
      <Card icono={<HiOutlineShoppingBag />} tono={t.verde} label="Ventas del mes"
        valor={data.sales.value} detalle={data.sales.detail}
        delta={data.sales.delta} serie={data.sales.series} />
      <Card icono={<HiOutlineCube />} tono={t.bosque} label="Lotes disponibles"
        valor={data.lots_available.value} detalle={data.lots_available.detail}
        delta={data.lots_available.delta} serie={data.lots_available.series} />
      <Card icono={<HiOutlineTag />} tono={t.ambar} label="Lotes vendidos"
        valor={data.lots_sold.value} detalle={data.lots_sold.detail}
        delta={data.lots_sold.delta} serie={data.lots_sold.series} />
      <Card icono={<HiOutlineSquare3Stack3D />} tono={t.azul} label="Inventario total"
        valor={data.lots_total.value} detalle={data.lots_total.detail}
        delta={data.lots_total.delta} serie={data.lots_total.series} />
      <Card icono={<HiOutlineUserGroup />} tono={t.morado} label="Contratos activos"
        valor={data.contracts.value} detalle={data.contracts.detail}
        delta={data.contracts.delta} serie={data.contracts.series} />
    </div>
    </>
  );
}
