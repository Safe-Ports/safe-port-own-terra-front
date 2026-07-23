import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import {
  LIVE_API_BASE,
  loginLive,
  getAuthToken,
  skipUnlessLiveCredentials,
  skipUnlessLiveBackend,
} from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_CSV = path.join(__dirname, "fixtures", "lotes.csv");

// Escribe datos reales: crea un fraccionamiento real vía
// POST /inmuebles + POST /lots/import-csv. El nombre lleva un timestamp
// para no chocar entre corridas y quedar identificable; al terminar el
// spec lo archiva (soft-delete, DELETE /inmuebles/:id) con el token real
// de la sesión — no queda sucio el organización de forma permanente.

test.describe("Importar lotes por CSV en vivo", () => {
  let projectName;
  let createdInmuebleId;

  test.beforeEach(async ({ page }) => {
    skipUnlessLiveCredentials();
    await skipUnlessLiveBackend();
    projectName = `E2E Live ${Date.now()}`;
    createdInmuebleId = null;
    await loginLive(page);
  });

  test.afterEach(async ({ request, page }) => {
    if (!createdInmuebleId) return;
    const token = await getAuthToken(page);
    await request.delete(`${LIVE_API_BASE}/inmuebles/${createdInmuebleId}`, {
      headers: { Authorization: `Bearer ${token}` },
      failOnStatusCode: false,
    });
  });

  test("crea un fraccionamiento e importa lotes desde un CSV real", async ({ page }) => {
    await page.goto("/lotes");

    // Tarjeta "Carga Manual": el botón interno es decorativo
    // (pointer-events-none), el click real lo maneja el contenedor.
    await page.getByText("Carga Manual", { exact: true }).click();

    await page.getByPlaceholder("Ej. Residencial Las Palmas").fill(projectName);

    // Sin plano: pasa directo al editor de matriz de lotes.
    await page.getByRole("button", { name: "Continuar" }).click();

    const createInmueble = page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url().includes("/inmuebles") && res.ok()
    );

    // El input oculto ya dispara la importación en su propio onChange al
    // recibir el archivo — no hace falta (ni conviene) también pulsar
    // "Subir": ese botón solo hace excelInputRef.current.click(), que abre
    // un selector de archivo NATIVO del SO. En un navegador controlado por
    // Playwright ese diálogo nunca se puede cerrar y cuelga el proceso
    // entero, incluyendo el fetch que ya estaba en curso. Verificado en vivo.
    await page.locator(".lots-excel-row input[type='file']").setInputFiles(FIXTURE_CSV);

    const inmuebleRes = await createInmueble;
    createdInmuebleId = (await inmuebleRes.json()).id;
    expect(createdInmuebleId, "el backend debió devolver el id del fraccionamiento creado").toBeTruthy();

    await expect(page.getByText(/2 importados/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("E2E-01")).toBeVisible();
    await expect(page.getByText("E2E-02")).toBeVisible();
  });
});
