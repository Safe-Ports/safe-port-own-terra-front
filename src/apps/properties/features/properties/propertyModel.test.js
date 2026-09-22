import { describe, expect, it } from "vitest";
import { createProperty, validateProperty } from "./propertyModel";

describe("Properties property model", () => {
  it("requires a name and usable location but leaves ownership optional", () => {
    expect(validateProperty({ name: "", ownerId: "", address: "", city: "", state: "" })).toEqual({
      name: "Ingresa un nombre para identificar el inmueble.",
      address: "Ingresa la dirección del inmueble.",
      city: "Ingresa la ciudad o municipio.",
      state: "Ingresa el estado.",
    });
    expect(validateProperty({ name: "Casa Centro", ownerId: "", address: "Calle 1", city: "Mérida", state: "Yucatán" })).toEqual({});
  });

  it("starts without invented units or occupancy", () => {
    const property = createProperty({ name: " Torre Norte ", ownerId: "owner-1", type: "apartment_building", address: " Av. Uno 20 ", city: " Mérida ", state: " Yucatán ", description: " " });
    expect(property).toMatchObject({ name: "Torre Norte", unitsCount: 0, occupiedUnits: 0, status: "active" });
  });
});
