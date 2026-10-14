import { describe, expect, it } from "vitest";
import { applicableDims, consolidateGenerator, rowSubtotal } from "./generatorMath.js";

describe("applicableDims: bloquea campos ilógicos según la unidad del concepto (Módulo 3 del PRD)", () => {
  it("m2 solo usa Largo x Alto (el PRD pide bloquear Ancho para m²)", () => {
    expect(applicableDims("m2")).toEqual({ length: true, width: false, height: true });
  });
  it("ml solo usa Largo", () => {
    expect(applicableDims("ml")).toEqual({ length: true, width: false, height: false });
  });
  it("m3 usa las 3 dimensiones", () => {
    expect(applicableDims("m3")).toEqual({ length: true, width: true, height: true });
  });
  it("pza no usa ninguna dimensión (solo cuenta piezas)", () => {
    expect(applicableDims("pza")).toEqual({ length: false, width: false, height: false });
  });
});

describe("rowSubtotal: Pzas negativo es la deducción de vanos, no un selector aparte", () => {
  it("una fila m2 con Pzas positivo suma Largo x Alto, ignora Ancho", () => {
    expect(rowSubtotal({ pieces: 1, length: 12.4, width: 999, height: 2.7 }, "m2")).toBeCloseTo(33.48, 5);
  });
  it("una fila con Pzas negativo resta (deducción de vano)", () => {
    expect(rowSubtotal({ pieces: -1, length: 0.9, height: 2.1 }, "m2")).toBeCloseTo(-1.89, 5);
  });
  it("ml solo multiplica por Largo", () => {
    expect(rowSubtotal({ pieces: 2, length: 3, width: 999, height: 999 }, "ml")).toBe(6);
  });
  it("pza solo cuenta piezas (dimensiones bloqueadas)", () => {
    expect(rowSubtotal({ pieces: 5, length: 999, width: 999, height: 999 }, "pza")).toBe(5);
  });
});

describe("consolidateGenerator: suma con signo, recorta solo el total final a cero", () => {
  it("acumula suma y deducción, sin recortar cada fila", () => {
    const rows = [
      { pieces: 1, length: 12.4, height: 2.7 },   // muro completo (m2 → Largo x Alto, sin Ancho)
      { pieces: -1, length: 0.9, height: 2.1 },    // vano puerta
      { pieces: -2, length: 1.2, height: 1.0 },     // vano ventanas x2
    ];
    // 12.4*2.7 - 0.9*2.1 - 2*(1.2*1.0) = 33.48 - 1.89 - 2.4 = 29.19
    expect(consolidateGenerator(rows, "m2")).toBeCloseTo(29.19, 5);
  });
  it("nunca da negativo aunque la deducción supere a la suma", () => {
    const rows = [{ pieces: 1, length: 1, height: 1 }, { pieces: -1, length: 5, height: 5 }];
    expect(consolidateGenerator(rows, "m2")).toBe(0);
  });
  it("array vacío consolida a 0", () => {
    expect(consolidateGenerator([], "m3")).toBe(0);
  });
});
