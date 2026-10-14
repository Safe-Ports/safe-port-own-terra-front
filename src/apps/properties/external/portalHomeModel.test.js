import { describe, expect, it } from "vitest";
import { dayPeriod, firstName, greeting, homeFacts, homeKind, sinceLabel, todayItems } from "./portalHomeModel";

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
