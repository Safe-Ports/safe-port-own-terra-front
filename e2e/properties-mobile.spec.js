import { expect, test } from "@playwright/test";

import { API } from "./helpers/session.js";
import { prepare, expectFits } from "./helpers/properties.js";

for (const width of [360, 390, 430]) {
  test.describe(`Properties a ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } });
    test.beforeEach(async ({ page }) => prepare(page));
    for (const [name, path] of [
      ["Inicio", "/properties"], ["Operación", "/properties/operacion"],
      ["Propietarios", "/properties/propietarios"], ["Inmuebles", "/properties/inmuebles"],
      ["Unidades", "/properties/unidades"], ["Portafolio", "/properties/portafolio"],
      ["Comunidades", "/properties/comunidades"], ["Directorio", "/properties/comunidades?tab=directory&community=community"],
      ["Tablero de unidades", "/properties/unidades?view=board"], ["Proveedores", "/properties/responsables"],
      ...["charges", "utilities", "communications", "amenities", "committee", "reports"].map(module => [`Operación ${module}`, `/properties/comunidades/operacion?community=community&module=${module}`]), ["Tickets", "/properties/tickets"],
      ["Paquetería", "/properties/accesos"], ["Guía", "/properties/guia"], ["Módulo de inspecciones", "/properties/modulos/inspecciones"],
    ]) test(`${name}: contenido sin desbordamiento`, async ({ page }, testInfo) => {
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(path);
      await expect(page.locator("main").first()).toBeVisible();
      await expect(page.getByRole("heading", { name: "Cargando Properties", exact: true })).toHaveCount(0);
      await expectFits(page);
      expect(errors).toEqual([]);
      // Las acciones deben seguir siendo accesibles, no esconderse con overflow:hidden.
      const controls = page.locator("main button:visible, .topbar button:visible");
      for (const control of await controls.all()) {
        const box = await control.boundingBox();
        expect(box.height, await control.textContent()).toBeGreaterThanOrEqual(44);
        expect(box.width, await control.textContent()).toBeGreaterThanOrEqual(44);
      }
      if (width === 390 && ["Inicio", "Comunidades", "Proveedores"].includes(name)) await page.screenshot({ path: testInfo.outputPath("mobile.png"), fullPage: true });
    });

    test("Error de API: reintento sin presentar un portafolio vacío", async ({ page }) => {
      let unavailable = true;
      await page.route(`${API}/properties**`, route => {
        if (new URL(route.request().url()).pathname.endsWith("/properties") && unavailable) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "OT-SYS-9003", message: "Servicio temporalmente no disponible" } }) });
        return route.fallback();
      });
      await page.goto("/properties/propietarios");
      await expect(page.getByRole("heading", { name: "No pudimos cargar Properties" })).toBeVisible();
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByRole("button", { name: "Nuevo propietario" })).toHaveCount(0);
      unavailable = false;
      await page.getByRole("button", { name: "Reintentar" }).click();
      await expect(page.getByRole("button", { name: "Nuevo propietario" })).toBeVisible();
    });

    test("Formulario de propietario: portal, foco y campos legibles", async ({ page }) => {
      await page.goto("/properties/propietarios");
      const trigger = page.getByRole("button", { name: "Nuevo propietario" });
      await trigger.focus(); await trigger.click();
      const dialog = page.getByRole("dialog", { name: "Nuevo propietario" });
      await expect(dialog).toBeVisible();
      expect(await dialog.evaluate(el => el.closest(".dialog-theme").parentElement === document.body)).toBe(true);
      for (const input of await dialog.locator("input:visible:not([type=checkbox]):not([type=radio]),select:visible,textarea:visible").all()) expect(await input.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
      await expectFits(page);
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
    });

    test("Nuevo ticket: portal, lectura sin zoom y cierre accesible", async ({ page }) => {
      await page.goto("/properties/tickets");
      await page.getByRole("button", { name: "Nuevo ticket" }).click();
      const dialog = page.getByRole("dialog", { name: "Crear ticket" });
      await expect(dialog).toBeVisible();
      expect(await dialog.evaluate(el => !el.closest(".scroll-area"))).toBe(true);
      for (const input of await dialog.locator("input, select, textarea").all()) {
        expect(await input.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
      }
      const bounds = await dialog.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Nuevo ticket" })).toBeFocused();
    });
  });
}
