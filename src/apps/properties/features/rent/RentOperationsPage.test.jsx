import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PropertiesDataProvider } from "../../data/PropertiesDataContext";
import RentOperationsPage from "./RentOperationsPage";

const mocks = vi.hoisted(() => ({
  canWrite: true,
  showToast: vi.fn(),
}));

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({
    canUseFeature: (permission) => permission.endsWith(".read") || mocks.canWrite,
    showToast: mocks.showToast,
  }),
}));

vi.mock("@/pages/Ecosystem/EcoLayout", () => ({
  default: ({ children }) => <div className="eco-root">{children}</div>,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <PropertiesDataProvider>
        <RentOperationsPage />
      </PropertiesDataProvider>
    </MemoryRouter>,
  );
}

describe("RentOperationsPage", () => {
  beforeEach(() => {
    mocks.canWrite = true;
    mocks.showToast.mockClear();
  });

  it("muestra el alcance honesto y las seis áreas operativas", () => {
    renderPage();

    expect(screen.getByText("Frontend funcional de sesión.")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Secciones de rentas" })).toBeInTheDocument();
    for (const tab of ["Resumen", "Prospectos", "Inquilinos", "Contratos", "Cobranza", "Inspecciones"]) {
      expect(screen.getByRole("button", { name: tab })).toBeInTheDocument();
    }
  });

  it("crea un prospecto y lo incorpora a la lista de la sesión", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Prospectos" }));
    fireEvent.click(screen.getByRole("button", { name: /^Prospecto$/ }));

    const dialog = screen.getByRole("dialog", { name: "Nuevo prospecto" });
    fireEvent.change(within(dialog).getByLabelText("Nombre *"), { target: { value: "Ana Torres" } });
    fireEvent.change(within(dialog).getByLabelText("Unidad de interés *"), { target: { value: "unit-j401" } });
    fireEvent.change(within(dialog).getByLabelText("Teléfono"), { target: { value: "55 1234 5678" } });
    fireEvent.change(within(dialog).getByLabelText("Presupuesto mensual *"), { target: { value: "23000" } });
    fireEvent.change(within(dialog).getByLabelText("Fecha deseada *"), { target: { value: "2026-10-15" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));

    expect(screen.getByText("Ana Torres")).toBeInTheDocument();
    expect(mocks.showToast).toHaveBeenCalledWith("Prospecto agregado a la sesión", "success");
  });

  it("bloquea las acciones de escritura para un viewer", () => {
    mocks.canWrite = false;
    renderPage();

    expect(screen.getByText(/Estás en modo de consulta/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Prospectos" }));
    expect(screen.queryByRole("button", { name: /^Prospecto$/ })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Visita|Expediente|Nuevo/).length).toBeGreaterThan(0);
  });
});
