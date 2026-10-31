import { describe, expect, it } from "vitest";
import { validationMessage } from "./parseApiError";

const err = details => ({ response: { data: { error: { code: "OT-SYS-1000", message: "Algunos datos no son válidos.", details } } } });

describe("validationMessage", () => {
  it("saca el motivo del campo en un 422 de pydantic", () => {
    const e = err([{ type: "value_error", loc: ["body", "new_password"], msg: "Value error, Esta contraseña apareció en una filtración de datos conocida. Elige otra distinta.", ctx: { error: "Esta contraseña apareció en una filtración de datos conocida. Elige otra distinta." } }]);
    expect(validationMessage(e)).toBe("Esta contraseña apareció en una filtración de datos conocida. Elige otra distinta.");
  });

  it("sin ctx usa msg sin el prefijo de pydantic", () => {
    expect(validationMessage(err([{ msg: "Value error, Muy corta" }]))).toBe("Muy corta");
  });

  it("devuelve null si details no es una lista de validación", () => {
    expect(validationMessage(err({ total_pct: "120" }))).toBeNull();
    expect(validationMessage(new Error("red"))).toBeNull();
  });
});
