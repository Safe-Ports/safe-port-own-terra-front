import { Fragment, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as constructService from "@/services/constructService";
import { useAppContext } from "@/context/AppContext";
import { conceptAmount } from "../utils/costEngine";
import { currency2, UNIT_LABEL } from "../utils/format";
import { AuditBadge } from "../Quantify/DirectPanel";
import FinancialRouter from "./FinancialRouter";
import ApuMatrixEditor from "./ApuMatrixEditor";

const MODE_LABEL = { apu: "A.P.U.", lump: "Precio alzado", parametric: "Paramétrico" };

function ConceptDetailPanel({ concept, project, catalog, canEdit, onClose }) {
  const queryClient = useQueryClient();
  const { showToast } = useAppContext();
  const [apuDraft, setApuDraft] = useState(concept.financial.apu || []);
  const [lumpDraft, setLumpDraft] = useState(concept.financial.lumpAmount ?? 0);
  const [parametricDraft, setParametricDraft] = useState(concept.financial.parametricUnitPrice ?? 0);

  useEffect(() => { setApuDraft(concept.financial.apu || []); setLumpDraft(concept.financial.lumpAmount ?? 0); setParametricDraft(concept.financial.parametricUnitPrice ?? 0); }, [concept.id]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["construct-concepts", project.id] });
  const modeMutation = useMutation({ mutationFn: (mode) => constructService.setFinancialMode(concept.id, mode), onSuccess: invalidate });
  const apuMutation = useMutation({ mutationFn: (apu) => constructService.saveApu(concept.id, apu), onSuccess: () => { invalidate(); showToast("Matriz APU guardada"); } });
  const lumpMutation = useMutation({ mutationFn: (amount) => constructService.saveLump(concept.id, amount), onSuccess: () => { invalidate(); showToast("Monto pactado guardado"); } });
  const parametricMutation = useMutation({ mutationFn: (price) => constructService.saveParametric(concept.id, price), onSuccess: () => { invalidate(); showToast("Precio paramétrico guardado"); } });

  return (
    <div className="obr-budget-detail">
      <div className="obr-budget-detail-head">
        <div><b>{concept.code}</b><span>{concept.name}</span></div>
        <button type="button" className="obr-secondary" onClick={onClose}>Cerrar</button>
      </div>
      <FinancialRouter mode={concept.financial.mode} canEdit={canEdit} onSelect={(mode) => modeMutation.mutate(mode)} />

      {concept.financial.mode === "apu" && (
        <>
          <ApuMatrixEditor concept={concept} project={project} catalog={catalog} canEdit={canEdit} apu={apuDraft} onChange={setApuDraft} />
          {canEdit && <button type="button" className="obr-primary" onClick={() => apuMutation.mutate(apuDraft)}>Guardar matriz APU</button>}
        </>
      )}
      {concept.financial.mode === "lump" && (
        <div className="obr-lump-editor">
          <label className="obr-field">
            <span>Monto pactado (cerrado)</span>
            <input type="number" disabled={!canEdit} value={lumpDraft} onChange={(e) => setLumpDraft(Number(e.target.value) || 0)} />
          </label>
          <p className="obr-muted">Precio alzado: no se desglosan insumos ni mano de obra interna — así lo pide el Anexo B.</p>
          {canEdit && <button type="button" className="obr-primary" onClick={() => lumpMutation.mutate(lumpDraft)}>Guardar monto pactado</button>}
        </div>
      )}
      {concept.financial.mode === "parametric" && (
        <div className="obr-lump-editor">
          <label className="obr-field">
            <span>Precio paramétrico por {UNIT_LABEL[concept.unit] || concept.unit}</span>
            <input type="number" disabled={!canEdit} value={parametricDraft} onChange={(e) => setParametricDraft(Number(e.target.value) || 0)} />
          </label>
          {canEdit && <button type="button" className="obr-primary" onClick={() => parametricMutation.mutate(parametricDraft)}>Guardar precio paramétrico</button>}
        </div>
      )}
      {!concept.financial.mode && <p className="obr-muted">Elige una estrategia de cobro para este concepto.</p>}
    </div>
  );
}

/* Presupuesto — 1 fila por concepto cuantificado, cada una con su propio
   Router Polimórfico (Módulo 4). A diferencia del demo (1 sola fila
   hardcodeada), aquí cada concepto del proyecto tiene su propia estrategia. */
function BudgetTable({ project }) {
  const { canUseFeature } = useAppContext();
  const canEdit = canUseFeature("construct.budget");
  const [expandedId, setExpandedId] = useState(null);

  const { data: concepts = [] } = useQuery({ queryKey: ["construct-concepts", project.id], queryFn: () => constructService.listConcepts(project.id) });
  const { data: insumos = [] } = useQuery({ queryKey: ["construct-insumos"], queryFn: constructService.listInsumos });
  const { data: basicos = [] } = useQuery({ queryKey: ["construct-basicos"], queryFn: constructService.listBasicos });
  const catalog = { insumos, basicos };

  const rows = concepts.map((concept) => ({ concept, ...conceptAmount(concept, project, catalog) }));
  const grandTotal = rows.reduce((sum, row) => sum + (row.total || 0), 0);

  return (
    <div className="obr-card obr-budget-shell">
      <div className="obr-card-head">
        <div><h2>Presupuesto</h2><p>Estrategia de cobro por concepto — APU, Alzado o Paramétrico.</p></div>
      </div>
      {rows.length === 0 ? (
        <div className="obr-empty">Sin conceptos todavía. Créalos y cuantifícalos en la pestaña Cuantificación.</div>
      ) : (
        <table className="obr-table">
          <thead>
            <tr><th>Clave</th><th>Concepto</th><th className="obr-num">Cantidad</th><th>Estrategia</th><th className="obr-num">Precio unitario</th><th className="obr-num">Importe</th></tr>
          </thead>
          <tbody>
            {rows.map(({ concept, unitPrice, total }) => (
              <Fragment key={concept.id}>
                <tr className={expandedId === concept.id ? "obr-row-active" : ""} onClick={() => setExpandedId(expandedId === concept.id ? null : concept.id)}>
                  <td className="obr-code">{concept.code}</td>
                  <td>{concept.name}</td>
                  <td className="obr-num">
                    {concept.quantity != null ? `${concept.quantity.toLocaleString("es-MX", { maximumFractionDigits: 2 })} ${UNIT_LABEL[concept.unit] || concept.unit}` : "—"}
                    {concept.type === "direct" && concept.quantity > 0 ? <AuditBadge /> : null}
                  </td>
                  <td>{concept.financial.mode ? <span className={`obr-badge-type ${concept.financial.mode}`}>{MODE_LABEL[concept.financial.mode]}</span> : <span className="obr-badge-type">Sin definir</span>}</td>
                  <td className="obr-num">{unitPrice != null ? currency2(unitPrice) : "—"}</td>
                  <td className="obr-num obr-strong">{currency2(total)}</td>
                </tr>
                {expandedId === concept.id && (
                  <tr>
                    <td colSpan={6}>
                      <ConceptDetailPanel concept={concept} project={project} catalog={catalog} canEdit={canEdit} onClose={() => setExpandedId(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
      <div className="obr-budget-total">
        <span>Total del proyecto (conceptos cargados)</span>
        <strong>{currency2(grandTotal)}</strong>
      </div>
    </div>
  );
}

export default BudgetTable;
