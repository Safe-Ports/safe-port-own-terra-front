// Reportes: lista de clientes, reporte financiero por cliente, enlace directo
// (?client=) y salidas (correo, PDF, impresión).
import { test, expect } from "@playwright/test";
import { installLandsApi } from "./helpers/landsApi.js";

let db;
test.beforeEach(async ({ page }) => {
  db = await installLandsApi(page);
  // window.print abre un diálogo nativo que bloquea la prueba; se registra la llamada.
  await page.addInitScript(() => { window.__prints = 0; window.print = () => { window.__prints += 1; }; });
});

const writes = (re) => db.log.filter((r) => r.method !== "GET" && re.test(r.path));
const report = (page) => page.locator("body");
const list = (page) => page.getByRole("complementary").filter({ hasText: "Clientes (" });

test("sin cliente elegido pide seleccionar uno y la lista se puede buscar", async ({ page }) => {
  await page.goto("/reportes");
  await expect(page.getByText("Selecciona un cliente")).toBeVisible();
  await expect(list(page)).toContainText("Clientes (4)");
  await list(page).getByRole("textbox", { name: "Buscar cliente…" }).fill("carla");
  await expect(list(page).getByRole("button", { name: /Carla Ruiz/ })).toBeVisible();
  await expect(list(page).getByRole("button", { name: /Ana López/ })).toHaveCount(0);
});

test("reporte del cliente: resumen, contratos y plan de pagos", async ({ page }) => {
  await page.goto("/reportes");
  await list(page).getByRole("button", { name: /Ana López/ }).click();
  await expect(report(page)).toContainText(/Reporte financiero del cliente\s*Ana López/);
  await expect(page.getByText("$240,000").first()).toBeVisible();
  await expect(page.getByRole("row", { name: /CT-001 Compraventa/ })).toContainText("Activo");
  await expect(page.getByRole("row", { name: /#1 .*Pagado/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /#2 .*Vencido/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /#3 .*Pendiente/ })).toBeVisible();
});

test("el enlace directo ?client= abre el reporte de ese cliente", async ({ page }) => {
  await page.goto("/reportes?client=c2");
  await expect(report(page)).toContainText(/Reporte financiero del cliente\s*Bruno Díaz/);
});

test("cambiar de cliente actualiza el reporte", async ({ page }) => {
  await page.goto("/reportes?client=c1");
  await expect(report(page)).toContainText(/Reporte financiero del cliente\s*Ana López/);
  await list(page).getByRole("button", { name: /Diego Mora/ }).click();
  await expect(report(page)).toContainText(/Reporte financiero del cliente\s*Diego Mora/);
  await expect(report(page)).not.toContainText(/Reporte financiero del cliente\s*Ana López/);
});

test("enviar por correo, descargar PDF e imprimir", async ({ page }) => {
  await page.goto("/reportes?client=c1");
  await page.getByRole("button", { name: "Enviar por correo" }).click();
  await expect.poll(() => writes(/^\/clients\/c1\/statement\/send-email$/).length).toBe(1);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar PDF" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  await page.getByRole("button", { name: "Imprimir reporte" }).click();
  await expect.poll(() => page.evaluate(() => window.__prints)).toBe(1);
});
