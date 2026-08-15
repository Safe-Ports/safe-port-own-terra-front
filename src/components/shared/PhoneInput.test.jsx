import { describe, expect, it } from "vitest";
import { parsePhone, joinPhone } from "./PhoneInput.jsx";

describe("parsePhone", () => {
  it("splits a value with a country code", () => {
    expect(parsePhone("+52 5512345678")).toEqual({ cc: "+52", national: "5512345678" });
  });

  it("prefers the longest matching code (+593 over +59/+5)", () => {
    expect(parsePhone("+593 987654321")).toEqual({ cc: "+593", national: "987654321" });
  });

  it("defaults legacy numbers without code to México (+52)", () => {
    expect(parsePhone("5512345678")).toEqual({ cc: "+52", national: "5512345678" });
  });

  it("returns empty national for an empty value", () => {
    expect(parsePhone("")).toEqual({ cc: "+52", national: "" });
    expect(parsePhone(null)).toEqual({ cc: "+52", national: "" });
  });

  it("strips non-digits from the national part", () => {
    expect(parsePhone("+1 (555) 123-4567").national).toBe("5551234567");
  });
});

describe("joinPhone", () => {
  it("joins code and number", () => {
    expect(joinPhone("+52", "5512345678")).toBe("+52 5512345678");
  });

  it("returns empty string when there is no number (no lada suelta)", () => {
    expect(joinPhone("+52", "")).toBe("");
    expect(joinPhone("+1", "   ")).toBe("");
  });

  it("keeps only digits in the number", () => {
    expect(joinPhone("+52", "55-1234 5678")).toBe("+52 5512345678");
  });
});
