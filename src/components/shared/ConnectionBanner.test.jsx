import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ConnectionBanner from "./ConnectionBanner";
import { isConnectionError } from "./ErrorBoundary";
import { parseApiError } from "@/errors/parseApiError";

const setOnline = (value) => Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => value });

describe("sin internet", () => {
  afterEach(() => { setOnline(true); vi.useRealTimers(); });

  it("avisa cuando se va la conexión y cuando vuelve", () => {
    vi.useFakeTimers();
    render(<ConnectionBanner />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    act(() => { setOnline(false); window.dispatchEvent(new Event("offline")); });
    expect(screen.getByRole("alert")).toHaveTextContent("Sin conexión a internet");

    act(() => { setOnline(true); window.dispatchEvent(new Event("online")); });
    expect(screen.getByRole("status")).toHaveTextContent("Volvió la conexión");
    act(() => { vi.advanceTimersByTime(4500); });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("un fallo de red sin internet dice que es la conexión, no el servidor", () => {
    setOnline(false);
    const parsed = parseApiError({ message: "Network Error" });
    expect(parsed.title).toBe("Sin conexión a internet");
    expect(parsed.message).toBe("No hay conexión a internet.");
    expect(parsed.code).toBe("OT-NET-9001");
  });

  it("con internet, un fallo de red conserva el mensaje del catálogo", () => {
    expect(parseApiError({ message: "Network Error" }).message).toBe("No pudimos conectar con el servidor.");
  });

  it("reconoce cuando una sección no se pudo descargar", () => {
    expect(isConnectionError(new TypeError("Failed to fetch dynamically imported module: /src/pages/Lots.jsx"))).toBe(true);
    expect(isConnectionError(new Error("Cannot read properties of undefined"))).toBe(false);
  });
});
