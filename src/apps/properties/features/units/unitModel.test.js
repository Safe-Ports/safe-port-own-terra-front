import { describe, expect, it } from "vitest";
import { createUnit, validateUnit } from "./unitModel";

describe("Properties unit model", () => {
  it("requires a property and an identifier unique within it", () => {
    const existing = [{ id: "u1", propertyId: "p1", identifier: "101", status: "available" }];
    expect(validateUnit({ propertyId: "p1", identifier: "101", area: "", suggestedRent: "" }, existing)).toMatchObject({ identifier: expect.stringContaining("Ya existe") });
    expect(validateUnit({ propertyId: "", identifier: "", area: "", suggestedRent: "" })).toMatchObject({ propertyId: expect.any(String), identifier: expect.any(String) });
  });

  it("normalizes numeric characteristics without inventing occupancy", () => {
    const unit = createUnit({ propertyId: "p1", ownerId: "", identifier: " 101 ", type: "apartment", floor: " 1 ", area: "75", bedrooms: "2", bathrooms: "1", suggestedRent: "12000", status: "available", description: " " });
    expect(unit).toMatchObject({ identifier: "101", ownerId: "", area: 75, suggestedRent: 12000, status: "available" });
  });
});
