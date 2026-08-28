import { useQuery } from "@tanstack/react-query";
import {
  HiOutlineBanknotes, HiOutlineShoppingBag, HiOutlineCube,
  HiOutlineTag, HiOutlineSquare3Stack3D, HiOutlineUserGroup,
} from "react-icons/hi2";
import { dashboardService } from "@/services/dashboardService";

/* Cifras del panel general. Vienen agregadas del backend: calcularlas sumando
   las listas que el front trae paginadas dejaba los totales cortos en cuanto la
   organización pasaba el tope de cada consulta. */

const money = (n) =>
  Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 1 });

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
    <div className="hub-kpi">
      <span className="hub-kpi-ico" style={{ background: `${tono}22`, color: tono }}>{icono}</span>
      <div className="hub-kpi-body">
        <span className="hub-kpi-lbl">{label}</span>
        <span className="hub-kpi-val">{valor}</span>
        <span className="hub-kpi-sub">{detalle}</span>
        {hay && (
          <span className={`hub-kpi-delta ${!sube && !baja ? "flat" : bueno ? "up" : "down"}`}>
            {sube ? "▲" : baja ? "▼" : "—"} {Math.abs(delta).toFixed(1)}%
            <em>vs. mes anterior</em>
          </span>
        )}
        <Spark serie={serie} tono={tono} />
      </div>
    </div>
  );
}

export default function HubKpis() {
  const { data, isError, isPending } = useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: () => dashboardService.kpis(6),
    retry: (n, err) => err?.response?.status !== 403 && n < 2,
  });

  if (isPending) return <div className="hub-kpis-msg">Cargando cifras…</div>;
  // Un cero es indistinguible de "no hay nada": si falló, se dice.
  if (isError || !data) return <div className="hub-kpis-msg">No se pudieron cargar las cifras.</div>;

  const t = { verde: "#6FAF6B", bosque: "#355E3B", ambar: "#C98A2B", azul: "#4B77BE", morado: "#8B72C4" };

  return (
    <div className="hub-kpis">
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
  );
}
