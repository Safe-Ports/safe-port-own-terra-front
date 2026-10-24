import { describe, expect, it } from "vitest";
import { canMove, demoOrders, nextAction, partitionOrders, stepIndex, summary, validateFinish, whenLabel } from "./partnerModel";

const now = new Date(2026, 9, 17, 15, 20);

describe("partnerModel", () => {
  it("sigue las transiciones de work_orders del backend", () => {
    expect(nextAction({ status: "dispatched" })).toMatchObject({ status: "accepted" });
    expect(nextAction({ status: "accepted" })).toMatchObject({ status: "in_progress" });
    expect(nextAction({ status: "in_progress" })).toMatchObject({ status: "done", needsEvidence: true });
    expect(nextAction({ status: "done" })).toBeNull();
    expect(canMove("dispatched", "rejected")).toBe(true);
    expect(canMove("accepted", "done")).toBe(false);
    expect(stepIndex("in_progress")).toBe(2);
  });

  it("pide foto y nota para terminar", () => {
    expect(Object.keys(validateFinish({ note: "", evidence: [] }))).toEqual(["evidence", "note"]);
    expect(validateFinish({ note: "Listo", evidence: [{ id: "1" }] })).toEqual({});
  });

  it("reparte las órdenes de ejemplo en hoy, agenda e historial", () => {
    const orders = demoOrders(now);
    const groups = partitionOrders(orders, now);
    expect(groups.today.map((o) => o.status)).toEqual(["in_progress", "dispatched"]);
    expect(groups.history.map((o) => o.status)).toEqual(["done"]);
    const stats = summary(orders, now);
    expect(stats).toMatchObject({ today: 1, toConfirm: 1, onSite: 1 });
    expect(stats.next.folio).toBe("OT-000127");
  });

  it("dice la fecha como la diría una persona", () => {
    expect(whenLabel(new Date(2026, 9, 17, 14), now)).toMatch(/^Hoy · /);
    expect(whenLabel(new Date(2026, 9, 18, 10, 30), now)).toMatch(/^Mañana · /);
    expect(whenLabel(new Date(2026, 9, 16, 9), now)).toMatch(/^Ayer · /);
  });
});
