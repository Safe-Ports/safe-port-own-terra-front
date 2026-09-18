import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReleasesTable from "./ReleasesTable";

vi.mock("@/services/contractService", () => ({
  contractService: { releases: vi.fn() },
}));

import { contractService } from "@/services/contractService";

const LIBERACION = {
  kind: "reservation",
  lot_id: "lot-1",
  lot_label: "L-001 · Las Palmas",
  client_name: "Ana",
  date: "2026-08-20",
  collected: "30000",
  refunded: "0",
  retained: "0",
  settled: false,
  files: [{ id: "d1", name: "transferencia.pdf", download_url: "https://vault/d1" }],
};

function pintar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ReleasesTable />
    </QueryClientProvider>
  );
}

describe("ReleasesTable · archivos del apartado", () => {
  beforeEach(() => vi.clearAllMocks());

  it("los comprobantes del apartado se siguen viendo desde la liberación", async () => {
    // Al liberar salen de la ficha del lote, pero no se borran: si hubo
    // devolución o retención son la evidencia de lo que se cobró.
    contractService.releases.mockResolvedValue([LIBERACION]);
    pintar();

    fireEvent.click(await screen.findByRole("button", { name: /1 archivo/ }));
    const enlace = screen.getByRole("link", { name: /transferencia\.pdf/ });
    expect(enlace).toHaveAttribute("href", "https://vault/d1");
  });

  it("una liberación sin archivos lo dice", async () => {
    contractService.releases.mockResolvedValue([{ ...LIBERACION, files: [] }]);
    pintar();
    expect(await screen.findByText("Sin archivos")).toBeInTheDocument();
  });

  it("aguanta que el backend no mande la clave", async () => {
    // Una respuesta vieja en caché no puede tumbar la tabla.
    const { files, ...sinClave } = LIBERACION;
    contractService.releases.mockResolvedValue([sinClave]);
    pintar();
    expect(await screen.findByText("L-001 · Las Palmas")).toBeInTheDocument();
  });
});
