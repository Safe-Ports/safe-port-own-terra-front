import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ServiceNetworkPage from "./ServiceNetworkPage";

const mocks = vi.hoisted(() => ({
  canManage: true,
  showToast: vi.fn(),
  suspendServiceProvider: vi.fn().mockResolvedValue({}),
  archiveServiceProvider: vi.fn().mockResolvedValue({}),
  approveServiceApplication: vi.fn().mockResolvedValue({}),
  rejectServiceApplication: vi.fn().mockResolvedValue({}),
  getServiceProviderContacts: vi.fn().mockResolvedValue([]),
  coreList: vi.fn().mockResolvedValue({ items: [{ id: "core-77", name: "Plomería Díaz", categoria: "Plomería" }] }),
}));

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({ canUseFeature: () => mocks.canManage, showToast: mocks.showToast }),
}));
vi.mock("@/pages/Ecosystem/EcoLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("@/services/providerService", () => ({ providerService: { list: (...a) => mocks.coreList(...a) } }));

const provider = {
  id: "prof-1", name: "Plomería Díaz", kind: "company", status: "active",
  categoria: "Plomería", phone: "55 1234 5678", declared_availability: "Tiempo completo",
  specialty_ids: ["spec-1"],
};
const application = {
  id: "app-1", folio: "SOL-0001", name: "Electricidad del Valle", kind: "company",
  email_normalized: "contacto@edv.mx", phone: "55 9000 1122", coverage: "Zona poniente",
};

vi.mock("../../data/PropertiesDataContext", () => ({
  usePropertiesData: () => ({
    serviceProviders: [provider],
    serviceSpecialties: [{ id: "spec-1", label: "Plomería" }],
    serviceApplications: [application],
    serviceEnrollmentLinks: [],
    serviceNetworkLoading: false,
    serviceNetworkError: null,
    enableServiceProvider: vi.fn(),
    suspendServiceProvider: mocks.suspendServiceProvider,
    reactivateServiceProvider: vi.fn(),
    archiveServiceProvider: mocks.archiveServiceProvider,
    getServiceProviderContacts: mocks.getServiceProviderContacts,
    addServiceProviderContact: vi.fn(),
    inviteServiceContact: vi.fn(),
    revokeServiceContactInvite: vi.fn(),
    createServiceEnrollmentLink: vi.fn(),
    approveServiceApplication: mocks.approveServiceApplication,
    rejectServiceApplication: mocks.rejectServiceApplication,
  }),
}));

const renderPage = () => render(<MemoryRouter><ServiceNetworkPage /></MemoryRouter>);

describe("ServiceNetworkPage", () => {
  beforeEach(() => {
    mocks.canManage = true;
    Object.values(mocks).forEach((value) => typeof value?.mockClear === "function" && value.mockClear());
    mocks.coreList.mockResolvedValue({ items: [{ id: "core-77", name: "Plomería Díaz", categoria: "Plomería" }] });
  });

  it("no usa los diálogos del navegador para pedir datos", () => {
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("x");
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Suspender" }));
    expect(prompt).not.toHaveBeenCalled();
    prompt.mockRestore();
  });

  it("exige un motivo escrito antes de suspender", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Suspender" }));

    const dialog = await screen.findByRole("dialog", { name: "¿Suspender a Plomería Díaz?" });
    const confirm = within(dialog).getByRole("button", { name: "Suspender" });
    expect(confirm).toBeDisabled();
    expect(mocks.suspendServiceProvider).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByPlaceholderText("Explica brevemente por qué."), { target: { value: "Incumplió el SLA" } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => expect(mocks.suspendServiceProvider).toHaveBeenCalledWith("prof-1", "Incumplió el SLA"));
    expect(mocks.showToast).toHaveBeenCalledWith("Proveedor suspendido", "success");
  });

  it("no acepta un motivo en blanco", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Archivar" }));
    const dialog = await screen.findByRole("dialog", { name: "¿Archivar a Plomería Díaz?" });
    fireEvent.change(within(dialog).getByPlaceholderText("Explica brevemente por qué."), { target: { value: "   " } });
    expect(within(dialog).getByRole("button", { name: "Archivar" })).toBeDisabled();
    expect(mocks.archiveServiceProvider).not.toHaveBeenCalled();
  });

  it("aprueba eligiendo el proveedor de Core, sin pedir un UUID", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Revisar solicitudes" }));
    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));

    const dialog = await screen.findByRole("dialog", { name: "Aprobar solicitud" });
    const confirm = within(dialog).getByRole("button", { name: "Aprobar y vincular" });
    expect(confirm).toBeDisabled();

    fireEvent.click(await within(dialog).findByRole("button", { name: /Plomería Díaz/ }));
    await waitFor(() => expect(confirm).toBeEnabled());
    fireEvent.click(confirm);

    await waitFor(() => expect(mocks.approveServiceApplication).toHaveBeenCalledWith(
      "app-1", { existing_core_provider_id: "core-77" },
    ));
  });

  it("avisa cuando ningún proveedor de Core coincide", async () => {
    mocks.coreList.mockResolvedValue({ items: [] });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Revisar solicitudes" }));
    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));

    const dialog = await screen.findByRole("dialog", { name: "Aprobar solicitud" });
    expect(await within(dialog).findByText("Ningún proveedor de Core coincide con esa búsqueda.")).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Aprobar y vincular" })).toBeDisabled();
  });

  it("rechaza una solicitud con su motivo", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Revisar solicitudes" }));
    fireEvent.click(await screen.findByRole("button", { name: "Rechazar" }));

    const dialog = await screen.findByRole("dialog", { name: "¿Rechazar la solicitud de Electricidad del Valle?" });
    fireEvent.change(within(dialog).getByPlaceholderText("Explica brevemente por qué."), { target: { value: "Sin cobertura" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Rechazar solicitud" }));

    await waitFor(() => expect(mocks.rejectServiceApplication).toHaveBeenCalledWith("app-1", "Sin cobertura"));
  });

  it("oculta las acciones de gestión a quien no tiene permiso", () => {
    mocks.canManage = false;
    renderPage();
    expect(screen.queryByRole("button", { name: "Suspender" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Habilitar proveedor" })).not.toBeInTheDocument();
    expect(within(screen.getByText("Plomería Díaz", { selector: "h2" }).closest("article")).queryByRole("button", { name: "Agregar contacto" })).not.toBeInTheDocument();
  });
});
