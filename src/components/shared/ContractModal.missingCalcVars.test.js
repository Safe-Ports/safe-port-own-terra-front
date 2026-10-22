import { describe, expect, it } from "vitest";
import { missingCalcVars } from "./ContractModal.jsx";

// Bug real: al registrar una venta con calculadora activa, una variable vacía o
// inválida (p. ej. una comisión que el vendedor olvidó llenar) se mandaba como 0 en
// silencio (`Number(x) || 0`), y el botón "Guardar" nunca revisaba nada — se podía
// congelar una mensualidad mal calculada en el contrato, para siempre, sin ningún
// aviso. Esta función es la que ahora bloquea ese guardado.
describe("missingCalcVars: detecta variables sin un valor numérico válido antes de guardar", () => {
  it("una variable vacía cuenta como faltante", () => {
    expect(missingCalcVars(["Precio_Lote", "Comision"], { Precio_Lote: "50000", Comision: "" }))
      .toEqual(["Comision"]);
  });

  it("null y undefined también cuentan como faltantes", () => {
    expect(missingCalcVars(["A", "B"], { A: null, B: undefined })).toEqual(["A", "B"]);
  });

  it("un valor no numérico (texto) cuenta como faltante", () => {
    expect(missingCalcVars(["Tasa"], { Tasa: "doce por ciento" })).toEqual(["Tasa"]);
  });

  it("un 0 escrito a propósito por el usuario NO cuenta como faltante", () => {
    // Distinto del bug: 0 es un valor legítimo si el usuario lo escribió; el
    // problema era que un campo VACÍO se volvía 0 sin que nadie lo pidiera.
    expect(missingCalcVars(["Enganche"], { Enganche: "0" })).toEqual([]);
    expect(missingCalcVars(["Enganche"], { Enganche: 0 })).toEqual([]);
  });

  it("con todas las variables llenas y válidas, no hay nada faltante", () => {
    expect(missingCalcVars(
      ["Precio_Lote", "Enganche", "Tasa_Anual", "Plazo"],
      { Precio_Lote: "50000", Enganche: "1000", Tasa_Anual: "12.5", Plazo: "40" }
    )).toEqual([]);
  });

  it("sin variables (calculadora sin fórmula con variables), no hay nada que revisar", () => {
    expect(missingCalcVars([], {})).toEqual([]);
    expect(missingCalcVars(undefined, {})).toEqual([]);
  });
});
