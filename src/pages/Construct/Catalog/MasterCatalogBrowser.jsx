import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HiPencil, HiPlus, HiTrash } from "react-icons/hi2";
import * as constructService from "@/services/constructService";
import { useAppContext } from "@/context/AppContext";
import { CSI_DIVISIONS } from "../data/mockCatalog";
import { costoDirecto, unitCostOfInsumo, unitCostOfRef } from "../utils/costEngine";
import { currency2 } from "../utils/format";
import CatalogItemForm from "./CatalogItemForm";
import RecipeRowEditor from "./RecipeRowEditor";

const KIND_FILTERS = [{ code: "ALL", label: "Todos" }, { code: "MAT", label: "Materiales" }, { code: "MO", label: "Mano de obra" }, { code: "EQ", label: "Equipo" }];
const csiName = (code) => CSI_DIVISIONS.find((d) => d.code === code)?.name || code;

function InsumosTab({ insumos, catalog, canEdit }) {
  const queryClient = useQueryClient();
  const { showToast } = useAppContext();
  const [kindFilter, setKindFilter] = useState("ALL");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["construct-insumos"] });
  const createMutation = useMutation({ mutationFn: constructService.createInsumo, onSuccess: () => { invalidate(); showToast("Insumo agregado al catálogo"); } });
  const updateMutation = useMutation({ mutationFn: ({ id, patch }) => constructService.updateInsumo(id, patch), onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: constructService.deleteInsumo, onSuccess: invalidate });

  const list = insumos.filter((i) => kindFilter === "ALL" || i.kind === kindFilter);

  return (
    <>
      <div className="obr-catalog-toolbar">
        <div className="obr-segmented">
          {KIND_FILTERS.map((f) => (
            <button key={f.code} type="button" className={kindFilter === f.code ? "active" : ""} onClick={() => setKindFilter(f.code)}>{f.label}</button>
          ))}
        </div>
        {canEdit && <button type="button" className="obr-primary" onClick={() => { setEditing(null); setShowForm(true); }}><HiPlus /> Nuevo insumo</button>}
      </div>
      <table className="obr-table">
        <thead><tr><th>Clave</th><th>Descripción</th><th>División CSI</th><th>Unidad</th><th className="obr-num">Costo base</th><th className="obr-num">Costo unitario</th>{canEdit && <th />}</tr></thead>
        <tbody>
          {list.map((insumo) => (
            <tr key={insumo.id}>
              <td className="obr-code">{insumo.code}</td>
              <td>{insumo.name}</td>
              <td>{csiName(insumo.csiDivision)}</td>
              <td>{insumo.unit}</td>
              <td className="obr-num">{currency2(insumo.baseCost)}</td>
              <td className="obr-num">{currency2(unitCostOfInsumo(insumo))}</td>
              {canEdit && (
                <td className="obr-row-actions">
                  <button type="button" onClick={() => { setEditing(insumo); setShowForm(true); }}><HiPencil /></button>
                  <button type="button" onClick={() => deleteMutation.mutate(insumo.id)}><HiTrash /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <CatalogItemForm
        open={showForm}
        initial={editing}
        onClose={() => setShowForm(false)}
        onSubmit={(data) => {
          if (editing) updateMutation.mutate({ id: editing.id, patch: data });
          else createMutation.mutate(data);
          setShowForm(false);
        }}
      />
    </>
  );
}

function BasicosTab({ basicos, catalog, canEdit }) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["construct-basicos"] });
  const createMutation = useMutation({
    mutationFn: () => constructService.createBasico({ code: `BAS-${(basicos.length + 1).toString().padStart(3, "0")}`, name: "Nuevo básico", unit: "m3", components: [] }),
    onSuccess: (basico) => { invalidate(); setExpandedId(basico.id); },
  });
  const updateMutation = useMutation({ mutationFn: ({ id, patch }) => constructService.updateBasico(id, patch), onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: constructService.deleteBasico, onSuccess: invalidate });

  return (
    <>
      <div className="obr-catalog-toolbar">
        <p className="obr-muted">Sub-recetas reutilizables (ej. Mortero 1:4) — se insertan como un insumo más dentro de cualquier concepto.</p>
        {canEdit && <button type="button" className="obr-primary" onClick={() => createMutation.mutate()}><HiPlus /> Nuevo básico</button>}
      </div>
      <div className="obr-recipe-list">
        {basicos.map((basico) => (
          <div key={basico.id} className="obr-card obr-recipe-card">
            <div className="obr-recipe-card-head" onClick={() => setExpandedId(expandedId === basico.id ? null : basico.id)}>
              <div>
                <b>{basico.code} · {basico.name}</b>
                <span>{basico.unit} · costo unitario {currency2(unitCostOfRef("basico", basico.id, catalog))}</span>
              </div>
              {canEdit && (
                <button type="button" className="obr-icon-btn" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(basico.id); }}><HiTrash /></button>
              )}
            </div>
            {expandedId === basico.id && (
              <div className="obr-recipe-card-body">
                <label className="obr-field full">
                  <span>Nombre</span>
                  <input value={basico.name} disabled={!canEdit} onChange={(e) => updateMutation.mutate({ id: basico.id, patch: { name: e.target.value } })} />
                </label>
                <RecipeRowEditor
                  items={basico.components}
                  catalog={catalog}
                  canEdit={canEdit}
                  datalistId={`obr-basico-options-${basico.id}`}
                  excludeBasicoId={basico.id}
                  onChange={(components) => updateMutation.mutate({ id: basico.id, patch: { components } })}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function MasterConceptsTab({ masterConcepts, catalog }) {
  return (
    <table className="obr-table">
      <thead><tr><th>Clave</th><th>Concepto</th><th>Unidad</th><th>División CSI</th><th className="obr-num">Costo directo</th></tr></thead>
      <tbody>
        {masterConcepts.map((mc) => (
          <tr key={mc.id}>
            <td className="obr-code">{mc.code}</td>
            <td>{mc.name}</td>
            <td>{mc.unit}</td>
            <td>{csiName(mc.csiDivision)}</td>
            <td className="obr-num">{currency2(costoDirecto({ financial: { apu: mc.apu } }, catalog))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const TABS = [{ key: "insumos", label: "Insumos" }, { key: "basicos", label: "Básicos" }, { key: "conceptos", label: "Conceptos maestro" }];

/* Catálogo Maestro (Módulo 1 del PRD) — Single Source of Truth de insumos,
   sub-recetas y conceptos estándar. Vive fuera del proyecto: un cambio aquí
   se refleja en el costo de cualquier concepto que use ese insumo/básico. */
function MasterCatalogBrowser() {
  const { canUseFeature } = useAppContext();
  const canEdit = canUseFeature("construct.catalog");
  const [tab, setTab] = useState("insumos");

  const insumosQuery = useQuery({ queryKey: ["construct-insumos"], queryFn: constructService.listInsumos });
  const basicosQuery = useQuery({ queryKey: ["construct-basicos"], queryFn: constructService.listBasicos });
  const masterQuery = useQuery({ queryKey: ["construct-master-concepts"], queryFn: constructService.listMasterConcepts });

  const insumos = insumosQuery.data || [];
  const basicos = basicosQuery.data || [];
  const masterConcepts = masterQuery.data || [];
  const catalog = { insumos, basicos };

  return (
    <div className="obr-card obr-catalog-shell">
      <div className="obr-card-head">
        <div><h2>Catálogo maestro</h2><p>Única fuente de verdad de insumos, básicos y conceptos estándar de la empresa.</p></div>
      </div>
      <div className="obr-tabs">
        {TABS.map((t) => <button key={t.key} type="button" className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>
      <div className="obr-catalog-body">
        {tab === "insumos" && <InsumosTab insumos={insumos} catalog={catalog} canEdit={canEdit} />}
        {tab === "basicos" && <BasicosTab basicos={basicos} catalog={catalog} canEdit={canEdit} />}
        {tab === "conceptos" && <MasterConceptsTab masterConcepts={masterConcepts} catalog={catalog} />}
      </div>
    </div>
  );
}

export default MasterCatalogBrowser;
