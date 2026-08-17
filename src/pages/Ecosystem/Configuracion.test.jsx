import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { server } from "@/test/mocks/server";
import EcosystemConfiguracion from "./Configuracion.jsx";

const API = "http://127.0.0.1:8000/api/v1";

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({
    showToast: vi.fn(),
    showError: vi.fn(),
    currentUser: { name: "Test User", organization: { name: "Org de prueba" } },
    logout: vi.fn(),
    notificationCount: 0,
    canAccessApp: () => true,
    canUseFeature: () => true,
  }),
}));

function renderConfig() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/ecosistema/configuracion"]}>
        <EcosystemConfiguracion />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Configuración en el shell del Core", () => {
  it("se renderiza con el sidebar del Core, no con el de Lands", async () => {
    server.use(
      http.get(`${API}/organization`, () => HttpResponse.json({
        id: "org-1",
        name: "Org de prueba",
        plan: "profesional",
        subscription_status: "active",
        stats: { total_users: 3, total_lots: 10, total_clients: 5, total_contracts: 2 },
      })),
      http.get(`${API}/organization/users`, () => HttpResponse.json([])),
      http.get(`${API}/billing/subscription`, () => HttpResponse.json({ status: "active" })),
    );

    renderConfig();

    // La página de configuración se pintó...
    await waitFor(() => expect(screen.getByText("🏢 Organización")).toBeInTheDocument());

    // ...dentro del shell del Core: su nav es el del Ecosistema.
    expect(screen.getByRole("button", { name: /Panel General/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Mi Día/ }).length).toBeGreaterThan(0);

    // Y NO el de Lands (que trae Lotes / Fraccionamientos / Pagos).
    expect(screen.queryByRole("link", { name: /Fraccionamientos/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Configuración del espacio Lands")).not.toBeInTheDocument();
  });
});
