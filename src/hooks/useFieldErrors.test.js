import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFieldErrors } from "./useFieldErrors";

describe("useFieldErrors – validate", () => {
  it("devuelve true cuando todas las reglas pasan", () => {
    const { result } = renderHook(() => useFieldErrors());
    const form = { email: "test@ownterra.com", name: "Juan" };
    const rules = {
      email: (v) => (v.includes("@") ? "" : "Correo inválido"),
      name: (v) => (v.length >= 2 ? "" : "Nombre muy corto"),
    };
    let valid;
    act(() => { valid = result.current.validate(form, rules); });
    expect(valid).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  it("devuelve false y setea errores cuando hay fallas", () => {
    const { result } = renderHook(() => useFieldErrors());
    const form = { email: "noesuncorreo" };
    const rules = {
      email: (v) => (v.includes("@") ? "" : "Correo inválido"),
    };
    let valid;
    act(() => { valid = result.current.validate(form, rules); });
    expect(valid).toBe(false);
    expect(result.current.errors.email).toBe("Correo inválido");
  });
});

describe("useFieldErrors – clear", () => {
  it("elimina solo el campo especificado", () => {
    const { result } = renderHook(() =>
      useFieldErrors({ email: "Requerido", name: "Requerido" })
    );
    act(() => { result.current.clear("email"); });
    expect(result.current.errors.email).toBeUndefined();
    expect(result.current.errors.name).toBe("Requerido");
  });

  it("no muta si el campo no existe", () => {
    const { result } = renderHook(() => useFieldErrors({ name: "Requerido" }));
    const prevErrors = result.current.errors;
    act(() => { result.current.clear("noExiste"); });
    expect(result.current.errors).toBe(prevErrors);
  });
});

describe("useFieldErrors – clearAll", () => {
  it("vacía todos los errores", () => {
    const { result } = renderHook(() =>
      useFieldErrors({ a: "err1", b: "err2" })
    );
    act(() => { result.current.clearAll(); });
    expect(result.current.errors).toEqual({});
  });
});

describe("useFieldErrors – fieldProps", () => {
  it("sin error: solo aplica clase base", () => {
    const { result } = renderHook(() => useFieldErrors());
    const props = result.current.fieldProps("email");
    expect(props.className).toBe("fi");
    expect(props["aria-invalid"]).toBeUndefined();
  });

  it("con error: agrega is-invalid y aria-invalid", () => {
    const { result } = renderHook(() => useFieldErrors({ email: "Requerido" }));
    const props = result.current.fieldProps("email");
    expect(props.className).toBe("fi is-invalid");
    expect(props["aria-invalid"]).toBe(true);
  });

  it("respeta la clase base custom", () => {
    const { result } = renderHook(() => useFieldErrors({ campo: "Error" }));
    const props = result.current.fieldProps("campo", "lf-input");
    expect(props.className).toBe("lf-input is-invalid");
  });
});

describe("useFieldErrors – fromServer", () => {
  it("devuelve false si el error no tiene detalles de campo", () => {
    const { result } = renderHook(() => useFieldErrors());
    const err = { response: { data: { message: "Error genérico" } } };
    let handled;
    act(() => { handled = result.current.fromServer(err); });
    expect(handled).toBe(false);
    expect(result.current.errors).toEqual({});
  });

  it("setea errores y devuelve true con error 422 con details", () => {
    const { result } = renderHook(() => useFieldErrors());
    const err = {
      response: {
        status: 422,
        data: {
          error: {
            code: "OT-SYS-1000",
            details: [{ loc: ["body", "email"], msg: "El correo ya existe." }],
          },
        },
      },
    };
    let handled;
    act(() => { handled = result.current.fromServer(err, { email: "email" }); });
    expect(handled).toBe(true);
    expect(result.current.errors.email).toBeTruthy();
  });
});
