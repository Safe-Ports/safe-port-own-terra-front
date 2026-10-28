import { describe, expect, it } from "vitest";
import { adminActivity, occupancyOf } from "./dashboardModel";

describe("dashboardModel", () => {
  it("lists the latest operation events newest first, with the unit name", () => {
    const items = adminActivity({
      reports: [{ id: "r1", status: "submitted", amount: 1850, persona_name: "Carlos Vega", created_at: "2026-10-26T10:00:00" }, { id: "r2", status: "cancelled", amount: 1, created_at: "2026-10-27T10:00:00" }],
      tickets: [{ id: "t1", folio: "T-023", title: "Fuga en cocina", status: "open", unitId: "u1", createdAt: "2026-10-25T10:00:00" }, { id: "t2", title: "Foco", status: "resolved", resolvedAt: "2026-10-20T10:00:00", createdAt: "2026-10-10T10:00:00" }],
      packages: [{ id: "k1", status: "pending", carrier: "Amazon", property_id: "u1", received_at: "2026-10-26T18:00:00" }],
      announcements: [{ id: "a1", title: "Alberca cerrada", body: "Del 10 al 12", published_at: "2026-10-01T10:00:00" }],
      unitLabel: (id) => (id === "u1" ? "Depto 101" : ""),
    });
    expect(items.map((item) => item.key)).toEqual(["package-k1", "report-r1", "ticket-t1", "ticket-t2"]);
    expect(items[0].detail).toBe("Amazon · Depto 101");
    expect(items[1]).toMatchObject({ title: "Pago reportado por revisar", tone: "calm" });
    expect(items[2].title).toBe("Ticket nuevo T-023");
    expect(items[3]).toMatchObject({ title: "Ticket resuelto", tone: "ok" });
  });

  it("measures occupancy over active units only", () => {
    expect(occupancyOf([{ status: "rented" }, { status: "available" }, { status: "rented" }, { status: "archived" }])).toEqual({ total: 3, occupied: 2, percent: 67 });
    expect(occupancyOf([])).toEqual({ total: 0, occupied: 0, percent: 0 });
  });
});
