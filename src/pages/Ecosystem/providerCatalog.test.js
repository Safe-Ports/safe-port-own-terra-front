import { describe, expect, it } from "vitest";
import { normalizeProviderType, providerSearchText, providerTypeMeta } from "./providerCatalog";

describe("providerCatalog", () => {
  it("normaliza categorías históricas al catálogo Core", () => {
    expect(normalizeProviderType("mantenimiento")).toBe("servicios");
    expect(normalizeProviderType("mano de obra")).toBe("subcontratista");
    expect(normalizeProviderType("desconocida")).toBe("otro");
  });
  it("expone etiquetas y búsqueda transversal", () => {
    expect(providerTypeMeta("materiales").label).toBe("Materiales");
    expect(providerSearchText({ name: "CFE", tax_id: "ABC010101XX0" })).toContain("abc010101xx0");
  });
});
