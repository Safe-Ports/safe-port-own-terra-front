import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { server } from "@/test/mocks/server";
import LotTrackPage from "./index.jsx";

const API = "http://127.0.0.1:8000/api/v1";

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({
    fracs: [{ id: "frac-1", name: "Valle Verde" }],
    showToast: vi.fn(),
    showError: vi.fn(),
  }),
}));

const SUMMARY = { available: 3, reserved: 2, sold: 1, total: 6, expiring_soon: 1 };

/** Apartado urgente: María apartó para Juan, vence en 2 días. */
const ROW_RESERVED = {
  id: "lot-1",
  code: "MZ2-L08",
  inmueble_id: "frac-1",
  inmueble_name: "Valle Verde",
  status: "reserved",
  price_contado: "480000.00",
  area_m2: "364.00",
  reserved_by_id: "u-maria",
  reserved_by_name: "María García",
  reserved_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  reserved_until: new Date(Date.now() + 2 * 86400000).toISOString(),
  client_id: "c-juan",
  client_name: "Juan Pérez",
  client_email: "juan.perez@gmail.com",
  client_phone: "+52 55 1234 5678",
  client_type: "lead",
  client_since: "2026-05-02T10:00:00Z",
  closed_by_id: null, closed_by_name: null,
  buyer_id: null, buyer_name: null,
  contract_number: null, contract_date: null, contract_amount: null,
};

/** Vendido con comisión compartida: apartó María, cerró Ana. */
const ROW_SPLIT = {
  ...ROW_RESERVED,
  id: "lot-2",
  code: "MZ4-L02",
  status: "sold",
  price_contado: "612000.00",
  reserved_until: null,
  client_id: "c-hugo",
  client_name: "Hugo Trejo",
  client_email: "hugo@gmail.com",
  client_phone: "+52 81 2233 4455",
  client_type: "buyer",
  closed_by_id: "u-ana",
  closed_by_name: "Ana Ruiz",
  buyer_id: "c-hugo",
  buyer_name: "Hugo Trejo",
  contract_number: "CTR-0141",
};

/** Disponible pero con rastro de un apartado que se cayó (lead tibio). */
const ROW_STALE = {
  ...ROW_RESERVED,
  id: "lot-3",
  code: "MZ2-L12",
  status: "available",
  reserved_until: null,
  client_name: "Patricia Núñez",
  reserved_by_name: "Carlos Mendoza",
};

function mockTrack(items = [ROW_RESERVED, ROW_SPLIT, ROW_STALE], summary = SUMMARY) {
  server.use(
    http.get(`${API}/lots/track`, () => HttpResponse.json({
      summary, items, total: items.length, page: 1, limit: 100, pages: 1,
    })),
  );
}

function renderTrack() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/track-lotes"]}>
        <LotTrackPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Track de lotes", () => {
  it("grafica el inventario por estado con una barra por cada uno", async () => {
    mockTrack();
    const { container } = renderTrack();

    await screen.findByText("MZ2-L08");
    expect(screen.getByText("6 lotes en total")).toBeInTheDocument();

    // Acotado al gráfico: los mismos nombres existen también como filtros.
    const chart = container.querySelector(".lt-chart");
    expect(within(chart).getByText("Disponibles")).toBeInTheDocument();
    expect(within(chart).getByText("Apartados")).toBeInTheDocument();
    expect(within(chart).getByText("Vendidos")).toBeInTheDocument();

    // Una barra por estado, con su conteo.
    const rows = chart.querySelectorAll(".lt-bar-row");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("3")).toBeInTheDocument();
    expect(within(rows[1]).getByText("2")).toBeInTheDocument();
    expect(within(rows[2]).getByText("1")).toBeInTheDocument();
  });

  it("avisa cuántos apartados vencen esta semana", async () => {
    mockTrack();
    renderTrack();
    expect(await screen.findByText(/1 apartado vence esta semana/i)).toBeInTheDocument();
  });

  it("marca como Split cuando quien apartó no es quien cerró", async () => {
    mockTrack();
    renderTrack();

    await screen.findByText("MZ4-L02");
    const splitRow = screen.getByText("MZ4-L02").closest("tr");
    expect(within(splitRow).getByText("Split")).toBeInTheDocument();
    expect(within(splitRow).getByText("María García")).toBeInTheDocument();
    expect(within(splitRow).getByText("Ana Ruiz")).toBeInTheDocument();
  });

  it("no marca Split cuando el mismo vendedor apartó y cerró", async () => {
    mockTrack([{ ...ROW_SPLIT, closed_by_name: "María García" }]);
    renderTrack();

    await screen.findByText("MZ4-L02");
    expect(screen.queryByText("Split")).not.toBeInTheDocument();
  });

  it("distingue un apartado vencido de uno vigente", async () => {
    mockTrack();
    renderTrack();

    await screen.findByText("MZ2-L12");
    const staleRow = screen.getByText("MZ2-L12").closest("tr");
    expect(within(staleRow).getByText("apartado vencido")).toBeInTheDocument();
  });

  it("abre el contacto del cliente desde el ojito, sin abrir el historial", async () => {
    const user = userEvent.setup();
    mockTrack([ROW_RESERVED]);
    renderTrack();

    await screen.findByText("MZ2-L08");
    await user.click(screen.getByLabelText("Ver contacto de Juan Pérez"));

    expect(await screen.findByText("juan.perez@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("+52 55 1234 5678")).toBeInTheDocument();
    // El ojito no debe disparar el panel del lote.
    expect(screen.queryByText("Historial del lote")).not.toBeInTheDocument();
  });

  it("abre el historial al hacer click en la fila", async () => {
    const user = userEvent.setup();
    mockTrack([ROW_RESERVED]);
    server.use(
      http.get(`${API}/lots/lot-1/timeline`, () => HttpResponse.json([
        {
          at: new Date().toISOString(),
          tone: "warn",
          text: "<b>María García</b> apartó el lote para <b>Juan Pérez</b>",
          detail: "Vencía el 29 ago 2026",
          actor_name: "María García",
        },
      ])),
    );
    renderTrack();

    await user.click(await screen.findByText("MZ2-L08"));

    expect(await screen.findByText("Historial del lote")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/apartó el lote para/)).toBeInTheDocument();
    });
    expect(screen.getByText("Vencía el 29 ago 2026")).toBeInTheDocument();
  });

  it("muestra un estado vacío cuando no hay lotes", async () => {
    mockTrack([], { available: 0, reserved: 0, sold: 0, total: 0, expiring_soon: 0 });
    renderTrack();

    expect(await screen.findByText("Sin lotes que mostrar")).toBeInTheDocument();
  });
});
