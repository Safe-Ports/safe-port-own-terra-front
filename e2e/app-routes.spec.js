import { expect, test } from "@playwright/test";
import { mockCoreEndpoints, seedSession } from "./helpers/session.js";

const ROUTES = [
  "/sin-acceso",
  "/ecosistema",
  "/ecosistema/clientes",
  "/ecosistema/documentos",
  "/ecosistema/mi-dia",
  "/ecosistema/finanzas",
  "/ecosistema/agenda",
  "/ecosistema/equipo",
  "/ecosistema/formularios",
  "/ecosistema/formularios/nuevo",
  "/ecosistema/formularios/form-e2e/editar",
  "/ecosistema/formularios/form-e2e/respuestas",
  "/planes",
  "/dashboard",
  "/lotes",
  "/fraccionamientos",
  "/clientes",
  "/ventas",
  "/contratos",
  "/documentos",
  "/pagos",
  "/reportes",
  "/calculadora",
  "/perfil",
  "/configuracion",
];

test.describe("Smoke de rutas — aplicación completa", () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await mockCoreEndpoints(page);
  });

  for (const route of ROUTES) {
    test(`${route} carga sin errores de render`, async ({ page }) => {
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${route.replaceAll("/", "\\/")}$`));
      await expect.poll(() => pageErrors, {
        message: `La ruta ${route} lanzó un error de JavaScript`,
      }).toEqual([]);
      await expect(page.getByText("Algo se rompió en la pantalla")).toHaveCount(0);
      await expect(page.locator("body")).toBeVisible();
    });
  }

  test("/alertas conserva la redirección histórica hacia pagos", async ({ page }) => {
    await page.goto("/alertas");
    await expect(page).toHaveURL(/\/pagos$/);
  });

  test("una ruta desconocida regresa al ecosistema", async ({ page }) => {
    await page.goto("/ruta-que-no-existe");
    await expect(page).toHaveURL(/\/ecosistema$/);
  });
});
