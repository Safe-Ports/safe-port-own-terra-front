import { describe, expect, it } from "vitest";
import { dayPeriod, firstName, greeting, homeFacts, homeKind, nextCharge, noticeImage, recentActivity, sinceLabel, todayItems, unitHighlights } from "./portalHomeModel";

const now = new Date("2026-10-13T16:00:00");

describe("portalHomeModel", () => {
  it("greets by time of day and by first name", () => {
    expect(greeting(8)).toBe("Buenos días");
    expect(greeting(16)).toBe("Buenas tardes");
    expect(greeting(23)).toBe("Buenas noches");
    expect(dayPeriod(6)).toBe("dawn");
    expect(dayPeriod(18)).toBe("dusk");
    expect(dayPeriod(2)).toBe("night");
    expect(firstName("Laura Méndez (prueba)")).toBe("Laura");
  });

  it("describes past dates in plain words", () => {
    expect(sinceLabel("2026-10-13T09:00:00", now)).toBe("hoy");
    expect(sinceLabel("2026-10-12", now)).toBe("ayer");
    expect(sinceLabel("2026-10-10", now)).toBe("hace 3 días");
    expect(sinceLabel("2026-10-01", now)).toMatch(/^el 1 oct/);
  });

  it("orders what matters today: overdue payment, urgent notice, package, then the rest", () => {
    const items = todayItems({
      charges: [
        { id: "c1", concept: "Cuota de octubre", amount: "1850", paid_amount: "0", due_date: "2026-10-11", status: "overdue" },
        { id: "c2", concept: "Cuota de noviembre", amount: "1850", paid_amount: "0", due_date: "2026-10-16", status: "pending" },
        { id: "c3", concept: "Cuota de diciembre", amount: "1850", paid_amount: "0", due_date: "2026-12-11", status: "pending" },
      ],
      packages: [{ id: "p1", carrier: "DHL", status: "pending", received_at: "2026-10-12T10:00:00" }, { id: "p2", status: "delivered", received_at: "2026-10-01" }],
      announcements: [{ id: "a1", title: "Corte de agua", body: "Sábado", is_urgent: false }, { id: "a2", title: "Fuga de gas", body: "Evita el sótano", is_urgent: true }, { id: "a3", title: "Leído", body: "", read_at: "2026-10-02" }],
      votes: [{ id: "v1", question: "¿Pintamos la fachada?", status: "open" }, { id: "v2", question: "Cerrada", status: "closed" }],
    }, now);
    expect(items.map((item) => item.key)).toEqual(["charge-c1", "notice-a2", "package-p1", "charge-c2", "notice-a1", "vote-v1"]);
    expect(items[0]).toMatchObject({ tone: "alert", detail: expect.stringContaining("venció hace 2 días") });
    expect(items[2].title).toBe("Tu paquete de DHL te espera en recepción");
    expect(items[2].detail).toBe("Llegó ayer");
    expect(items[3].detail).toContain("vence en 3 días");
  });

  it("returns nothing when the home is in order", () => {
    expect(todayItems({}, now)).toEqual([]);
  });

  it("shows only the facts the administration captured", () => {
    const unit = { attributes: { type: "house", bedrooms: 3, bathrooms: 1, area: 600, floor: "2" } };
    expect(homeFacts(unit).map((fact) => fact.label)).toEqual(["Casa", "3 recámaras", "1 baño", "600 m²", "Piso 2"]);
    expect(homeFacts({ attributes: {} })).toEqual([]);
    expect(homeKind(unit)).toBe("house");
    expect(homeKind({ attributes: { type: "apartment" } })).toBe("building");
  });
});

describe("portalHomeModel · Mi hogar", () => {
  it("picks the open charge that is due first", () => {
    const charges = [
      { id: "late", amount: "100", paid_amount: "0", due_date: "2026-12-01" },
      { id: "paid", amount: "100", paid_amount: "100", due_date: "2026-10-01" },
      { id: "soon", amount: "100", paid_amount: "20", due_date: "2026-11-05" },
    ];
    expect(nextCharge(charges).id).toBe("soon");
    expect(nextCharge([])).toBeNull();
  });

  it("splits the unit sheet into measures and what it includes, skipping what is missing", () => {
    const { main, extra } = unitHighlights({ attributes: { area: 82, floor: 0, recamaras: 2, banos: 1, parking: 1, storage_room: true, pets_allowed: false } });
    expect(main.map((fact) => fact.value)).toEqual(["82 m²", "Piso 0", "2", "1"]);
    expect(main[3].label).toBe("Baño");
    expect(extra.map((fact) => `${fact.label}: ${fact.value}`)).toEqual(["Estacionamiento: 1 cajón", "Bodega: Incluida", "Mascotas: No permitidas"]);
    expect(unitHighlights({ attributes: {} })).toEqual({ main: [], extra: [] });
  });

  it("finds the first image attached to a notice", () => {
    expect(noticeImage({ attachments: ["https://x/doc.pdf", "https://x/alberca.JPG?v=2"] })).toBe("https://x/alberca.JPG?v=2");
    expect(noticeImage({ attachments: ["https://x/doc.pdf"] })).toBeNull();
  });

  it("lists recent activity newest first, across payments, tickets, packages and notices", () => {
    const items = recentActivity({
      reports: [{ id: "r1", status: "approved", amount: 18500, reviewed_at: "2026-10-03T10:00:00" }, { id: "r2", status: "cancelled", amount: 1, created_at: "2026-10-20T10:00:00" }],
      tickets: [{ id: "t1", folio: "#023", title: "Aire acondicionado", status: "in_progress", created_at: "2026-09-28T10:00:00" }],
      packages: [{ id: "p1", carrier: "Amazon", status: "delivered", received_at: "2026-10-05T10:00:00" }],
      announcements: [{ id: "a1", title: "Mantenimiento de elevador", body: "Mañana de 9 a 12", published_at: "2026-09-12T10:00:00" }],
      statusLabel: { in_progress: "En progreso" },
    }, 3);
    expect(items.map((item) => item.key)).toEqual(["package-p1", "report-r1", "ticket-t1"]);
    expect(items[1]).toMatchObject({ title: "Pago confirmado", tone: "ok", section: "charges" });
    expect(items[2].detail).toBe("Aire acondicionado · En progreso");
  });
});
