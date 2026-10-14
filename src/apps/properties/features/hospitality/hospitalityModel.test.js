import { describe, expect, it } from "vitest";
import { createHospitalityReservation, nextHousekeepingStatus, nextReservationStatus, nightsBetween, validateHospitalityReservation } from "./hospitalityModel";

describe("hospitality operation", () => {
  it("calculates nights without counting checkout day", () => expect(nightsBetween("2026-08-28", "2026-08-31")).toBe(3));
  it("rejects invalid dates and overlapping stays", () => {
    expect(validateHospitalityReservation({guestName:"Ana",unitId:"u1",checkIn:"2026-08-30",checkOut:"2026-08-29"})).toHaveProperty("checkOut");
    expect(validateHospitalityReservation({guestName:"Ana",unitId:"u1",checkIn:"2026-08-29",checkOut:"2026-08-31"},[{unitId:"u1",checkIn:"2026-08-28",checkOut:"2026-08-30",status:"confirmed"}])).toHaveProperty("unitId");
  });
  it("creates a confirmed reservation with its total", () => expect(createHospitalityReservation({guestName:" Ana ",unitId:"u1",checkIn:"2026-08-28",checkOut:"2026-08-31",guests:2,nightlyRate:2500,deposit:1000})).toMatchObject({guestName:"Ana",nights:3,total:7500,paid:1000,status:"confirmed"}));
  it("advances front desk and housekeeping workflows", () => {
    expect(nextReservationStatus("confirmed")).toBe("checked_in");
    expect(nextHousekeepingStatus("cleaning")).toBe("inspection");
  });
});
