// Paginado de clientes con un directorio grande (236 clientes): libreta de
// Lands (/clientes) y CRM del ecosistema (/ecosistema/clientes).
import { test, expect } from "@playwright/test";
import { installLandsApi } from "./helpers/landsApi.js";

const TOTAL = 236;
const pad = (n) => String(n).padStart(3, "0");

// 236 clientes, los más recientes primero (como el backend). Sólo los
// `lands` más antiguos están en Lands; el resto, en Properties.
async function seed(page, { lands = TOTAL } = {}) {
  const db = await installLandsApi(page);
  const base = db.clients[0];
  db.clients.length = 0;
  for (let n = TOTAL; n >= 1; n -= 1) {
    db.clients.push({ ...base, id: `x${pad(n)}`, name: `Cliente ${pad(n)}`, email: `cliente${pad(n)}@prueba.mx`, initials: "CL", apps: n <= lands ? ["lands"] : ["properties"] });
  }
  return db;
}

const appLookups = (db) => db.log.filter((r) => /^\/clients\/[^/]+\/apps$/.test(r.path));
const lista = (page) => page.locator(".cl-list-body");
const siguiente = (page) => page.getByRole("button", { name: "›" });

test.describe("Lands /clientes", () => {
  test("recorre las 12 páginas de 20 sin consultar accesos uno por uno", async ({ page }) => {
    const db = await seed(page);
    await page.goto("/clientes");
    for (let p = 1; p <= 12; p += 1) {
      await expect(page.getByText(`Mostrando ${(p - 1) * 20 + 1} a ${Math.min(p * 20, TOTAL)} de ${TOTAL}`)).toBeVisible();
      await expect(lista(page).getByRole("button", { name: `Ver cliente Cliente ${pad(TOTAL - (p - 1) * 20)}` })).toBeVisible();
      await expect(lista(page).getByRole("button", { name: /^Ver cliente/ })).toHaveCount(p < 12 ? 20 : TOTAL - 220);
      if (p < 12) await siguiente(page).click();
    }
    await expect(siguiente(page)).toBeDisabled();
    expect(appLookups(db)).toHaveLength(0);
  });

  test("si los 200 más nuevos son de Properties, la página 1 ya trae clientes de Lands", async ({ page }) => {
    await seed(page, { lands: 36 });
    await page.goto("/clientes");
    await expect(page.getByText("Mostrando 1 a 20 de 36")).toBeVisible();
    await expect(lista(page).getByRole("button", { name: "Ver cliente Cliente 036" })).toBeVisible();
    await expect(lista(page).getByRole("button", { name: /^Ver cliente/ })).toHaveCount(20);
    await expect(lista(page)).not.toContainText("Cliente 236");
    await siguiente(page).click();
    await expect(lista(page).getByRole("button", { name: /^Ver cliente/ })).toHaveCount(16);
  });

  test("con el backend anterior (sin app_key ni apps) sigue funcionando y lo explica", async ({ page }) => {
    const db = await seed(page, { lands: 36 });
    // Backend anterior: ignora app_key y no manda `apps` en el listado.
    await page.route(/\/api\/v1\/clients\?/, (route) => {
      const url = new URL(route.request().url());
      const pagina = Number(url.searchParams.get("page") || 1);
      const items = db.clients.slice((pagina - 1) * 20, pagina * 20).map(({ apps, ...c }) => c);
      return route.fulfill({ json: { items, total: db.clients.length, page: pagina, limit: 20, pages: 12 } });
    });
    await page.goto("/clientes");
    await expect(page.getByText("Sin clientes vinculados a Lands en esta página.")).toBeVisible();
    expect(appLookups(db).length).toBeGreaterThan(0);
  });
});

test.describe("CRM /ecosistema/clientes", () => {
  test("pagina el directorio completo y la búsqueda llega al cliente más antiguo", async ({ page }) => {
    await seed(page, { lands: 36 });
    await page.goto("/ecosistema/clientes");
    const nombres = page.locator(".usr-list .usr-name");
    await expect(page.locator(".usr-list-title")).toHaveText(`Clientes (${TOTAL})`);
    await expect(nombres).toHaveCount(20);
    await expect(nombres.first()).toHaveText("Cliente 236");
    await page.getByRole("button", { name: "»" }).click();
    await expect(nombres).toHaveCount(TOTAL - 220);
    await expect(nombres.last()).toHaveText("Cliente 001");

    await page.getByPlaceholder("Buscar por nombre o correo…").fill("Cliente 001");
    await expect(nombres).toHaveCount(1);
    await expect(nombres.first()).toHaveText("Cliente 001");
    await page.getByPlaceholder("Buscar por nombre o correo…").fill("nadie");
    await expect(page.getByText('Sin resultados para "nadie".')).toBeVisible();
  });

  test("los totales por app vienen del servidor, no de la página cargada", async ({ page }) => {
    await seed(page, { lands: 36 });
    await page.goto("/ecosistema/clientes");
    const kpi = (label) => page.locator(".kpi").filter({ hasText: label }).locator(".kpi-val");
    await expect(kpi("Clientes en el core")).toHaveText(String(TOTAL));
    await expect(kpi("En OwnTerra Lands")).toHaveText("36");
    await expect(kpi("En Properties")).toHaveText("200");
  });
});
