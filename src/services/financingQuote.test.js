import { describe, expect, it } from "vitest";
import { calculateQuote, standardMonthlyPayment } from "./financingQuote";

describe("cotización con el plan vigente", () => {
  it("usa la fórmula de la organización en vez de dividir el capital sin intereses", () => {
    const result = calculateQuote({ formula: "CAPITAL * (1 + TASA_ANUAL / 100) / MESES", variables: ["CAPITAL", "TASA_ANUAL", "MESES"] }, { amount: 120000, down_payment: 20000, interest_rate: .12, totalM: 10 });
    expect(result.value).toBeCloseTo(11200);
  });
  it("no presenta una mensualidad cuando falta una variable del plan", () => {
    const result = calculateQuote({ formula: "CAPITAL / MESES + SEGURO", variables: ["CAPITAL", "MESES", "SEGURO"] }, { amount: 1000, totalM: 10 });
    expect(result.value).toBeNull();
    expect(result.missing).toEqual(["SEGURO"]);
    expect(calculateQuote({ formula: "CAPITAL / MESES + SEGURO", variables: ["CAPITAL", "MESES", "SEGURO"] }, { amount: 1000, totalM: 10 }, { SEGURO: 20 }).value).toBe(120);
  });
  it("no sustituye un plan ausente o inválido por una fórmula inventada", () => {
    expect(calculateQuote(null, {}).value).toBeNull();
    expect(calculateQuote({ formula: "CAPITAL / 0", variables: ["CAPITAL"] }, { amount: 1000 }).error).toBeTruthy();
  });
});

describe("mensualidad sin calculadora", () => {
  it("es la amortización francesa del backend sobre el saldo después del enganche", () => {
    expect(standardMonthlyPayment({ amount: 120000, down_payment: 20000, interest_rate: 0.12, totalM: 12 })).toBe(8884.88);
  });
  it("sin intereses reparte el saldo en partes iguales", () => {
    expect(standardMonthlyPayment({ amount: 1000, down_payment: 0, interest_rate: 0, totalM: 4 })).toBe(250);
  });
  it("no inventa una mensualidad con datos incompletos", () => {
    expect(standardMonthlyPayment({ amount: 0, totalM: 12, interest_rate: 0.12 })).toBeNull();
    expect(standardMonthlyPayment({ amount: 1000, totalM: 0, interest_rate: 0.12 })).toBeNull();
  });
});
