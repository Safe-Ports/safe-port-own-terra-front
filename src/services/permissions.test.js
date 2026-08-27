import { describe, expect, it } from "vitest";

import { APP_CATALOG, canAccessApp, canUseFeature, defaultPermissionsFor } from "./permissions.js";

describe("permissions catalog", () => {
  it("registers OwnTerra Lands as the deployed assignable vertical", () => {
    const lands = APP_CATALOG.find((app) => app.key === "lands");

    expect(lands).toMatchObject({
      key: "lands",
      vertical: true,
      live: true,
      defaultRole: "seller",
    });
    expect(lands.roles).toContain("seller");
    expect(lands.roles).toContain("collections");
  });

  it("does not treat property owner as a global admin role", () => {
    const user = { role: "owner", apps: [] };

    expect(canAccessApp(user, "lands")).toBe(false);
    expect(canUseFeature(user, "core.team")).toBe(false);
  });

  it("generates scoped permissions for Lands roles", () => {
    expect(defaultPermissionsFor("lands", "seller")).toContain("lands.agenda");
    expect(defaultPermissionsFor("lands", "collections")).toContain("lands.payments");
    expect(defaultPermissionsFor("lands", "seller")).not.toContain("lands.*");
  });

  it("un colaborador sin asignaciones no entra a Lands", () => {
    // Antes se asumía que cualquier "vendor" entraba a Lands aunque nadie se lo
    // hubiera asignado. El backend no lo asume: le daba 403 en todo mientras el
    // menú le mostraba la app. Alta y acceso son dos pasos distintos.
    const user = { role: "vendor", apps: [] };

    expect(canAccessApp(user, "lands")).toBe(false);
    expect(canUseFeature(user, "lands.clients")).toBe(false);
  });

  it("un colaborador con Lands asignado opera su cartera pero no administra", () => {
    const user = {
      role: "vendor",
      apps: [{ app_key: "lands", role: "seller", is_active: true }],
    };

    expect(canAccessApp(user, "lands")).toBe(true);
    expect(canUseFeature(user, "lands.clients")).toBe(true);
    expect(canUseFeature(user, "lands.sales")).toBe(true);
    // Carga de Lotes y Calculadora quedan fuera: son de administración.
    expect(canUseFeature(user, "lands.write")).toBe(false);
    expect(canUseFeature(user, "lands.payments")).toBe(false);
    expect(canUseFeature(user, "lands.reports")).toBe(false);
  });

  it("un administrador puede con todo sin necesitar asignaciones", () => {
    const user = { role: "admin", apps: [] };

    expect(canAccessApp(user, "lands")).toBe(true);
    expect(canUseFeature(user, "lands.write")).toBe(true);
    expect(canUseFeature(user, "core.config")).toBe(true);
  });
});
