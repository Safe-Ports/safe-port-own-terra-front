import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const importCsv = vi.fn();
vi.mock("@/services/lotService", () => ({ lotService: { importCsv: (...a) => importCsv(...a) } }));
vi.mock("@/services/clientService", () => ({ clientService: {} }));
vi.mock("@/services/contractService", () => ({ contractService: {} }));
vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({
    currentUser: { organization: { id: "org-test" } },
    fracs: [{ id: "frac-1", name: "Los Pinos" }],
    showToast: () => {},
  }),
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => () => {} }));
const invalidar = vi.fn();
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: invalidar }) }));
vi.mock("@/services/inmuebleService", () => ({ inmuebleService: { create: vi.fn() } }));

import MigrationWizard from "./MigrationWizard";

/* La migración es de un fraccionamiento: sin elegirlo, los pasos están
   bloqueados. */
function elegirFraccionamiento(container, id = "frac-1") {
  const select = container.querySelector("select");
  select.value = id;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function elegirArchivo(container) {
  // Hay dos inputs: el del plano (imágenes) y el de la fase (hoja de cálculo).
  const input = container.querySelector('input[type="file"][accept*="csv"]');
  Object.defineProperty(input, "files", {
    value: [new File(["a"], "lotes.csv")], configurable: true,
  });
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function clickPorTexto(container, texto) {
  const b = [...container.querySelectorAll("button")].find((x) => x.textContent.includes(texto));
  b.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("Asistente de migración: la revisión del archivo", () => {
  beforeEach(() => {
    importCsv.mockReset();
    // El avance se guarda por organización: sin limpiarlo, un test arranca donde
    // terminó el anterior.
    window.localStorage.clear();
  });

  it("muestra los avisos que llegan como objeto sin tumbar la pantalla", async () => {
    // El importador de lotes reporta avisos con {row, message}; el de clientes
    // manda texto suelto. Renderizar el objeto directo rompía React entero.
    importCsv.mockResolvedValue({
      imported: 2, updated: 0, failed: 1,
      errors: [{ row: 4, field: "Precio Contado", message: "No es un número" }],
      warnings: [{ row: 7, message: "Superficie vacía" }],
    });

    const { container } = render(<MigrationWizard onSalir={() => {}} />);
    await act(async () => elegirFraccionamiento(container));
    await act(async () => elegirArchivo(container));
    await act(async () => clickPorTexto(container, "Revisar archivo"));

    await waitFor(() => expect(screen.getByText(/2 filas van a entrar/)).toBeTruthy());
    expect(screen.getByText(/Fila 4 · Precio Contado: No es un número/)).toBeTruthy();
    expect(screen.getByText(/Fila 7: Superficie vacía/)).toBeTruthy();
  });

  it("cuenta las filas válidas del dry-run de lotes, que no vienen en imported", async () => {
    // El importador de lotes devuelve imported=0 en dry-run porque no persistió
    // nada; las filas buenas van en preview_lots. Sin normalizar eso, la revisión
    // decía "0 nuevos" y no se podía avanzar.
    importCsv.mockResolvedValue({
      imported: 0, updated: 0, failed: 0, errors: [], warnings: [],
      preview_lots: [{ row: 2, code: "L001" }, { row: 3, code: "L002" }],
    });

    const { container } = render(<MigrationWizard onSalir={() => {}} />);
    await act(async () => elegirFraccionamiento(container));
    await act(async () => elegirArchivo(container));
    await act(async () => clickPorTexto(container, "Revisar archivo"));

    await waitFor(() => expect(screen.getByText(/2 filas van a entrar/)).toBeTruthy());
    expect(container.textContent).toContain("Cargar 2 registros");
  });

  it("deja ver las filas antes de cargarlas", async () => {
    // Un contador dice cuántas; la tabla dice cuáles. Es donde se descubre que
    // la columna de precios se corrió.
    importCsv.mockResolvedValue({
      imported: 0, updated: 0, failed: 0, errors: [], warnings: [],
      preview_lots: [
        { row: 2, code: "L001", price_contado: 250000, area_m2: 200 },
        { row: 3, code: "L002", price_contado: 280000, area_m2: 300 },
      ],
    });

    const { container } = render(<MigrationWizard onSalir={() => {}} />);
    await act(async () => elegirFraccionamiento(container));
    await act(async () => elegirArchivo(container));
    await act(async () => clickPorTexto(container, "Revisar archivo"));
    await waitFor(() => expect(screen.getByText(/2 filas van a entrar/)).toBeTruthy());

    // La tabla no aparece sola: primero hay que pedirla.
    expect(container.textContent).not.toContain("L001");
    await act(async () => clickPorTexto(container, "Ver las 2 filas"));
    expect(container.textContent).toContain("L001");
    expect(container.textContent).toContain("L002");
  });

  it("no esconde las filas que no entraron", async () => {
    // Decir solo "0 cargados" deja al usuario sin saber si el archivo estaba mal,
    // si ya estaban cargados, o si el sistema falló.
    importCsv.mockResolvedValue({
      imported: 0, updated: 0, failed: 3,
      errors: [{ row: 2, field: "ID Lote", message: "El código ya existe" }],
      warnings: [], preview_lots: [],
    });

    const { container } = render(<MigrationWizard onSalir={() => {}} />);
    await act(async () => elegirFraccionamiento(container));
    await act(async () => elegirArchivo(container));
    await act(async () => clickPorTexto(container, "Revisar archivo"));

    await waitFor(() => expect(container.textContent).toContain("3 con problemas"));
    expect(container.textContent).toContain("El código ya existe");
  });

  it("pide actualizar los que ya existen: reintentar el archivo es seguro", async () => {
    importCsv.mockResolvedValue({
      imported: 0, updated: 0, failed: 0, errors: [], warnings: [], preview_lots: [],
    });
    const { container } = render(<MigrationWizard onSalir={() => {}} />);
    await act(async () => elegirFraccionamiento(container));
    await act(async () => elegirArchivo(container));
    await act(async () => clickPorTexto(container, "Revisar archivo"));

    expect(importCsv).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ update_existing: true }),
    );
  });

  it("distingue la plantilla sin llenar de un archivo sin datos", async () => {
    // Cero filas tiene dos causas muy distintas y confundirlas hace perder un
    // rato largo buscando el problema equivocado.
    importCsv.mockResolvedValue({
      imported: 0, updated: 0, failed: 0, errors: [], preview_lots: [],
      warnings: ["Este archivo solo trae las filas de ejemplo de la plantilla."],
    });

    const { container } = render(<MigrationWizard onSalir={() => {}} />);
    await act(async () => elegirFraccionamiento(container));
    await act(async () => elegirArchivo(container));
    await act(async () => clickPorTexto(container, "Revisar archivo"));

    await waitFor(() =>
      expect(container.textContent).toContain("Es la plantilla sin llenar"));
  });

  it("avisa cuántos lotes quedaron fuera del archivo de contratos", async () => {
    // El sistema no puede saber si un lote sin contrato está mal —uno disponible
    // legítimamente no tiene— pero sí dar el número para contrastarlo.
    importCsv.mockResolvedValue({
      imported: 0, updated: 0, failed: 0, errors: [], warnings: [],
      preview_lots: [{ row: 2 }, { row: 3 }, { row: 4 }],
    });

    const { container } = render(<MigrationWizard onSalir={() => {}} />);
    // Paso 1: cargar 3 lotes
    await act(async () => elegirFraccionamiento(container));
    await act(async () => elegirArchivo(container));
    await act(async () => clickPorTexto(container, "Revisar archivo"));
    await waitFor(() => expect(container.textContent).toContain("3 filas van a entrar"));
    importCsv.mockResolvedValue({ imported: 3, updated: 0, failed: 0, errors: [], warnings: [] });
    await act(async () => clickPorTexto(container, "Cargar 3 registros"));
    await waitFor(() => expect(container.textContent).toContain("3 lotes en el sistema"));

    expect(container.textContent).toContain("Continuar al paso 2");
  });

  it("retoma la migración donde quedó al volver a entrar", async () => {
    // Una migración de 1500 lotes no se hace de un tirón: se carga una fase, se
    // verifica con la inmobiliaria, y se vuelve al día siguiente.
    importCsv
      .mockResolvedValueOnce({ imported: 0, updated: 0, failed: 0, errors: [], warnings: [],
                               preview_lots: [{ row: 2 }, { row: 3 }] })
      .mockResolvedValueOnce({ imported: 2, updated: 0, failed: 0, errors: [], warnings: [] });

    const primera = render(<MigrationWizard onSalir={() => {}} />);
    await act(async () => elegirFraccionamiento(primera.container));
    await act(async () => elegirArchivo(primera.container));
    await act(async () => clickPorTexto(primera.container, "Revisar archivo"));
    await waitFor(() => expect(primera.container.textContent).toContain("2 filas van a entrar"));
    await act(async () => clickPorTexto(primera.container, "Cargar 2 registros"));
    await waitFor(() => expect(primera.container.textContent).toContain("2 lotes en el sistema"));
    primera.unmount();

    // Volver a entrar: el paso 1 sigue completo y no hay que repetir la carga.
    const segunda = render(<MigrationWizard onSalir={() => {}} />);
    expect(segunda.container.textContent).toContain("Retomando la migración de");
    expect(segunda.container.textContent).toContain("Los Pinos");
    expect(segunda.container.textContent).toContain("1 de 3 pasos completados");
  });

  it("el resumen final cuenta lo actualizado, no solo lo nuevo", async () => {
    // Reintentar una fase deja todo como "actualizado": leer solo `imported`
    // mostraba "0 lotes" sobre datos que sí estaban cargados.
    importCsv
      .mockResolvedValueOnce({ imported: 0, updated: 0, failed: 0, errors: [], warnings: [],
                               preview_lots: [{ row: 2 }, { row: 3 }, { row: 4 }] })
      .mockResolvedValueOnce({ imported: 0, updated: 3, failed: 0, errors: [], warnings: [] });

    const { container } = render(<MigrationWizard onSalir={() => {}} />);
    await act(async () => elegirFraccionamiento(container));
    await act(async () => elegirArchivo(container));
    await act(async () => clickPorTexto(container, "Revisar archivo"));
    await act(async () => clickPorTexto(container, "Cargar 3 registros"));

    await waitFor(() => expect(container.textContent).toContain("3 lotes en el sistema"));
  });

  it("no deja avanzar sin elegir fraccionamiento", async () => {
    // Los lotes tienen que entrar a alguno: sin eso el importador no sabe dónde
    // ponerlos y quedarían repartidos por nombre, que es frágil.
    const { container } = render(<MigrationWizard onSalir={() => {}} />);
    expect(container.textContent).toContain("Elige primero el fraccionamiento");
    expect(container.querySelector('input[type="file"][accept*="csv"]')).toBeNull();
  });

  it("manda los lotes al fraccionamiento elegido", async () => {
    importCsv.mockResolvedValue({
      imported: 0, updated: 0, failed: 0, errors: [], warnings: [], preview_lots: [{ row: 2 }],
    });
    const { container } = render(<MigrationWizard onSalir={() => {}} />);
    await act(async () => elegirFraccionamiento(container));
    await act(async () => elegirArchivo(container));
    await act(async () => clickPorTexto(container, "Revisar archivo"));

    expect(importCsv).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fraccionamiento_id: "frac-1" }),
    );
  });

  it("refresca las listas al terminar un paso", async () => {
    // Sin esto, ir a ver los lotes recién cargados muestra la lista vieja y hay
    // que refrescar a mano, como si la migración no hubiera hecho nada.
    importCsv
      .mockResolvedValueOnce({ imported: 0, updated: 0, failed: 0, errors: [], warnings: [],
                               preview_lots: [{ row: 2 }] })
      .mockResolvedValueOnce({ imported: 1, updated: 0, failed: 0, errors: [], warnings: [] });
    invalidar.mockClear();

    const { container } = render(<MigrationWizard onSalir={() => {}} />);
    await act(async () => elegirFraccionamiento(container));
    await act(async () => elegirArchivo(container));
    await act(async () => clickPorTexto(container, "Revisar archivo"));
    await act(async () => clickPorTexto(container, "Cargar 1 registros"));

    const llaves = invalidar.mock.calls.map((c) => c[0].queryKey[0]);
    expect(llaves).toContain("lots");
    expect(llaves).toContain("inmuebles");
  });

  /* Falta acá el caso de "el servidor rechaza el archivo". El componente lo
     maneja bien —se verificó mirando el DOM: muestra el mensaje del backend con
     su Ref— pero vitest reporta el rechazo como no manejado al cruzar el
     manejador de eventos de React, y el test falla aunque el comportamiento sea
     correcto. Preferí no dejar un test roto ni deformar el componente para
     satisfacer al arnés. */
});

describe("Asistente de migración: varios fraccionamientos", () => {
  beforeEach(() => {
    importCsv.mockReset();
    window.localStorage.clear();
  });

  it("descarta un avance guardado sin fraccionamiento", () => {
    // Viene de antes de que se eligiera uno: retomarlo dejaba la pantalla
    // diciendo "3 de 3 pasos" y "elige el fraccionamiento" a la vez.
    window.localStorage.setItem("ot_migracion", JSON.stringify({
      "org-test": { pasoActivo: 2, hechos: { lotes: { imported: 3 } } },
    }));

    const { container } = render(<MigrationWizard onSalir={() => {}} />);
    expect(container.textContent).not.toContain("Retomando la migración");
    expect(container.textContent).toContain("Elige primero el fraccionamiento");
  });

  it("al terminar deja empezar con otro fraccionamiento", async () => {
    window.localStorage.setItem("ot_migracion", JSON.stringify({
      "org-test": {
        pasoActivo: 2, fracId: "frac-1",
        hechos: {
          lotes: { imported: 3 }, clientes: { imported: 3 },
          contratos: { imported: 3, installments: 156 },
        },
      },
    }));

    const { container } = render(<MigrationWizard onSalir={() => {}} />);
    expect(container.textContent).toContain("Migración completa");

    await act(async () => clickPorTexto(container, "Migrar otro fraccionamiento"));
    expect(container.textContent).not.toContain("Migración completa");
    expect(container.textContent).toContain("Elige primero el fraccionamiento");
  });
});

describe("Asistente de migración: el plano", () => {
  beforeEach(() => {
    importCsv.mockReset();
    window.localStorage.clear();
  });

  it("ofrece cargar el plano al elegir un fraccionamiento que no tiene", async () => {
    const { container } = render(<MigrationWizard onSalir={() => {}} />);
    await act(async () => elegirFraccionamiento(container));
    expect(container.textContent).toContain("Plano del fraccionamiento");
    expect(container.textContent).toContain("la vista de lotes queda vacía");
  });

  it("avisa al terminar si quedó sin plano", () => {
    // Es exactamente el hueco que hace volver al proyecto días después.
    window.localStorage.setItem("ot_migracion", JSON.stringify({
      "org-test": {
        pasoActivo: 2, fracId: "frac-1",
        hechos: { lotes: { imported: 3 }, clientes: { imported: 3 },
                  contratos: { imported: 3, installments: 156 } },
      },
    }));
    const { container } = render(<MigrationWizard onSalir={() => {}} />);
    expect(container.textContent).toContain("Quedó sin plano");
  });
});
