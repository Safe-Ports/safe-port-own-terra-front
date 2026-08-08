import { expect, test } from "@playwright/test";
import { mockCoreEndpoints, seedSession } from "./helpers/session.js";

test.describe("Flujos críticos con validación del usuario", () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await mockCoreEndpoints(page);
  });

  test("formularios impide publicar sin nombre", async ({ page }) => {
    await page.goto("/ecosistema/formularios/nuevo");
    await page.getByRole("button", { name: "Guardar y publicar" }).click();
    await expect(page.getByText("El nombre del formulario es obligatorio")).toBeVisible();
  });

  test("calculadora exige nombre y fórmula antes de guardar", async ({ page }) => {
    await page.goto("/calculadora");
    await page.getByRole("button", { name: "+ Nueva calculadora" }).click();
    await page.getByRole("button", { name: /Guardar configuración/ }).click();
    await expect(page.getByText("Ponle un nombre a la calculadora")).toBeVisible();
  });

  test("equipo muestra errores de los campos obligatorios", async ({ page }) => {
    await page.goto("/configuracion");
    await page.getByRole("button", { name: "+ Nuevo usuario" }).click();
    await page.getByRole("button", { name: "✓ Crear" }).click();

    await expect(page.getByText("El nombre es obligatorio.")).toBeVisible();
    await expect(page.getByText("El correo es obligatorio.")).toBeVisible();
    await expect(page.getByText("La contraseña es obligatoria.")).toBeVisible();
  });

  test("carga manual conserva editable el nombre del fraccionamiento", async ({ page }) => {
    await page.goto("/lotes");
    await page.getByText("Carga Manual", { exact: true }).click();

    const name = page.getByPlaceholder("Ej. Residencial Las Palmas");
    await name.fill("Residencial E2E");
    await expect(name).toHaveValue("Residencial E2E");
  });

  test("modales compartidos se cierran con Escape", async ({ page }) => {
    await page.goto("/clientes");
    await page.getByRole("button", { name: "+ Vincular" }).click();
    await expect(page.getByText("Vincular o crear cliente")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByText("Vincular o crear cliente")).toHaveCount(0);
  });
});
