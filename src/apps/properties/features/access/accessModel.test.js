import { describe, expect, it } from "vitest";
import { DENIAL_REASON, defaultWindow, validateVisitor, visitorBody } from "./accessModel";

describe("accessModel", () => {
  const base = { propertyId: "unit", fullName: "Luis Ramírez", visitorType: "guest", validFrom: "2026-10-14T10:00", validUntil: "2026-10-14T14:00", maxEntries: 1 };

  it("valida nombre, unidad, vigencia y entradas", () => {
    expect(validateVisitor(base)).toEqual({});
    expect(validateVisitor({ ...base, fullName: " " }).fullName).toBeTruthy();
    expect(validateVisitor({ ...base, propertyId: "" }).propertyId).toBeTruthy();
    expect(validateVisitor({ ...base, propertyId: "" }, { requireProperty: false }).propertyId).toBeUndefined();
    expect(validateVisitor({ ...base, validUntil: "2026-10-14T09:00" }).validUntil).toMatch(/después/);
    expect(validateVisitor({ ...base, maxEntries: 0 }).maxEntries).toBeTruthy();
  });

  it("arma el body del backend: placas en mayúsculas, sólo 4 dígitos de identificación y fechas ISO", () => {
    const body = visitorBody({ ...base, vehiclePlate: " abc-123 ", documentHint: "INE123456789", phone: "" });
    expect(body).toMatchObject({ property_id: "unit", full_name: "Luis Ramírez", vehicle_plate: "ABC-123", document_hint: "6789", phone: null, max_entries: 1, allowed_point_ids: [] });
    expect(body.valid_from).toBe(new Date("2026-10-14T10:00").toISOString());
    expect("document_hint" in visitorBody(base)).toBe(false);
  });

  it("propone una ventana de 4 horas y traduce los motivos de negación", () => {
    const window = defaultWindow(new Date(2026, 9, 14, 10, 5));
    expect(window).toEqual({ validFrom: "2026-10-14T10:05", validUntil: "2026-10-14T14:05" });
    expect(DENIAL_REASON.MAX_ENTRIES).toMatch(/ya se usó/);
  });
});
