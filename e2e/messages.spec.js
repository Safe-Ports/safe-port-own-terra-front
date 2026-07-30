import { expect, test } from "@playwright/test";
import { API, mockCoreEndpoints, seedSession } from "./helpers/session.js";

const QUOTA_ERROR = {
  error: {
    code: "OT-SUB-4001",
    message: "Alcanzaste el límite de usuarios de tu plan (1).",
    details: {},
    request_id: "ref_e2e_subscription_limit",
  },
};

async function openNewTeamMember(page) {
  await page.goto("/ecosistema/equipo");
  await page.getByRole("button", { name: "Nuevo integrante" }).click();

  const modal = page.locator(".usr-modal");
  await expect(modal).toBeVisible();
  return modal;
}

async function fillValidMember(modal) {
  await modal.locator(".usr-field").filter({ hasText: "Nombre" }).locator("input").fill("Integrante E2E");
  await modal.locator(".usr-field").filter({ hasText: "Correo" }).locator("input").fill("mensajes.e2e@ownterra.com");
  await modal.locator(".usr-field").filter({ hasText: "Contraseña temporal" }).locator("input").fill("Temporal123");
}

test.describe("Sistema de mensajes OwnTerra", () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await mockCoreEndpoints(page);
  });

  test("muestra la validación junto al campo sin toast global", async ({ page }) => {
    const modal = await openNewTeamMember(page);

    await modal.getByRole("button", { name: "Guardar" }).click();

    await expect(modal.getByText("El nombre es obligatorio.")).toBeVisible();
    await expect(modal.getByText("Ingresa un correo electrónico válido.")).toBeVisible();
    await expect(modal.getByText("La contraseña temporal debe tener al menos 8 caracteres.")).toBeVisible();
    await expect(page.locator(".app-toast")).toHaveCount(0);
  });

  test("presenta el límite del plan dentro del formulario una sola vez", async ({ page }) => {
    await page.route(`${API}/users`, async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      return route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify(QUOTA_ERROR),
      });
    });

    const modal = await openNewTeamMember(page);
    await fillValidMember(modal);
    await modal.getByRole("button", { name: "Guardar" }).click();

    const message = modal.getByRole("alert");
    await expect(message).toBeVisible();
    await expect(message).toContainText("Advertencia");
    await expect(message).toContainText(QUOTA_ERROR.error.message);
    await expect(message).toContainText("Mejora tu plan para agregar más.");
    await expect(message).toContainText("OT-SUB-4001");
    await expect(page.getByText(QUOTA_ERROR.error.message)).toHaveCount(1);
    await expect(page.locator(".app-toast")).toHaveCount(0);
    await expect(page.locator(".ie-backdrop")).toHaveCount(0);
    await expect(modal).toBeVisible();
    if (process.env.MESSAGE_SCREENSHOT === "1") {
      await page.screenshot({ path: "/private/tmp/ownterra-message-spacing.png", fullPage: true });
    }
  });

  test("confirma la creación con un toast ligero y descartable", async ({ page }) => {
    await page.route(`${API}/users`, async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      const body = await route.request().postDataJSON();
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: "user-e2e", ...body, is_active: true }),
      });
    });

    const modal = await openNewTeamMember(page);
    await fillValidMember(modal);
    await modal.getByRole("button", { name: "Guardar" }).click();

    const toast = page.getByRole("status");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Listo");
    await expect(toast).toContainText("Integrante creado");
    await expect(modal).toBeHidden();

    await toast.getByRole("button", { name: "Cerrar mensaje" }).click();
    await expect(toast).toBeHidden();
  });
});

test("recorrido visual lento de mensajes", async ({ page }) => {
  test.skip(process.env.MESSAGE_DEMO !== "1", "Recorrido visual manual");
  test.setTimeout(60_000);

  await page.addInitScript(() => localStorage.clear());
  await mockCoreEndpoints(page);
  await page.route(`${API}/auth/login`, (route) => route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({
      error: {
        code: "OT-AUTH-2010",
        message: "Tu sesión expiró.",
        details: {},
        request_id: "ref_demo_session",
      },
    }),
  }));

  // 1. Error de sesión: permanece inline hasta que el usuario actúe.
  await page.goto("/");
  await page.getByPlaceholder("correo@empresa.mx").fill("demo@ownterra.com");
  await page.locator('input[type="password"]').fill("demostracion");
  await page.getByRole("button", { name: /ingresar|iniciar sesión/i }).click();
  await expect(page.getByRole("alert")).toContainText("Tu sesión expiró.");
  await page.waitForTimeout(8_000);

  // 2. Error de imagen: toast de advertencia visible durante diez segundos.
  await seedSession(page);
  await page.goto("/lotes");
  await page.getByText("Carga Manual", { exact: true }).click();
  await page.locator('.lot-upload-drop input[type="file"]').setInputFiles({
    name: "plano-no-compatible.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("archivo no compatible"),
  });
  await expect(page.getByRole("alert")).toContainText("El plano debe ser una imagen");
  await page.waitForTimeout(8_000);
  await page.getByRole("button", { name: "Cerrar mensaje" }).click();

  // 3. Restricción del plan: mensaje contextual, sin toast duplicado.
  let quotaReached = true;
  await page.route(`${API}/users`, async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    if (quotaReached) {
      return route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify(QUOTA_ERROR),
      });
    }
    const body = await route.request().postDataJSON();
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "user-demo", ...body, is_active: true }),
    });
  });

  const modal = await openNewTeamMember(page);
  await fillValidMember(modal);
  await modal.getByRole("button", { name: "Guardar" }).click();
  await expect(modal.getByRole("alert")).toContainText(QUOTA_ERROR.error.message);
  await expect(page.locator(".app-toast")).toHaveCount(0);
  await page.waitForTimeout(8_000);

  // 4. Éxito: se reutiliza el formulario y se muestra la confirmación ligera.
  await modal.getByRole("button", { name: "Cerrar mensaje" }).click();
  quotaReached = false;
  await modal.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("status")).toContainText("Integrante creado");
  await page.waitForTimeout(5_000);
});
