import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HiArchiveBox, HiCheck, HiLockClosed, HiPlus, HiRectangleGroup } from "react-icons/hi2";
import * as constructService from "@/services/constructService";
import { useAppContext } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";
import Button from "@/components/Button";
import WbsTree from "./WbsTree";
import ConceptTypeStep from "../Quantify/ConceptTypeStep";
import ConceptEditor from "../Quantify/ConceptEditor";
import { AuditBadge } from "../Quantify/DirectPanel";

const UNIT_LABEL = { m2: "m²", m3: "m³", ml: "ml", pza: "pza", lote: "lote" };
const TYPE_BADGE = { generator: "Generador", direct: "Directo", bim: "BIM" };

/* Insertar un concepto del Catálogo Maestro (Módulo 1) directamente en el WBS,
   con su matriz APU ya precargada — el valor central del catálogo como
   Single Source of Truth. */
function MasterConceptPickerModal({ open, onClose, onPick }) {
  const { data: masterConcepts = [] } = useQuery({ queryKey: ["construct-master-concepts"], queryFn: constructService.listMasterConcepts });
  return (
    <Modal open={open} title="Usar del catálogo maestro" subtitle="Se copia como concepto editable del proyecto, con su matriz APU precargada." onClose={onClose}>
      <div className="obr-picker-list">
        {masterConcepts.map((mc) => (
          <button key={mc.id} type="button" className="obr-picker-row" onClick={() => onPick(mc.id)}>
            <div><b>{mc.code}</b><span>{mc.name}</span></div>
            <span className="obr-unit-chip">{UNIT_LABEL[mc.unit] || mc.unit}</span>
          </button>
        ))}
        {masterConcepts.length === 0 && <div className="obr-empty">Catálogo maestro vacío.</div>}
      </div>
    </Modal>
  );
}

function NewConceptModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState({ code: "", name: "", unit: "m2" });
  const submit = () => {
    onCreate(form);
    setForm({ code: "", name: "", unit: "m2" });
  };
  return (
    <Modal open={open} title="Nuevo concepto" subtitle="Se agregará al nodo WBS seleccionado." onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={!form.code || !form.name} onClick={submit}>Crear concepto</Button>
        </>
      )}>
      <div className="obr-form-grid">
        <label className="obr-field">
          <span>Clave</span>
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="ALB-002" />
        </label>
        <label className="obr-field">
          <span>Unidad</span>
          <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            {Object.entries(UNIT_LABEL).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
        <label className="obr-field full">
          <span>Descripción</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Muro de block hueco 15x20x40…" />
        </label>
      </div>
    </Modal>
  );
}

/* Equivalente al "qf-manager" del demo, pero data-driven de verdad: árbol WBS
   infinito + tabla de conceptos del nodo seleccionado + flujo tipo→editor. */
function WbsManagerView({ project }) {
  const { canUseFeature, showToast } = useAppContext();
  const canEdit = canUseFeature("construct.quantify");
  const queryClient = useQueryClient();

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [view, setView] = useState("manager"); // manager | type | editor
  const [activeConceptId, setActiveConceptId] = useState(null);
  const [showNewConcept, setShowNewConcept] = useState(false);
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);

  const nodesQuery = useQuery({ queryKey: ["construct-nodes", project.id], queryFn: () => constructService.listWbsNodes(project.id) });
  const conceptsQuery = useQuery({ queryKey: ["construct-concepts", project.id], queryFn: () => constructService.listConcepts(project.id) });
  const nodes = nodesQuery.data || [];
  const concepts = conceptsQuery.data || [];

  const effectiveNodeId = selectedNodeId || nodes[0]?.id || null;

  const countsByNode = useMemo(() => {
    const map = {};
    concepts.forEach((c) => { map[c.nodeId] = (map[c.nodeId] || 0) + 1; });
    return map;
  }, [concepts]);

  const nodeConcepts = concepts.filter((c) => c.nodeId === effectiveNodeId);
  const activeConcept = concepts.find((c) => c.id === activeConceptId) || null;
  const selectedNode = nodes.find((n) => n.id === effectiveNodeId) || null;
  const childFases = selectedNode?.kind !== "partida" ? nodes.filter((n) => n.parentId === effectiveNodeId) : [];

  const breadcrumb = useMemo(() => {
    const parts = [];
    let current = selectedNode;
    while (current) {
      parts.unshift(current.name);
      current = nodes.find((n) => n.id === current.parentId) || null;
    }
    return [project.name, ...parts];
  }, [selectedNode, nodes, project.name]);

  const isPartida = selectedNode?.kind === "partida";
  const nodeClosed = Boolean(selectedNode?.closed);
  const canEditHere = canEdit && !nodeClosed;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["construct-nodes", project.id] });
    queryClient.invalidateQueries({ queryKey: ["construct-concepts", project.id] });
  };

  const addNodeMutation = useMutation({
    mutationFn: (parentId) => constructService.createWbsNode({ projectId: project.id, parentId, name: parentId ? "Nueva partida" : "Nueva fase" }),
    onSuccess: invalidate,
  });
  const closeNodeMutation = useMutation({
    mutationFn: (id) => constructService.closeWbsNode(id),
    onSuccess: () => { invalidate(); showToast("Cuantificación cerrada"); },
  });
  const reopenNodeMutation = useMutation({
    mutationFn: (id) => constructService.reopenWbsNode(id),
    onSuccess: () => { invalidate(); showToast("Cuantificación reabierta"); },
  });
  const renameNodeMutation = useMutation({ mutationFn: ({ id, name }) => constructService.renameWbsNode(id, name), onSuccess: invalidate });
  const duplicateNodeMutation = useMutation({ mutationFn: (id) => constructService.duplicateWbsNode(id), onSuccess: invalidate });
  const deleteNodeMutation = useMutation({
    mutationFn: (id) => constructService.deleteWbsNode(id),
    onSuccess: (_data, id) => { invalidate(); if (effectiveNodeId === id) setSelectedNodeId(null); },
  });
  const reorderMutation = useMutation({
    mutationFn: ({ parentId, orderedIds }) => constructService.reorderSiblings(project.id, parentId, orderedIds),
    onSuccess: invalidate,
  });

  const createConceptMutation = useMutation({
    mutationFn: (data) => constructService.createConcept({ projectId: project.id, nodeId: effectiveNodeId, ...data }),
    onSuccess: (concept) => { invalidate(); setShowNewConcept(false); setActiveConceptId(concept.id); setView("type"); },
  });
  const applyMasterConceptMutation = useMutation({
    mutationFn: (masterConceptId) => constructService.applyMasterConcept(masterConceptId, { projectId: project.id, nodeId: effectiveNodeId }),
    onSuccess: (concept) => { invalidate(); setShowCatalogPicker(false); setActiveConceptId(concept.id); setView("type"); showToast("Concepto agregado desde el catálogo maestro"); },
  });
  const setTypeMutation = useMutation({
    mutationFn: ({ id, type }) => constructService.setConceptType(id, type),
    onSuccess: () => { invalidate(); setView("editor"); },
  });
  const saveRowsMutation = useMutation({
    mutationFn: ({ id, rows }) => constructService.saveGeneratorRows(id, rows),
    onSuccess: () => { invalidate(); showToast("Cuantificación guardada"); },
  });
  const saveDirectMutation = useMutation({
    mutationFn: ({ id, direct }) => constructService.saveDirect(id, direct),
    onSuccess: () => { invalidate(); showToast("Cuantificación guardada"); },
  });
  const deleteConceptMutation = useMutation({ mutationFn: (id) => constructService.deleteConcept(id), onSuccess: invalidate });

  if (view === "type" && activeConcept) {
    return <ConceptTypeStep concept={activeConcept} onSelect={(type) => setTypeMutation.mutate({ id: activeConcept.id, type })} />;
  }
  if (view === "editor" && activeConcept) {
    return (
      <ConceptEditor
        concept={activeConcept}
        canEdit={canEditHere}
        onBack={() => setView("manager")}
        onSaveGeneratorRows={(rows) => saveRowsMutation.mutate({ id: activeConcept.id, rows })}
        onSaveDirect={(direct) => saveDirectMutation.mutate({ id: activeConcept.id, direct })}
        onChangeType={() => setView("type")}
      />
    );
  }

  return (
    <div className="obr-manager-shell">
      <div className="obr-card obr-wbs-card">
        <div className="obr-card-head">
          <div><h2>WBS</h2><p>Fases, zonas y partidas</p></div>
        </div>
        <WbsTree
          nodes={nodes}
          selectedId={effectiveNodeId}
          onSelect={setSelectedNodeId}
          countsByNode={countsByNode}
          canEdit={canEdit}
          onAddChild={(parentId) => addNodeMutation.mutate(parentId)}
          onRename={(id, name) => renameNodeMutation.mutate({ id, name })}
          onDuplicate={(id) => duplicateNodeMutation.mutate(id)}
          onDelete={(id) => { if (window.confirm("¿Eliminar este nodo y todo su contenido?")) deleteNodeMutation.mutate(id); }}
          onReorder={(parentId, orderedIds) => reorderMutation.mutate({ parentId, orderedIds })}
        />
      </div>

      <div className="obr-card obr-concepts-card">
        <div className="obr-card-head">
          <div className="obr-concept-heading">
            {effectiveNodeId && <span className="obr-node-icon"><HiRectangleGroup /></span>}
            <div>
              <h2>{selectedNode?.name || "Selecciona un nodo"}</h2>
              <p className="obr-breadcrumb">{effectiveNodeId ? breadcrumb.join(" / ") : "Ningún nodo seleccionado"}</p>
            </div>
          </div>
          {canEditHere && isPartida && (
            <div className="obr-toolbar-actions">
              <button type="button" className="obr-secondary" onClick={() => setShowCatalogPicker(true)}><HiArchiveBox /> Usar del catálogo</button>
              <button type="button" className="obr-primary" onClick={() => setShowNewConcept(true)}><HiPlus /> Nuevo concepto</button>
            </div>
          )}
        </div>

        {!effectiveNodeId ? (
          <div className="obr-empty">Crea o selecciona una fase del WBS para ver sus partidas.</div>
        ) : !isPartida ? (
          <div className="obr-fase-rollup">
            {childFases.length === 0 ? (
              <div className="obr-empty">Esta fase no tiene partidas todavía. Agrégalas desde el árbol WBS.</div>
            ) : (
              <div className="obr-partida-grid">
                {childFases.map((p) => (
                  <button key={p.id} type="button" className="obr-partida-chip" onClick={() => setSelectedNodeId(p.id)}>
                    <b>{p.name}</b>
                    <span>{(countsByNode[p.id] || 0)} concepto{(countsByNode[p.id] || 0) === 1 ? "" : "s"} {p.closed ? "· Cerrada" : ""}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {canEdit && (
              <div className="obr-demo-banner-row">
                <button type="button" className="obr-secondary" onClick={() => showToast("Borrador guardado")}>Guardar borrador</button>
              </div>
            )}
            {nodeClosed && (
              <div className="obr-audit-note obr-closed-note"><HiLockClosed /> Esta partida está cerrada — la cuantificación quedó fija. {canEdit && <button type="button" className="obr-link-btn" onClick={() => reopenNodeMutation.mutate(effectiveNodeId)}>Reabrir</button>}</div>
            )}
            {nodeConcepts.length === 0 ? (
              <div className="obr-empty">Sin conceptos todavía en esta partida.</div>
            ) : (
              <table className="obr-table">
                <thead><tr><th>Clave</th><th>Concepto</th><th>Tipo</th><th className="obr-num">Cantidad</th><th>Estado</th><th /></tr></thead>
                <tbody>
                  {nodeConcepts.map((concept) => (
                    <tr key={concept.id}>
                      <td className="obr-code">{concept.code}</td>
                      <td>{concept.name}</td>
                      <td>{concept.type ? <span className={`obr-badge-type ${concept.type}`}>{TYPE_BADGE[concept.type]}</span> : <span className="obr-badge-type">Sin tipo</span>}</td>
                      <td className="obr-num">
                        {concept.quantity != null ? `${concept.quantity.toLocaleString("es-MX", { maximumFractionDigits: 2 })} ${UNIT_LABEL[concept.unit] || concept.unit}` : "—"}
                        {concept.type === "direct" && concept.quantity > 0 ? <AuditBadge /> : null}
                      </td>
                      <td><span className={`obr-badge-status ${concept.status}`}>{concept.status}</span></td>
                      <td className="obr-row-actions">
                        <button type="button" onClick={() => { setActiveConceptId(concept.id); setView(concept.type ? "editor" : "type"); }}>
                          {concept.type ? (canEditHere ? "Editar" : "Ver") : "Cuantificar"}
                        </button>
                        {canEditHere && <button type="button" onClick={() => deleteConceptMutation.mutate(concept.id)}>Eliminar</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="obr-close-bar">
              <span className={`obr-badge-audit ${nodeClosed ? "" : "success"}`}>{nodeClosed ? "Cerrada" : "Demo guardado"}</span>
              {canEdit && !nodeClosed && (
                <button type="button" className="obr-close-btn" onClick={() => closeNodeMutation.mutate(effectiveNodeId)}>
                  <HiCheck /> Cerrar cuantificación
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <NewConceptModal open={showNewConcept} onClose={() => setShowNewConcept(false)} onCreate={(data) => createConceptMutation.mutate(data)} />
      <MasterConceptPickerModal open={showCatalogPicker} onClose={() => setShowCatalogPicker(false)} onPick={(id) => applyMasterConceptMutation.mutate(id)} />
    </div>
  );
}

export default WbsManagerView;
