import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import LotsPage from "./index.jsx";

// El fraccionamiento se crea explícitamente en un paso anterior ("Guardar y
// continuar" en la pantalla de nombre+plano) — para cuando el usuario llega al
// tablero y usa "Subir", _editingFracId SIEMPRE existe. Importar el Excel/CSV es
// entonces una operación real e inmediata contra ese fraccionamiento ya guardado —
// no hay nada "prematuro" que evitar aquí. Estas pruebas cubren el segundo bug
// reportado por separado: un archivo con errores no decía en qué fila ni columna
// estaba el problema.

const mockSetDraftProject = vi.fn();
const mockShowToast = vi.fn();
const mockShowError = vi.fn();
let mockDraftProject;

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({
    draftProject: mockDraftProject,
    setDraftProject: mockSetDraftProject,
    createFracDraft: vi.fn(),
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

/* Cargar a mano y por archivo son dos caminos separados: hay que entrar al de
   archivo antes de que exista el input. */
function entrarAModoArchivo(container) {
  const boton = [...container.querySelectorAll("button")]
    .find(b => b.textContent.includes("Importar archivo"));
  if (!boton) throw new Error("no se encontró la opción de importar archivo");
  boton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

function selectFile(input, file) {
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("Carga de lotes desde Excel/CSV: import real contra un fraccionamiento ya guardado", () => {
  beforeEach(() => {
    mockSetDraftProject.mockClear();
    mockShowToast.mockClear();
    mockShowError.mockClear();
    importCsv.mockReset();
    lotList.mockReset();
    mockDraftProject = {
      mode: "editor",
      name: "Residencial Test",
      mapUrl: "",
      sections: [],
      cadProcessing: false,
      _editingFracId: "frac-123",
    };
  });

  it("sube el archivo directo al fraccionamiento ya existente (fraccionamiento_id, no dry_run)", async () => {
    importCsv.mockResolvedValue({ imported: 1, updated: 0, failed: 0, errors: [], warnings: [] });
    lotList.mockResolvedValue({ items: [{ id: "lot-1", code: "A-01", status: "available" }] });

    const { container } = renderPage();
    await act(async () => entrarAModoArchivo(container));
    const file = new File(["contenido"], "lotes.csv");
    await act(async () => selectFile(excelInput(container), file));

    await waitFor(() => expect(importCsv).toHaveBeenCalledWith(file, { fraccionamiento_id: "frac-123" }));
    expect(lotList).toHaveBeenCalledWith({ inmueble_id: "frac-123", limit: 200 });
  });

  it("un archivo con datos inválidos muestra fila y columna exactas, no solo un mensaje genérico", async () => {
    importCsv.mockResolvedValue({
      imported: 0, updated: 0, failed: 1,
      errors: [{ row: 3, field: "price_contado", message: "Valor no numérico en 'price_contado'", raw_value: "abc" }],
      warnings: [],
    });

    const { container } = renderPage();
    await act(async () => entrarAModoArchivo(container));
    const file = new File(["contenido"], "lotes.csv");
    await act(async () => selectFile(excelInput(container), file));

    await waitFor(() => expect(screen.getByText(/Resultado de la importación/i)).toBeInTheDocument());
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("price_contado")).toBeInTheDocument();
    expect(screen.getByText(/Valor no numérico/)).toBeInTheDocument();
  });
});
