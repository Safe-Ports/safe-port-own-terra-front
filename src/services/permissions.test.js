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

  it("registers Properties as an internal-user vertical", () => {
    const properties = APP_CATALOG.find((app) => app.key === "properties");

    expect(properties).toMatchObject({
      vertical: true,
      live: true,
      defaultRole: "manager",
    });
    expect(properties.roles).toEqual(["manager", "viewer"]);
  });

  it("accepts the legacy neighb assignment while Properties migrates", () => {
    const user = { role: "vendor", apps: [{ app_key: "neighb", role: "manager", is_active: true }] };

    expect(canAccessApp(user, "properties")).toBe(true);
    expect(canUseFeature(user, "properties.owners.read")).toBe(true);
  });

  it("keeps Properties viewers read-only across the initial catalogs", () => {
    const user = { role: "vendor", apps: [{ app_key: "properties", role: "viewer", is_active: true }] };

    expect(canUseFeature(user, "properties.owners.read")).toBe(true);
    expect(canUseFeature(user, "properties.owners.write")).toBe(false);
    expect(canUseFeature(user, "properties.rent.read")).toBe(true);
    expect(canUseFeature(user, "properties.rent.write")).toBe(false);
  });

  it("allows a Properties manager to operate rentals", () => {
    const user = { role: "vendor", apps: [{ app_key: "properties", role: "manager", is_active: true }] };

    expect(canUseFeature(user, "properties.rent.read")).toBe(true);
    expect(canUseFeature(user, "properties.rent.write")).toBe(true);
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

// ── Coherencia con el backend ────────────────────────────────────────────────
// El backend es el que manda; esto es un espejo para no ofrecerle al usuario
// pantallas que después le van a devolver un 403.

describe("permisos: acceso revocado y guards", () => {
  const colaborador = (apps) => ({ role: "vendor", apps, permissions: [] });

  it("una asignación desactivada no da permisos", () => {
    // El backend filtra por is_active antes de mirar nada; acá se recorrían
    // todas las filas, así que revocar un acceso desactivándolo no hacía efecto
    // en la UI: menú visible y 403 en cada pantalla.
    const user = colaborador([
      { app_key: "lands", role: "seller", is_active: false },
    ]);
    expect(canAccessApp(user, "lands")).toBe(false);
    expect(canUseFeature(user, "lands.clients")).toBe(false);
    expect(canUseFeature(user, "lands.sales")).toBe(false);
  });

  it("la misma asignación activa sí los da", () => {
    const user = colaborador([
      { app_key: "lands", role: "seller", is_active: true },
    ]);
    expect(canAccessApp(user, "lands")).toBe(true);
    expect(canUseFeature(user, "lands.clients")).toBe(true);
  });

  it("un permiso suelto no saltea el acceso a la app", () => {
    // El fallback `|| hasPermission(...)` reintentaba el check sin el
    // canAccessApp, así que un permiso colgado de una app a la que ya no se
    // entra volvía a abrir la sección.
    const user = { role: "vendor", apps: [], permissions: ["lands.write"] };
    expect(canAccessApp(user, "lands")).toBe(false);
    expect(canUseFeature(user, "lands.write")).toBe(false);
  });

  it("un colaborador sin asignaciones no entra a ninguna vertical", () => {
    const user = colaborador([]);
    expect(canAccessApp(user, "lands")).toBe(false);
    expect(canUseFeature(user, "lands.read")).toBe(false);
  });

  it("el admin sigue entrando a todo", () => {
    const admin = { role: "admin", apps: [], permissions: [] };
    expect(canAccessApp(admin, "lands")).toBe(true);
    expect(canUseFeature(admin, "lands.write")).toBe(true);
  });
});
