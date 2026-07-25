import { expect, test } from "@playwright/test";
import { mockCoreEndpoints, seedSession } from "./helpers/session.js";

test.describe("Autorización por rol y permisos", () => {
  test("un vendedor sin core.config termina en acceso denegado", async ({ page }) => {
    const vendor = {
      role: "vendor",
      apps: ["lands"],
      permissions: [],
    };
    await seedSession(page, vendor);
    await mockCoreEndpoints(page, vendor);

    await page.goto("/configuracion");
    await expect(page).toHaveURL(/\/sin-acceso$/);
    await expect(page.getByRole("heading", { name: "Sin acceso" })).toBeVisible();
    await expect(page.getByText("No tienes permiso para acceder a Configuración.")).toBeVisible();
  });
});
