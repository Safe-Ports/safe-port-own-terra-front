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
                <th style={{ textAlign: "right" }}>Devuelto</th>
                <th style={{ textAlign: "right" }}>Retenido</th>
                <th>Liquidación</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => {
                const esContrato = f.kind === "contract";
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
                      {esContrato ? money(f.collected) : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {esContrato ? money(f.refunded) : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {esContrato ? money(f.retained) : "—"}
                    </td>
                    <td>
                      {f.settled ? (
                        <span style={{ fontSize: ".74rem", fontWeight: 700, color: "#2F6A38" }}>
                          {esContrato ? "Liquidado" : "Sin dinero"}
                        </span>
                      ) : (
                        <span style={{ fontSize: ".74rem", fontWeight: 700, color: "#b0791f" }}>
                          Pendiente de liquidar
                        </span>
                      )}
                    </td>
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
