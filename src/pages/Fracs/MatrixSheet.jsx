import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { HiArrowDownTray, HiOutlinePaperClip, HiChevronDown } from "react-icons/hi2";
import { lotService } from "@/services/lotService";
import { documentService } from "@/services/documentService";
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

/* Va aparte de HEADERS a propósito: HEADERS espeja la plantilla de importación
   y el archivo que se descarga lo genera el backend con esa misma lista. Esta
   columna es solo de pantalla —enlaces al Vault— y por eso no viaja en la
   descarga: un archivo con una celda de links no se podría volver a importar. */
const COL_ARCHIVOS = "Files asociados";

const STATUS_ES = { available: "disponible", reserved: "apartado", sold: "vendido" };
const STATUS_CLS = { available: "ok", reserved: "wr", sold: "sd" };

/**
 * Quién tiene el lote. Son dos orígenes distintos y hasta ahora la matriz solo
 * miraba uno: el vendedor que un administrador asigna, y —si nadie lo asignó—
 * quien lo apartó, que en la práctica es quien lo está trabajando.
 *
 * `reserved_by_id` no se limpia al liberar el apartado, así que solo cuenta
 * mientras el lote siga apartado: si no, un lote disponible mostraría a alguien
 * que ya no tiene nada que ver con él.
 */
function quienLoTiene(lot) {
  if (lot.seller_name) return lot.seller_name;
  if (lot.status === "reserved" && lot.reserved_by_name) {
    return (
      <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1.25 }}>
        <span>{lot.reserved_by_name}</span>
        <span style={{ fontSize: ".68rem", color: "var(--mu)" }}>lo apartó</span>
      </span>
    );
  }
  return <span className="mx-no">—</span>;
}

/**
 * Los archivos del lote, detrás de un desplegable.
 *
 * En lista abierta un lote con diez archivos estiraba su fila hasta romper la
 * lectura de la tabla; acá la celda siempre ocupa un renglón y el detalle se
 * pide cuando hace falta.
 *
 * El panel va en un portal con posición fija porque la tabla vive dentro de un
 * contenedor con scroll: cualquier panel posicionado dentro quedaría recortado
 * en el borde. Por lo mismo se cierra al hacer scroll —seguir a la celda
 * mientras se desplaza costaría más de lo que vale.
 */
function CeldaArchivos({ archivos, lote }) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState(null);
  const botonRef = useRef(null);
  const panelRef = useRef(null);

  const cantidad = archivos?.length || 0;

  useEffect(() => {
    if (!abierto) return undefined;

    const cerrar = () => setAbierto(false);
    const alClic = (e) => {
      if (botonRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setAbierto(false);
    };
    const alTeclado = (e) => { if (e.key === "Escape") { setAbierto(false); botonRef.current?.focus(); } };

    document.addEventListener("mousedown", alClic);
    document.addEventListener("keydown", alTeclado);
    // En captura: el scroll del contenedor de la tabla no burbujea.
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    return () => {
      document.removeEventListener("mousedown", alClic);
      document.removeEventListener("keydown", alTeclado);
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, [abierto]);

  if (cantidad === 0) return <span className="mx-no">—</span>;

  const alternar = () => {
    if (abierto) { setAbierto(false); return; }
    const r = botonRef.current.getBoundingClientRect();
    const ancho = 260;
    setPos({
      top: r.bottom + 6,
      // Si la celda está pegada al borde derecho, el panel se alinea por su
      // derecha en vez de salirse de la pantalla.
      left: Math.max(8, Math.min(r.left, window.innerWidth - ancho - 8)),
      ancho,
    });
    setAbierto(true);
  };

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        className="mx-files-btn"
        onClick={alternar}
        aria-expanded={abierto}
        aria-haspopup="true"
      >
        <HiOutlinePaperClip aria-hidden="true" />
        {cantidad} archivo{cantidad === 1 ? "" : "s"}
        <HiChevronDown aria-hidden="true" className={abierto ? "mx-files-caret abierto" : "mx-files-caret"} />
      </button>

      {abierto && pos && createPortal(
        <div
          ref={panelRef}
          className="mx-files-pop"
          role="dialog"
          aria-label={`Archivos del lote ${lote}`}
          style={{ top: pos.top, left: pos.left, width: pos.ancho }}
        >
          <div className="mx-files-pop-h">Lote {lote}</div>
          {archivos.map((a) => (
            <a key={a.id} href={a.download_url} target="_blank" rel="noreferrer"
               className="mx-files-item" title={a.name}>
              <HiOutlinePaperClip aria-hidden="true" />
              <span>{a.name}</span>
            </a>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}


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

  /* Si falla, la matriz se pinta igual: los archivos son un extra de la vista,
     no la vista. */
  const { data: archivosPorLote = {} } = useQuery({
    queryKey: ["documents", "for-lots", fracId],
    queryFn: () => documentService.forLots(fracId),
    enabled: !!fracId,
  });

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
                <th className="mx-extra">{COL_ARCHIVOS}</th>
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
                    <td>{quienLoTiene(lot)}</td>
                    <td className="mx-extra">
                      <CeldaArchivos archivos={archivosPorLote[lot.id]} lote={lot.code} />
                    </td>
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
        <b> Files asociados</b> queda fuera de la descarga —son enlaces al Vault— para
        que el archivo se siga pudiendo reimportar tal cual.
      </div>
    </article>
  );
}
