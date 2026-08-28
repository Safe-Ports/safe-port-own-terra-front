import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineDocumentText, HiOutlineBanknotes, HiOutlineClock, HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import { dashboardService } from "@/services/dashboardService";

/* Bandeja de pendientes del mes. A diferencia de las cifras de arriba —que
   cuentan cómo viene el mes— esto es lo que espera por alguien, así que cada
   item lleva a la pantalla donde se resuelve. */

const ESTILOS = `
  .qs-wrap { background:var(--sf); border:1px solid var(--bd); border-radius:16px;
    padding:14px 6px; box-shadow:var(--sh); margin-bottom:18px; }
  .qs-hd { font-size:.66rem; font-weight:800; letter-spacing:.12em; text-transform:uppercase;
    color:var(--mu); padding:0 14px; margin-bottom:12px; }
  .qs-row { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); }
  .qs-item { display:flex; gap:11px; align-items:center; padding:2px 14px; min-width:0;
    border-left:1px solid var(--bd); background:none; border-top:0; border-right:0;
    border-bottom:0; font:inherit; text-align:left; cursor:pointer; }
  .qs-item:first-child { border-left:0; }
  .qs-item:hover .qs-val { color:var(--forest); }
  .qs-item:disabled { cursor:default; }
  .qs-ico { width:36px; height:36px; border-radius:11px; display:grid; place-items:center;
    font-size:1.05rem; flex-shrink:0; }
  .qs-body { display:flex; flex-direction:column; min-width:0; }
  .qs-lbl { font-size:.74rem; color:var(--tx2); white-space:nowrap; overflow:hidden;
    text-overflow:ellipsis; }
  .qs-val { font-size:1.4rem; font-weight:800; color:var(--tx); line-height:1.15;
    font-variant-numeric:tabular-nums; }
  .qs-sub { font-size:.66rem; color:var(--mu); white-space:nowrap; overflow:hidden;
    text-overflow:ellipsis; }
  @media (max-width:900px){
    .qs-row { grid-template-columns:repeat(2,minmax(0,1fr)); row-gap:14px; }
    .qs-item:nth-child(3) { border-left:0; }
  }
`;

const money = (n) =>
  Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

export default function QuickSummary() {
  const navigate = useNavigate();
  const { data, isError } = useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: () => dashboardService.kpis(6),
    retry: (n, err) => err?.response?.status !== 403 && n < 2,
  });

  if (isError || !data?.quick) return null;
  const q = data.quick;

  const items = [
    { k: "ap", ico: <HiOutlineDocumentText />, tono: "#6FAF6B",
      label: "Contratos pendientes", valor: q.pending_approval.value,
      sub: q.pending_approval.detail, ir: "/contratos" },
    { k: "co", ico: <HiOutlineBanknotes />, tono: "#355E3B",
      label: "Por cobrar este mes", valor: q.due_this_month.value,
      sub: money(q.due_this_month.amount), ir: "/pagos" },
    { k: "re", ico: <HiOutlineClock />, tono: "#C98A2B",
      label: "Apartados por vencer", valor: q.reservations_expiring.value,
      sub: q.reservations_expiring.detail, ir: "/lotes" },
    { k: "mo", ico: <HiOutlineExclamationTriangle />, tono: "#C0392B",
      label: "Clientes en mora", valor: q.overdue_clients.value,
      sub: q.overdue_clients.detail, ir: "/pagos" },
  ];

  return (
    <>
      <style>{ESTILOS}</style>
      <div className="qs-wrap">
        <div className="qs-hd">Resumen rápido</div>
        <div className="qs-row">
          {items.map(it => (
            <button key={it.k} className="qs-item" onClick={() => navigate(it.ir)}
              disabled={!it.valor} aria-label={`${it.label}: ${it.valor}`}>
              <span className="qs-ico" style={{ background: `${it.tono}1F`, color: it.tono }}>{it.ico}</span>
              <span className="qs-body">
                <span className="qs-lbl">{it.label}</span>
                <span className="qs-val">{it.valor}</span>
                <span className="qs-sub">{it.sub}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
