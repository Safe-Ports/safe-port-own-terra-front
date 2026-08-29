import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MatrixSheet from "./MatrixSheet";

vi.mock("@/services/documentService", () => ({
  documentService: { forLots: vi.fn() },
}));
vi.mock("@/services/lotService", () => ({
  lotService: { matrixExport: vi.fn() },
}));

import { documentService } from "@/services/documentService";

const LOTES = [
  { id: "lot-1", code: "L-001", status: "reserved", area_m2: "120", price_contado: "500000" },
  { id: "lot-2", code: "L-002", status: "available", area_m2: "130", price_contado: "510000" },
];

function pintar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MatrixSheet lots={LOTES} fracId="frac-1" fracName="Las Palmas"
                   loading={false} showError={vi.fn()} />
    </QueryClientProvider>
  );
}

describe("MatrixSheet · files asociados", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra los archivos del lote como enlaces", async () => {
    documentService.forLots.mockResolvedValue({
      "lot-1": [{ id: "d1", name: "transferencia.pdf", download_url: "https://vault/d1" }],
    });
    pintar();

    const enlace = await screen.findByRole("link", { name: /transferencia\.pdf/ });
    expect(enlace).toHaveAttribute("href", "https://vault/d1");
    // Abre el Vault en otra pestaña: la matriz no se pierde.
    expect(enlace).toHaveAttribute("target", "_blank");
  });

  it("pide los documentos de todo el fraccionamiento en una sola llamada", async () => {
    documentService.forLots.mockResolvedValue({});
    pintar();
    await waitFor(() => expect(documentService.forLots).toHaveBeenCalledTimes(1));
    expect(documentService.forLots).toHaveBeenCalledWith("frac-1");
  });

  it("el lote sin archivos no queda en blanco", async () => {
    documentService.forLots.mockResolvedValue({
      "lot-1": [{ id: "d1", name: "recibo.pdf", download_url: "https://vault/d1" }],
    });
    const { container } = pintar();
    await screen.findByRole("link", { name: /recibo\.pdf/ });

    const filaSinArchivos = container.querySelectorAll("tbody tr")[1];
    expect(filaSinArchivos.querySelector(".mx-extra").textContent).toBe("—");
  });

  it("la columna no forma parte de las que se descargan", async () => {
    // El archivo lo genera el backend con los encabezados de la plantilla; si
    // esta columna entrara ahí, el archivo descargado ya no se podría reimportar.
    documentService.forLots.mockResolvedValue({});
    const { container } = pintar();
    await waitFor(() => expect(documentService.forLots).toHaveBeenCalled());

    const encabezados = [...container.querySelectorAll("thead th")].map((th) => th.textContent);
    expect(encabezados).toContain("Files asociados");
    expect(encabezados[encabezados.length - 1]).toBe("Files asociados");
    expect(container.querySelector("thead th.mx-extra").textContent).toBe("Files asociados");
  });

  it("si falla la consulta la matriz se pinta igual", async () => {
    documentService.forLots.mockRejectedValue(new Error("boom"));
    pintar();
    expect(await screen.findByText("L-001")).toBeInTheDocument();
    expect(screen.getByText("L-002")).toBeInTheDocument();
  });
});
