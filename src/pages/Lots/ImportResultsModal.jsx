import { createPortal } from "react-dom";
import { HiCheckCircle, HiExclamationTriangle } from "react-icons/hi2";
import useEscapeKey from "@/hooks/useEscapeKey";

const BD = "#E7E4DB";
const ERR = "#dc2626";
const WARN = "#92400e";

/**
 * Detalle fila-por-fila de un import de lotes (Excel/CSV): antes de esto, un error se
 * mostraba solo como un toast genérico con el primer mensaje, sin decir en qué fila ni
 * en qué columna estaba el problema — el usuario no tenía forma de saber qué corregir.
 * El backend ya trae `row`/`field`/`raw_value` por cada error (ver csv_importer.py); esto
 * solo los hace visibles.
 */
export default function ImportResultsModal({ open, onClose, summary }) {
  useEscapeKey(onClose, open);

  if (!open || !summary) return null;

  const errors = summary.errors || [];
  const warnings = summary.warnings || [];
  const rows = [
    ...errors.map((e) => ({ ...e, kind: "error" })),
    ...warnings.map((w) => ({ ...w, kind: "warning" })),
  ].sort((a, b) => (a.row ?? 0) - (b.row ?? 0));

  return createPortal(
    <div className="guide-overlay" onClick={onClose}>
      <div
        className="guide-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Resultado de la importación"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640, width: "min(95vw, 640px)" }}
      >
        <div className="guide-head">
          <div
            className="guide-icon"
            style={{ background: errors.length ? ERR : "#355E3B", color: "white", fontSize: "1rem", minWidth: 40, height: 40 }}
          >
            {errors.length ? <HiExclamationTriangle className="h-5 w-5" /> : <HiCheckCircle className="h-5 w-5" />}
          </div>
          <div className="guide-head-text">
            <div className="guide-title">Resultado de la importación</div>
            <div className="guide-sub">
              {summary.fileName ? `${summary.fileName} · ` : ""}
              {summary.imported} listo{summary.imported === 1 ? "" : "s"}
              {summary.failed ? ` · ${summary.failed} con error${summary.failed === 1 ? "" : "es"}` : ""}
              {warnings.length ? ` · ${warnings.length} advertencia${warnings.length === 1 ? "" : "s"}` : ""}
            </div>
          </div>
          <button className="guide-close-x" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="guide-body" style={{ padding: "12px 16px" }}>
          {rows.length === 0 ? (
            <p style={{ fontSize: "0.84rem", color: "#43453F" }}>
              Todas las filas se procesaron sin problemas.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr>
                    {["Fila", "Columna", "Detalle"].map((h) => (
                      <th key={h} style={{
                        padding: "6px 10px", background: "#F1EEE6", color: "#43453F",
                        fontWeight: 700, textAlign: "left", borderBottom: `1px solid ${BD}`,
                        whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#FBFAF6" }}>
                      <td style={{ padding: "6px 10px", borderBottom: `1px solid ${BD}`, color: "#43453F", whiteSpace: "nowrap" }}>
                        {r.row ?? "—"}
                      </td>
                      <td style={{ padding: "6px 10px", borderBottom: `1px solid ${BD}`, color: "#43453F", whiteSpace: "nowrap" }}>
                        {r.field ?? "—"}
                      </td>
                      <td style={{ padding: "6px 10px", borderBottom: `1px solid ${BD}`, color: r.kind === "error" ? ERR : WARN }}>
                        {r.message}
                        {r.raw_value ? <span style={{ color: "#83867C" }}> (valor: "{r.raw_value}")</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="guide-foot">
          <button className="guide-ok" onClick={onClose}>Entendido</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
