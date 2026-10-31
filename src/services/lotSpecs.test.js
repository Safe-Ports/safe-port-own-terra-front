import { describe, expect, it } from "vitest";
import { specDetail, specLabel, specOn } from "./lotSpecs";

describe("lotSpecs", () => {
  it("un texto cualquiera cuenta como que el lote tiene el servicio", () => {
    expect(specOn("true")).toBe(true);
    expect(specOn(true)).toBe(true);
    expect(specOn("Solar")).toBe(true);
    expect(specOn("")).toBe(false);
    expect(specOn("false")).toBe(false);
    expect(specOn(undefined)).toBe(false);
  });

  it("la descripción es el texto, salvo el true genérico", () => {
    expect(specDetail("Terracería")).toBe("Terracería");
    expect(specDetail("true")).toBe("");
    expect(specLabel("Solar")).toBe("Sí · Solar");
    expect(specLabel("true")).toBe("Sí");
    expect(specLabel("")).toBe("No");
  });
});
