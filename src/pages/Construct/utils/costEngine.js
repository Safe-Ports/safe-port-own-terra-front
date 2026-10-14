import { roundHalfEven } from "@/services/formulaEngine";
import { FACTOR_CUOTAS_PATRONALES } from "../data/mockCatalog";

/* Core Engine (Módulo 4 del PRD): cascada FASAR → Costo Horario → Costo Directo
   → Pie de Precios, calculada en cliente sobre el catálogo (mock por ahora).
   Todo redondeo monetario usa roundHalfEven — mismo criterio que el backend
   (ver src/services/formulaEngine.js), para no repetir la divergencia que ya
   se corrigió en la Calculadora. */

function indexById(list) {
  return new Map((list || []).map((item) => [item.id, item]));
}

/* FASAR: Salario Base × factor de cuotas patronales/IMSS. */
function fasar(insumo) {
  return roundHalfEven(insumo.baseCost * FACTOR_CUOTAS_PATRONALES, 2);
}

/* Desgaste de la maquinaria por hora activa. */
function costoHorario(insumo) {
  return roundHalfEven(insumo.baseCost / (insumo.usefulLifeHours || 1), 2);
}

export function unitCostOfInsumo(insumo) {
  if (!insumo) return 0;
  if (insumo.kind === "MO") return fasar(insumo);
  if (insumo.kind === "EQ") return costoHorario(insumo);
  return roundHalfEven(insumo.baseCost, 2);
}

/* Resuelve el costo unitario de una referencia de matriz APU: un insumo directo,
   o un Básico (sub-receta) que se expande recursivamente. `seen` evita ciclos si
   un Básico llegara a referenciarse a sí mismo por error de captura. */
export function unitCostOfRef(refType, refId, catalog, seen = new Set()) {
  if (refType === "insumo") {
    return unitCostOfInsumo(indexById(catalog.insumos).get(refId));
  }
  if (refType === "basico") {
    if (seen.has(refId)) return 0;
    const basico = indexById(catalog.basicos).get(refId);
    if (!basico) return 0;
    const nextSeen = new Set(seen).add(refId);
    const total = (basico.components || []).reduce((sum, comp) => (
      sum + comp.performance * unitCostOfRef(comp.refType, comp.refId, catalog, nextSeen)
    ), 0);
    return roundHalfEven(total, 2);
  }
  return 0;
}

/* Costo Directo = suma matricial de Insumos × Rendimientos de la matriz APU del concepto. */
export function costoDirecto(concept, catalog) {
  const apu = concept?.financial?.apu || [];
  const total = apu.reduce((sum, item) => (
    sum + (Number(item.performance) || 0) * unitCostOfRef(item.refType, item.refId, catalog)
  ), 0);
  return roundHalfEven(total, 2);
}

/* Pie de Precios = Costo Directo × cascada de Indirectos/Financiamiento/Utilidad
   + Cargos Adicionales, usando los Parámetros Financieros Globales del proyecto. */
export function pieDePrecio(concept, project, catalog) {
  const cd = costoDirecto(concept, catalog);
  const s = project?.settings || {};
  let amount = cd * (1 + (Number(s.indirectosCampo) || 0) + (Number(s.indirectosOficina) || 0));
  amount *= 1 + (Number(s.financiamiento) || 0);
  amount *= 1 + (Number(s.utilidad) || 0);
  amount += Number(s.cargosAdicionales) || 0;
  return roundHalfEven(amount, 2);
}

/* Aísla, dentro del Pie de Precios, cuánto corresponde solo a la capa de
   Utilidad (para la Carátula General — utilidad final de la constructora). */
export function utilidadUnitAmount(concept, project, catalog) {
  const cd = costoDirecto(concept, catalog);
  const s = project?.settings || {};
  const base1 = cd * (1 + (Number(s.indirectosCampo) || 0) + (Number(s.indirectosOficina) || 0));
  const base2 = base1 * (1 + (Number(s.financiamiento) || 0));
  return roundHalfEven(base2 * (Number(s.utilidad) || 0), 2);
}

/* Monto de un concepto en el presupuesto, según su estrategia de cobro
   (Router Polimórfico por línea, no global). */
export function conceptAmount(concept, project, catalog) {
  const quantity = Number(concept.quantity) || 0;
  const mode = concept?.financial?.mode;

  if (mode === "apu") {
    const unitPrice = pieDePrecio(concept, project, catalog);
    return { unitPrice, total: roundHalfEven(quantity * unitPrice, 2) };
  }
  if (mode === "lump") {
    const total = Number(concept?.financial?.lumpAmount) || 0;
    return { unitPrice: quantity > 0 ? roundHalfEven(total / quantity, 2) : null, total: roundHalfEven(total, 2) };
  }
  if (mode === "parametric") {
    const unitPrice = Number(concept?.financial?.parametricUnitPrice) || 0;
    return { unitPrice, total: roundHalfEven(quantity * unitPrice, 2) };
  }
  return { unitPrice: null, total: 0 };
}

/* Explosión de Insumos (BOM) para el Anexo A: recorre todos los conceptos APU
   del proyecto y acumula, por insumo base, cuánto se necesita en total —
   expandiendo Básicos recursivamente por su rendimiento encadenado. */
export function explodeBOM(concepts, catalog) {
  const totals = new Map();

  function addRef(refType, refId, qty, seen) {
    if (refType === "insumo") {
      totals.set(refId, (totals.get(refId) || 0) + qty);
      return;
    }
    if (refType === "basico") {
      if (seen.has(refId)) return;
      const basico = indexById(catalog.basicos).get(refId);
      if (!basico) return;
      const nextSeen = new Set(seen).add(refId);
      (basico.components || []).forEach((comp) => (
        addRef(comp.refType, comp.refId, qty * (Number(comp.performance) || 0), nextSeen)
      ));
    }
  }

  concepts
    .filter((concept) => concept?.financial?.mode === "apu")
    .forEach((concept) => {
      const quantity = Number(concept.quantity) || 0;
      (concept.financial.apu || []).forEach((item) => (
        addRef(item.refType, item.refId, quantity * (Number(item.performance) || 0), new Set())
      ));
    });

  const insumoIndex = indexById(catalog.insumos);
  return Array.from(totals.entries())
    .map(([insumoId, qty]) => ({ insumo: insumoIndex.get(insumoId), quantity: roundHalfEven(qty, 3) }))
    .filter((row) => row.insumo)
    .sort((a, b) => a.insumo.code.localeCompare(b.insumo.code));
}
