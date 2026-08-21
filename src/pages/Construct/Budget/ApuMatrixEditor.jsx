import RecipeRowEditor from "../Catalog/RecipeRowEditor";
import { costoDirecto, pieDePrecio } from "../utils/costEngine";
import { currency2 } from "../utils/format";

/* Constructor de Matriz APU (Módulo 4 del PRD) — típeahead al Catálogo Maestro
   + Rendimiento, con el Costo Directo y el Pie de Precio recalculando en vivo
   sobre la cascada real de utils/costEngine.js. Ausente por completo en el demo. */
function ApuMatrixEditor({ concept, project, catalog, canEdit, apu, onChange }) {
  const draftConcept = { ...concept, financial: { ...concept.financial, apu } };
  const cd = costoDirecto(draftConcept, catalog);
  const pu = pieDePrecio(draftConcept, project, catalog);

  return (
    <div className="obr-apu-editor">
      <RecipeRowEditor
        items={apu}
        catalog={catalog}
        canEdit={canEdit}
        datalistId={`obr-apu-options-${concept.id}`}
        onChange={onChange}
      />
      <div className="obr-apu-summary">
        <div><span>Costo directo</span><b>{currency2(cd)}</b></div>
        <div><span>Pie de precio</span><b className="obr-accent">{currency2(pu)}</b></div>
      </div>
    </div>
  );
}

export default ApuMatrixEditor;
