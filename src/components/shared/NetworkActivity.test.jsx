import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NetworkActivity from "./NetworkActivity";
import LoadingScreen from "./LoadingScreen";
import { endRequest, resetNetworkActivity, snapshot, startRequest } from "@/services/networkActivity";

describe("indicador de carga con red lenta", () => {
  beforeEach(() => { vi.useFakeTimers(); resetNetworkActivity(); });
  afterEach(() => { vi.useRealTimers(); resetNetworkActivity(); });

  it("una petición rápida no muestra nada", () => {
    render(<NetworkActivity />);
    let id;
    act(() => { id = startRequest(); });
    act(() => { vi.advanceTimersByTime(300); });
    act(() => { endRequest(id); });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("si tarda, aparece la barra; si tarda mucho, el aviso de conexión lenta; al terminar se va todo", () => {
    render(<NetworkActivity />);
    let id;
    act(() => { id = startRequest(); });
    act(() => { vi.advanceTimersByTime(800); });
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText(/conexión está lenta/i)).not.toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText(/conexión está lenta/i)).toBeInTheDocument();

    act(() => { endRequest(id); });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("generar un PDF tarda por naturaleza: muestra la barra pero no culpa a la conexión", () => {
    render(<NetworkActivity />);
    act(() => { startRequest({ expectSlow: true }); });
    act(() => { vi.advanceTimersByTime(8000); });
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText(/conexión está lenta/i)).not.toBeInTheDocument();
    expect(snapshot().count).toBe(1);
  });

  it("la pantalla de carga explica la demora si se alarga", () => {
    render(<LoadingScreen message="Abriendo tu portal…" />);
    expect(screen.getByText("Abriendo tu portal…")).toBeInTheDocument();
    expect(screen.queryByText(/conexión está lenta/i)).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5200); });
    expect(screen.getByText(/conexión está lenta/i)).toBeInTheDocument();
  });
});
