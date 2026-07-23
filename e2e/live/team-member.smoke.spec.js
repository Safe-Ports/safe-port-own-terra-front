import { test, expect } from "@playwright/test";
import {
  LIVE_API_BASE,
  loginLive,
  getAuthToken,
  skipUnlessLiveCredentials,
  skipUnlessLiveBackend,
} from "./helpers.js";

// Crea un integrante real vía POST /users (Ecosistema → Equipo → Nuevo
// integrante) y lo archiva (soft-delete, DELETE /users/:id) al terminar.
// El correo lleva un timestamp: el backend valida unicidad de email y no
// hay forma de reusar uno fijo entre corridas.
test.describe("Alta de integrante de equipo en vivo", () => {
  let email;
  let createdUserId;

  test.beforeEach(async ({ page }) => {
    skipUnlessLiveCredentials();
    await skipUnlessLiveBackend();
    // Nada de dominios .local/.test/.invalid/.example: el backend usa
    // EmailStr (email-validator) y rechaza los TLD reservados por
    // RFC 2606/6762 aunque el formato "parezca" válido. Confirmado en vivo.
    email = `e2e.live.${Date.now()}@ownterra-e2e-tests.com`;
    createdUserId = null;
    await loginLive(page);
  });

  test.afterEach(async ({ request, page }) => {
    if (!createdUserId) return;
    const token = await getAuthToken(page);
    await request.delete(`${LIVE_API_BASE}/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
      failOnStatusCode: false,
    });
  });

  test("da de alta un vendedor con acceso a Lands", async ({ page }) => {
    await page.goto("/ecosistema/equipo");
    await page.getByRole("button", { name: "Nuevo integrante" }).click();

    const modal = page.locator(".usr-modal");
    await expect(modal).toBeVisible();

    // Las etiquetas (.usr-field-lbl) no están asociadas al input vía
    // htmlFor/aria, así que getByLabel no las encuentra — hay que ubicar
    // el campo por el texto de su label y bajar al input/select dentro.
    await modal.locator(".usr-field").filter({ hasText: "Nombre" }).locator("input").fill("E2E Live Vendedor");
    await modal.locator("select.usr-select").selectOption("vendor");
    await modal.locator(".usr-field").filter({ hasText: "Correo" }).locator("input").fill(email);
    await modal.locator(".usr-field").filter({ hasText: "Contraseña temporal" }).locator("input").fill("TestPass1234");

    // Acceso a la app OwnTerra Lands (solo visible con rol Vendedor).
    await modal.locator(".usr-app-pick").filter({ hasText: "OwnTerra Lands" }).click();

    const createUser = page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url().endsWith("/users") && res.ok()
    );

    await modal.getByRole("button", { name: "Guardar" }).click();

    const userRes = await createUser;
    createdUserId = (await userRes.json()).id;
    expect(createdUserId, "el backend debió devolver el id del integrante creado").toBeTruthy();

    await expect(page.getByText("Integrante creado")).toBeVisible({ timeout: 10_000 });
    await expect(modal).toBeHidden();
    // Aparece dos veces (fila de la lista + panel de detalle) a propósito.
    await expect(page.getByText("E2E Live Vendedor").first()).toBeVisible();
  });
});
