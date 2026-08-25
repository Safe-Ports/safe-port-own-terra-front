import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { HttpResponse, http } from "msw";
import { server } from "@/test/mocks/server";
import SettingsPage from "./index.jsx";

const API = "http://127.0.0.1:8000/api/v1";

const showToast = vi.fn();
const showError = vi.fn();

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({
    showToast,
    showError,
    currentUser: { id: "admin-1", name: "Admin", role: "admin" },
    canUseFeature: () => true,
  }),
}));

const USERS = [
  { id: "admin-1", name: "Admin", email: "admin@x.com", role: "admin", is_active: true, app_keys: ["lands", "properties"] },
  { id: "u-2", name: "E2E Debug", email: "e2e@x.com", role: "vendor", is_active: true, app_keys: ["lands"] },
  { id: "u-3", name: "Ana Vendedora", email: "ana@x.com", role: "vendor", is_active: true, app_keys: ["lands"] },
  { id: "u-4", name: "Sin Lands", email: "sin@x.com", role: "vendor", is_active: true, app_keys: [] },
];

function baseHandlers() {
  return [
    http.get(`${API}/organization`, () => HttpResponse.json({
      id: "org-1", name: "Org", plan: "profesional", subscription_status: "active",
      stats: { total_users: 3, total_lots: 0, total_clients: 0, total_contracts: 0 },
    })),
    http.get(`${API}/users`, () => HttpResponse.json({ items: USERS, total: USERS.length })),
    http.get(`${API}/billing/subscription`, () => HttpResponse.json({ status: "active" })),
  ];
}

function renderSettings() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

async function openDeleteDialog() {
  renderSettings();
  await waitFor(() => expect(screen.getByText("E2E Debug")).toBeInTheDocument());
  const row = screen.getByText("E2E Debug").closest("tr");
  fireEvent.click(within(row).getByRole("button", { name: "Eliminar E2E Debug" }));
}

describe("Baja de un usuario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.use(...baseHandlers());
  });

  it("da de baja directamente cuando no tiene cartera asignada", async () => {
    let deleted = null;
    server.use(
      http.delete(`${API}/users/:id`, ({ params }) => {
        deleted = params.id;
        return new HttpResponse(null, { status: 204 });
      })
    );

    await openDeleteDialog();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar usuario" }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Usuario eliminado"));
    expect(deleted).toBe("u-2");
  });

  it("ofrece traspasar la cartera cuando el backend rechaza la baja", async () => {
    server.use(
      http.delete(`${API}/users/:id`, () => HttpResponse.json(
        {
          error: {
            code: "OT-USER-3030",
            message: "El usuario tiene datos asignados.",
            details: { clients: 4, contracts: 2, inventory_units: 7 },
          },
        },
        { status: 409 }
      ))
    );

    await openDeleteDialog();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar usuario" }));

    // En vez de un error sin salida, aparece el paso de traspaso con las cifras.
    await waitFor(() => expect(screen.getByText(/Traspasar la cartera/)).toBeInTheDocument());
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(showError).not.toHaveBeenCalled();
  });

  it("traspasa y luego completa la baja", async () => {
    let transferBody = null;
    let deleteCalls = 0;
    server.use(
      http.post(`${API}/users/:id/transfer-data`, async ({ request }) => {
        transferBody = await request.json();
        return HttpResponse.json({ clients: 4, contracts: 2, inventory_units: 7 });
      }),
      http.delete(`${API}/users/:id`, () => {
        deleteCalls += 1;
        // El primer intento choca con la cartera; tras el traspaso, pasa.
        if (deleteCalls === 1) {
          return HttpResponse.json(
            { error: { code: "OT-USER-3030", message: "…", details: { clients: 4, contracts: 2, inventory_units: 7 } } },
            { status: 409 }
          );
        }
        return new HttpResponse(null, { status: 204 });
      })
    );

    await openDeleteDialog();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar usuario" }));
    await waitFor(() => expect(screen.getByText(/Traspasar la cartera/)).toBeInTheDocument());

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "u-3" } });
    fireEvent.click(screen.getByRole("button", { name: "Traspasar y eliminar" }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Usuario eliminado"));
    expect(transferBody).toEqual({ to_user_id: "u-3" });
    expect(deleteCalls).toBe(2);
    expect(showToast).toHaveBeenCalledWith("13 registros transferidos");
  });

  it("no ofrece a quien no tiene acceso a Lands cuando se mueven contratos o lotes", async () => {
    server.use(
      http.delete(`${API}/users/:id`, () => HttpResponse.json(
        { error: { code: "OT-USER-3030", message: "…", details: { clients: 0, contracts: 3, inventory_units: 0 } } },
        { status: 409 }
      ))
    );

    await openDeleteDialog();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar usuario" }));
    await waitFor(() => expect(screen.getByText(/Traspasar la cartera/)).toBeInTheDocument());

    const options = Array.from(screen.getByRole("combobox").options).map((o) => o.value);
    expect(options).not.toContain("u-4");  // vendedor sin acceso a Lands
    expect(options).toContain("u-3");      // vendedora con Lands
    expect(options).toContain("admin-1");  // el admin siempre puede
  });

  it("sí ofrece a quien no tiene Lands si solo se mueven clientes", async () => {
    server.use(
      http.delete(`${API}/users/:id`, () => HttpResponse.json(
        { error: { code: "OT-USER-3030", message: "…", details: { clients: 2, contracts: 0, inventory_units: 0 } } },
        { status: 409 }
      ))
    );

    await openDeleteDialog();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar usuario" }));
    await waitFor(() => expect(screen.getByText(/Traspasar la cartera/)).toBeInTheDocument());

    const options = Array.from(screen.getByRole("combobox").options).map((o) => o.value);
    expect(options).toContain("u-4");
  });

  it("no ofrece como destino al propio usuario que se da de baja", async () => {
    server.use(
      http.delete(`${API}/users/:id`, () => HttpResponse.json(
        { error: { code: "OT-USER-3030", message: "…", details: { clients: 1, contracts: 0, inventory_units: 0 } } },
        { status: 409 }
      ))
    );

    await openDeleteDialog();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar usuario" }));
    await waitFor(() => expect(screen.getByText(/Traspasar la cartera/)).toBeInTheDocument());

    const options = Array.from(screen.getByRole("combobox").options).map((o) => o.value);
    expect(options).not.toContain("u-2");
    expect(options).toContain("u-3");
  });
});
