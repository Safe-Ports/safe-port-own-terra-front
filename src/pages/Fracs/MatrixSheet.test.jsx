import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

  it("la celda resume y el enlace aparece al desplegar", async () => {
    // En lista abierta un lote con diez archivos estiraba su fila: la celda
    // solo cuenta, el detalle se pide.
    documentService.forLots.mockResolvedValue({
      "lot-1": [{ id: "d1", name: "transferencia.pdf", download_url: "https://vault/d1" }],
    });
    pintar();

    const boton = await screen.findByRole("button", { name: /1 archivo/ });
    expect(screen.queryByRole("link", { name: /transferencia\.pdf/ })).not.toBeInTheDocument();

    fireEvent.click(boton);
    const enlace = screen.getByRole("link", { name: /transferencia\.pdf/ });
    expect(enlace).toHaveAttribute("href", "https://vault/d1");
    // Abre el Vault en otra pestaña: la matriz no se pierde.
    expect(enlace).toHaveAttribute("target", "_blank");
  });

  it("con muchos archivos la celda sigue siendo de un renglón", async () => {
    documentService.forLots.mockResolvedValue({
      "lot-1": Array.from({ length: 12 }, (_, i) => ({
        id: `d${i}`, name: `archivo-${i}.pdf`, download_url: `https://vault/d${i}`,
      })),
    });
    pintar();

    const boton = await screen.findByRole("button", { name: /12 archivos/ });
    expect(screen.queryAllByRole("link")).toHaveLength(0);

    fireEvent.click(boton);
    expect(screen.getAllByRole("link")).toHaveLength(12);
  });

  it("se cierra con Escape", async () => {
    documentService.forLots.mockResolvedValue({
      "lot-1": [{ id: "d1", name: "recibo.pdf", download_url: "https://vault/d1" }],
    });
    pintar();

    fireEvent.click(await screen.findByRole("button", { name: /1 archivo/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("se cierra al hacer scroll, porque el panel no sigue a la celda", async () => {
    documentService.forLots.mockResolvedValue({
      "lot-1": [{ id: "d1", name: "recibo.pdf", download_url: "https://vault/d1" }],
    });
    pintar();

    fireEvent.click(await screen.findByRole("button", { name: /1 archivo/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.scroll(window);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
    await screen.findByRole("button", { name: /1 archivo/ });

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

describe("MatrixSheet · paginado", () => {
  beforeEach(() => vi.clearAllMocks());

  const MUCHOS_LOTES = Array.from({ length: 25 }, (_, i) => ({
    id: `lot-${i + 1}`,
    code: `L-${String(i + 1).padStart(3, "0")}`,
    status: "available",
    area_m2: "120",
    price_contado: "500000",
  }));

  function pintarConLotes(lots) {
    documentService.forLots.mockResolvedValue({});
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <MatrixSheet lots={lots} fracId="frac-1" fracName="Las Palmas"
                     loading={false} showError={vi.fn()} />
      </QueryClientProvider>
    );
  }

  it("con 2 lotes no hay control de paginación (entran en una sola página)", async () => {
    pintar();
    await screen.findByText("L-001");
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
  });

  it("con 25 lotes solo pinta los primeros 20 y deja avanzar a la página 2", async () => {
    pintarConLotes(MUCHOS_LOTES);
    await screen.findByText("L-001");

    expect(screen.getAllByRole("row")).toHaveLength(1 + 20); // encabezado + 20 filas
    expect(screen.queryByText("L-021")).not.toBeInTheDocument();
    expect(screen.getByText("Mostrando 1 a 20 de 25")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "›" }));

    expect(await screen.findByText("L-021")).toBeInTheDocument();
    expect(screen.queryByText("L-001")).not.toBeInTheDocument();
    expect(screen.getByText("Mostrando 21 a 25 de 25")).toBeInTheDocument();
  });

  it("al cambiar la lista de lotes vuelve a la página 1", async () => {
    const { rerender } = pintarConLotes(MUCHOS_LOTES);
    await screen.findByText("L-001");
    fireEvent.click(screen.getByRole("button", { name: "›" }));
    await screen.findByText("L-021");

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    rerender(
      <QueryClientProvider client={qc}>
        <MatrixSheet lots={MUCHOS_LOTES.slice(0, 2)} fracId="frac-1" fracName="Las Palmas"
                     loading={false} showError={vi.fn()} />
      </QueryClientProvider>
    );

    expect(await screen.findByText("L-001")).toBeInTheDocument();
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
  });
});
