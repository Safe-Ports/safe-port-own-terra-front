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
  });
});
