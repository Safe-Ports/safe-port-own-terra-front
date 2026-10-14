import { describe, expect, it } from "vitest";
import { conceptAmount, costoDirecto, explodeBOM, pieDePrecio, unitCostOfInsumo, unitCostOfRef } from "./costEngine.js";

const catalog = {
  insumos: [
    { id: "i-mat", kind: "MAT", code: "MAT-1", baseCost: 100 },
    { id: "i-mo", kind: "MO", code: "MO-1", baseCost: 400 },
    { id: "i-eq", kind: "EQ", code: "EQ-1", baseCost: 900, usefulLifeHours: 3 },
  ],
  basicos: [
    {
      id: "b-mix",
      components: [
        { refType: "insumo", refId: "i-mat", performance: 2 },
        { refType: "insumo", refId: "i-mo", performance: 0.5 },
      ],
    },
  ],
};

describe("unitCostOfInsumo: FASAR y costo horario del Core Engine (Módulo 4 del PRD)", () => {
  it("MAT usa el costo base directo", () => {
    expect(unitCostOfInsumo(catalog.insumos[0])).toBe(100);
  });
  it("MO aplica FASAR: Salario Base x factor de cuotas patronales", () => {
    // 400 * 1.35 (FACTOR_CUOTAS_PATRONALES en mockCatalog.js)
    expect(unitCostOfInsumo(catalog.insumos[1])).toBe(540);
  });
  it("EQ se desgasta por hora activa: costo base / vida útil", () => {
    expect(unitCostOfInsumo(catalog.insumos[2])).toBe(300);
  });
});

describe("unitCostOfRef: un Básico expande su sub-receta recursivamente", () => {
  it("resuelve el costo unitario del básico como suma de sus componentes", () => {
    // 2 * 100 (MAT) + 0.5 * 540 (MO con FASAR) = 200 + 270 = 470
    expect(unitCostOfRef("basico", "b-mix", catalog)).toBe(470);
  });
});

describe("costoDirecto: suma matricial de Insumos x Rendimientos, incluyendo Básicos anidados", () => {
  it("mezcla un insumo directo y un básico en la misma matriz APU", () => {
    const concept = { financial: { apu: [
      { refType: "insumo", refId: "i-eq", performance: 1 },
      { refType: "basico", refId: "b-mix", performance: 2 },
    ] } };
    // 1*300 (EQ) + 2*470 (básico) = 300 + 940 = 1240
    expect(costoDirecto(concept, catalog)).toBe(1240);
  });
});

describe("pieDePrecio: cascada Indirectos -> Financiamiento -> Utilidad + Cargos Adicionales", () => {
  it("aplica los Parámetros Financieros Globales del proyecto en orden", () => {
    const concept = { financial: { apu: [{ refType: "insumo", refId: "i-mat", performance: 10 }] } }; // costo directo = 1000
    const project = { settings: { indirectosCampo: 0.10, indirectosOficina: 0.05, financiamiento: 0, utilidad: 0.10, cargosAdicionales: 0 } };
    // 1000 * 1.15 * 1.10 = 1265
    expect(pieDePrecio(concept, project, catalog)).toBeCloseTo(1265, 2);
  });
  it("suma los cargos adicionales al final, después de la utilidad", () => {
    const concept = { financial: { apu: [{ refType: "insumo", refId: "i-mat", performance: 10 }] } };
    const project = { settings: { indirectosCampo: 0, indirectosOficina: 0, financiamiento: 0, utilidad: 0, cargosAdicionales: 50 } };
    expect(pieDePrecio(concept, project, catalog)).toBe(1050);
  });
});

describe("conceptAmount: Router Polimórfico por concepto (APU / Alzado / Paramétrico)", () => {
  const project = { settings: { indirectosCampo: 0, indirectosOficina: 0, financiamiento: 0, utilidad: 0, cargosAdicionales: 0 } };

  it("apu: importe = cantidad x pie de precio", () => {
    const concept = { quantity: 3, financial: { mode: "apu", apu: [{ refType: "insumo", refId: "i-mat", performance: 1 }] } };
    expect(conceptAmount(concept, project, catalog)).toEqual({ unitPrice: 100, total: 300 });
  });
  it("lump: importe = monto pactado, sin relación con la cantidad", () => {
    const concept = { quantity: 3, financial: { mode: "lump", lumpAmount: 5000 } };
    const result = conceptAmount(concept, project, catalog);
    expect(result.total).toBe(5000);
    expect(result.unitPrice).toBeCloseTo(1666.67, 2); // solo informativo, no rige el importe
  });
  it("parametric: importe = cantidad x precio paramétrico configurado", () => {
    const concept = { quantity: 4, financial: { mode: "parametric", parametricUnitPrice: 8750 } };
    expect(conceptAmount(concept, project, catalog)).toEqual({ unitPrice: 8750, total: 35000 });
  });
});

describe("explodeBOM: Explosión de Insumos para el Anexo A, expandiendo Básicos", () => {
  it("acumula insumos base a través de un básico usado en un concepto", () => {
    const concepts = [{
      quantity: 10,
      financial: { mode: "apu", apu: [{ refType: "basico", refId: "b-mix", performance: 2 }] },
    }];
    const bom = explodeBOM(concepts, catalog);
    const byId = Object.fromEntries(bom.map((row) => [row.insumo.id, row.quantity]));
    // cantidad(10) * rendimiento del básico(2) * rendimiento interno del componente
    expect(byId["i-mat"]).toBe(40); // 10 * 2 * 2
    expect(byId["i-mo"]).toBe(10);  // 10 * 2 * 0.5
  });
  it("ignora conceptos que no son APU (Alzado no expone insumos)", () => {
    const concepts = [{ quantity: 10, financial: { mode: "lump", apu: [{ refType: "insumo", refId: "i-mat", performance: 5 }] } }];
    expect(explodeBOM(concepts, catalog)).toEqual([]);
  });
});
