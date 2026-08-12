import { describe, expect, it } from "vitest";
import {
  buildAppointmentBody,
  buildMonthDays,
  buildWeekDays,
  getVisibleRange,
  googleCalendarUrl,
  normalizeAppt,
  startOfWeek,
  toDateKey,
} from "./agendaShared.jsx";

describe("agenda date ranges", () => {
  const anchor = new Date(2026, 6, 14, 12);

  it("builds a Sunday-to-Saturday week", () => {
    expect(toDateKey(startOfWeek(anchor))).toBe("2026-07-12");
    expect(buildWeekDays(anchor).map((day) => day.key)).toEqual([
      "2026-07-12", "2026-07-13", "2026-07-14", "2026-07-15",
      "2026-07-16", "2026-07-17", "2026-07-18",
    ]);
  });

  it("builds the complete six-row month grid", () => {
    const days = buildMonthDays(new Date(2026, 6, 1));
    expect(days).toHaveLength(42);
    expect(days[0]).toMatchObject({ key: "2026-06-28", inMonth: false });
    expect(days[41]).toMatchObject({ key: "2026-08-08", inMonth: false });
  });

  it.each(["day", "week", "month"])("returns a valid %s range", (view) => {
    const range = getVisibleRange(view, new Date(2026, 6, 1), "2026-07-14");
    expect(range.start.getTime()).toBeLessThan(range.end.getTime());
    expect(range.days?.length ?? null).toBe(view === "month" ? null : view === "week" ? 7 : 1);
  });
});

describe("agenda API mapping", () => {
  it("builds the backend payload using local time converted to UTC", () => {
    const body = buildAppointmentBody({
      title: "Visita", date: "2026-07-14", time: "10:30", type: "visita",
      app: "lands", client: "Ana", context: "Lote 1", owner: "Luis",
    });
    expect(body).toMatchObject({
      title: "Visita", appt_type: "visita", app_key: "lands",
      contact_name: "Ana", notes: "Lote 1", owner: "Luis",
    });
    expect(body.scheduled_at).toMatch(/Z$/);
  });

  it("normalizes backend appointments for the calendar", () => {
    const appointment = normalizeAppt({
      id: "a1", scheduled_at: "2026-07-14T16:30:00.000Z", title: "Visita",
      app_key: "lands", appt_type: "visita", status: "completed",
    });
    expect(appointment).toMatchObject({
      id: "a1", date: "2026-07-14", title: "Visita", app: "lands",
      type: "visita", status: "completed",
    });
  });

  it("builds a Google Calendar link with a 60-min UTC range", () => {
    const url = googleCalendarUrl({
      date: "2026-07-14", time: "09:00", title: "Visita con Ana",
      client: "Ana", clientPhone: "5551234567", context: "Lote 1",
    });
    const params = new URL(url).searchParams;
    expect(url).toContain("calendar.google.com/calendar/render");
    expect(params.get("action")).toBe("TEMPLATE");
    expect(params.get("text")).toBe("Visita con Ana");
    // 09:00 local en la TZ de la corrida; el rango debe ser exactamente 60 min.
    const [start, end] = params.get("dates").split("/");
    const toDate = (s) => new Date(
      `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`
    );
    expect((toDate(end) - toDate(start)) / 60000).toBe(60);
    expect(params.get("details")).toContain("Ana");
  });
});
