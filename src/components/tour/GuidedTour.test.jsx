import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import GuidedTour, { replayTour } from "./GuidedTour.jsx";

const markTourSeen = vi.fn();
let ctx;

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ctx,
}));

function renderTour(route = "/ecosistema") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <GuidedTour />
    </MemoryRouter>
  );
}

describe("Tutorial guiado: solo la bienvenida se auto-lanza, el resto es manual", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    markTourSeen.mockClear();
    ctx = {
      currentUser: { id: "u1", tours_seen: [] },
      markTourSeen,
      authHydrating: false,
    };
  });

  afterEach(() => vi.useRealTimers());

  it("la bienvenida arranca sola la primera vez que se visita /ecosistema", async () => {
    renderTour("/ecosistema");
    act(() => vi.advanceTimersByTime(800));
    await waitFor(() =>
      expect(screen.getByText(/Te enseño la casa en un minuto/)).toBeInTheDocument()
    );
  });

  it("no vuelve a arrancar sola si ya está vista", async () => {
    ctx.currentUser = { id: "u1", tours_seen: ["ecosistema"] };
    renderTour("/ecosistema");
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText(/Te enseño la casa/)).not.toBeInTheDocument();
  });

  it("no arranca sola en ninguna otra pantalla (solo /ecosistema)", async () => {
    renderTour("/pagos");
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByText(/Te enseño la casa/)).not.toBeInTheDocument();
  });

  it("espera a que la sesión termine de resolverse antes de decidir", async () => {
    // Lanzarla antes se lo mostraría un instante a quien ya la vio.
    ctx.authHydrating = true;
    renderTour("/ecosistema");
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText(/Te enseño la casa/)).not.toBeInTheDocument();
  });

  it("cualquier OTRO tour (no la bienvenida) no arranca solo, ni en su propia pantalla", async () => {
    // Regresión clave del rediseño: solo "ecosistema" tiene auto-lanzamiento.
    ctx.currentUser = { id: "u1", tours_seen: ["ecosistema"] };
    renderTour("/lotes");
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByText(/Tu primer fraccionamiento/)).not.toBeInTheDocument();
  });

  it("al saltar la bienvenida se marca como vista", async () => {
    renderTour("/ecosistema");
    act(() => vi.advanceTimersByTime(800));
    await waitFor(() => expect(screen.getByText(/Saltar/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Saltar/));
    await waitFor(() => expect(markTourSeen).toHaveBeenCalledWith("ecosistema"));
  });

  it("cualquier tour se puede repetir a mano (botón del panel de Tours guiados)", async () => {
    ctx.currentUser = { id: "u1", tours_seen: ["ecosistema"] };
    renderTour("/pagos"); // ni siquiera hace falta estar en /ecosistema
    act(() => {
      replayTour("ecosistema");
      vi.advanceTimersByTime(300);
    });
    await waitFor(() =>
      expect(screen.getByText(/Te enseño la casa en un minuto/)).toBeInTheDocument()
    );
  });
});
