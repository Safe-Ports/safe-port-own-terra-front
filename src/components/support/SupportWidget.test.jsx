import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
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

function renderWidget(path = "/dashboard") {
  return render(<MemoryRouter initialEntries={[path]}><SupportWidget /></MemoryRouter>);
}

describe("SupportWidget: el punto rojo revisa mensajes no leídos de forma continua", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockCurrentUser = { token: "tok" };
    const storage = new Map();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(key => storage.get(key) ?? null),
      setItem: vi.fn((key, value) => storage.set(key, String(value))),
      removeItem: vi.fn(key => storage.delete(key)),
      clear: vi.fn(() => storage.clear()),
    });
    // jsdom no implementa scrollIntoView; ThreadView lo llama al recibir mensajes.
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("con el panel cerrado, revisa más de una vez mientras pasa el tiempo (no solo al montar)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: "t1", status: "open", unread_count: 0 }],
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWidget();

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

    renderWidget();

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

    renderWidget();
    const toggle = screen.getByRole("button", { name: /soporte/i });
    await act(async () => {
      toggle.click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(35_000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("con exactamente UN ticket sin leer, abrir el widget lleva directo al hilo — no a un menú que no dice nada", async () => {
    // Queja real: "cuando abro el chat me aparecen las opciones pero nunca sé si es
    // de algún ticket o algo". El punto rojo por sí solo no contesta esa pregunta —
    // hay que llevar al usuario directo a lo que causó el ping.
    const ticket = { id: "ticket-abc123", status: "open", unread_count: 1, description: "algo" };
    const fetchMock = vi.fn((url) => {
      if (url.includes("/messages/read")) return Promise.resolve({ ok: true, json: async () => ({}) });
      if (url.includes("/messages")) return Promise.resolve({ ok: true, json: async () => [] });
      if (url.endsWith(`/support/tickets/${ticket.id}`)) return Promise.resolve({ ok: true, json: async () => ticket });
      return Promise.resolve({ ok: true, json: async () => [ticket] }); // /support/tickets/mine
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWidget();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000); // la revisión de fondo detecta el ticket
    });

    const toggle = screen.getByRole("button", { name: /soporte/i });
    await act(async () => {
      toggle.click();
    });

    await waitFor(() => expect(screen.queryByText(/¿Cómo podemos ayudarte\?/i)).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/Tu ticket fue creado/i)).toBeInTheDocument());
  });

  it("con VARIOS tickets sin leer, abrir el widget lleva a la lista — no a un hilo al azar ni al menú", async () => {
    const tickets = [
      { id: "t1", status: "open", unread_count: 1, description: "Problema uno", created_at: "2026-01-01" },
      { id: "t2", status: "open", unread_count: 2, description: "Problema dos", created_at: "2026-01-02" },
    ];
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => tickets });
    vi.stubGlobal("fetch", fetchMock);

    renderWidget();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    const toggle = screen.getByRole("button", { name: /soporte/i });
    await act(async () => {
      toggle.click();
    });

    await waitFor(() => expect(screen.queryByText(/¿Cómo podemos ayudarte\?/i)).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Problema uno")).toBeInTheDocument());
    expect(screen.getByText("Problema dos")).toBeInTheDocument();
  });

  it("permite arrastrar el botón sin abrir el panel y recuerda su posición", () => {
    vi.stubGlobal("fetch", vi.fn());
    renderWidget();
    const toggle = screen.getByRole("button", { name: /soporte/i });

    fireEvent.pointerDown(toggle, { pointerId: 1, button: 0, clientX: 970, clientY: 720 });
    fireEvent.pointerMove(toggle, { pointerId: 1, clientX: 180, clientY: 160 });
    fireEvent.pointerUp(toggle, { pointerId: 1, clientX: 180, clientY: 160 });
    fireEvent.click(toggle);

    expect(screen.queryByText(/¿Cómo podemos ayudarte\?/i)).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("sp_support_widget_position"))).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
  });

  it("adapta el color del botón a la aplicación activa", () => {
    vi.stubGlobal("fetch", vi.fn());
    const { unmount } = renderWidget("/properties/condominios");
    expect(screen.getByRole("button", { name: /soporte/i })).toHaveClass("sp-btn--properties");
    unmount();

    renderWidget("/construction");
    expect(screen.getByRole("button", { name: /soporte/i })).toHaveClass("sp-btn--construction");
  });
});
