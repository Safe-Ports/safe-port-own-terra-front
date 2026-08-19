import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import LotsPage from "./index.jsx";

// Bug real reportado: al elegir el archivo de plantilla (antes de darle clic a "Crear
// fraccionamiento"), la app creaba el inmueble de inmediato — el usuario nunca decidió
// crear nada, la app lo hizo sola. Estas pruebas cubren el fix: elegir el archivo solo
// PREVISUALIZA (dry_run), nada se crea hasta el clic real en "Crear fraccionamiento".
// También cubren el segundo bug: un archivo con datos inválidos no decía en qué fila ni
// columna estaba el problema.

const mockSetDraftProject = vi.fn();
const mockShowToast = vi.fn();
const mockShowError = vi.fn();
let mockDraftProject;

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({
    draftProject: mockDraftProject,
    setDraftProject: mockSetDraftProject,
    saveFrac: vi.fn(),
    saveEditedFrac: vi.fn(),
    deleteFrac: vi.fn(),
    setSelectedFracId: vi.fn(),
    showToast: mockShowToast,
    showError: mockShowError,
  }),
}));

vi.mock("@/hooks/queries/useAppQueries", () => ({
  useProjectsQuery: () => ({ data: [] }),
}));

const importCsv = vi.fn();
const lotList = vi.fn();
vi.mock("@/services/lotService", () => ({
  lotService: {
    list: (...a) => lotList(...a),
    importCsv: (...a) => importCsv(...a),
    bulkCreate: vi.fn(),
    delete: vi.fn(),
  },
}));

const inmuebleCreate = vi.fn();
vi.mock("@/services/inmuebleService", () => ({
  inmuebleService: {
    create: (...a) => inmuebleCreate(...a),
    update: vi.fn(),
    uploadMap: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <LotsPage />
    </MemoryRouter>
  );
}

function excelInput(container) {
  return container.querySelector('input[type="file"][accept=".xlsx,.xls,.csv,.txt"]');
}

function selectFile(input, file) {
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("Carga de lotes desde Excel/CSV: no crea nada hasta que el usuario le dé Crear", () => {
  beforeEach(() => {
    mockSetDraftProject.mockClear();
    mockShowToast.mockClear();
    mockShowError.mockClear();
    importCsv.mockReset();
    lotList.mockReset();
    inmuebleCreate.mockReset();
    mockDraftProject = {
      mode: "editor",
      name: "Residencial Test",
      mapUrl: "",
      sections: [],
      cadProcessing: false,
      _editingFracId: null,
    };
  });

  it("al elegir el archivo NO crea el fraccionamiento ni llama a bulkCreate: solo previsualiza (dry_run)", async () => {
    importCsv.mockResolvedValue({
      imported: 0, updated: 0, failed: 0,
      errors: [], warnings: [],
      preview_lots: [{ row: 2, code: "A-01", status: "available", price_contado: 150000, price_financiado: null, frente_ml: null, fondo_ml: null, area_m2: null, services: {} }],
    });

    const { container } = renderPage();
    const input = excelInput(container);
    expect(input).toBeTruthy();

    const file = new File(["contenido"], "lotes.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    await act(async () => selectFile(input, file));

    await waitFor(() => expect(importCsv).toHaveBeenCalled());
    expect(importCsv).toHaveBeenCalledWith(file, { dry_run: true });
    // Lo que reportó el usuario: esto NO debe pasar hasta que le dé clic a "Crear".
    expect(inmuebleCreate).not.toHaveBeenCalled();
  });

  it("las filas válidas quedan en el tablero (staged) via setDraftProject, no persistidas", async () => {
    importCsv.mockResolvedValue({
      imported: 0, updated: 0, failed: 0,
      errors: [], warnings: [],
      preview_lots: [
        { row: 2, code: "A-01", status: "available", price_contado: 150000, price_financiado: null, frente_ml: 10, fondo_ml: 20, area_m2: 200, services: { agua: 1 } },
      ],
    });

    const { container } = renderPage();
    const file = new File(["contenido"], "lotes.xlsx");
    await act(async () => selectFile(excelInput(container), file));

    await waitFor(() => expect(mockSetDraftProject).toHaveBeenCalled());
    // El efecto de montaje llama setDraftProject con un objeto plano; el staging del
    // import llama con una función updater — es esa la que nos interesa.
    const updaterCall = mockSetDraftProject.mock.calls.find(([arg]) => typeof arg === "function");
    expect(updaterCall).toBeTruthy();
    const next = updaterCall[0](mockDraftProject);
    expect(next.sections).toHaveLength(1);
    expect(next.sections[0].name).toBe("Importados");
    expect(next.sections[0].lots[0]).toMatchObject({ code: "A-01", status: "available", price: 150000, frente: 10, fondo: 20, area: 200 });
    // El inmueble sigue sin existir: la sección quedó en el draft, no en el backend.
    expect(inmuebleCreate).not.toHaveBeenCalled();
  });

  it("un archivo con datos inválidos muestra fila y columna exactas, no solo un mensaje genérico", async () => {
    importCsv.mockResolvedValue({
      imported: 0, updated: 0, failed: 1,
      errors: [{ row: 3, field: "price_contado", message: "Valor no numérico en 'price_contado'", raw_value: "abc" }],
      warnings: [],
      preview_lots: [],
    });

    const { container } = renderPage();
    const file = new File(["contenido"], "lotes.csv");
    await act(async () => selectFile(excelInput(container), file));

    await waitFor(() => expect(screen.getByText(/Resultado de la importación/i)).toBeInTheDocument());
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("price_contado")).toBeInTheDocument();
    expect(screen.getByText(/Valor no numérico/)).toBeInTheDocument();
    expect(inmuebleCreate).not.toHaveBeenCalled();
  });

  it("al editar un fraccionamiento YA EXISTENTE, el import sigue siendo inmediato (comportamiento correcto, sin cambios)", async () => {
    mockDraftProject = { ...mockDraftProject, _editingFracId: "frac-123" };
    importCsv.mockResolvedValue({ imported: 1, updated: 0, failed: 0, errors: [], warnings: [] });
    lotList.mockResolvedValue({ items: [{ id: "lot-1", code: "A-01", status: "available" }] });

    const { container } = renderPage();
    const file = new File(["contenido"], "lotes.csv");
    await act(async () => selectFile(excelInput(container), file));

    await waitFor(() => expect(importCsv).toHaveBeenCalledWith(file, { fraccionamiento_id: "frac-123" }));
    expect(lotList).toHaveBeenCalledWith({ inmueble_id: "frac-123", limit: 200 });
  });
});
