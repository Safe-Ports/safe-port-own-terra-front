import { describe, expect, it } from "vitest";
import { PROPERTY_ACTION_ICONS, PROPERTY_ENTITY_ICONS } from "./propertiesIconCatalog";

describe("Properties icon catalog", () => {
  it("assigns a different icon to every entity or domain", () => {
    const icons = Object.values(PROPERTY_ENTITY_ICONS);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it("defines the standard icon for every shared action", () => {
    expect(Object.keys(PROPERTY_ACTION_ICONS).sort()).toEqual([
      "archive", "back", "close", "create", "edit", "open", "search", "send",
    ]);
  });
});
