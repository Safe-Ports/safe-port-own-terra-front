import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HiArrowUturnLeft, HiOutlineClock } from "react-icons/hi2";
import { contractService } from "@/services/contractService";
import FilePicker from "@/components/shared/FilePicker";
import Button from "@/components/Button";

/* Lotes que volvieron al inventario. Dos caminos con la misma consecuencia:
   cancelar un contrato —que arrastra dinero y hay que liquidar— o soltar un
   apartado, que no mueve nada y por eso un vendedor puede hacerlo solo. */

const money = (n) =>
  Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });

const fecha = (d) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* Solo se pide lo devuelto: lo retenido es la diferencia contra lo cobrado.
   Pedir los dos invita a que no cuadren, y quien liquida sabe cuánto entregó. */
function SettleModal({ fila, onClose, onDone }) {
  const cobrado = Number(fila.collected || 0);
  const [monto, setMonto] = useState(String(cobrado));
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const val = Number(monto);
  const invalido = monto === "" || isNaN(val) || val < 0;
  const retenido = Math.max(cobrado - (invalido ? 0 : val), 0);

  const guardar = async () => {
    if (invalido) { setErr("Ingresa cuánto se devolvió (puede ser $0)."); return; }
    if (val > cobrado + 0.001) { setErr(`No se puede devolver más de ${money(cobrado)}.`); return; }
    setBusy(true);
    try {
      await contractService.settleRelease({
        kind: fila.kind,
        refId: fila.kind === "contract" ? fila.contract_id : fila.lot_id,
        refunded: Number(val.toFixed(2)),
        file,
      });
      onDone();
    } catch {
      setErr("No se pudo registrar la devolución.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div className="modal-hd">
          <div style={{ flex: 1 }}>
            <div className="modal-title" style={{ fontSize: "1.25rem" }}>Registrar devolución</div>
            <div className="modal-sub">{fila.lot_label} · {fila.client_name || "sin cliente"}</div>
          </div>
        </div>
        <div className="modal-body">
          <div style={{ background: "var(--sf2)", borderRadius: 12, padding: "12px 14px",
                        marginBottom: 14, display: "flex", justifyContent: "space-between", fontSize: ".84rem" }}>
            <span style={{ color: "var(--mu)" }}>El cliente entregó</span>
            <span style={{ fontWeight: 800 }}>{money(cobrado)}</span>
          </div>

          <div className="fg">
            <label className="fl">¿Cuánto se le devolvió?</label>
            <input className={`fi ${err ? "is-invalid" : ""}`} type="number" min="0" step="0.01"
              value={monto} onChange={(e) => { setMonto(e.target.value); setErr(""); }} autoFocus />
            {err && <div style={{ marginTop: 6, fontSize: ".76rem", color: "var(--danger)" }}>{err}</div>}
            {!err && !invalido && (
              <div style={{ marginTop: 6, fontSize: ".76rem", fontWeight: 600,
                            color: retenido > 0 ? "#b0791f" : "#2F6A38" }}>
                {retenido > 0
                  ? `Se dan por retenidos ${money(retenido)}`
                  : "Se devuelve todo, no queda nada retenido"}
              </div>
            )}
          </div>

          <div className="fg">
            <label className="fl">Comprobante (opcional)</label>
            <FilePicker value={file} onChange={setFile}
              accept="application/pdf,image/jpeg,image/png,image/webp"
              hint="PDF o imagen. Puedes registrarlo ahora y subir el papel después." />
          </div>
        </div>
        <div className="modal-foot">
          <Button variant="secondary" style={{ flex: 1 }} onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" style={{ flex: 2 }} onClick={guardar} disabled={busy}>
            {busy ? "Guardando…" : "Registrar devolución"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ReleasesTable() {
  const qc = useQueryClient();
  const [liquidando, setLiquidando] = useState(null);
  const { data, isPending, isError } = useQuery({
    queryKey: ["contracts", "releases"],
    queryFn: () => contractService.releases(50),
    retry: (n, err) => err?.response?.status !== 403 && n < 2,
  });

  if (isError) return null;

  const filas = data || [];
  const porLiquidar = filas.filter(f => !f.settled).length;

  return (
    <>
    {liquidando && (
      <SettleModal fila={liquidando} onClose={() => setLiquidando(null)}
        onDone={() => { setLiquidando(null); qc.invalidateQueries({ queryKey: ["contracts", "releases"] }); }} />
    )}
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
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#2f5fa8" }}>
                      {hubo && f.settled ? money(f.refunded) : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#b0791f" }}>
                      {hubo && f.settled ? money(f.retained) : "—"}
                    </td>
                    <td>
                      {!hubo ? (
                        <span style={{ fontSize: ".74rem", color: "var(--mu)" }}>Sin dinero</span>
                      ) : f.settled ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: ".74rem", fontWeight: 700, color: "#2F6A38" }}>Liquidado</span>
                          {f.receipt_url && (
                            <a href={f.receipt_url} target="_blank" rel="noreferrer"
                               style={{ fontSize: ".72rem", color: "var(--earth)" }}>comprobante</a>
                          )}
                        </span>
                      ) : (
                        <button className="btn-s" onClick={() => setLiquidando(f)}
                          style={{ padding: "5px 11px", fontSize: ".74rem", fontWeight: 700,
                                   color: "#b0791f", borderColor: "rgba(201,138,43,.4)" }}>
                          Registrar devolución
                        </button>
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
    </>
  );
}
