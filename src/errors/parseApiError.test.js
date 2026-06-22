import { describe, it, expect } from "vitest";
import { parseApiError, errorClipboardText, localRef } from "./parseApiError";

// ── localRef ──────────────────────────────────────────────────────────────────

describe("localRef", () => {
  it("tiene el prefijo ref_local_", () =>
    expect(localRef()).toMatch(/^ref_local_/));

  it("genera valores únicos", () =>
    expect(localRef()).not.toBe(localRef()));
});

// ── parseApiError ─────────────────────────────────────────────────────────────

describe("parseApiError – respuesta con envelope homologado", () => {
  const error = {
    response: {
      status: 422,
      headers: { "x-request-id": "ref_backend_abc" },
      data: {
        error: {
          code: "OT-SYS-1000",
          message: "El nombre no puede estar vacío.",
          request_id: "ref_backend_abc",
        },
      },
    },
  };

  it("usa el código del envelope", () =>
    expect(parseApiError(error).code).toBe("OT-SYS-1000"));

  it("usa el mensaje del backend", () =>
    expect(parseApiError(error).message).toBe("El nombre no puede estar vacío."));

  it("usa el request_id del envelope", () =>
    expect(parseApiError(error).requestId).toBe("ref_backend_abc"));

  it("no es ref local", () =>
    expect(parseApiError(error).isLocalRef).toBe(false));

  it("devuelve el httpStatus correcto", () =>
    expect(parseApiError(error).httpStatus).toBe(422));
});

describe("parseApiError – sin respuesta (error de red)", () => {
  const error = { __refLocal: "ref_local_aabbccddee11" };

  it("usa el código de red OT-NET-9001", () =>
    expect(parseApiError(error).code).toBe("OT-NET-9001"));

  it("es ref local", () =>
    expect(parseApiError(error).isLocalRef).toBe(true));

  it("reutiliza __refLocal si ya fue generado", () =>
    expect(parseApiError(error).requestId).toBe("ref_local_aabbccddee11"));

  it("httpStatus es null", () =>
    expect(parseApiError(error).httpStatus).toBeNull());
});

describe("parseApiError – respuesta HTTP sin envelope", () => {
  const make = (status) => ({
    response: { status, headers: {}, data: {} },
  });

  it("500 → OT-SYS-9000", () =>
    expect(parseApiError(make(500)).code).toBe("OT-SYS-9000"));

  it("401 → OT-AUTH-2010", () =>
    expect(parseApiError(make(401)).code).toBe("OT-AUTH-2010"));

  it("403 → OT-AUTH-2003", () =>
    expect(parseApiError(make(403)).code).toBe("OT-AUTH-2003"));

  it("404 → OT-SYS-3000", () =>
    expect(parseApiError(make(404)).code).toBe("OT-SYS-3000"));

  it("429 → OT-SYS-4000", () =>
    expect(parseApiError(make(429)).code).toBe("OT-SYS-4000"));

  it("código desconocido cae a OT-SYS-9000", () =>
    expect(parseApiError(make(418)).code).toBe("OT-SYS-9000"));
});

describe("parseApiError – campos obligatorios siempre presentes", () => {
  const result = parseApiError({});

  it("tiene code", () => expect(result.code).toBeTruthy());
  it("tiene title", () => expect(result.title).toBeTruthy());
  it("tiene message", () => expect(result.message).toBeTruthy());
  it("tiene severity", () => expect(result.severity).toBeTruthy());
});

// ── errorClipboardText ────────────────────────────────────────────────────────

describe("errorClipboardText", () => {
  it("incluye el código y la ref", () => {
    const parsed = { code: "OT-SYS-9000", requestId: "ref_abc_123" };
    expect(errorClipboardText(parsed)).toBe("Código: OT-SYS-9000 · Ref: ref_abc_123");
  });

  it("muestra — si no hay requestId", () => {
    const parsed = { code: "OT-SYS-9000", requestId: null };
    expect(errorClipboardText(parsed)).toBe("Código: OT-SYS-9000 · Ref: —");
  });
});
