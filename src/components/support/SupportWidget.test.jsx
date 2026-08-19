import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import SupportWidget from "./SupportWidget.jsx";

// Bug real reportado: cuando soporte responde un ticket desde el panel, el usuario
// no se entera de nada salvo que vuelva a abrir el widget por su cuenta — el punto
// rojo del botón solo se revisaba UNA vez (2s tras montar o cerrar el panel), nunca
// de forma continua. Estas pruebas cubren que ahora sí revisa en un intervalo
// mientras el panel está cerrado.

let mockCurrentUser;
vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({ currentUser: mockCurrentUser }),
}));

describe("SupportWidget: el punto rojo revisa mensajes no leídos de forma continua", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockCurrentUser = { token: "tok" };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("con el panel cerrado, revisa más de una vez mientras pasa el tiempo (no solo al montar)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: "t1", status: "open", unread_count: 0 }],
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SupportWidget />);

    // Revisión inicial (2s) + al menos una del intervalo (30s) sin que el usuario
    // haya tocado nada — antes de este fix, jamás pasaba de la primera.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    const afterFirst = fetchMock.mock.calls.length;
    expect(afterFirst).toBeGreaterThanOrEqual(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(afterFirst);
  });

  it("muestra el punto rojo cuando una revisión en segundo plano encuentra un ticket con mensajes sin leer", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: "t1", status: "open", unread_count: 2 }],
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SupportWidget />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    await waitFor(() => {
      expect(document.querySelector(".sp-btn-dot")).toBeTruthy();
    });
  });

  it("con el panel ABIERTO no dispara la revisión de fondo (el hilo/lista ya se encargan)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: "t1", status: "open", unread_count: 1 }],
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SupportWidget />);
    const toggle = screen.getByRole("button", { name: /soporte/i });
    await act(async () => {
      toggle.click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(35_000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
