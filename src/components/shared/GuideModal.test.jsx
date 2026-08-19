import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import GuideModal from "./GuideModal.jsx";

// El objetivo de este archivo: probar que la lista de "Tours guiados" es
// TRANSVERSAL — vive dentro de GuideModal mismo, así que cualquier página que use
// este componente la obtiene gratis, sin montarla por su cuenta. Por eso el test usa
// contenido de página genérico ("Lotes", pasos inventados), no algo real de
// Configuración: si esto pasa, pasa para cualquiera de las ~20 páginas que usan
// GuideModal.

let ctx;
vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ctx,
}));

const navigateSpy = vi.fn();
vi.mock("react-router-dom", async (orig) => ({
  ...(await orig()),
  useNavigate: () => navigateSpy,
}));

const replayTourSpy = vi.fn();
vi.mock("@/components/tour/GuidedTour", () => ({
  replayTour: (key) => replayTourSpy(key),
}));

function renderModal(props = {}) {
  return render(
    <MemoryRouter>
      <GuideModal
        open
        onClose={vi.fn()}
        title="Lotes"
        subtitle="Página de ejemplo, ajena a Configuración"
        steps={[{ title: "Un paso cualquiera", text: "Texto de ejemplo." }]}
        {...props}
      />
    </MemoryRouter>
  );
}

describe("GuideModal: la lista de Tours guiados es transversal a toda la app", () => {
  beforeEach(() => {
    navigateSpy.mockClear();
    replayTourSpy.mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    ctx = { currentUser: { id: "u1", tours_seen: ["ecosistema"] } };
  });

  it("aparece en un GuideModal de una página cualquiera, no solo Configuración", async () => {
    renderModal();
    // El contenido propio de la página sigue ahí...
    expect(screen.getByText("Un paso cualquiera")).toBeInTheDocument();
    // ...y la lista de tours aparece igual, sin que esta página la haya montado.
    expect(screen.getByText("🧭 Tours guiados")).toBeInTheDocument();
    expect(screen.getByText("Crea tu primer fraccionamiento")).toBeInTheDocument();
  });

  it("no lista las partes encadenadas (hidden) como si fueran su propio tour", () => {
    renderModal();
    expect(screen.queryByText(/Ya casi/)).not.toBeInTheDocument();
  });

  it("marca con check lo ya visto y sin check lo pendiente", () => {
    renderModal();
    const ecosistemaRow = screen.getByText("El ecosistema OwnTerra").closest(".d-row");
    expect(within(ecosistemaRow).getByText("✅")).toBeInTheDocument();
    const fracRow = screen.getByText("Crea tu primer fraccionamiento").closest(".d-row");
    expect(within(fracRow).getByText("⬜")).toBeInTheDocument();
  });

  it("iniciar un tour con ruta cierra el modal, navega y lo relanza", async () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    const fracRow = screen.getByText("Crea tu primer fraccionamiento").closest(".d-row");
    fireEvent.click(within(fracRow).getByRole("button", { name: "Iniciar" }));

    expect(onClose).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith("/lotes");
    act(() => vi.advanceTimersByTime(500));
    expect(replayTourSpy).toHaveBeenCalledWith("lands-frac-selector");
  });

  it("iniciar Restricciones (sin ruta) cierra el modal y lo relanza sin navegar", async () => {
    // Regresión: sin cerrar el modal aquí, Restricciones (que no navega a ningún
    // lado) arrancaba igual pero quedaba escondida detrás del modal para siempre
    // (Guías usa z-index 9999, el tour 45 a propósito).
    const onClose = vi.fn();
    renderModal({ onClose });

    const row = screen.getByText("Restricciones que existen").closest(".d-row");
    fireEvent.click(within(row).getByRole("button", { name: "Iniciar" }));

    expect(onClose).toHaveBeenCalled();
    expect(replayTourSpy).toHaveBeenCalledWith("restricciones");
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
