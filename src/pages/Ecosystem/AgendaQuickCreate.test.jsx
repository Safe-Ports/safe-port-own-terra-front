import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AgendaQuickCreate from "./AgendaQuickCreate.jsx";

const anchorRect = { top: 100, left: 100, right: 140, bottom: 120, width: 40, height: 20 };

describe("AgendaQuickCreate", () => {
  beforeEach(() => {
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("innerHeight", 768);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the clicked slot's date and time", () => {
    render(
      <AgendaQuickCreate
        date="2026-07-14"
        time="10:30"
        anchorRect={anchorRect}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        onMore={vi.fn()}
      />
    );
    expect(screen.getByText(/10:30/)).toBeInTheDocument();
  });

  it("submits the fixed date/time and title without requiring extra fields", async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    const onClose = vi.fn();
    render(
      <AgendaQuickCreate
        date="2026-07-14"
        time="10:30"
        anchorRect={anchorRect}
        onClose={onClose}
        onSubmit={onSubmit}
        onMore={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Añadir título"), { target: { value: "Visita rápida" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const body = onSubmit.mock.calls[0][0];
    expect(body).toMatchObject({ title: "Visita rápida", appt_type: "evento", app_key: "core" });
    expect(body.scheduled_at).toBe(new Date("2026-07-14T10:30:00").toISOString());
    expect(onClose).toHaveBeenCalled();
  });

  it("hands off to the full form via 'Más opciones' without submitting", () => {
    const onMore = vi.fn();
    const onSubmit = vi.fn();
    render(
      <AgendaQuickCreate
        date="2026-07-14"
        time="10:30"
        anchorRect={anchorRect}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        onMore={onMore}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Más opciones" }));
    expect(onMore).toHaveBeenCalledWith("2026-07-14", "10:30");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("closes on Escape without submitting", () => {
    const onClose = vi.fn();
    render(
      <AgendaQuickCreate
        date="2026-07-14"
        time="10:30"
        anchorRect={anchorRect}
        onClose={onClose}
        onSubmit={vi.fn()}
        onMore={vi.fn()}
      />
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when clicking outside the popover", () => {
    const onClose = vi.fn();
    render(
      <div>
        <div data-testid="outside">outside</div>
        <AgendaQuickCreate
          date="2026-07-14"
          time="10:30"
          anchorRect={anchorRect}
          onClose={onClose}
          onSubmit={vi.fn()}
          onMore={vi.fn()}
        />
      </div>
    );
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
