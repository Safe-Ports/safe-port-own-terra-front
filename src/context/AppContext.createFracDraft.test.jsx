import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppProvider, useAppContext } from "./AppContext";

// El fraccionamiento ahora se crea en un paso explícito y separado ("Guardar y
// continuar" en la pantalla de nombre+plano) — antes de eso, nada existe en el
// servidor; el usuario decide cuándo. Es una sola llamada atómica: si falla (p. ej.
// tope de fraccionamientos del plan), no se crea nada, no hay nada que revertir. A
// partir de ahí, agregar lotes es una operación aparte (saveEditedFrac) que tampoco
// necesita revertir el fraccionamiento si falla — ya existía de verdad.

vi.mock("@/services/clientService", () => ({ clientService: { list: vi.fn().mockResolvedValue({ items: [] }) } }));
const inmuebleCreate = vi.fn();
const inmuebleUploadMap = vi.fn();
vi.mock("@/services/inmuebleService", () => ({
  inmuebleService: {
    list: vi.fn().mockResolvedValue({ items: [] }),
    create: (...a) => inmuebleCreate(...a),
    uploadMap: (...a) => inmuebleUploadMap(...a),
  },
}));
vi.mock("@/services/lotService", () => ({ lotService: { list: vi.fn().mockResolvedValue({ items: [] }) } }));
vi.mock("@/services/contractService", () => ({ contractService: { list: vi.fn().mockResolvedValue({ items: [] }) } }));
vi.mock("@/services/paymentService", () => ({ paymentService: { list: vi.fn().mockResolvedValue({ items: [] }) } }));
vi.mock("@/services/documentService", () => ({
  documentService: { list: vi.fn().mockResolvedValue({ items: [] }) },
  filenameForDocument: vi.fn(),
  toBackendEntityType: vi.fn(),
}));
vi.mock("@/services/notificationService", () => ({ notificationService: { unreadCount: vi.fn().mockResolvedValue(0) } }));
vi.mock("@/services/appointmentService", () => ({ appointmentService: { list: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/services/folderService", () => ({ folderService: {} }));
vi.mock("@/utils/mapImage", () => ({
  mapFileFromUrl: vi.fn().mockResolvedValue(new File(["img"], "map.png", { type: "image/png" })),
}));

function Probe() {
  const { createFracDraft, draftProject, toast } = useAppContext();
  return (
    <div>
      <button onClick={() => createFracDraft({ name: "Residencial Test", mapUrl: "" })}>guardar</button>
      <button onClick={() => createFracDraft({ name: "Residencial Test", mapUrl: "data:image/png;base64,fake" })}>
        guardar-con-plano
      </button>
      <div data-testid="editing-id">{draftProject?._editingFracId ?? "sin-crear"}</div>
      <div data-testid="mode">{draftProject?.mode ?? "sin-modo"}</div>
      <div data-testid="toast">{toast ? `${toast.kind}:${toast.message ?? toast.title ?? ""}` : "sin-toast"}</div>
    </div>
  );
}

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AppProvider>
          <Probe />
        </AppProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Guardar y continuar: crea el fraccionamiento como un paso explícito y atómico", () => {
  beforeEach(() => {
    window.localStorage.clear();
    inmuebleCreate.mockReset();
    inmuebleUploadMap.mockReset();
  });

  it("con solo el nombre: crea el inmueble y pasa al tablero (_editingFracId real, no un placeholder)", async () => {
    inmuebleCreate.mockResolvedValue({ id: "frac-1" });

    renderApp();
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByText("guardar"));
    });

    await waitFor(() => expect(screen.getByTestId("editing-id").textContent).toBe("frac-1"));
    expect(screen.getByTestId("mode").textContent).toBe("editor");
    expect(inmuebleUploadMap).not.toHaveBeenCalled();
  });

  it("si el tope de fraccionamientos del plan lo rechaza, no crea nada y NO pasa al tablero", async () => {
    inmuebleCreate.mockRejectedValue({
      response: { data: { error: { code: "OT-SUB-4001", message: "Alcanzaste el límite de fraccionamientos de tu plan" } } },
    });

    renderApp();
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByText("guardar"));
    });

    await waitFor(() => expect(screen.getByTestId("toast").textContent).not.toBe("sin-toast"));
    expect(screen.getByTestId("editing-id").textContent).toBe("sin-crear");
    expect(screen.getByTestId("mode").textContent).not.toBe("editor");
  });

  it("con plano: lo sube al inmueble recién creado", async () => {
    inmuebleCreate.mockResolvedValue({ id: "frac-2" });
    inmuebleUploadMap.mockResolvedValue({});

    renderApp();
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByText("guardar-con-plano"));
    });

    await waitFor(() => expect(inmuebleUploadMap).toHaveBeenCalledWith("frac-2", expect.any(File)));
    expect(screen.getByTestId("editing-id").textContent).toBe("frac-2");
  });

  it("si SOLO falla la subida del plano, igual pasa al tablero (el fraccionamiento sí se creó)", async () => {
    inmuebleCreate.mockResolvedValue({ id: "frac-3" });
    inmuebleUploadMap.mockRejectedValue({
      response: { data: { error: { code: "OT-SYS-9000", message: "boom" } } },
    });

    renderApp();
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByText("guardar-con-plano"));
    });

    // Lo importante: el fraccionamiento SÍ quedó creado y SÍ pasa al tablero — que
    // falle solo el plano no debe bloquear ni revertir nada de eso.
    await waitFor(() => expect(screen.getByTestId("editing-id").textContent).toBe("frac-3"));
    expect(screen.getByTestId("mode").textContent).toBe("editor");
    await waitFor(() => expect(screen.getByTestId("toast").textContent).not.toBe("sin-toast"));
  });
});
