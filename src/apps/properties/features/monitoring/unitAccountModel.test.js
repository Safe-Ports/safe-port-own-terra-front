import { describe, expect, it } from "vitest";
import { unitAccount } from "./unitAccountModel";

const charges = [
  { id: "c1", unitId: "u1", concept: "Cuota agosto", amount: 1500, paidAmount: 1500, status: "paid", dueDate: "2026-08-05" },
  { id: "c2", unitId: "u1", concept: "Cuota septiembre", amount: 1500, paidAmount: 500, status: "overdue", dueDate: "2026-09-05" },
  { id: "c3", unitId: "u1", concept: "Cuota octubre", amount: 1500, paidAmount: 0, status: "pending", dueDate: "2026-10-05" },
  { id: "c4", unitId: "u2", concept: "Otra unidad", amount: 900, paidAmount: 0, status: "overdue", dueDate: "2026-09-05" },
];

describe("unitAccount", () => {
  it("adds up what the unit owes, puts what awaits review first and leaves other units out", () => {
    const reports = [{ id: "r1", charge_ids: ["c3"], status: "submitted", created_at: "2026-10-06" }];
    const account = unitAccount({ charges, reports, unitId: "u1" });
    expect(account.rows.map((row) => [row.id, row.state])).toEqual([["c3", "reported"], ["c2", "overdue"], ["c1", "paid"]]);
    expect(account.pending).toBe(2500);
    expect(account.overdue).toBe(1000);
    expect(account.toReview).toBe(1);
    expect(account.paid).toBe(1500);
  });

  it("keeps only the latest settled charges", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, unitId: "u1", concept: `Cuota ${i}`, amount: 100, paidAmount: 100, status: "paid", dueDate: `2026-0${i + 1}-05` }));
    const account = unitAccount({ charges: many, unitId: "u1", settledLimit: 2 });
    expect(account.rows.map((row) => row.id)).toEqual(["p4", "p3"]);
    expect(account.hiddenSettled).toBe(3);
  });
});
