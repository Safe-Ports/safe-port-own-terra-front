import { test, expect } from "@playwright/test";
import { LIVE_EMAIL, LIVE_PASSWORD, skipUnlessLiveCredentials, skipUnlessLiveBackend } from "./helpers.js";

// Smoke test real: sin page.route(), habla con el backend en
// http://127.0.0.1:8000/api/v1 de verdad. Ver TESTING.md → "Tests E2E en vivo"
// para cómo levantar el backend y qué cuenta usar.
test.describe("Login en vivo", () => {
  test.beforeEach(async ({ page }) => {
    skipUnlessLiveCredentials();
    await skipUnlessLiveBackend();
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/");
  });

  test("inicia sesión con una cuenta real y carga el ecosistema", async ({ page }) => {
    await page.getByPlaceholder("correo@empresa.mx").fill(LIVE_EMAIL);
    await page.locator('input[type="password"]').fill(LIVE_PASSWORD);
    await page.getByRole("button", { name: /ingresar|iniciar sesión/i }).click();

    await expect(page).toHaveURL(/ecosistema/, { timeout: 15_000 });
    // La sesión real trae datos del backend (apps, permisos, nombre de
    // usuario) — si esto se ve, el layout autenticado cargó con datos
    // reales, no con un mock. Por nombre accesible, no por atributo title:
    // el logout se renderiza distinto entre Topbar (title="Cerrar sesión")
    // y Sidebar (solo texto) según el layout/viewport.
    await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible({ timeout: 10_000 });
  });

  test("credenciales incorrectas muestran el error real del backend", async ({ page }) => {
    await page.getByPlaceholder("correo@empresa.mx").fill(LIVE_EMAIL);
    await page.locator('input[type="password"]').fill("una-contrasena-definitivamente-incorrecta");
    await page.getByRole("button", { name: /ingresar|iniciar sesión/i }).click();

    // El backend responde OT-AUTH-2001 con mensaje "Correo o contraseña
    // incorrectos." (app/shared/errors/catalog.py), pero el frontend no lo
    // muestra tal cual: InlineError pinta su propio título "Credenciales
    // inválidas" para ese código. Verificado corriendo este spec en vivo.
    await expect(page.getByText(/credenciales inválidas/i)).toBeVisible({ timeout: 10_000 });
    await expect(page).not.toHaveURL(/ecosistema/);
  });
});
