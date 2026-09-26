import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PropertiesDataProvider } from "../../data/PropertiesDataContext";
import CommunityWorkspace from "./CommunityWorkspace";

const mocks = vi.hoisted(() => ({ showToast: vi.fn(), saveSpecs: vi.fn(async () => ({})) }));

vi.mock("@/context/AppContext", () => ({ useAppContext: () => ({ canUseFeature: () => true, showToast: mocks.showToast }) }));
vi.mock("@/pages/Ecosystem/EcoLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("@/services/propertiesService", () => ({ default: { media: { list: async () => [] }, specs: { get: async () => ({ attributos: { elevador: true }, dimensiones: { niveles: 6 } }), save: mocks.saveSpecs } } }));

function renderUnits() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/properties/comunidades?tab=units&community=community-jacarandas"]}>
        <PropertiesDataProvider><CommunityWorkspace /></PropertiesDataProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CommunityWorkspace · Unidades", () => {
  it("adds a new person to an empty unit in one step", async () => {
    renderUnits();
    fireEvent.click(screen.getByRole("button", { name: /Penthouse 501/ }));
    fireEvent.click(screen.getByRole("button", { name: /Agregar la primera persona/ }));

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Agregar a la unidad" }));
    expect(within(dialog).getByText("Ingresa el nombre de la persona.")).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/Nombre completo/), { target: { value: "Ana Ruiz" } });
    fireEvent.click(within(dialog).getByRole("radio", { name: /Inquilino/ }));
    // Un inquilino no vota por omisión; el administrador lo puede cambiar.
    expect(within(dialog).getByRole("checkbox", { name: /Derecho a voto/ })).not.toBeChecked();
    fireEvent.click(within(dialog).getByRole("button", { name: "Agregar a la unidad" }));

    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith("Ana Ruiz quedó como inquilino de Penthouse 501", "success"));
    expect(screen.getByRole("region", { name: "Personas de Penthouse 501" })).toHaveTextContent("Ana Ruiz");
  });

  it("keeps a single payment responsible per unit", () => {
    renderUnits();
    fireEvent.click(screen.getByRole("button", { name: /Departamento 201/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Agregar persona$/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("checkbox", { name: /Responsable de pago/ })).toBeDisabled();
    expect(within(dialog).getByText(/ya es responsable de pago de esta unidad/)).toBeInTheDocument();
  });
});

describe("CommunityWorkspace · Detalle y edición", () => {
  it("unfolds the selected community and edits it", async () => {
    renderUnits();
    expect(screen.queryByRole("region", { name: /Detalle de/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Configuración/ })).not.toBeInTheDocument();

    const card = screen.getByRole("button", { name: /Comunidad Torre Jacarandas/, pressed: true });
    fireEvent.click(card);
    const detail = screen.getByRole("region", { name: "Detalle de Comunidad Torre Jacarandas" });
    fireEvent.click(within(detail).getByRole("button", { name: /Editar comunidad/ }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Nombre de la comunidad/), { target: { value: "Jacarandas Residencial" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith("Comunidad actualizada", "success"));
    expect(screen.getByRole("region", { name: "Detalle de Jacarandas Residencial" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Jacarandas Residencial/, pressed: true }));
    expect(screen.queryByRole("region", { name: /Detalle de/ })).not.toBeInTheDocument();
  });

  it("edits a unit from its detail", async () => {
    renderUnits();
    fireEvent.click(screen.getByRole("button", { name: /Departamento 201/ }));
    fireEvent.click(screen.getByRole("button", { name: "Editar Departamento 201" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("region", { name: "Fotos de la unidad" })).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Identificador/), { target: { value: "Depto 201-B" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar unidad" }));
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith("Unidad actualizada", "success"));
    expect(screen.getByRole("button", { name: /Depto 201-B/, pressed: true })).toBeInTheDocument();
  });

  it("saves the unit spec sheet and shows it in the unit detail", async () => {
    renderUnits();
    fireEvent.click(screen.getByRole("button", { name: /Departamento 201/ }));
    fireEvent.click(screen.getByRole("button", { name: "Editar Departamento 201" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Estacionamientos/), { target: { value: "2" } });
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Bodega/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar unidad" }));
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith("Unidad actualizada", "success"));
    const sheet = screen.getByRole("group", { name: "Ficha técnica de Departamento 201" });
    expect(sheet).toHaveTextContent("Estacionamientos2");
    expect(sheet).toHaveTextContent("Bodega");
  });
});
