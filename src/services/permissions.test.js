import { describe, expect, it } from "vitest";

import { APP_CATALOG, canAccessApp, canUseFeature, defaultPermissionsFor, isGlobalAdmin } from "./permissions.js";

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
});

describe("isGlobalAdmin: única fuente de verdad de \"es admin\" (evita sets duplicados por pantalla)", () => {
  it("reconoce admin y superadmin", () => {
    expect(isGlobalAdmin({ role: "admin" })).toBe(true);
    expect(isGlobalAdmin({ role: "superadmin" })).toBe(true);
  });

  it("NO reconoce vendor ni owner como admin", () => {
    expect(isGlobalAdmin({ role: "vendor" })).toBe(false);
    expect(isGlobalAdmin({ role: "owner" })).toBe(false);
  });
});
