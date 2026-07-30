import { expect, test } from "@playwright/test";
import { API } from "./helpers/session.js";

const template = {
  id: "form-public-e2e",
  name: "Registro de prospecto",
  description: "Déjanos tus datos",
  slug: "registro-e2e",
  is_published: true,
  fields: [
    { id: "full_name", label: "Nombre completo", type: "text", required: true },
    { id: "phone", label: "Teléfono", type: "text", required: false },
  ],
};

test.describe("Flujos públicos", () => {
  test("verificación de correo rechaza enlaces sin token", async ({ page }) => {
    await page.goto("/verify-email");
    await expect(page.getByText("No pudimos verificar tu cuenta")).toBeVisible();
    await expect(page.getByText("El enlace de verificación es inválido.")).toBeVisible();
  });

  test("formulario público valida obligatorios y confirma el envío", async ({ page }) => {
    await page.route(`${API}/public/forms/registro-e2e**`, (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: "submission-e2e" }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(template),
      });
    });

    await page.goto("/f/registro-e2e");
    await page.getByRole("button", { name: "Enviar información" }).click();
    await expect(page.getByText("Este campo es obligatorio")).toBeVisible();

    await page.getByLabel("Nombre completo").fill("Ada Lovelace");
    await page.getByRole("button", { name: "Enviar información" }).click();
    await expect(page.getByText("¡Información enviada!")).toBeVisible();
  });

  test("formulario inexistente muestra un estado seguro", async ({ page }) => {
    await page.route(`${API}/public/forms/no-existe`, (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "OT-FORM-2001", message: "Formulario no encontrado" } }),
      })
    );

    await page.goto("/f/no-existe");
    await expect(page.getByText("Formulario no disponible")).toBeVisible();
  });
});
