import { HiArrowDownTray } from "react-icons/hi2";
import { conceptAmount, explodeBOM } from "../utils/costEngine";
import { currency2, UNIT_LABEL } from "../utils/format";
import { exportWorkbook } from "./xlsxExport";

/* Anexo A (Módulo 5 del PRD): solo conceptos APU + Explosión de Insumos (BOM)
   automática — la lista de supermercado para Compras. Sin representación en
   el demo más allá de un botón que solo mostraba un toast. */
function AnnexA({ project, concepts, catalog }) {
  const apuConcepts = concepts.filter((c) => c.financial?.mode === "apu");
  const rows = apuConcepts.map((concept) => ({ concept, ...conceptAmount(concept, project, catalog) }));
  const bom = explodeBOM(concepts, catalog);
  const total = rows.reduce((sum, row) => sum + row.total, 0);

  const handleExport = () => exportWorkbook(`anexo-a-${project.name}.xlsx`, [
    {
      name: "Anexo A - APU",
      rows: [
        ["Clave", "Concepto", "Unidad", "Cantidad", "Precio unitario", "Importe"],
        ...rows.map(({ concept, unitPrice, total: rowTotal }) => [concept.code, concept.name, concept.unit, concept.quantity || 0, unitPrice || 0, rowTotal]),
        ["", "", "", "", "Total", total],
      ],
    },
    {
      name: "Explosion de insumos",
      rows: [["Clave", "Insumo", "Unidad", "Cantidad total"], ...bom.map((row) => [row.insumo.code, row.insumo.name, row.insumo.unit, row.quantity])],
    },
  ]);

  return (
    <div className="obr-card obr-report-card">
      <div className="obr-card-head">
        <div><h2>Anexo A · Catálogo a Precios Unitarios</h2><p>Solo conceptos APU, con Explosión de Insumos (BOM) automática.</p></div>
        <button type="button" className="obr-secondary" onClick={handleExport}><HiArrowDownTray /> Exportar a Excel</button>
      </div>
      {rows.length === 0 ? <div className="obr-empty">Sin conceptos en modo APU todavía.</div> : (
        <>
          <table className="obr-table">
            <thead><tr><th>Clave</th><th>Concepto</th><th className="obr-num">Cantidad</th><th className="obr-num">Precio unitario</th><th className="obr-num">Importe</th></tr></thead>
            <tbody>
              {rows.map(({ concept, unitPrice, total: rowTotal }) => (
                <tr key={concept.id}>
                  <td className="obr-code">{concept.code}</td>
                  <td>{concept.name}</td>
                  <td className="obr-num">{concept.quantity?.toLocaleString("es-MX", { maximumFractionDigits: 2 })} {UNIT_LABEL[concept.unit] || concept.unit}</td>
                  <td className="obr-num">{currency2(unitPrice)}</td>
                  <td className="obr-num obr-strong">{currency2(rowTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="obr-budget-total"><span>Total Anexo A</span><strong>{currency2(total)}</strong></div>

          <h3 className="obr-subheading">Explosión de insumos (BOM)</h3>
          <table className="obr-table">
            <thead><tr><th>Clave</th><th>Insumo</th><th className="obr-num">Cantidad total</th></tr></thead>
            <tbody>
              {bom.map((row) => (
                <tr key={row.insumo.id}><td className="obr-code">{row.insumo.code}</td><td>{row.insumo.name}</td><td className="obr-num">{row.quantity.toLocaleString("es-MX", { maximumFractionDigits: 3 })} {row.insumo.unit}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default AnnexA;
