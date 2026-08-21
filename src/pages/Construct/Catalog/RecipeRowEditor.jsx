import { HiPlus, HiTrash } from "react-icons/hi2";
import { unitCostOfRef } from "../utils/costEngine";
import { currency2 } from "../utils/format";

let seq = 0;
const nextId = () => `apu-${Date.now()}-${(seq += 1)}`;

/* Constructor de matriz insumo × rendimiento, reusado por el Básico del
   Catálogo Maestro y por la Matriz APU del Presupuesto (Módulos 1 y 4 del
   PRD). El typeahead sobre el catálogo se resuelve con <input list> +
   <datalist> nativos — sin nueva dependencia. */
function RecipeRowEditor({ items, catalog, canEdit, onChange, datalistId, excludeBasicoId }) {
  const options = [
    ...catalog.insumos.map((i) => ({ refType: "insumo", refId: i.id, label: `${i.code} — ${i.name}` })),
    ...catalog.basicos.filter((b) => b.id !== excludeBasicoId).map((b) => ({ refType: "basico", refId: b.id, label: `${b.code} — ${b.name} (básico)` })),
  ];
  const byLabel = new Map(options.map((o) => [o.label, o]));
  const labelFor = (refType, refId) => options.find((o) => o.refType === refType && o.refId === refId)?.label || "";

  const updateRow = (id, patch) => onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const removeRow = (id) => onChange(items.filter((it) => it.id !== id));
  const addRow = () => onChange([...items, { id: nextId(), refType: options[0]?.refType || "insumo", refId: options[0]?.refId, performance: 1 }]);

  return (
    <div className="obr-recipe-editor">
      <datalist id={datalistId}>
        {options.map((o) => <option key={`${o.refType}-${o.refId}`} value={o.label} />)}
      </datalist>
      <table className="obr-table obr-recipe-table">
        <thead><tr><th>Insumo / Básico</th><th className="obr-num">Rendimiento</th><th className="obr-num">Costo unitario</th>{canEdit && <th />}</tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <input
                  list={datalistId}
                  disabled={!canEdit}
                  defaultValue={labelFor(item.refType, item.refId)}
                  placeholder="Buscar en catálogo…"
                  onBlur={(e) => {
                    const match = byLabel.get(e.target.value);
                    if (match) updateRow(item.id, { refType: match.refType, refId: match.refId });
                  }}
                />
              </td>
              <td><input type="number" step="0.0001" className="obr-num-input" disabled={!canEdit} value={item.performance} onChange={(e) => updateRow(item.id, { performance: e.target.value === "" ? "" : Number(e.target.value) })} /></td>
              <td className="obr-num">{currency2(unitCostOfRef(item.refType, item.refId, catalog))}</td>
              {canEdit && <td><button type="button" className="obr-icon-btn" onClick={() => removeRow(item.id)}><HiTrash /></button></td>}
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={4} className="obr-generator-empty">Sin insumos todavía.</td></tr>}
        </tbody>
      </table>
      {canEdit && <button type="button" className="obr-add-link" onClick={addRow}><HiPlus /> Agregar insumo</button>}
    </div>
  );
}

export default RecipeRowEditor;
