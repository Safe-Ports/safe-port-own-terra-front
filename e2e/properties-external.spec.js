import { expect, test } from "@playwright/test";
import { prepare, expectFits } from "./helpers/properties.js";

for (const width of [360, 390, 430]) {
  test.describe(`Portales Properties a ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } });
    test.beforeEach(async ({ page }) => prepare(page));
    for (const [name, path] of [["Portal comunitario", "/portal-comunidad"], ["Portal servicio", "/portal-servicio"], ["Registro", "/servicio/registro"], ["Invitación", "/servicio/invitacion"], ["Login servicio", "/servicio/login"]]) {
      test(`${name}: lectura y controles táctiles`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator("main").first()).toBeVisible();
        await expectFits(page);
        for (const input of await page.locator("main input:visible:not([type=checkbox]):not([type=radio]), main select:visible, main textarea:visible").all()) {
          expect(await input.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
        }
        for (const button of await page.locator("main button:visible").all()) {
          const box = await button.boundingBox();
          expect(box.height, await button.textContent()).toBeGreaterThanOrEqual(44);
          expect(box.width, await button.textContent()).toBeGreaterThanOrEqual(44);
        }
      });
    }
  });
}
