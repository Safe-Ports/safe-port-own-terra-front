import { HiArrowDownTray } from "react-icons/hi2";
import { conceptAmount, utilidadUnitAmount } from "../utils/costEngine";
import { currency2 } from "../utils/format";
import { exportWorkbook } from "./xlsxExport";

function findRoot(nodeId, nodesById) {
  let current = nodesById.get(nodeId);
  if (!current) return null;
  while (current.parentId) {
    const parent = nodesById.get(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

/* Carátula General (Módulo 5 del PRD): totales por Fase/Partida + utilidad
   final de la constructora, desglosada solo sobre conceptos APU (Alzado no
   expone su margen interno por diseño). */
function CoverSheet({ project, concepts, nodes, catalog }) {
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const groups = new Map();

  concepts.forEach((concept) => {
    const root = findRoot(concept.nodeId, nodesById);
    const key = root?.id || "sin-fase";
    const label = root?.name || "Sin fase asignada";
    const { total } = conceptAmount(concept, project, catalog);
    const prev = groups.get(key) || { label, total: 0 };
    prev.total += total;
    groups.set(key, prev);
  });

  const rows = Array.from(groups.values()).sort((a, b) => b.total - a.total);
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
  const utilidadTotal = concepts
    .filter((c) => c.financial?.mode === "apu")
    .reduce((sum, c) => sum + (Number(c.quantity) || 0) * utilidadUnitAmount(c, project, catalog), 0);

  const handleExport = () => exportWorkbook(`caratula-${project.name}.xlsx`, [{
    name: "Caratula general",
    rows: [
      ["Fase / Partida", "Importe"],
      ...rows.map((row) => [row.label, row.total]),
      ["Total del proyecto", grandTotal],
      ["Utilidad de la constructora (conceptos APU)", utilidadTotal],
    ],
  }]);

  return (
    <div className="obr-card obr-report-card">
      <div className="obr-card-head">
        <div><h2>Carátula general</h2><p>Resumen financiero del proyecto por Fase/Partida.</p></div>
        <button type="button" className="obr-secondary" onClick={handleExport}><HiArrowDownTray /> Exportar a Excel</button>
      </div>
      {rows.length === 0 ? <div className="obr-empty">Sin conceptos con estrategia de cobro todavía.</div> : (
        <>
          <table className="obr-table">
            <thead><tr><th>Fase / Partida</th><th className="obr-num">Importe</th></tr></thead>
            <tbody>
              {rows.map((row) => <tr key={row.label}><td>{row.label}</td><td className="obr-num obr-strong">{currency2(row.total)}</td></tr>)}
            </tbody>
          </table>
          <div className="obr-caratula-summary">
            <div className="obr-budget-total"><span>Total del proyecto</span><strong>{currency2(grandTotal)}</strong></div>
            <div className="obr-budget-total"><span>Utilidad de la constructora (conceptos APU)</span><strong className="obr-accent">{currency2(utilidadTotal)}</strong></div>
          </div>
        </>
      )}
    </div>
  );
}

export default CoverSheet;
