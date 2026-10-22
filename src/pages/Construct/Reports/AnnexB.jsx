import { HiArrowDownTray } from "react-icons/hi2";
import { conceptAmount } from "../utils/costEngine";
import { currency2, UNIT_LABEL } from "../utils/format";
import { exportWorkbook } from "./xlsxExport";

/* Anexo B (Módulo 5 del PRD): conceptos de subcontrato cerrado (Alzado) —
   oculta cualquier material o mano de obra interna, solo el monto pactado. */
function AnnexB({ project, concepts, catalog }) {
  const lumpConcepts = concepts.filter((c) => c.financial?.mode === "lump");
  const rows = lumpConcepts.map((concept) => ({ concept, ...conceptAmount(concept, project, catalog) }));
  const total = rows.reduce((sum, row) => sum + row.total, 0);

  const handleExport = () => exportWorkbook(`anexo-b-${project.name}.xlsx`, [{
    name: "Anexo B - Alzado",
    rows: [
      ["Clave", "Concepto", "Unidad", "Cantidad", "Monto pactado"],
      ...rows.map(({ concept, total: rowTotal }) => [concept.code, concept.name, concept.unit, concept.quantity || 0, rowTotal]),
      ["", "", "", "Total", total],
    ],
  }]);

  return (
    <div className="obr-card obr-report-card">
      <div className="obr-card-head">
        <div><h2>Anexo B · Catálogo a Precio Alzado</h2><p>Subcontratos cerrados — sin desglose de insumos ni mano de obra interna.</p></div>
        <button type="button" className="obr-secondary" onClick={handleExport}><HiArrowDownTray /> Exportar a Excel</button>
      </div>
      {rows.length === 0 ? <div className="obr-empty">Sin conceptos en modo Alzado todavía.</div> : (
        <>
          <table className="obr-table">
            <thead><tr><th>Clave</th><th>Concepto</th><th className="obr-num">Cantidad</th><th className="obr-num">Monto pactado</th></tr></thead>
            <tbody>
              {rows.map(({ concept, total: rowTotal }) => (
                <tr key={concept.id}>
                  <td className="obr-code">{concept.code}</td>
                  <td>{concept.name}</td>
                  <td className="obr-num">{concept.quantity?.toLocaleString("es-MX", { maximumFractionDigits: 2 })} {UNIT_LABEL[concept.unit] || concept.unit}</td>
                  <td className="obr-num obr-strong">{currency2(rowTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="obr-budget-total"><span>Total Anexo B</span><strong>{currency2(total)}</strong></div>
        </>
      )}
    </div>
  );
}

export default AnnexB;
