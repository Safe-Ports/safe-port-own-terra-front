import { useEffect, useState } from "react";
import { HiArrowLeft } from "react-icons/hi2";
import GeneratorTable from "./GeneratorTable";
import DirectPanel, { AuditBadge } from "./DirectPanel";
import { consolidateGenerator } from "../utils/generatorMath";

const TYPE_LABEL = { generator: "Número generador", direct: "Cantidad directa", bim: "Plano / BIM" };

function ConceptEditor({ concept, canEdit, onBack, onSaveGeneratorRows, onSaveDirect, onChangeType }) {
  const [rows, setRows] = useState(concept.rows || []);
  const [direct, setDirect] = useState(concept.direct || { value: 0, reason: "" });

  useEffect(() => { setRows(concept.rows || []); }, [concept.id]);
  useEffect(() => { setDirect(concept.direct || { value: 0, reason: "" }); }, [concept.id]);

  const livePreview = concept.type === "generator"
    ? consolidateGenerator(rows, concept.unit)
    : Number(direct.value) || 0;

  const dirty = concept.type === "generator"
    ? JSON.stringify(rows) !== JSON.stringify(concept.rows || [])
    : JSON.stringify(direct) !== JSON.stringify(concept.direct || {});

  const handleSave = () => {
    if (concept.type === "generator") onSaveGeneratorRows(rows);
    else if (concept.type === "direct") onSaveDirect(direct);
  };

  return (
    <div className="obr-editor-grid">
      <div className="obr-card obr-editor-main">
        <div className="obr-editor-header">
          <button type="button" className="obr-back" onClick={onBack}><HiArrowLeft /> Conceptos</button>
          <p className="obr-eyebrow">{concept.code} · {TYPE_LABEL[concept.type] || "Sin tipo"}</p>
          <h2>{concept.name}</h2>
        </div>
        <div className="obr-editor-body">
          {concept.type === "generator" && (
            <GeneratorTable rows={rows} unit={concept.unit} canEdit={canEdit} onChange={setRows} />
          )}
          {concept.type === "direct" && (
            <DirectPanel direct={direct} unit={concept.unit} canEdit={canEdit} onChange={setDirect} />
          )}
          {concept.type === "bim" && (
            <div className="obr-empty">Integración con planos/BIM fuera de alcance de este MVP — usa Cantidad directa con evidencia mientras tanto.</div>
          )}
        </div>
      </div>
      <aside className="obr-card obr-editor-side">
        <h3>Resultado</h3>
        <div className="obr-result-box">
          <span>Cantidad</span>
          <strong>{livePreview.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {concept.unit}</strong>
          {concept.type === "direct" && livePreview > 0 && <AuditBadge />}
        </div>
        <div className="obr-meta-row"><span>Tipo</span><b>{TYPE_LABEL[concept.type] || "—"}</b></div>
        <div className="obr-meta-row"><span>Estado</span><b>{concept.status}</b></div>
        {canEdit && (
          <>
            <button type="button" className="obr-primary" disabled={!dirty} onClick={handleSave}>Guardar cuantificación</button>
            <button type="button" className="obr-secondary" onClick={() => onChangeType(concept.id)}>Cambiar tipo de cuantificación</button>
          </>
        )}
      </aside>
    </div>
  );
}

export default ConceptEditor;
