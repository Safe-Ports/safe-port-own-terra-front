import { describe, expect, it } from "vitest";

import corpus from "./casos_formula.json";
import { evaluate } from "./formulaEngine";

/**
 * Paridad con el motor del backend.
 *
 * Los dos archivos dicen en su encabezado que son espejo, pero nada lo verificaba
 * y habían divergido en cuatro cosas: el menos unario ligaba distinto que la
 * potencia (`-2^2` daba 4 acá y -4 allá), el módulo tomaba el signo del dividendo
 * en vez del divisor, y el tokenizador no entendía ni la notación científica ni
 * `//`, que el AST de Python sí acepta.
 *
 * Importa porque el front muestra la mensualidad en el modal de venta y el back
 * recalcula la que se guarda en el contrato: cuando difieren, el vendedor ve un
 * número y el cliente firma otro.
 *
 * El corpus y sus resultados esperados salen del backend. El mismo archivo vive
 * en `tests/casos_formula.json` del repo del backend y hay un test allá que lo
 * lee igual, así que una divergencia rompe el CI de los dos lados.
 */
describe("formulaEngine: paridad con el backend", () => {
  it.each(corpus.casos)("$f", ({ f, v, esperado }) => {
    expect(evaluate(f, v)).toBe(Number(esperado));
  });

  it("el corpus no quedó vacío por un archivo mal copiado", () => {
    expect(corpus.casos.length).toBeGreaterThanOrEqual(30);
  });
});
