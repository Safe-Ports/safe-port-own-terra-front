// El perfil se abre dentro de la app en la que está el usuario: Properties no
// debe mandarte al perfil de Lands, ni Lands al del Core.
import { test, expect } from "@playwright/test";
import { prepare as prepareProperties } from "./helpers/properties.js";
import { prepareLands } from "./helpers/lands.js";

test("desde Properties el perfil abre dentro de Properties", async ({ page }) => {
  await prepareProperties(page);
  await page.goto("/properties");
  await page.getByRole("button", { name: /Ver perfil de/ }).click();
  await expect(page).toHaveURL(/\/properties\/perfil$/);
  await expect(page.getByRole("navigation", { name: "Navegación de Properties" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mis datos" })).toBeVisible();
});

test("desde Lands el perfil sigue en Lands y desde el Hub en el Core", async ({ page }) => {
  await prepareLands(page);
  await page.goto("/clientes");
  await page.getByRole("button", { name: /Ver perfil de/ }).click();
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page).not.toHaveURL(/\/(properties|ecosistema)\/perfil$/);
  await page.goto("/ecosistema");
  await page.getByRole("button", { name: /Ver perfil de/ }).click();
  await expect(page).toHaveURL(/\/ecosistema\/perfil$/);
});

test("Mis accesos muestra el logo de cada app", async ({ page }) => {
  await prepareProperties(page);
  await page.goto("/properties/perfil");
  const logos = page.locator(".lands-embed img[src*='/brand/']");
  await expect(logos.first()).toBeVisible();
  const srcs = await logos.evaluateAll((imgs) => imgs.map((i) => i.getAttribute("src")));
  for (const app of ["lands", "construction", "properties"]) expect(srcs.some((s) => s.includes(`${app}-mark`))).toBeTruthy();
  expect(await logos.evaluateAll((imgs) => imgs.every((i) => i.naturalWidth > 0))).toBeTruthy();
});
