import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { currency } from "@/services/formatters";
import { financeService } from "@/services/financeService";
import { useFinancePeriod } from "@/context/FinanceContext";

const fmtD = (iso) => (!iso ? "—" : new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }));
const ESTADO_LABEL = { ok: "Al día", soon: "Próximo", late: "Atrasado" };
const AGING_CHIPS = [
  ["al_dia", "Al día", 1],
  ["d1_30", "1-30d", 2],
  ["d31_60", "31-60d", 3],
  ["d61_90", "61-90d", 3],
  ["d90_mas", "90+d", 4],
];

function FinanceCuentasPorCobrar() {
  const navigate = useNavigate();
  const { contracts, payments, clients } = useAppContext();
  const { period } = useFinancePeriod();
  const [search, setSearch] = useState("");
  const [project, setProject] = useState("");
  const [filter, setFilter] = useState("all");

  // Misma fuente que el KPI del Dashboard — antes esta página recalculaba su
  // propio total con los mismos `payments`, y las dos cifras podían divergir.
  const { data: summary } = useQuery({
    queryKey: ["finance-summary", period],
    queryFn: () => financeService.summary(period),
  });

  const rows = useMemo(() => {
    const byContract = {};
    for (const p of payments) {
      const cid = p.contract?.id || p.contract_id;
      if (cid) (byContract[cid] ||= []).push(p);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return contracts
      .filter((c) => c.status === "active" && (c.total_months || c.payments_summary?.total || 0) > 0)
      .map((c) => {
        const ps = c.payments_summary || {};
        const total = c.total_months || ps.total || 0;
        const mine = byContract[c.id] || [];
        const next = mine
          .filter((p) => p.status === "pending" || p.status === "overdue")
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
        const hasOverdue = (ps.overdue || 0) > 0 || mine.some((p) => p.status === "overdue");
        let estado = "ok";
        if (hasOverdue) estado = "late";
        else if (next) {
          const days = Math.ceil((new Date(`${next.due_date}T12:00:00`) - today) / 86400000);
          if (days >= 0 && days <= 5) estado = "soon";
        }
        return {
          id: c.id,
          cli: c.client?.id,
          cliName: c.client?.name || "—",
          prop: [c.lot?.code, c.lot?.inmueble_name].filter(Boolean).join(" · ") || c.contract_number,
          proj: c.lot?.inmueble_name || "",
          paid: ps.paid || 0,
          total,
          cuota: Number(c.monthly_payment || 0),
          venc: next?.due_date || null,
          estado,
        };
      });
  }, [contracts, payments]);

  const projects = useMemo(() => [...new Set(rows.map((r) => r.proj).filter(Boolean))].sort(), [rows]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (filter === "all" || r.estado === filter) &&
          (!project || r.proj === project) &&
          (!search || `${r.cliName} ${r.prop}`.toLowerCase().includes(search.toLowerCase())),
      ),
    [rows, filter, project, search],
  );

  const waLink = (r) => {
    let d = (clients.find((c) => c.id === r.cli)?.phone || "").replace(/\D/g, "");
    if (!d) return null;
    if (d.length === 10) d = "52" + d;
    const first = (r.cliName || "").split(" ")[0];
    const msg = `Hola ${first}, te recordamos tu cuota de ${currency(r.cuota)}${r.venc ? ` con vencimiento el ${fmtD(r.venc)}` : ""}. ¡Gracias por tu pago! — OwnTerra`;
    return `https://wa.me/${d}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div>
      <div className="ot-page-head">
        <div className="ot-page-heading">
          <h1 className="ot-page-title">Cuentas por Cobrar</h1>
          <p className="ot-page-sub">
            Amortización por contrato en OwnTerra Lands — {summary ? currency(summary.accounts_receivable) : "…"} en cartera.
          </p>
        </div>
      </div>

      <div className="ot-card">
        {summary && (
          <div className="fin-aging-strip">
            {AGING_CHIPS.map(([key, label, severity]) => (
              <div key={key} className={`fin-aging-chip severity-${severity}`}>
                <div className="lbl">{label}</div>
                <div className="val">{currency(summary.receivables_aging[key])}</div>
              </div>
            ))}
          </div>
        )}
        <div className="fin-toolbar">
          <label className="fin-search">
            <span>🔎</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente o lote…" />
          </label>
          <select className="fin-field" value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="">Todos los proyectos</option>
            {projects.map((pj) => (
              <option key={pj} value={pj}>{pj}</option>
            ))}
          </select>
          <div className="fin-pills">
            {[["all", "Todos", ""], ["ok", "Al día", "ok"], ["soon", "Próximos", "soon"], ["late", "Atrasados", "late"]].map(([f, lbl, cls]) => (
              <button key={f} className={`fin-pill ${cls} ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>{lbl}</button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="fin-table">
            <thead>
              <tr>
                <th>Cliente / Propiedad</th>
                <th>Progreso (meses)</th>
                <th>Cuota mensual</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="fin-empty">Sin contratos para este filtro.</td></tr>
              )}
              {filtered.map((r) => {
                const pct = r.total ? Math.min(Math.round((r.paid / r.total) * 100), 100) : 0;
                const link = waLink(r);
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="fin-cli">{r.cliName}</div>
                      <div className="fin-prop">{r.prop}</div>
                    </td>
                    <td>
                      <div className="fin-prog">
                        <div className={`fin-bar ${r.estado}`}><i style={{ width: `${pct}%` }} /></div>
                        <span className="fin-prog-n">{r.paid}/{r.total}</span>
                      </div>
                    </td>
                    <td className="fin-amt">{currency(r.cuota)}</td>
                    <td className={`fin-venc ${r.estado === "late" ? "late" : ""}`}>{r.venc ? fmtD(r.venc) : "—"}</td>
                    <td><span className={`fin-badge ${r.estado}`}>{ESTADO_LABEL[r.estado]}</span></td>
                    <td>
                      <div className="fin-acts">
                        <button className="fin-ico pay" title="Registrar pago en OwnTerra Lands" onClick={() => navigate("/pagos")}>＄</button>
                        {link ? (
                          <a className="fin-ico wa" href={link} target="_blank" rel="noreferrer" title="Recordatorio por WhatsApp">✆</a>
                        ) : (
                          <button className="fin-ico" title="Sin teléfono del cliente" disabled style={{ opacity: 0.4, cursor: "default" }}>✆</button>
                        )}
                        <button className="fin-ico" title="Historial de amortización" onClick={() => navigate("/finanzas/reportes")}>☰</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default FinanceCuentasPorCobrar;
