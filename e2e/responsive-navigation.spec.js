import { expect, test } from "@playwright/test";
import { API, mockCoreEndpoints, seedSession } from "./helpers/session.js";

test.describe("Navegación compartida en iPad", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await mockCoreEndpoints(page);
    await page.route(`${API}/appointments**`, (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    }));
  });

  test("mantiene las acciones del core y muestra claramente el perfil", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto("/ecosistema");
    await expect.poll(() => pageErrors).toEqual([]);

    let actions = page.getByRole("navigation", { name: "Acciones del ecosistema" });
    await expect(page.getByRole("button", { name: "Abrir guías de esta sección" })).toBeVisible();
    await expect(actions.getByRole("button", { name: "Mi Día", exact: true })).toBeVisible();
    await expect(actions.getByRole("button", { name: "Calendario", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ver perfil de Test User" })).toContainText("Perfil");

    const ecosystemProfileStyle = await page.getByRole("button", { name: "Ver perfil de Test User" }).evaluate((element) => {
      const style = getComputedStyle(element);
      return { borderRadius: style.borderRadius, minHeight: style.minHeight, fontFamily: style.fontFamily };
    });

    await page.goto("/lotes");

    actions = page.getByRole("navigation", { name: "Acciones del ecosistema" });
    await expect(page.getByRole("button", { name: "Abrir guías de esta sección" })).toBeVisible();
    await expect(actions.getByRole("button", { name: "Mi Día", exact: true })).toBeVisible();
    await expect(actions.getByRole("button", { name: "Calendario", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ver perfil de Test User" })).toContainText("Perfil");

    const landsProfileStyle = await page.getByRole("button", { name: "Ver perfil de Test User" }).evaluate((element) => {
      const style = getComputedStyle(element);
      return { borderRadius: style.borderRadius, minHeight: style.minHeight, fontFamily: style.fontFamily };
    });

    expect(landsProfileStyle).toEqual(ecosystemProfileStyle);
  });

  test("convierte el sidebar del ecosistema en menú deslizable", async ({ page }) => {
    await page.goto("/ecosistema");
    const sidebar = page.locator(".eco-root .sidebar");

    await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();
    await expect.poll(async () => (await sidebar.boundingBox())?.x).toBeLessThan(0);

    await page.getByRole("button", { name: "Abrir menú" }).click();
    await expect.poll(async () => Math.round((await sidebar.boundingBox())?.x || 0)).toBe(0);
    await expect(sidebar.getByText("Núcleo central")).toBeVisible();
  });
});
