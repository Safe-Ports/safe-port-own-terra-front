import { describe, it, expect } from "vitest";
import { evaluate, extractVariables, buildFlatSchedule, FormulaError } from "./formulaEngine";

// ── evaluate ──────────────────────────────────────────────────────────────────

describe("evaluate – aritmética básica", () => {
  it("suma dos números", () => expect(evaluate("1 + 2")).toBe(3));
  it("resta", () => expect(evaluate("10 - 4")).toBe(6));
  it("multiplicación", () => expect(evaluate("3 * 4")).toBe(12));
  it("división", () => expect(evaluate("10 / 4")).toBe(2.5));
  it("potencia con ^", () => expect(evaluate("2 ^ 3")).toBe(8));
  it("potencia con **", () => expect(evaluate("2 ** 3")).toBe(8));
  it("módulo", () => expect(evaluate("10 % 3")).toBe(1));
  it("paréntesis cambia precedencia", () => expect(evaluate("(1 + 2) * 4")).toBe(12));
  it("unario negativo", () => expect(evaluate("-5 + 10")).toBe(5));
  it("resultado redondeado a 2 decimales", () => expect(evaluate("1 / 3")).toBe(0.33));
});

describe("evaluate – variables", () => {
  it("sustituye una variable", () =>
    expect(evaluate("precio * 0.1", { precio: 200000 })).toBe(20000));

  it("sustituye múltiples variables", () =>
    expect(evaluate("a + b + c", { a: 1, b: 2, c: 3 })).toBe(6));

  it("lanza error si falta variable", () =>
    expect(() => evaluate("precio * 0.1", {})).toThrow(FormulaError));

  it("lanza error si variable es vacía", () =>
    expect(() => evaluate("x + 1", { x: "" })).toThrow(FormulaError));
});

describe("evaluate – funciones", () => {
  it("min", () => expect(evaluate("min(10, 5)")).toBe(5));
  it("max", () => expect(evaluate("max(10, 5)")).toBe(10));
  it("abs de negativo", () => expect(evaluate("abs(-7)")).toBe(7));
  it("round con 0 decimales", () => expect(evaluate("round(3.7)")).toBe(4));
  it("round con 2 decimales", () => expect(evaluate("round(3.145, 2)")).toBe(3.15));
  it("floor", () => expect(evaluate("floor(3.9)")).toBe(3));
  it("ceil", () => expect(evaluate("ceil(3.1)")).toBe(4));
  it("sqrt", () => expect(evaluate("sqrt(9)")).toBe(3));
  it("pow", () => expect(evaluate("pow(2, 10)")).toBe(1024));
});

describe("evaluate – constantes", () => {
  // evaluate() siempre redondea el resultado final a 2 decimales.
  it("pi ≈ 3.14", () => expect(evaluate("pi")).toBe(3.14));
  it("e ≈ 2.72", () => expect(evaluate("e")).toBe(2.72));
  it("pi está entre 3.14 y 3.15", () => {
    expect(evaluate("pi")).toBeGreaterThanOrEqual(3.14);
    expect(evaluate("pi")).toBeLessThan(3.15);
  });
});

describe("evaluate – errores", () => {
  it("división por cero", () =>
    expect(() => evaluate("10 / 0")).toThrow(FormulaError));

  it("paréntesis desbalanceados – falta cierre", () =>
    expect(() => evaluate("(1 + 2")).toThrow(FormulaError));

  it("paréntesis desbalanceados – falta apertura", () =>
    expect(() => evaluate("1 + 2)")).toThrow(FormulaError));

  it("carácter no permitido", () =>
    expect(() => evaluate("1 @ 2")).toThrow(FormulaError));

  it("fórmula vacía lanza error", () =>
    expect(() => evaluate("")).toThrow());
});

// ── extractVariables ──────────────────────────────────────────────────────────

describe("extractVariables", () => {
  it("retorna variables en orden de aparición", () =>
    expect(extractVariables("precio * tasa + comision")).toEqual([
      "precio",
      "tasa",
      "comision",
    ]));

  it("no duplica variables", () =>
    expect(extractVariables("x + x * x")).toEqual(["x"]));

  it("excluye funciones y constantes", () =>
    expect(extractVariables("round(precio, 2) + pi")).toEqual(["precio"]));

  it("retorna array vacío para fórmula vacía", () =>
    expect(extractVariables("")).toEqual([]));

  it("retorna array vacío para fórmula inválida", () =>
    expect(extractVariables("@@@")).toEqual([]));
});

// ── buildFlatSchedule ────────────────────────────────────────────────────────

describe("buildFlatSchedule", () => {
  const schedule = buildFlatSchedule(10000, 100000, 12);

  it("genera exactamente N cuotas", () =>
    expect(schedule.rows).toHaveLength(12));

  it("el saldo final es 0", () =>
    expect(schedule.rows.at(-1).ending).toBe(0));

  it("el saldo inicial es el capital", () =>
    expect(schedule.rows[0].balance).toBe(100000));

  it("la cuota mensual es la especificada", () =>
    expect(schedule.monthlyPayment).toBe(10000));

  it("totalPaid = monthlyPayment × meses (±1 por redondeo)", () => {
    expect(schedule.totalPaid).toBeGreaterThanOrEqual(schedule.monthlyPayment * 12 - 1);
    expect(schedule.totalPaid).toBeLessThanOrEqual(schedule.monthlyPayment * 12 + 1);
  });

  it("totalInterest = totalPaid - capital", () =>
    expect(schedule.totalInterest).toBe(
      Math.round((schedule.totalPaid - 100000) * 100) / 100
    ));

  it("capital + interés = cuota en cada fila (excepto última por redondeo)", () => {
    schedule.rows.slice(0, -1).forEach((row) => {
      expect(Math.round((row.capital + row.interest) * 100) / 100).toBe(row.payment);
    });
  });

  it("con 1 mes, todo el capital se paga en la primera cuota", () => {
    const s = buildFlatSchedule(50000, 50000, 1);
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0].ending).toBe(0);
  });
});
