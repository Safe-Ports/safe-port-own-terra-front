import { describe, expect, it } from "vitest";
import { countPendingLotChanges, lotHasChanges } from "./lotDraftChanges";

const saved = (patch = {}) => ({
  _backendId: "l1", code: "A-1", area: 200, price: "", priceFinanciado: "", frente: "", fondo: "", orientacion: "",
  especificaciones: { agua: "true", luz: "" },
  _orig: { code: "A-1", area: 200, price: "", priceFinanciado: "", frente: "", fondo: "", orientacion: "", especificaciones: JSON.stringify({ agua: "true", luz: "" }) },
  ...patch,
});

describe("lotDraftChanges", () => {
  it("un lote recién cargado no tiene cambios; uno editado o nuevo sí", () => {
    expect(lotHasChanges(saved())).toBe(false);
    expect(lotHasChanges(saved({ area: "250" }))).toBe(true);
    expect(lotHasChanges(saved({ especificaciones: { agua: true, luz: "Solar" } }))).toBe(true);
    expect(lotHasChanges({ code: "N-1" })).toBe(true);
  });

  it("los interruptores apagados no cuentan como cambio", () => {
    expect(lotHasChanges(saved({ especificaciones: { agua: true, luz: false, gas: false } }))).toBe(false);
  });

  it("asignar otro vendedor cuenta como cambio pendiente", () => {
    expect(lotHasChanges(saved({ sellerId: "u1" }))).toBe(true);
  });

  it("suma lotes pendientes y lotes borrados", () => {
    const draft = { sections: [{ lots: [saved(), saved({ code: "A-9" }), { code: "N-1" }] }] };
    expect(countPendingLotChanges(draft, 1)).toBe(3);
  });
});
