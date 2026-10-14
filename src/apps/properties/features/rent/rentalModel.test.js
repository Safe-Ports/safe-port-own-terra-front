import { describe, expect, it } from "vitest";
import {
  completeRentalInspection,
  createRentalInspection,
  createRentalLease,
  createRentalPayment,
  createRentalProspect,
  createRentalTenant,
  rentalCollectionSummary,
  validateRentalLease,
  validateRentalProspect,
} from "./rentalModel";

describe("rental operation model", () => {
  it("requires a reachable prospect and a unit", () => {
    expect(validateRentalProspect({ name:"", unitId:"", budget:0, desiredMoveIn:"", phone:"", email:"" })).toMatchObject({ name:expect.any(String), unitId:expect.any(String), budget:expect.any(String), desiredMoveIn:expect.any(String), contact:expect.any(String) });
    expect(createRentalProspect({ name:" Ana López ", unitId:"unit-1", budget:"18000", desiredMoveIn:"2026-10-01", phone:"55 1000 2000", email:"", source:"Referido" })).toMatchObject({ name:"Ana López", unitId:"unit-1", budget:18000, status:"new" });
  });

  it("creates a tenant without inventing legal verification", () => {
    expect(createRentalTenant({ name:" Empresa Uno ", personType:"company", email:"ADMIN@UNO.MX", phone:"", emergencyContact:"", documentSummary:"" })).toMatchObject({ name:"Empresa Uno", email:"admin@uno.mx", status:"active" });
  });

  it("validates dates, payment day and overlapping leases", () => {
    const draft = { tenantId:"t1", unitId:"u1", startDate:"2026-10-01", endDate:"2027-09-30", rent:20000, dueDay:5 };
    expect(validateRentalLease(draft, [{ unitId:"u1", startDate:"2026-01-01", endDate:"2026-12-31", status:"active" }])).toHaveProperty("unitId");
    expect(validateRentalLease({ ...draft, unitId:"u2", dueDay:31 })).toHaveProperty("dueDay");
    expect(createRentalLease({ ...draft, unitId:"u2", deposit:20000 })).toMatchObject({ rent:20000, deposit:20000, depositStatus:"held", status:"active" });
  });

  it("records evidence without claiming payment processing", () => {
    expect(createRentalPayment({ leaseId:"l1", period:"2026-09", amount:"15000", method:"spei", evidenceName:"comprobante.pdf" })).toMatchObject({ leaseId:"l1", amount:15000, method:"spei", evidenceName:"comprobante.pdf", status:"paid" });
  });

  it("tracks inspection completion and evidence count", () => {
    const inspection = createRentalInspection({ leaseId:"l1", unitId:"u1", scheduledAt:"2026-10-10", type:"entry" });
    expect(completeRentalInspection(inspection, 6)).toMatchObject({ status:"completed", evidenceCount:6 });
  });

  it("calculates collection from active leases and the requested period", () => {
    const leases = [{ id:"l1", rent:10000, status:"active" }, { id:"l2", rent:8000, status:"active" }, { id:"l3", rent:9000, status:"ended" }];
    const payments = [{ leaseId:"l1", period:"2026-09", amount:10000, status:"paid" }, { leaseId:"l2", period:"2026-09", amount:3000, status:"partial" }, { leaseId:"l2", period:"2026-09", amount:8000, status:"overdue" }, { leaseId:"l1", period:"2026-08", amount:10000, status:"paid" }];
    expect(rentalCollectionSummary(leases, payments, "2026-09")).toEqual({ expected:18000, collected:13000, overdue:8000, outstanding:5000 });
  });
});
