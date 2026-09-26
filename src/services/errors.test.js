import { describe, expect, it } from "vitest";
import { getFieldErrors } from "./errors";

describe("getFieldErrors", () => {
  const details = [{ loc: ["body", "password"], msg: "Value error, Elige otra contraseña." }];
  it("lee tanto errores HTTP originales como normalizados", () => {
    expect(getFieldErrors({ response: { status: 422, data: { error: { details } } } }))
      .toEqual({ password: "Elige otra contraseña." });
    expect(getFieldErrors({ httpStatus: 422, details })).toEqual({ password: "Elige otra contraseña." });
  });
  it("no convierte errores de negocio en errores de campo", () => {
    expect(getFieldErrors({ httpStatus: 409, details })).toBeNull();
    expect(getFieldErrors({ response: { status: 400, data: { error: { details } } } })).toBeNull();
  });
});
