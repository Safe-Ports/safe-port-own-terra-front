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
const FIXTURE_DOC = path.join(__dirname, "fixtures", "documento.txt");

// Recorrido completo en vivo: fraccionamiento+lote (CSV) → cliente →
// contrato sobre ese lote → documento vinculado a ese contrato. Todo real,
// sin mocks. Cada entidad creada se archiva (soft-delete) al terminar.
//
// Precondición externa: una venta ("sale") exige una calculadora de
// financiamiento activa para "lands" (ContractModal.jsx, `noCalculator`
// bloquea el guardado con un toast si no hay una). Este spec NO crea una
// calculadora — si no hay ninguna activa, se salta con un mensaje claro en
// vez de fallar en rojo. Configúrala una vez en /calculadora si quieres que
// esta corrida completa.
test.describe("Lotes → cliente → contrato → documento en vivo", () => {
  let projectName;
  let clientName;
  let createdInmuebleId;
  let createdClientId;
  let createdContractId;
  let createdDocumentId;

  test.beforeEach(async ({ page, request }) => {
    skipUnlessLiveCredentials();
    await skipUnlessLiveBackend();
    const ts = Date.now();
    projectName = `E2E Live ${ts}`;
    clientName = `E2ELive Contrato${ts}`;
    createdInmuebleId = null;
    createdClientId = null;
    createdContractId = null;
    createdDocumentId = null;

    await loginLive(page);

    const token = await getAuthToken(page);
    const calcRes = await request.get(`${LIVE_API_BASE}/calculators/active?app_key=lands`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const activeCalc = calcRes.ok() ? await calcRes.json() : null;
    test.skip(
      !activeCalc,
      "No hay calculadora de financiamiento activa para 'lands' — actívala en /calculadora " +
        "para poder generar un contrato de venta. Ver ContractModal.jsx `noCalculator`."
    );
  });

  test.afterEach(async ({ request, page }) => {
    const token = await getAuthToken(page);
    const auth = { Authorization: `Bearer ${token}` };
    // Orden: hijo antes que padre, aunque todo sea soft-delete/archive.
    if (createdDocumentId) {
      await request.delete(`${LIVE_API_BASE}/documents/${createdDocumentId}`, { headers: auth, failOnStatusCode: false });
    }
    if (createdContractId) {
      await request.delete(`${LIVE_API_BASE}/contracts/${createdContractId}`, { headers: auth, failOnStatusCode: false });
    }
    if (createdClientId) {
      await request.delete(`${LIVE_API_BASE}/clients/${createdClientId}`, { headers: auth, failOnStatusCode: false });
    }
    if (createdInmuebleId) {
      await request.delete(`${LIVE_API_BASE}/inmuebles/${createdInmuebleId}`, { headers: auth, failOnStatusCode: false });
    }
  });

  test("crea lote, cliente, contrato y documento vinculado", async ({ page }) => {
    // ── 1. Fraccionamiento + lote (mismo flujo que lots-import.smoke.spec.js) ──
    await page.goto("/lotes");
    await page.getByText("Carga Manual", { exact: true }).click();
    await page.getByPlaceholder("Ej. Residencial Las Palmas").fill(projectName);
    await page.getByRole("button", { name: "Continuar" }).click();

    const createInmueble = page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url().includes("/inmuebles") && res.ok()
    );
    // Ver lots-import.smoke.spec.js: setInputFiles solo, sin click en "Subir"
    // (ese botón abre un selector de archivo NATIVO que cuelga Playwright).
    await page.locator(".lots-excel-row input[type='file']").setInputFiles(FIXTURE_CSV);

    const inmuebleRes = await createInmueble;
    createdInmuebleId = (await inmuebleRes.json()).id;
    expect(createdInmuebleId, "debió crearse el fraccionamiento").toBeTruthy();
    await expect(page.getByText(/2 importados/i)).toBeVisible({ timeout: 20_000 });

    // ── 2. Cliente ──
    await page.goto("/clientes");
    await page.getByText("+ Vincular", { exact: false }).click();

    const clientModal = page.locator(".modal-box").filter({ hasText: "Vincular o crear cliente" });
    await expect(clientModal).toBeVisible();
    await clientModal.locator(".fg").filter({ hasText: "Nombre" }).locator("input").fill(clientName);
    await clientModal.locator(".fg").filter({ hasText: "Apellidos" }).locator("input").fill("E2E");
    await clientModal.locator(".fg").filter({ hasText: "Correo electrónico" }).locator("input").fill(
      `e2e.live.contrato.${Date.now()}@ownterra-e2e-tests.com`
    );

    const createClient = page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url().endsWith("/clients") && res.ok()
    );
    await clientModal.getByRole("button", { name: "✓ Guardar" }).click();
    const clientRes = await createClient;
    createdClientId = (await clientRes.json()).id;
    expect(createdClientId, "debió crearse el cliente").toBeTruthy();
    await expect(page.getByText("Cliente creado correctamente")).toBeVisible({ timeout: 10_000 });

    // ── 3. Contrato sobre el lote importado, para el cliente creado ──
    await page.goto("/contratos");
    await page.getByRole("button", { name: "+ Generar Contrato" }).click();

    const contractModal = page.locator(".modal-box").filter({ hasText: "Generar Contrato" });
    await expect(contractModal).toBeVisible();

    const fracOptionValue = await contractModal
      .locator("#cf-inmuebleId option")
      .filter({ hasText: projectName })
      .getAttribute("value");
    expect(fracOptionValue, "el fraccionamiento recién creado debe aparecer en el selector").toBeTruthy();
    await contractModal.locator("#cf-inmuebleId").selectOption(fracOptionValue);

    await contractModal.locator("#cf-lot").fill("E2E-01");
    await contractModal.locator("strong").filter({ hasText: "E2E-01" }).click();

    await contractModal.locator("#cf-clientId").fill(clientName);
    await contractModal.locator("div").filter({ hasText: clientName }).last().click();

    await contractModal.locator("#cf-amount").fill("300000");

    const createContract = page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url().endsWith("/contracts") && res.ok()
    );
    await contractModal.getByRole("button", { name: "✓ Registrar" }).click();
    const contractRes = await createContract;
    const contractBody = await contractRes.json();
    createdContractId = contractBody.id;
    const contractNumber = contractBody.contract_number;
    expect(createdContractId, "debió crearse el contrato").toBeTruthy();
    await expect(page.getByText("Contrato registrado")).toBeVisible({ timeout: 10_000 });

    // ── 4. Documento vinculado al contrato ──
    await page.goto("/documentos");
    await page.getByRole("button", { name: "Subir" }).click();

    const docModal = page.locator(".modal-box").filter({ hasText: "Subir documento" });
    await expect(docModal).toBeVisible();
    await docModal.locator("input[type='file']").setInputFiles(FIXTURE_DOC);
    await docModal.getByPlaceholder("Nombre descriptivo").fill(`E2E Live Doc ${Date.now()}`);

    const selects = docModal.locator("select");
    await selects.nth(1).selectOption("contract"); // linkType: "Contrato"
    await selects.nth(2).selectOption({ label: contractNumber });

    const createDocument = page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url().includes("/documents/upload") && res.ok()
    );
    await docModal.getByRole("button", { name: "Guardar" }).click();
    const docRes = await createDocument;
    createdDocumentId = (await docRes.json()).id;
    expect(createdDocumentId, "debió subirse el documento").toBeTruthy();
    await expect(page.getByText("Documento subido")).toBeVisible({ timeout: 10_000 });
  });
});
