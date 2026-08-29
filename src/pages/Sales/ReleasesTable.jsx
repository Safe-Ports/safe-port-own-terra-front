import { useQuery } from "@tanstack/react-query";
import { HiArrowUturnLeft, HiOutlineClock } from "react-icons/hi2";
import { contractService } from "@/services/contractService";

/* Lotes que volvieron al inventario. Dos caminos con la misma consecuencia:
   cancelar un contrato —que arrastra dinero y hay que liquidar— o soltar un
   apartado, que no mueve nada y por eso un vendedor puede hacerlo solo. */

const money = (n) =>
  Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });

const fecha = (d) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* Antes eran tres columnas de dinero —cobrado, devuelto, retenido— y en los
   apartados dos quedaban siempre vacías, así que parecían lo mismo. Ahora el
   monto va solo y el destino se cuenta en una frase. */
function destino(f, hubo) {
  if (!hubo) {
    return <span style={{ fontSize: ".76rem", color: "var(--mu)" }}>No se cobró nada</span>;
  }
  if (!f.settled) {
    return (
      <span style={{ fontSize: ".76rem", fontWeight: 700, color: "#b0791f" }}>
        Sin resolver — falta decidir si se devuelve o se retiene
      </span>
    );
  }
  const partes = [];
  if (Number(f.refunded) > 0) partes.push(`${money(f.refunded)} devuelto al cliente`);
  if (Number(f.retained) > 0) partes.push(`${money(f.retained)} retenido`);
  return (
    <span style={{ fontSize: ".76rem", color: "var(--tx2)" }}>
      {partes.length ? partes.join(" · ") : "Liquidado"}
    </span>
  );
}

export default function ReleasesTable() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["contracts", "releases"],
    queryFn: () => contractService.releases(50),
    retry: (n, err) => err?.response?.status !== 403 && n < 2,
  });

  if (isError) return null;

  const filas = data || [];
  const porLiquidar = filas.filter(f => !f.settled).length;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-hd">
        <div className="card-title">
          <HiArrowUturnLeft style={{ display: "inline", verticalAlign: "-2px" }} /> Lotes liberados
        </div>
        {porLiquidar > 0 && (
          <span style={{ fontSize: ".76rem", fontWeight: 700, color: "#b0791f",
            background: "rgba(201,138,43,.16)", borderRadius: 999, padding: "4px 11px" }}>
            {porLiquidar} sin liquidar
          </span>
        )}
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {isPending ? (
          <div style={{ padding: "18px 20px", color: "var(--mu)", fontSize: ".85rem" }}>Cargando…</div>
        ) : filas.length === 0 ? (
          <div style={{ padding: "18px 20px", color: "var(--mu)", fontSize: ".85rem" }}>
            Todavía no se liberó ningún lote.
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Motivo</th>
                <th>Lote</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th style={{ textAlign: "right" }}>Cobrado</th>
                <th>Qué se hizo con ese dinero</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => {
                const esContrato = f.kind === "contract";
                const hubo = Number(f.collected) > 0;
                return (
                  <tr key={`${f.kind}-${f.contract_id || i}-${f.date}`}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6,
                        fontSize: ".8rem", fontWeight: 600 }}>
                        {esContrato ? <HiArrowUturnLeft /> : <HiOutlineClock />}
                        {esContrato ? "Contrato cancelado" : "Apartado liberado"}
                      </span>
                      {esContrato && f.contract_number && (
                        <div style={{ fontSize: ".72rem", color: "var(--mu)" }}>{f.contract_number}</div>
                      )}
                    </td>
                    <td style={{ fontSize: ".82rem" }}>{f.lot_label || "—"}</td>
                    <td style={{ fontSize: ".82rem" }}>{f.client_name || "—"}</td>
                    <td style={{ fontSize: ".8rem", color: "var(--mu)", whiteSpace: "nowrap" }}>{fecha(f.date)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {hubo ? money(f.collected) : "—"}
                    </td>
                    <td>{destino(f, hubo)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
