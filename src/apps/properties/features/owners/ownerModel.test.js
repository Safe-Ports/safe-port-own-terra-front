import { describe, expect, it } from "vitest";
import { createOwner, validateOwner } from "./ownerModel";

describe("Properties owner model", () => {
  it("requires the minimum contact information", () => {
    expect(validateOwner({ name: "", email: "bad", phone: "" })).toEqual({
      name: "Ingresa el nombre o razón social.",
      email: "Ingresa un correo válido.",
      phone: "Ingresa un teléfono de contacto.",
    });
  });

  it("normalizes a new owner without inventing portfolio data", () => {
    const owner = createOwner({
      name: "  Inmobiliaria Norte  ",
      personType: "company",
      email: " ADMIN@NORTE.MX ",
      phone: " 555 010 2020 ",
      notes: " Primer contacto ",
    });

    expect(owner).toMatchObject({
      name: "Inmobiliaria Norte",
      email: "admin@norte.mx",
      status: "active",
      propertiesCount: 0,
    });
  });
});
