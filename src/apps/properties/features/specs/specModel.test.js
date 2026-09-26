import { describe, expect, it } from "vitest";
import { buildingSpecDraft, buildingSpecPayload, buildingSpecSheet, unitSpecDraft, unitSpecPayload, unitSpecSheet } from "./specModel";

describe("unitSpecSheet", () => {
  it("formats known specs, accepts backend aliases and hides internal data", () => {
    const sheet = unitSpecSheet({ type: "apartment", floor: "2", area: 85, recamaras: 2, banos: 1.5, parking: 1, indiviso_pct: 2.5, owner_id: "x", suggested_rent: 9000, balcony: true, furnished: false, vista: "Parque", description: "Luminoso" });
    expect(sheet.facts.map((fact) => [fact.label, fact.value])).toEqual([
      ["Tipo", "Departamento"], ["Piso o nivel", "2"], ["Superficie", "85 m²"], ["Recámaras", "2"], ["Baños", "1.5"], ["Estacionamientos", "1"], ["Indiviso", "2.5 %"], ["Vista", "Parque"],
    ]);
    expect(sheet.features).toEqual(["Balcón o terraza"]);
    expect(sheet.description).toBe("Luminoso");
  });

  it("skips zero values", () => {
    expect(unitSpecSheet({ area: 0, bedrooms: 0 }).facts).toEqual([]);
  });
});

describe("unit spec draft", () => {
  it("round-trips the extra fields the form edits", () => {
    const draft = unitSpecDraft({ estacionamientos: 2, storage_room: true });
    expect(draft).toMatchObject({ parking: "2", indiviso_pct: "", storage_room: true, balcony: false });
    expect(unitSpecPayload({ ...draft, indiviso_pct: "3" })).toMatchObject({ parking: 2, indiviso_pct: 3, storage_room: true, balcony: false });
  });
});

describe("building spec", () => {
  it("lists amenities and dimensions, keeping unknown keys on save", () => {
    const spec = { attributos: { elevador: true, alberca_comun: false, cancha_padel: true }, dimensiones: { m2_totales: 4200, niveles: 8, anio_construccion: 2019 } };
    const sheet = buildingSpecSheet(spec);
    expect(sheet.features).toEqual(["Elevador", "Cancha padel"]);
    expect(sheet.facts.map((fact) => fact.value)).toEqual(["4,200 m²", "8", "2019"]);
    const draft = buildingSpecDraft(spec);
    draft.attributos.gimnasio = true;
    draft.dimensiones.torres = "2";
    expect(buildingSpecPayload(draft)).toEqual({ attributos: { elevador: true, cancha_padel: true, gimnasio: true }, dimensiones: { m2_totales: 4200, niveles: 8, anio_construccion: 2019, torres: 2 } });
  });

  it("treats a missing sheet as empty", () => {
    expect(buildingSpecSheet(null)).toEqual({ facts: [], features: [] });
  });
});
