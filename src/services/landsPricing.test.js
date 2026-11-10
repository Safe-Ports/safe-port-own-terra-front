import { describe, it, expect } from "vitest";
import { estimateSubscription, packagesFor } from "./landsPricing";

describe("packagesFor", () => {
  it("cobra al menos un paquete, aunque la operación tenga menos de 50 lotes", () => {
    expect(packagesFor(0)).toBe(1);
    expect(packagesFor(12)).toBe(1);
    expect(packagesFor(50)).toBe(1);
  });

  it("redondea hacia arriba al siguiente paquete", () => {
    expect(packagesFor(51)).toBe(2);
    expect(packagesFor(150)).toBe(3);
  });

  it("ignora entradas inválidas o negativas", () => {
    expect(packagesFor("")).toBe(1);
    expect(packagesFor(-80)).toBe(1);
    expect(packagesFor("120")).toBe(3);
  });
});

describe("estimateSubscription", () => {
  it("hasta 250 lotes recomienda el Estándar", () => {
    expect(estimateSubscription(1)).toEqual(expect.objectContaining({ total: 6000, packages: 0 }));
    expect(estimateSubscription(250).plan.key).toBe("estandar");
  });

  it("de 251 a 500 lotes recomienda el Empresarial, sin paquetes sobre el Estándar", () => {
    const e = estimateSubscription(251);
    expect(e.plan.key).toBe("empresarial");
    expect(e.total).toBe(8000);
    expect(e.packages).toBe(0);
  });

  it("dentro de los 500 lotes del Empresarial solo cobra el plan", () => {
    const e = estimateSubscription(500);
    expect(e.packages).toBe(0);
    expect(e.total).toBe(8000);
    expect(e.lines).toHaveLength(1);
  });

  it("hasta 600 lotes los paquetes van a precio normal", () => {
    const e = estimateSubscription(600);
    expect(e.total).toBe(8200);
    expect(e.savings).toBe(0);
    expect(e.isLargeOperation).toBe(false);
  });

  it("solo los paquetes después del lote 600 llevan descuento", () => {
    const e = estimateSubscription(1000);
    expect(e.packages).toBe(10);
    expect(e.lines).toEqual([
      expect.objectContaining({ key: "plan", subtotal: 8000 }),
      expect.objectContaining({ label: "Lotes 501–600", packages: 2, subtotal: 200 }),
      expect.objectContaining({ label: "Lotes 601–1000", packages: 8, subtotal: 640, discounted: true }),
    ]);
    expect(e.total).toBe(8840);
    expect(e.savings).toBe(160);
  });

  it("redondea al siguiente paquete y reporta los lotes libres", () => {
    const e = estimateSubscription(601);
    expect(e.coveredLots).toBe(650);
    expect(e.spareLots).toBe(49);
    expect(e.total).toBe(8280);
  });

  it("cruzar el umbral nunca baja el total y el precio por lote baja con el volumen", () => {
    expect(estimateSubscription(601).total).toBeGreaterThan(estimateSubscription(600).total);
    expect(estimateSubscription(2000).perLot).toBeLessThan(estimateSubscription(1000).perLot);
  });
});
