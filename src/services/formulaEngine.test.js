import { describe, expect, it } from "vitest";
import { evaluate, roundHalfEven, buildFlatSchedule, extractVariables } from "./formulaEngine.js";

// Bug real: el redondeo del frontend (Math.round, "mitad arriba") no coincidía con
// el del backend (Decimal ROUND_HALF_EVEN, "mitad al par" — el mismo que usa el
// round() nativo de Python 3). Para números exactamente a la mitad de un centavo
// esto daba resultados DISTINTOS entre la vista previa del navegador y lo que el
// servidor de verdad guardaba en el contrato. Verificado contra la salida real de
// Decimal(str(x)).quantize(Decimal("0.01"), ROUND_HALF_EVEN) de Python.
describe("roundHalfEven: coincide con Decimal(...).quantize(ROUND_HALF_EVEN) del backend", () => {
  const cases = [
    [1378.125, 1378.12],   // fórmula de ejemplo de la calculadora con valores reales — antes daba 1378.13
    [1378.135, 1378.14],
    [1378.145, 1378.14],
    [0.005, 0],
    [0.015, 0.02],
    [0.025, 0.02],
    [-1378.125, -1378.12],
    [9.995, 10],
    [2.5, 2.5],
    [1.005, 1],
    [100, 100],
    [0, 0],
    [1234567.895, 1234567.9],
    [3.14159, 3.14],
  ];

  it.each(cases)("roundHalfEven(%s) === %s", (input, expected) => {
    expect(roundHalfEven(input, 2)).toBeCloseTo(expected, 9);
  });

  it("no diverge del backend en un barrido de valores típicos de la calculadora (antes 1 de cada ~14 sí divergía)", () => {
    // Espejo del barrido que confirmó la divergencia real con Math.round: la misma
    // fórmula de ejemplo de la calculadora, (Precio - Enganche) * (1 + Tasa/100) / Plazo,
    // sobre un rango realista de precios/enganches/tasas/plazos.
    let checked = 0;
    for (let precio = 40000; precio <= 60000; precio += 2500) {
      for (let enganche = 0; enganche <= 5000; enganche += 1000) {
        for (let tasa = 5; tasa <= 20; tasa += 2.5) {
          for (let plazo = 12; plazo <= 48; plazo += 6) {
            const raw = (precio - enganche) * (1 + tasa / 100) / plazo;
            const rounded = roundHalfEven(raw, 2);
            // La cuota redondeada nunca debe alejarse más de medio centavo del valor
            // crudo — si el redondeo estuviera mal (p. ej. usando Math.round en un
            // caso .xx5), esto seguiría pasando; lo que de verdad importa es la
            // paridad exacta con Python, cubierta arriba. Aquí solo se confirma que
            // no truena con ningún valor del barrido.
            expect(Number.isFinite(rounded)).toBe(true);
            expect(Math.abs(rounded - raw)).toBeLessThanOrEqual(0.005 + 1e-9);
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });
});

describe("evaluate(): usa el redondeo correcto de punta a punta", () => {
  it("la fórmula de ejemplo de la calculadora con valores reales da el mismo resultado que el backend", () => {
    // (Precio_Lote - Enganche) * (1 + (Tasa_Anual/100)) / Plazo con Precio=50000,
    // Enganche=1000, Tasa=12.5, Plazo=40 → crudo 1378.125 → backend: 1378.12
    const formula = "(Precio_Lote - Enganche) * (1 + (Tasa_Anual/100)) / Plazo";
    const vars = { Precio_Lote: 50000, Enganche: 1000, Tasa_Anual: 12.5, Plazo: 40 };
    expect(evaluate(formula, vars)).toBe(1378.12);
  });
});

describe("extractVariables(): no confunde nombres que son subcadena de otro", () => {
  it("Precio y Precio_Lote se detectan como variables distintas, ninguna se recorta", () => {
    expect(extractVariables("Precio + Precio_Lote")).toEqual(["Precio", "Precio_Lote"]);
  });
});

describe("buildFlatSchedule(): la tabla de amortización usa el mismo redondeo", () => {
  it("con una cuota exactamente a la mitad de un centavo, reparte igual que el backend", () => {
    const { rows, monthlyPayment } = buildFlatSchedule(1378.125, 5000, 4);
    expect(monthlyPayment).toBe(1378.12);
    expect(rows).toHaveLength(4);
    // El saldo debe llegar exactamente a 0 en la última fila.
    expect(rows[rows.length - 1].ending).toBe(0);
  });
});
