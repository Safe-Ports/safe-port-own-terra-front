import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { server } from "@/test/mocks/server";
import AgendaPage from "./Agenda.jsx";
import { LocaleProvider } from "@/i18n";

const API = "http://127.0.0.1:8000/api/v1";

const showToast = vi.fn();
const showError = vi.fn();
const clearCalendarAlerts = vi.fn();

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({
    showToast,
    showError,
    clearCalendarAlerts,
    clients: [],
    currentUser: { name: "Test User" },
    logout: vi.fn(),
    notificationCount: 0,
    canAccessApp: () => true,
    canUseFeature: () => true,
  }),
}));

// Ancla "hoy" a un martes fijo (misma semana que agendaShared.test.jsx) para
// que el rango visible y las citas de la fixture sean deterministas.
const TODAY = new Date(2026, 6, 14, 9, 0, 0);

function apptFixture(overrides = {}) {
  return {
    id: "appt-1",
    scheduled_at: new Date(2026, 6, 14, 10, 0, 0).toISOString(),
    title: "Visita con Ana",
    contact_name: "Ana",
    app_key: "core",
    appt_type: "visita",
    status: "pending",
    ...overrides,
  };
}

function renderAgenda() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LocaleProvider>
          <AgendaPage />
        </LocaleProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("AgendaPage", () => {
  beforeEach(() => {
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("carga las citas de la semana visible y refleja los KPIs", async () => {
    server.use(
      http.get(`${API}/appointments`, () => HttpResponse.json([apptFixture()]))
    );
    renderAgenda();

    await waitFor(() => expect(screen.getAllByText("Visita con Ana").length).toBeGreaterThan(0));
    const totalKpi = screen.getByText("Total").closest(".ag-kpi");
    expect(within(totalKpi).getByText("1")).toBeInTheDocument();
    const pendingKpi = screen.getByText("Pendientes").closest(".ag-kpi");
    expect(within(pendingKpi).getByText("1")).toBeInTheDocument();
  });

  it("cambia entre las vistas Día, Semana y Mes", async () => {
    server.use(http.get(`${API}/appointments`, () => HttpResponse.json([])));
    renderAgenda();
    await waitFor(() => expect(screen.getByText("Sin eventos para este día")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Día" }));
    expect(document.querySelector(".ag-timegrid-day")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mes" }));
    expect(document.querySelector(".ag-calendar-grid")).toBeInTheDocument();
  });

  it("crea un evento completo desde el modal 'Nuevo evento'", async () => {
    server.use(http.get(`${API}/appointments`, () => HttpResponse.json([])));
    let createdBody = null;
    server.use(
      http.post(`${API}/appointments`, async ({ request }) => {
        createdBody = await request.json();
        return HttpResponse.json({ id: "appt-new", status: "pending", ...createdBody }, { status: 201 });
      })
    );
    renderAgenda();
    await waitFor(() => expect(screen.getByText("Sin eventos para este día")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Nuevo evento" }));
    fireEvent.change(screen.getByPlaceholderText("Ej: Junta con equipo, Recordatorio pago..."), {
      target: { value: "Junta de seguimiento" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar evento" }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Evento guardado"));
    expect(createdBody).toMatchObject({ title: "Junta de seguimiento", appt_type: "evento", app_key: "core" });
    expect(screen.queryByText("Nuevo evento", { selector: "h3" })).not.toBeInTheDocument();
  });

  it("abre el popover de creación rápida al hacer clic en una celda vacía de la rejilla", async () => {
    server.use(http.get(`${API}/appointments`, () => HttpResponse.json([])));
    renderAgenda();
    await waitFor(() => expect(screen.getByText("Sin eventos para este día")).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole("button", { name: "Crear evento 10:30" })[0]);
    expect(screen.getByPlaceholderText("Añadir título")).toBeInTheDocument();
  });

  it("edita un evento existente al hacer clic en su bloque en la rejilla", async () => {
    server.use(http.get(`${API}/appointments`, () => HttpResponse.json([apptFixture()])));
    let patchedBody = null;
    server.use(
      http.patch(`${API}/appointments/:id`, async ({ request, params }) => {
        patchedBody = await request.json();
        return HttpResponse.json({ id: params.id, ...patchedBody });
      })
    );
    renderAgenda();
    await waitFor(() => expect(screen.getAllByText("Visita con Ana").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: /10:00.*Visita con Ana/i }));
    const titleInput = await screen.findByDisplayValue("Visita con Ana");
    fireEvent.change(titleInput, { target: { value: "Visita reagendada" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Evento actualizado"));
    expect(patchedBody).toMatchObject({ title: "Visita reagendada" });
  });

  it("elimina un evento desde la lista lateral del día", async () => {
    server.use(http.get(`${API}/appointments`, () => HttpResponse.json([apptFixture()])));
    let deletedId = null;
    server.use(
      http.delete(`${API}/appointments/:id`, ({ params }) => {
        deletedId = params.id;
        return new HttpResponse(null, { status: 204 });
      })
    );
    renderAgenda();
    await waitFor(() => expect(screen.getAllByText("Visita con Ana").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Evento eliminado"));
    expect(deletedId).toBe("appt-1");
  });
});
