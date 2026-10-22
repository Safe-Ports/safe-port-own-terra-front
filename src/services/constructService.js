import {
  BASICOS_SEED,
  INSUMOS_SEED,
  MASTER_CONCEPTS_SEED,
  seedProject,
  seedProjects,
} from "@/pages/Construct/data/mockCatalog";
import { consolidateGenerator } from "@/pages/Construct/utils/generatorMath";

/* Store de Ownterra Construct EN MEMORIA (sin persistencia real todavía —
   ver decisión "Motor de costos: calcular en cliente con catálogo mock" del
   plan). Cada función devuelve una Promise para que los componentes ya
   consuman esto vía React Query igual que cualquier otro servicio del repo
   (ver src/services/lotService.js) — el día que exista backend, solo este
   archivo se reescribe sobre axios/api.js, ningún componente cambia. */

const seed = seedProject();

const store = {
  projects: seedProjects(),
  nodes: [...seed.nodes],
  concepts: [...seed.concepts],
  insumos: [...INSUMOS_SEED],
  basicos: [...BASICOS_SEED],
  masterConcepts: [...MASTER_CONCEPTS_SEED],
};

const genId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const clone = (value) => JSON.parse(JSON.stringify(value));
const resolve = (value) => Promise.resolve(clone(value));

function recomputeConcept(concept) {
  if (concept.type === "generator") {
    concept.quantity = consolidateGenerator(concept.rows || [], concept.unit);
    concept.status = (concept.rows || []).length > 0 ? "Cuantificada" : "Borrador";
  } else if (concept.type === "direct") {
    concept.quantity = Number(concept.direct?.value) || 0;
    concept.status = concept.quantity > 0 ? "Cuantificada" : "Borrador";
  } else if (concept.type === "bim") {
    concept.status = concept.status === "Pendiente" ? "Borrador" : concept.status;
  } else {
    concept.status = "Pendiente";
  }
  return concept;
}

function findConceptOrThrow(id) {
  const concept = store.concepts.find((c) => c.id === id);
  if (!concept) throw new Error(`Concepto ${id} no encontrado`);
  return concept;
}

/* ── Proyectos ─────────────────────────────────────────────────────────── */

export function listProjects() {
  return resolve(store.projects);
}

export function getProject(projectId) {
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return Promise.reject(new Error(`Proyecto ${projectId} no encontrado`));
  return resolve(project);
}

export function createProject({ name, location, type, stages = [] }) {
  const project = {
    id: genId("prj"),
    name,
    location,
    type,
    createdAt: new Date().toISOString(),
    settings: {
      indirectosCampo: 0.08,
      indirectosOficina: 0.04,
      financiamiento: 0.015,
      utilidad: 0.06,
      cargosAdicionales: 0,
    },
  };
  store.projects.push(project);
  stages.forEach((name_, index) => {
    store.nodes.push({ id: genId("n"), projectId: project.id, parentId: null, name: name_, order: index, kind: "fase", closed: false });
  });
  return resolve(project);
}

export function updateProjectSettings(projectId, settings) {
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return Promise.reject(new Error(`Proyecto ${projectId} no encontrado`));
  project.settings = { ...project.settings, ...settings };
  return resolve(project);
}

/* ── WBS ───────────────────────────────────────────────────────────────── */

export function listWbsNodes(projectId) {
  return resolve(store.nodes.filter((n) => n.projectId === projectId).sort((a, b) => a.order - b.order));
}

/* WBS de 3 niveles fijos: Proyecto (implícito) → Fase (nodo raíz) → Partida
   (hoja, cuelga de una Fase y ya no puede tener hijos). No es un árbol
   infinito — es el control real de la constructora. */
export function createWbsNode({ projectId, parentId = null, name }) {
  if (parentId) {
    const parent = store.nodes.find((n) => n.id === parentId);
    if (!parent) return Promise.reject(new Error(`Nodo ${parentId} no encontrado`));
    if (parent.kind === "partida") return Promise.reject(new Error("Una Partida no puede tener sub-nodos."));
  }
  const siblings = store.nodes.filter((n) => n.projectId === projectId && n.parentId === parentId);
  const node = {
    id: genId("n"),
    projectId,
    parentId,
    name,
    order: siblings.length,
    kind: parentId ? "partida" : "fase",
    closed: false,
  };
  store.nodes.push(node);
  return resolve(node);
}

export function closeWbsNode(id) {
  const node = store.nodes.find((n) => n.id === id);
  if (!node) return Promise.reject(new Error(`Nodo ${id} no encontrado`));
  node.closed = true;
  return resolve(node);
}

export function reopenWbsNode(id) {
  const node = store.nodes.find((n) => n.id === id);
  if (!node) return Promise.reject(new Error(`Nodo ${id} no encontrado`));
  node.closed = false;
  return resolve(node);
}

export function renameWbsNode(id, name) {
  const node = store.nodes.find((n) => n.id === id);
  if (!node) return Promise.reject(new Error(`Nodo ${id} no encontrado`));
  node.name = name;
  return resolve(node);
}

function collectDescendantIds(nodeId) {
  const children = store.nodes.filter((n) => n.parentId === nodeId).map((n) => n.id);
  return children.reduce((acc, childId) => acc.concat(childId, collectDescendantIds(childId)), []);
}

export function duplicateWbsNode(id) {
  const original = store.nodes.find((n) => n.id === id);
  if (!original) return Promise.reject(new Error(`Nodo ${id} no encontrado`));

  const idMap = new Map();
  const toDuplicate = [original.id, ...collectDescendantIds(original.id)];
  toDuplicate.forEach((oldId) => idMap.set(oldId, genId("n")));

  const siblings = store.nodes.filter((n) => n.projectId === original.projectId && n.parentId === original.parentId);
  toDuplicate.forEach((oldId) => {
    const src = store.nodes.find((n) => n.id === oldId);
    const isRoot = oldId === original.id;
    store.nodes.push({
      id: idMap.get(oldId),
      projectId: src.projectId,
      parentId: isRoot ? src.parentId : idMap.get(src.parentId),
      name: isRoot ? `${src.name} (copia)` : src.name,
      order: isRoot ? siblings.length : src.order,
      kind: src.kind,
      closed: false,
    });
  });

  const conceptsToDuplicate = store.concepts.filter((c) => idMap.has(c.nodeId));
  conceptsToDuplicate.forEach((c) => {
    store.concepts.push({ ...clone(c), id: genId("cpt"), nodeId: idMap.get(c.nodeId) });
  });

  return resolve(store.nodes.find((n) => n.id === idMap.get(original.id)));
}

export function deleteWbsNode(id) {
  const idsToDelete = new Set([id, ...collectDescendantIds(id)]);
  store.nodes = store.nodes.filter((n) => !idsToDelete.has(n.id));
  store.concepts = store.concepts.filter((c) => !idsToDelete.has(c.nodeId));
  return resolve({ ok: true });
}

export function reorderSiblings(projectId, parentId, orderedIds) {
  orderedIds.forEach((nodeId, index) => {
    const node = store.nodes.find((n) => n.id === nodeId && n.projectId === projectId && n.parentId === parentId);
    if (node) node.order = index;
  });
  return resolve(store.nodes.filter((n) => n.projectId === projectId && n.parentId === parentId));
}

/* ── Conceptos ─────────────────────────────────────────────────────────── */

export function listConcepts(projectId) {
  return resolve(store.concepts.filter((c) => c.projectId === projectId));
}

export function createConcept({ projectId, nodeId, code, name, unit }) {
  const concept = {
    id: genId("cpt"),
    projectId,
    nodeId,
    code,
    name,
    unit,
    type: null,
    status: "Pendiente",
    quantity: null,
    rows: [],
    direct: null,
    masterConceptId: null,
    financial: { mode: null, apu: [], lumpAmount: null, parametricUnitPrice: null },
  };
  store.concepts.push(concept);
  return resolve(concept);
}

export function updateConcept(id, patch) {
  const concept = findConceptOrThrow(id);
  Object.assign(concept, patch);
  return resolve(recomputeConcept(concept));
}

export function deleteConcept(id) {
  store.concepts = store.concepts.filter((c) => c.id !== id);
  return resolve({ ok: true });
}

export function setConceptType(id, type) {
  const concept = findConceptOrThrow(id);
  concept.type = type;
  if (type === "generator" && !concept.rows) concept.rows = [];
  if (type === "direct" && !concept.direct) concept.direct = { value: 0, reason: "" };
  return resolve(recomputeConcept(concept));
}

export function saveGeneratorRows(id, rows) {
  const concept = findConceptOrThrow(id);
  concept.rows = rows;
  return resolve(recomputeConcept(concept));
}

export function saveDirect(id, direct) {
  const concept = findConceptOrThrow(id);
  concept.direct = direct;
  return resolve(recomputeConcept(concept));
}

export function setFinancialMode(id, mode) {
  const concept = findConceptOrThrow(id);
  concept.financial = { ...concept.financial, mode };
  return resolve(concept);
}

export function saveApu(id, apu) {
  const concept = findConceptOrThrow(id);
  concept.financial = { ...concept.financial, mode: "apu", apu };
  return resolve(concept);
}

export function saveLump(id, lumpAmount) {
  const concept = findConceptOrThrow(id);
  concept.financial = { ...concept.financial, mode: "lump", lumpAmount };
  return resolve(concept);
}

export function saveParametric(id, parametricUnitPrice) {
  const concept = findConceptOrThrow(id);
  concept.financial = { ...concept.financial, mode: "parametric", parametricUnitPrice };
  return resolve(concept);
}

/* ── Catálogo Maestro ──────────────────────────────────────────────────── */

export function listInsumos() {
  return resolve(store.insumos);
}

export function createInsumo(data) {
  const insumo = { id: genId("ins"), ...data };
  store.insumos.push(insumo);
  return resolve(insumo);
}

export function updateInsumo(id, patch) {
  const insumo = store.insumos.find((i) => i.id === id);
  if (!insumo) return Promise.reject(new Error(`Insumo ${id} no encontrado`));
  Object.assign(insumo, patch);
  return resolve(insumo);
}

export function deleteInsumo(id) {
  store.insumos = store.insumos.filter((i) => i.id !== id);
  return resolve({ ok: true });
}

export function listBasicos() {
  return resolve(store.basicos);
}

export function createBasico(data) {
  const basico = { id: genId("bas"), ...data };
  store.basicos.push(basico);
  return resolve(basico);
}

export function updateBasico(id, patch) {
  const basico = store.basicos.find((b) => b.id === id);
  if (!basico) return Promise.reject(new Error(`Básico ${id} no encontrado`));
  Object.assign(basico, patch);
  return resolve(basico);
}

export function deleteBasico(id) {
  store.basicos = store.basicos.filter((b) => b.id !== id);
  return resolve({ ok: true });
}

export function listMasterConcepts() {
  return resolve(store.masterConcepts);
}

export function createMasterConcept(data) {
  const masterConcept = { id: genId("mc"), ...data };
  store.masterConcepts.push(masterConcept);
  return resolve(masterConcept);
}

/* Copia un concepto del Catálogo Maestro como instancia editable del proyecto
   (Single Source of Truth → instancia local), preseteada en modo APU con la
   misma matriz de insumos/rendimientos del maestro. */
export function applyMasterConcept(masterConceptId, { projectId, nodeId }) {
  const master = store.masterConcepts.find((m) => m.id === masterConceptId);
  if (!master) return Promise.reject(new Error(`Concepto maestro ${masterConceptId} no encontrado`));
  const concept = {
    id: genId("cpt"),
    projectId,
    nodeId,
    code: master.code,
    name: master.name,
    unit: master.unit,
    type: null,
    status: "Pendiente",
    quantity: null,
    rows: [],
    direct: null,
    masterConceptId: master.id,
    financial: { mode: "apu", apu: clone(master.apu), lumpAmount: null, parametricUnitPrice: null },
  };
  store.concepts.push(concept);
  return resolve(concept);
}

export function getCatalogSnapshot() {
  return resolve({ insumos: store.insumos, basicos: store.basicos });
}
