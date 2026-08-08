import { createPortal } from "react-dom";
import { useState } from "react";
import useEscapeKey from "@/hooks/useEscapeKey";
import { useLocale } from "@/i18n";

const G = "#355E3B";
const OK = "#16a34a";
const ERR = "#dc2626";
const BG = "#FBFAF6";
const BD = "#E7E4DB";

const Check = () => (
  <span style={{ color: OK, fontWeight: 800, fontSize: "0.8rem" }}>✓</span>
);
const Cross = () => (
  <span style={{ color: ERR, fontWeight: 800, fontSize: "0.8rem" }}>✕</span>
);

function Badge({ type, english }) {
  const cfg = {
    required: { label: english ? "Required" : "Obligatorio", bg: "#FEF2F2", color: ERR },
    optional: { label: english ? "Optional" : "Opcional", bg: "#F0FDF4", color: OK },
  }[type];
  return (
    <span style={{
      fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em",
      textTransform: "uppercase", padding: "2px 8px", borderRadius: 20,
      background: cfg.bg, color: cfg.color, flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  );
}

function Section({ id, title, type, open, onToggle, children, english }) {
  return (
    <div style={{ border: `1px solid ${BD}`, borderRadius: 14, marginBottom: 8, overflow: "hidden" }}>
      <button
        onClick={() => onToggle(id)}
        style={{
          width: "100%", padding: "11px 16px", display: "flex", alignItems: "center",
          gap: 10, background: open ? "#F1EEE6" : "white", border: "none", cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ flex: 1, fontWeight: 700, fontSize: "0.84rem", color: "#1E3D2B" }}>{title}</span>
        <Badge type={type} english={english} />
        <span style={{ fontSize: "0.65rem", color: "#83867C", marginLeft: 4 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "12px 16px 16px", borderTop: `1px solid ${BD}`, background: "white" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function MiniTable({ headers, rows }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 10 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={{
                padding: "6px 10px", background: "#F1EEE6", color: "#43453F",
                fontWeight: 700, textAlign: "left", borderBottom: `1px solid ${BD}`,
                whiteSpace: "nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "white" : BG }}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: "6px 10px", borderBottom: `1px solid ${BD}`,
                  color: "#43453F", whiteSpace: "nowrap",
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pill({ ok, label }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px",
      borderRadius: 20, fontSize: "0.74rem", fontWeight: 600,
      background: ok ? "#F0FDF4" : "#FEF2F2", color: ok ? OK : ERR,
      border: `1px solid ${ok ? "#86efac" : "#fca5a5"}`,
    }}>
      {ok ? <Check /> : <Cross />} {label}
    </span>
  );
}

function Note({ children }) {
  return (
    <div style={{
      marginTop: 10, padding: "8px 12px", background: "#FFFBEB",
      border: "1px solid #fcd34d", borderRadius: 10, fontSize: "0.74rem", color: "#92400e",
    }}>
      ⚠ {children}
    </div>
  );
}

export default function LotImportFormatModal({ open, onClose }) {
  const { locale } = useLocale();
  const english = locale === "en";
  const c = (spanish, englishText) => english ? englishText : spanish;
  const [sections, setSections] = useState({
    requerido: true,
    agrupacion: false,
    medidas: false,
    precios: false,
    estados: false,
    servicios: false,
    ejemplo: false,
  });
  useEscapeKey(onClose, open);

  if (!open) return null;

  const toggle = (id) => setSections((p) => ({ ...p, [id]: !p[id] }));

  return createPortal(
    <div className="guide-overlay" onClick={onClose}>
      <div
        className="guide-modal"
        role="dialog"
        aria-modal="true"
        aria-label={c("Campos requeridos y formato del archivo", "Required fields and file format")}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 720, width: "min(95vw, 720px)" }}
      >
        {/* Header */}
        <div className="guide-head">
          <div
            className="guide-icon"
            style={{ background: G, color: "white", fontSize: "1rem", minWidth: 40, height: 40 }}
          >
            📋
          </div>
          <div className="guide-head-text">
            <div className="guide-title">{c("Campos requeridos y formato del archivo", "Required fields and file format")}</div>
            <div className="guide-sub">{c("Referencia completa para crear tu Excel de lotes sin errores", "Complete reference for creating an error-free lot spreadsheet")}</div>
          </div>
          <button className="guide-close-x" onClick={onClose} aria-label={c("Cerrar", "Close")}>×</button>
        </div>

        {/* Body */}
        <div
          className="guide-body"
          style={{ padding: "12px 16px" }}
        >
          {/* ── 1. ID Lote — OBLIGATORIO ─────────────────────────────────── */}
          <Section english={english} id="requerido" title={c("ID Lote — identificador único", "Lot ID — unique identifier")} type="required" open={sections.requerido} onToggle={toggle}>
            <p style={{ fontSize: "0.8rem", color: "#43453F", marginBottom: 10 }}>
              {c("Cada fila debe tener un valor único en esta columna. Es el único campo obligatorio del archivo.", "Every row must have a unique value in this column. It is the file’s only required field.")}
            </p>
            <MiniTable
              headers={english ? ["Accepted header", "Valid example", "Invalid"] : ["Encabezado aceptado", "Ejemplo válido", "Inválido"]}
              rows={[
                ["ID Lote", "A-01", <Cross />],
                ["id lote", "L001", <Cross />],
                ["codigo / código", "MZ-A-10", "—"],
                ["lote", "Lote 5", "—"],
                ["clave", "CLV-001", "—"],
              ]}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              <Pill ok label="A-01" />
              <Pill ok label="L001" />
              <Pill ok label="MZ-A-10" />
              <Pill ok label="P-05" />
              <Pill ok={false} label={c("(vacío)", "(empty)")} />
              <Pill ok={false} label={c("duplicado", "duplicate")} />
            </div>
            <Note>{c("No uses celdas combinadas ni dejes filas sin ID Lote.", "Do not use merged cells or leave rows without a Lot ID.")}</Note>
          </Section>

          {/* ── 2. Agrupación ───────────────────────────────────────────── */}
          <Section english={english} id="agrupacion" title={c("Agrupación por sección o manzana", "Group by section or block")} type="optional" open={sections.agrupacion} onToggle={toggle}>
            <p style={{ fontSize: "0.8rem", color: "#43453F", marginBottom: 10 }}>
              {c('Agrupa los lotes en secciones dentro del fraccionamiento. Si se omite, todos quedan en "Importados".', 'Groups lots into sections within the development. When omitted, all lots are placed under "Imported".')}
            </p>
            <MiniTable
              headers={english ? ["Accepted header", "Example"] : ["Encabezado aceptado", "Ejemplo"]}
              rows={[
                ["Fraccionamiento", "Residencial Las Palmas"],
                ["Sección", "Etapa 1"],
                ["Manzana", "Manzana A"],
                ["Bloque", "Bloque Norte"],
                ["Section", "Zone B"],
              ]}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              <Pill ok label="Manzana A" />
              <Pill ok label="Zona Norte" />
              <Pill ok label="Etapa 1" />
              <Pill ok label="Frente Mar" />
            </div>
          </Section>

          {/* ── 3. Medidas ──────────────────────────────────────────────── */}
          <Section english={english} id="medidas" title={c("Medidas del lote", "Lot measurements")} type="optional" open={sections.medidas} onToggle={toggle}>
            <p style={{ fontSize: "0.8rem", color: "#43453F", marginBottom: 10 }}>
              {c("Usa números positivos. No incluyas unidades en la celda, solo el valor numérico.", "Use positive numbers. Enter only the numeric value, without units.")}
            </p>
            <MiniTable
              headers={english ? ["Header", "Unit", "Valid", "Invalid"] : ["Encabezado", "Unidad", "Válido", "Inválido"]}
              rows={[
                ["Superficie (m2)", "m²", <><Check /> 120 / 120.5</>, <><Cross /> "120 m2"</>],
                ["Frente (ML)", "metros lineales", <><Check /> 8 / 8.5</>, <><Cross /> "8ml"</>],
                ["Fondo (ML)", "metros lineales", <><Check /> 15</>, <><Cross /> "quince"</>],
              ]}
            />
            <Note>{c("Deja la celda vacía si no tienes el dato. No pongas cero (0) a menos que sea el valor real.", "Leave the cell empty when the value is unknown. Do not enter zero unless it is the actual value.")}</Note>
          </Section>

          {/* ── 4. Precios ──────────────────────────────────────────────── */}
          <Section english={english} id="precios" title={c("Precios del lote", "Lot prices")} type="optional" open={sections.precios} onToggle={toggle}>
            <p style={{ fontSize: "0.8rem", color: "#43453F", marginBottom: 10 }}>
              {c("Puedes usar el signo $ y separadores de miles; el sistema los elimina automáticamente.", "You may use the $ sign and thousands separators; the system removes them automatically.")}
            </p>
            <MiniTable
              headers={english ? ["Header", "Valid formats", "Result"] : ["Encabezado", "Formatos válidos", "Resultado"]}
              rows={[
                ["Precio Contado", "450000  /  $450,000  /  450,000", "$450,000"],
                ["Precio Financiado", "520000  /  $520,000.00", "$520,000"],
              ]}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              <Pill ok label="450000" />
              <Pill ok label="$450,000" />
              <Pill ok label="450,000.00" />
              <Pill ok={false} label='"cuatrocientos mil"' />
              <Pill ok={false} label="450 mil" />
            </div>
          </Section>

          {/* ── 5. Estados ──────────────────────────────────────────────── */}
          <Section english={english} id="estados" title={c("Estado del lote", "Lot status")} type="optional" open={sections.estados} onToggle={toggle}>
            <p style={{ fontSize: "0.8rem", color: "#43453F", marginBottom: 10 }}>
              {c("Use el encabezado Estado, Estatus o Status. Si se omite, se usa disponible.", "Use the Estado, Estatus, or Status header. When omitted, the lot defaults to available.")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              <Pill ok label="disponible" />
              <Pill ok label="apartado" />
              <Pill ok label="reservado" />
              <Pill ok={false} label="vendido" />
              <Pill ok={false} label="sold" />
            </div>
            <Note>
              {c("Vendido requiere un contrato y no se puede asignar directamente en esta carga. Usa disponible y después registra la venta desde Contratos.", "Sold requires a contract and cannot be assigned directly during this upload. Use available, then record the sale from Contracts.")}
            </Note>
          </Section>

          {/* ── 6. Servicios ────────────────────────────────────────────── */}
          <Section english={english} id="servicios" title={c("Servicios disponibles", "Available utilities")} type="optional" open={sections.servicios} onToggle={toggle}>
            <p style={{ fontSize: "0.8rem", color: "#43453F", marginBottom: 10 }}>
              {c("Agrega una columna por cada servicio. Para indicar que el lote sí tiene el servicio usa alguno de los valores válidos.", "Add one column per utility. Use any accepted true value to indicate that the lot has that utility.")}
            </p>
            <MiniTable
              headers={english ? ["Column (header)", "Values → ✓ (available)", "Values → ✕ (not available)"] : ["Columna (encabezado)", "Valores → ✓ (sí tiene)", "Valores → ✕ (no tiene)"]}
              rows={[
                ["Agua Potable", "sí, si, 1, true, yes, x", "no, 0, false, (vacío)"],
                ["Energía Eléctrica", "sí, si, 1, true, yes, x", "no, 0, false, (vacío)"],
                ["Drenaje", "sí, si, 1, true, yes, x", "no, 0, false, (vacío)"],
                ["Gas Natural", "sí, si, 1, true, yes, x", "no, 0, false, (vacío)"],
                ["Internet/Fibra", "sí, si, 1, true, yes, x", "no, 0, false, (vacío)"],
                ["Pavimento", "sí, si, 1, true, yes, x", "no, 0, false, (vacío)"],
              ]}
            />
          </Section>

          {/* ── 7. Ejemplo real ─────────────────────────────────────────── */}
          <Section english={english} id="ejemplo" title={c("Ejemplo real — archivo completo", "Complete file example")} type="optional" open={sections.ejemplo} onToggle={toggle}>
            <p style={{ fontSize: "0.8rem", color: "#43453F", marginBottom: 10 }}>
              {c("Así se ve un archivo correcto con todos los campos. Usa la plantilla oficial como punto de partida.", "This is what a valid file with every field looks like. Use the official template as your starting point.")}
            </p>
            <MiniTable
              headers={["ID Lote", "Manzana", "Superficie (m2)", "Precio Contado", "Estado", "Agua Potable", "Pavimento"]}
              rows={[
                ["A-01", "Manzana A", "120", "450,000", "disponible", "sí", "sí"],
                ["A-02", "Manzana A", "115", "440,000", "apartado", "sí", "sí"],
                ["B-01", "Manzana B", "150", "580,000", "disponible", "sí", "no"],
                ["P-01", "Zona Premium", "280", "950,000", "disponible", "sí", "sí"],
              ]}
            />
            <div style={{
              marginTop: 14, padding: "10px 14px", background: "#F0FDF4",
              border: "1px solid #86efac", borderRadius: 10,
            }}>
              <div style={{ fontSize: "0.74rem", fontWeight: 700, color: G, marginBottom: 6 }}>
                ✓ {c("Descarga la plantilla oficial desde el tablero para tener el formato exacto", "Download the official template from the board to use the exact format")}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#43453F" }}>
                {c("La primera fila debe tener los encabezados. Una fila por lote. Sin celdas combinadas. Archivos aceptados: XLSX, XLS, CSV (máx. 10 MB).", "The first row must contain headers. Use one row per lot and no merged cells. Accepted files: XLSX, XLS, CSV (max. 10 MB).")}
              </div>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="guide-foot">
          <button className="guide-ok" onClick={onClose}>{c("Entendido", "Got it")}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
