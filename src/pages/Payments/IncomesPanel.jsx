import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { HiOutlineBanknotes, HiOutlineHomeModern } from "react-icons/hi2";
import { incomeService, INCOME_CAT } from "@/services/incomeService";

/* Todo el dinero que entra, en una sola vista: la cobranza de lotes —que vive en
   la caja de cobros— junto a los ingresos que no vienen de un lote. No se copian
   entre sí; se leen de sus dos fuentes y se presentan juntos. */

const money = (n) =>
  Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });

const fecha = (d) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function IncomesPanel({ onMarcarRecibido }) {
  const manuales = useQuery({
    queryKey: ["incomes"],
    queryFn: () => incomeService.list({ limit: 200 }).then(r => r.items),
  });
  const cobranza = useQuery({
    queryKey: ["incomes", "collections"],
    queryFn: () => incomeService.collections(6),
  });

  const filas = useMemo(() => {
    const a = (manuales.data || []).map(i => ({ ...i, origin: "manual" }));
    const b = cobranza.data || [];
    return [...a, ...b].sort((x, y) =>
      String(y.received_date || y.due_date).localeCompare(String(x.received_date || x.due_date)));
  }, [manuales.data, cobranza.data]);

  if (manuales.isError || cobranza.isError) {
    return <div style={{ padding: "18px 20px", color: "var(--mu)", fontSize: ".85rem" }}>
      No se pudieron cargar los ingresos.
    </div>;
  }
  if (manuales.isPending || cobranza.isPending) {
    return <div style={{ padding: "18px 20px", color: "var(--mu)", fontSize: ".85rem" }}>Cargando…</div>;
  }
  if (filas.length === 0) {
    return <div style={{ padding: "18px 20px", color: "var(--mu)", fontSize: ".85rem" }}>
      Todavía no hay ingresos registrados este periodo.
    </div>;
  }

  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Origen</th>
          <th>Concepto</th>
          <th>Cliente</th>
          <th style={{ textAlign: "right" }}>Monto</th>
          <th>Fecha</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        {filas.map(f => {
          const esLote = f.origin === "lot";
          const recibido = f.status === "received";
          return (
            <tr key={`${f.origin}-${f.id}`}>
              <td>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6,
                               fontSize: ".78rem", fontWeight: 600,
                               color: esLote ? "var(--mid)" : "var(--tx2)" }}>
                  {esLote ? <HiOutlineHomeModern /> : <HiOutlineBanknotes />}
                  {esLote ? "Cobranza de lote" : INCOME_CAT[f.categoria] || "Otro"}
                </span>
              </td>
              <td style={{ fontSize: ".84rem" }}>{f.concepto}</td>
              <td style={{ fontSize: ".82rem", color: "var(--mu)" }}>{f.client_name || "—"}</td>
              <td style={{ textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums",
                           color: recibido ? "var(--mid)" : "var(--tx2)" }}>
                {money(f.monto)}
              </td>
              <td style={{ fontSize: ".8rem", color: "var(--mu)", whiteSpace: "nowrap" }}>
                {fecha(f.received_date || f.due_date)}
              </td>
              <td>
                {recibido ? (
                  <span className="pc-chip paid">RECIBIDO</span>
                ) : (
                  <button className="btn-s" onClick={() => onMarcarRecibido?.(f)}
                    style={{ padding: "5px 11px", fontSize: ".74rem", fontWeight: 700 }}>
                    Marcar recibido
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
