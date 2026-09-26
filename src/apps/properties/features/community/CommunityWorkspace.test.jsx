import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PropertiesDataProvider } from "../../data/PropertiesDataContext";
import CommunityWorkspace from "./CommunityWorkspace";

const mocks = vi.hoisted(() => ({ showToast: vi.fn() }));

vi.mock("@/context/AppContext", () => ({ useAppContext: () => ({ canUseFeature: () => true, showToast: mocks.showToast }) }));
vi.mock("@/pages/Ecosystem/EcoLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("@/services/propertiesService", () => ({ default: { media: { list: async () => [] } } }));

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
