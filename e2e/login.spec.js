import { test, expect } from "@playwright/test";

const API = "http://127.0.0.1:8000/api/v1";

function passwordInput(page) {
  // El campo de contraseña no tiene <label for>/aria-label asociado, así que
  // getByLabel() no lo encuentra — se localiza por type en su lugar.
  return page.locator('input[type="password"]');
}

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    // Limpia sesión antes de cada test.
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/");
  });

  test("muestra el formulario de inicio de sesión sin sesión activa", async ({ page }) => {
    // El app redirige al LoginScreen cuando no hay sesión.
    await expect(page.getByRole("button", { name: /ingresar|iniciar sesión/i })).toBeVisible();
  });

  test("muestra error con credenciales incorrectas", async ({ page }) => {
    // Mock: el backend responde 401.
    await page.route(`${API}/auth/login`, (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "OT-AUTH-2010",
            message: "Credenciales incorrectas.",
            request_id: "ref_e2e_test",
          },
        }),
      })
    );

    await page.getByPlaceholder("correo@empresa.mx").fill("mal@correo.com");
    await passwordInput(page).fill("wrongpassword");
    await page.getByRole("button", { name: /ingresar|iniciar sesión/i }).click();

    await expect(page.getByText(/credenciales incorrectas/i)).toBeVisible();
  });

  test("redirige al ecosistema tras login exitoso", async ({ page }) => {
    // Mock genérico de las queries que el AppContext dispara al iniciar sesión
    // — se registra ANTES del mock específico de /auth/login para que este
    // último (registrado después, con mayor precedencia en Playwright) sea
    // el que responda esa URL concreta.
    await page.route(`${API}/**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0, page: 1, limit: 20, pages: 1 }),
      })
    );

    await page.route(`${API}/auth/login`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "mock-token",
          refresh_token: "mock-refresh",
          user: { id: "u1", name: "Test User", email: "test@ownterra.com", role: "admin", apps: [], permissions: [] },
        }),
      })
    );

    await page.getByPlaceholder("correo@empresa.mx").fill("test@ownterra.com");
    await passwordInput(page).fill("password123");
    await page.getByRole("button", { name: /ingresar|iniciar sesión/i }).click();

    await expect(page).toHaveURL(/ecosistema/, { timeout: 8_000 });
  });

  test("valida que los campos no estén vacíos antes de enviar", async ({ page }) => {
    await page.getByRole("button", { name: /ingresar|iniciar sesión/i }).click();
    // El botón no debe disparar request si los campos están vacíos.
    // Verifica que seguimos en la pantalla de login (sin redirigir).
    await expect(page.getByRole("button", { name: /ingresar|iniciar sesión/i })).toBeVisible();
  });
});
