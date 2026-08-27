import { useMemo, useState } from "react";
import { HiArrowDownTray } from "react-icons/hi2";
import { lotService } from "@/services/lotService";
import { measure } from "@/services/formatters";

/**
 * Encabezados de la plantilla de importación, en su orden exacto.
 *
 * La fuente de verdad es `_TEMPLATE_HEADERS` del backend (csv_importer.py) —
 * esta copia solo pinta la tabla; el archivo que se descarga lo genera el
 * backend con esa constante, así que no pueden quedar desalineados en el
 * archivo aunque esta lista se olvide de actualizar.
 */
const HEADERS = [
  "ID Lote", "Fraccionamiento", "Estado", "Precio Contado", "Precio Financiado",
  "Frente (ML)", "Fondo (ML)", "Superficie (m2)",
  "Agua Potable", "Energía Eléctrica", "Drenaje", "Gas Natural", "Internet/Fibra", "Pavimento",
  "Vendedor Asignado",
];

/** Servicios en el mismo orden en que aparecen en la plantilla. */
const SERVICE_KEYS = ["agua", "luz", "drenaje", "gas", "internet", "pavimento"];

const STATUS_ES = { available: "disponible", reserved: "apartado", sold: "vendido" };
const STATUS_CLS = { available: "ok", reserved: "wr", sold: "sd" };

/** Importe con separador de miles; vacío si no hay dato. */
function money(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n.toLocaleString("es-MX");
}

/**
 * Los lotes en el mismo formato que pide la plantilla de Excel: las 15 columnas,
 * con sus nombres y su orden. Sirve para revisar todo el fraccionamiento de un
 * vistazo y para bajar un archivo que se puede editar y volver a subir.
 */
export default function MatrixSheet({ lots, fracId, fracName, loading, showError }) {
  const [downloading, setDownloading] = useState(null);

  const missing = useMemo(
    () => lots.filter((l) => !l.area_m2 && !l.price_contado).length,
    [lots]
  );

  const download = async (format) => {
    if (downloading) return;
    setDownloading(format);
    try {
      const blob = await lotService.matrixExport({ inmueble_id: fracId, format });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(fracName || "lotes").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError(err, "No se pudo descargar el archivo");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <article className="frac-panel">
      <div className="frac-panel-head">
        <div>
          <div className="frac-panel-title">Vista matriz</div>
          <div className="frac-panel-sub">
            {lots.length} lote{lots.length === 1 ? "" : "s"} · mismas columnas que la plantilla de importación
            {missing > 0 ? ` · ${missing} sin medidas ni precio` : ""}
          </div>
        </div>
        <div className="mx-actions">
          <button className="mx-btn" onClick={() => download("csv")} disabled={!!downloading}>
            {downloading === "csv" ? "Generando…" : "CSV"}
          </button>
          <button className="mx-btn primary" onClick={() => download("xlsx")} disabled={!!downloading}>
            <HiArrowDownTray />
            {downloading === "xlsx" ? "Generando…" : "Descargar Excel"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="frac-empty">Cargando lotes...</div>
      ) : lots.length === 0 ? (
        <div className="frac-empty">No hay lotes que coincidan con los filtros.</div>
      ) : (
        <div className="mx-wrap">
          <table className="mx-table">
            <thead>
              <tr>
                {HEADERS.map((h, i) => (
                  <th key={h} className={i === 0 ? "mx-stick" : ""}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => {
                const money_c = money(lot.price_contado);
                const money_f = money(lot.price_financiado);
                const fr = measure(lot.frente_ml);
                const fo = measure(lot.fondo_ml);
                const sup = measure(lot.area_m2);
                return (
                  <tr key={lot.id}>
                    <td className="mx-stick mx-sku">{lot.code}</td>
                    <td>{lot.inmueble_name || fracName}</td>
                    <td>
                      <span className={`mx-pill ${STATUS_CLS[lot.status] || "ok"}`}>
                        {STATUS_ES[lot.status] || lot.status}
                      </span>
                    </td>
                    <td className="mx-num">{money_c ?? <span className="mx-miss">falta</span>}</td>
                    <td className="mx-num">{money_f ?? <span className="mx-miss">falta</span>}</td>
                    <td className="mx-num">{fr ?? <span className="mx-miss">falta</span>}</td>
                    <td className="mx-num">{fo ?? <span className="mx-miss">falta</span>}</td>
                    <td className="mx-num">{sup ?? <span className="mx-miss">falta</span>}</td>
                    {SERVICE_KEYS.map((k) => (
                      <td key={k} className={lot.services?.[k] ? "mx-yes" : "mx-no"}>
                        {lot.services?.[k] ? "Sí" : "No"}
                      </td>
                    ))}
                    <td>{lot.seller_name || <span className="mx-no">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mx-foot">
        El archivo descargado se puede editar en Excel y volver a subir desde
        <b> Carga de Lotes</b>: usa exactamente las columnas que espera el importador.
      </div>
    </article>
  );
}
