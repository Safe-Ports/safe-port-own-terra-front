import { describe, expect, it } from "vitest";
import { DEFAULT_POLICY, lateFeeExample, normalizePolicy, remindersSummary, reportForCharge, reportNotices, reportableCharges, validatePolicy, validateReport } from "./collectionsModel";

const file = (type = "image/jpeg", size = 1000) => ({ name: "comprobante.jpg", type, size });

describe("collectionsModel", () => {
  it("asks for everything a reviewer needs before sending a report", () => {
    expect(validateReport({}, "2026-10-14")).toEqual({
      chargeIds: expect.any(String), amount: expect.any(String), paidOn: expect.any(String), method: expect.any(String), file: expect.any(String),
    });
    expect(validateReport({ chargeIds: ["c1"], amount: "1850", paidOn: "2026-10-15", method: "transfer", file: file() }, "2026-10-14")).toEqual({ paidOn: "La fecha no puede ser futura." });
    expect(validateReport({ chargeIds: ["c1"], amount: "1850", paidOn: "2026-10-14", method: "transfer", file: file("text/plain") }, "2026-10-14").file).toMatch(/imagen/);
    expect(validateReport({ chargeIds: ["c1"], amount: "1850", paidOn: "2026-10-14", method: "transfer", file: file("application/pdf", 11 * 1024 * 1024) }, "2026-10-14").file).toMatch(/10 MB/);
    expect(validateReport({ chargeIds: ["c1"], amount: "1850", paidOn: "2026-10-14", method: "cash", file: file() }, "2026-10-14")).toEqual({});
  });

  it("a charge with a report under review cannot be reported twice", () => {
    const charges = [{ id: "c1", amount: "1850", paid_amount: "0" }, { id: "c2", amount: "500", paid_amount: "500" }, { id: "c3", amount: "900", paid_amount: "0" }];
    const reports = [
      { id: "r1", charge_ids: ["c1"], status: "submitted", created_at: "2026-10-12" },
      { id: "r0", charge_ids: ["c3"], status: "rejected", created_at: "2026-10-10" },
    ];
    expect(reportableCharges(charges, reports).map((charge) => charge.id)).toEqual(["c3"]);
    expect(reportForCharge(reports, "c1").id).toBe("r1");
    expect(reportForCharge([...reports, { id: "r2", charge_ids: ["c1"], status: "cancelled", created_at: "2026-10-13" }], "c1").id).toBe("r1");
  });

  it("tells the resident where each report stands on the home screen", () => {
    const now = new Date("2026-10-14T12:00:00");
    const notices = reportNotices([
      { id: "a", amount: 1850, status: "submitted" },
      { id: "b", amount: 900, status: "rejected", rejection_reason: "No se ve el folio", reviewed_at: "2026-10-13T10:00:00" },
      { id: "c", amount: 500, status: "approved", reviewed_at: "2026-09-01T10:00:00" },
    ], now);
    expect(notices.map((notice) => notice.label)).toEqual(["Pago en revisión", "Comprobante rechazado"]);
    expect(notices[1].detail).toBe("No se ve el folio");
  });

  it("keeps late fees off by default and validates the rule only when enabled", () => {
    const policy = normalizePolicy(null);
    expect(policy.late_fee.enabled).toBe(false);
    expect(validatePolicy(policy)).toEqual({});
    expect(validatePolicy({ ...policy, late_fee: { ...policy.late_fee, enabled: true, kind: "percent", value: 120 } }).late_fee_value).toMatch(/100/);
    expect(validatePolicy({ ...policy, auto_generate: { enabled: true, day_of_month: 31 } }).day_of_month).toBeDefined();
    expect(normalizePolicy({ late_fee: { enabled: true } }).reminders).toEqual(DEFAULT_POLICY.reminders);
  });

  it("explains reminders and late fees in plain words", () => {
    expect(remindersSummary(DEFAULT_POLICY.reminders)).toBe("3 días antes, el día de vencimiento y 3 y 15 días después");
    expect(remindersSummary({ before_days: [], on_due_date: false, after_days: [] })).toBe("Sin recordatorios");
    expect(lateFeeExample({ enabled: false })).toBe("Sin recargos por atraso.");
    expect(lateFeeExample({ enabled: true, kind: "percent", value: 10, grace_days: 5 })).toMatch(/5 días después de vencer genera un recargo de \$185\.00/);
  });
});
