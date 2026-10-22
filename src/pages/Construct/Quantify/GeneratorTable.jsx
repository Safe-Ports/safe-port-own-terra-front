import { HiPlus, HiTrash } from "react-icons/hi2";
import { applicableDims, consolidateGenerator, emptyGeneratorRow, rowSubtotal } from "../utils/generatorMath";

const UNIT_LABEL = { m2: "m²", m3: "m³", ml: "ml", pza: "pza", lote: "lote" };

/* Tabla de Números Generadores — las 8 columnas exactas del PRD (Módulo 3):
   Referencia de Plano, Eje, Tramo, Pzas, Largo, Ancho, Alto, Subtotal.
   La deducción de vanos es Pzas negativo (no un selector aparte). Los campos
   de dimensión que no aplican a la unidad del concepto quedan bloqueados. */
function GeneratorTable({ rows, unit, canEdit, onChange }) {
  const dims = applicableDims(unit);
  const total = consolidateGenerator(rows, unit);

  const updateRow = (id, patch) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeRow = (id) => onChange(rows.filter((row) => row.id !== id));
  const addRow = () => onChange([...rows, emptyGeneratorRow()]);

  const numberField = (row, key, applicable) => (
    <input
      type="number"
      value={row[key]}
      disabled={!canEdit || !applicable}
      onChange={(e) => updateRow(row.id, { [key]: e.target.value === "" ? "" : Number(e.target.value) })}
      placeholder={applicable ? "0" : "—"}
    />
  );

  return (
    <div className="obr-generator-wrap">
      <div className="obr-generator-toolbar">
        <div>
          <b>Tabla de números generadores</b>
          <span>Unidad del concepto: {UNIT_LABEL[unit] || unit} · Pzas negativo = deducción (vanos)</span>
        </div>
      </div>
      <div className="obr-generator-scroll">
        <table className="obr-generator-table">
          <thead>
            <tr>
              <th>Ref. plano</th>
              <th>Eje</th>
              <th>Tramo</th>
              <th>Pzas</th>
              <th>Largo</th>
              <th>Ancho</th>
              <th>Alto</th>
              <th className="obr-num">Subtotal</th>
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const subtotal = rowSubtotal(row, unit);
              return (
                <tr key={row.id} className={subtotal < 0 ? "negative" : ""}>
                  <td><input value={row.planRef} disabled={!canEdit} onChange={(e) => updateRow(row.id, { planRef: e.target.value })} placeholder="ARQ-04" /></td>
                  <td><input value={row.axis} disabled={!canEdit} onChange={(e) => updateRow(row.id, { axis: e.target.value })} placeholder="A/1-4" /></td>
                  <td><input value={row.section} disabled={!canEdit} onChange={(e) => updateRow(row.id, { section: e.target.value })} placeholder="Muro completo" /></td>
                  <td>{numberField(row, "pieces", true)}</td>
                  <td>{numberField(row, "length", dims.length)}</td>
                  <td>{numberField(row, "width", dims.width)}</td>
                  <td>{numberField(row, "height", dims.height)}</td>
                  <td className="obr-row-result">{subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  {canEdit && <td><button type="button" className="obr-icon-btn" onClick={() => removeRow(row.id)}><HiTrash /></button></td>}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="obr-generator-empty">Sin filas todavía. Agrega la primera medición.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <div className="obr-generator-actions">
          <button type="button" onClick={addRow}><HiPlus /> Agregar fila</button>
        </div>
      )}
      <div className="obr-generator-total">
        <span>Cantidad consolidada</span>
        <strong>{total.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {UNIT_LABEL[unit] || unit}</strong>
      </div>
    </div>
  );
}

export default GeneratorTable;
