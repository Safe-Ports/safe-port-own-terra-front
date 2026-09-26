import { describe, expect, it } from "vitest";
import { isPathInScope } from "./mvpScope";

describe("Properties MVP scope", () => {
  it("hides rentals and sales while the MVP is focused on communities", () => {
    expect(isPathInScope("/properties/rentas")).toBe(false);
    expect(isPathInScope("/properties/rentas/hospedaje")).toBe(false);
    expect(isPathInScope("/properties/publicaciones")).toBe(false);
    expect(isPathInScope("/properties/modulos/publicaciones")).toBe(false);
    expect(isPathInScope("/portal-inquilino")).toBe(false);
  });

  it("leaves modules without a backend for later versions", () => {
    expect(isPathInScope("/properties/modulos/inspecciones")).toBe(false);
    expect(isPathInScope("/properties/modulos/mensajes")).toBe(false);
    expect(isPathInScope("/properties/modulos/notificaciones")).toBe(false);
    expect(isPathInScope("/properties/modulos/portal-propietario")).toBe(false);
    expect(isPathInScope("/properties/responsables")).toBe(false);
    expect(isPathInScope("/properties/accesos")).toBe(true);
    expect(isPathInScope("/properties/modulos/documentos")).toBe(true);
  });

  it("keeps communities and shared portfolio routes", () => {
    expect(isPathInScope("/properties/comunidades")).toBe(true);
    expect(isPathInScope("/properties/comunidades/operacion?module=charges")).toBe(true);
    expect(isPathInScope("/properties/portafolio")).toBe(true);
    expect(isPathInScope("/portal-comunidad")).toBe(true);
    expect(isPathInScope("/properties/rentas-historicas")).toBe(true);
  });
});
