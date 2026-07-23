import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AgendaTimeGrid, { layoutDayEvents } from "./AgendaTimeGrid.jsx";

const day = { date: new Date(2026, 6, 14), key: "2026-07-14", label: 14 };

describe("AgendaTimeGrid", () => {
  it("creates an event from the selected half-hour slot", () => {
    const onSlotClick = vi.fn();
    render(<AgendaTimeGrid view="day" days={[day]} appointments={[]} onSlotClick={onSlotClick} onEventClick={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Crear evento 10:30" }));
    expect(onSlotClick).toHaveBeenCalledWith(
      "2026-07-14",
      "10:30",
      expect.objectContaining({ top: expect.any(Number), left: expect.any(Number) })
    );
  });

  it("opens an existing event without creating a new one", () => {
    const onSlotClick = vi.fn();
    const onEventClick = vi.fn();
    const appointment = { id: "a1", date: day.key, time: "10:00", title: "Visita", app: "lands" };
    render(<AgendaTimeGrid view="day" days={[day]} appointments={[appointment]} onSlotClick={onSlotClick} onEventClick={onEventClick} />);
    fireEvent.click(screen.getByRole("button", { name: /10:00.*Visita/i }));
    expect(onEventClick).toHaveBeenCalledWith(expect.objectContaining({ id: "a1" }));
    expect(onSlotClick).not.toHaveBeenCalled();
  });
});

describe("overlap layout", () => {
  it("keeps unrelated events full width and only splits an overlapping group", () => {
    const result = layoutDayEvents([
      { id: "morning", startMinutes: 540 },
      { id: "overlap-a", startMinutes: 900 },
      { id: "overlap-b", startMinutes: 930 },
    ]);
    expect(result.find((item) => item.id === "morning").laneCount).toBe(1);
    expect(result.find((item) => item.id === "overlap-a").laneCount).toBe(2);
    expect(result.find((item) => item.id === "overlap-b").laneCount).toBe(2);
  });
});
