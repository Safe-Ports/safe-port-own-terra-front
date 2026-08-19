import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppProvider, useAppContext } from "./AppContext";

// Bug real reportado: crear un fraccionamiento fallaba por el tope de lotes del plan
// (correcto, el plan sí tiene ese límite) pero el fraccionamiento VACÍO se quedaba
// creado de todos modos — "Crear fraccionamiento" son dos llamadas al backend (crear
// el inmueble, luego crear los lotes) que no pueden envolverse en una sola transacción
// del servidor; si la segunda falla, hay que revertir la primera a mano.

vi.mock("@/services/clientService", () => ({ clientService: { list: vi.fn().mockResolvedValue({ items: [] }) } }));
const inmuebleCreate = vi.fn();
const inmuebleDelete = vi.fn();
const inmuebleUploadMap = vi.fn();
vi.mock("@/services/inmuebleService", () => ({
  inmuebleService: {
    list: vi.fn().mockResolvedValue({ items: [] }),
    create: (...a) => inmuebleCreate(...a),
    delete: (...a) => inmuebleDelete(...a),
    uploadMap: (...a) => inmuebleUploadMap(...a),
  },
}));
const lotBulkCreate = vi.fn();
vi.mock("@/services/lotService", () => ({
  lotService: {
    list: vi.fn().mockResolvedValue({ items: [] }),
    bulkCreate: (...a) => lotBulkCreate(...a),
    update: vi.fn(),
  },
}));
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

function Probe() {
  const { saveFrac, toast } = useAppContext();
  const sections = [{ id: "s1", name: "Manzana A", lots: [{ id: "l1", code: "A-01", status: "available" }] }];
  return (
    <div>
      <button onClick={() => saveFrac({ name: "Residencial Test", sections, mapUrl: "" })}>crear</button>
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

describe("Crear fraccionamiento: si falla después de crear el inmueble, no debe quedar huérfano", () => {
  beforeEach(() => {
    inmuebleCreate.mockReset();
    inmuebleDelete.mockReset();
    inmuebleUploadMap.mockReset();
    lotBulkCreate.mockReset();
  });

  it("si el tope de lotes del plan rechaza el bulk-create, revierte (archiva) el inmueble recién creado", async () => {
    inmuebleCreate.mockResolvedValue({ id: "frac-1" });
    lotBulkCreate.mockRejectedValue({
      response: { data: { error: { code: "OT-SUB-4001", message: "Alcanzaste el límite de lotes de tu plan" } } },
    });

    renderApp();
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByText("crear"));
    });

    await waitFor(() => expect(inmuebleDelete).toHaveBeenCalledWith("frac-1"));
    // El error real (tope del plan) se le sigue mostrando al usuario — la reversión es
    // silenciosa, no debe reemplazar ese mensaje.
    await waitFor(() => expect(screen.getByTestId("toast").textContent).not.toBe("sin-toast"));
  });

  it("camino feliz: si todo sale bien, NUNCA llama a revertir/archivar", async () => {
    inmuebleCreate.mockResolvedValue({ id: "frac-2" });
    lotBulkCreate.mockResolvedValue({ created: 1, inmueble_id: "frac-2", lot_ids: ["lot-1"] });

    renderApp();
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByText("crear"));
    });

    await waitFor(() => expect(lotBulkCreate).toHaveBeenCalled());
    expect(inmuebleDelete).not.toHaveBeenCalled();
  });

  it("si crear el inmueble mismo falla, no hay nada que crear los lotes ni nada que revertir", async () => {
    inmuebleCreate.mockRejectedValue({
      response: { data: { error: { code: "OT-SUB-4001", message: "Alcanzaste el límite de fraccionamientos de tu plan" } } },
    });

    renderApp();
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByText("crear"));
    });

    await waitFor(() => expect(screen.getByTestId("toast").textContent).not.toBe("sin-toast"));
    expect(lotBulkCreate).not.toHaveBeenCalled();
    expect(inmuebleDelete).not.toHaveBeenCalled();
  });
});
