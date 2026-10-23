// Perfil (datos, foto, contraseña, accesos) y Configuración de Lands
// (organización, usuarios, planes y facturación).
import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { installLandsApi } from "./helpers/landsApi.js";

const FOTO = { name: "foto.jpg", mimeType: "image/jpeg", buffer: fs.readFileSync(new URL("../public/apps/lands.jpg", import.meta.url)) };

let db;
test.beforeEach(async ({ page }) => { db = await installLandsApi(page); });

const writes = (re) => db.log.filter((r) => r.method !== "GET" && re.test(r.path));
const section = (page, title) => page.locator("section, .card, div").filter({ has: page.getByRole("heading", { name: title, level: 3 }) }).last();

test.describe("Perfil", () => {
  test("muestra datos, accesos y organización", async ({ page }) => {
    await page.goto("/perfil");
    await expect(page.getByRole("heading", { name: "Test User", level: 2 })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "OwnTerra Lands" })).toContainText("Gerente");
    await expect(page.getByRole("definition").filter({ hasText: "Test Org" })).toBeVisible();
  });

  test("editar mis datos: nombre, teléfono, iniciales y color", async ({ page }) => {
    await page.goto("/perfil");
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await page.getByRole("textbox", { name: "Nombre" }).fill("Test Usuario");
    await page.getByRole("textbox", { name: "10 dígitos" }).fill("3312345678");
    await page.getByRole("textbox", { name: /^Iniciales/ }).fill("TX");
    await page.getByRole("button", { name: "Usar el color #5B6ABF" }).click();
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect.poll(() => writes(/^\/users\/u1$/).length).toBe(1);
    const body = writes(/^\/users\/u1$/)[0].body;
    expect(body).toMatchObject({ name: "Test Usuario", initials: "TX", color: "#5B6ABF" });
    expect(body.phone).toContain("3312345678");
  });

  test("cancelar la edición no guarda", async ({ page }) => {
    await page.goto("/perfil");
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await page.getByRole("textbox", { name: "Nombre" }).fill("No guardar");
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("definition").filter({ hasText: "Test User" }).first()).toBeVisible();
    expect(writes(/^\/users\/u1$/)).toHaveLength(0);
  });

  test("subir foto de perfil", async ({ page }) => {
    await page.goto("/perfil");
    await page.locator('input[type="file"][accept*="image"]').setInputFiles(FOTO);
    await expect.poll(() => writes(/^\/users\/u1\/avatar$/).length).toBe(1);
    expect(writes(/^\/users\/u1\/avatar$/)[0].body.files).toHaveLength(1);
  });

  test("cambiar contraseña valida coincidencia y largo", async ({ page }) => {
    await page.goto("/perfil");
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    const actual = page.getByRole("textbox", { name: "Contraseña actual" });
    const nueva = page.getByRole("textbox", { name: /^Nueva contraseña/ });
    const repite = page.getByRole("textbox", { name: "Repite la nueva" });
    const enviar = page.getByRole("button", { name: "Cambiar contraseña" });

    await actual.fill("actual-123");
    await nueva.fill("corta");
    await repite.fill("corta");
    await enviar.click();
    expect(writes(/^\/auth\/me\/password$/)).toHaveLength(0);

    await nueva.fill("una-frase-nueva");
    await repite.fill("otra-frase-nueva");
    await enviar.click();
    expect(writes(/^\/auth\/me\/password$/)).toHaveLength(0);

    await repite.fill("una-frase-nueva");
    await enviar.click();
    await expect.poll(() => writes(/^\/auth\/me\/password$/).length).toBe(1);
    expect(JSON.stringify(writes(/^\/auth\/me\/password$/)[0].body)).toContain("una-frase-nueva");
  });

  test("accesos de administración llevan al ecosistema", async ({ page }) => {
    await page.goto("/perfil");
    await page.getByRole("button", { name: /^Equipo/ }).click();
    await expect(page).toHaveURL(/\/ecosistema\/equipo$/);
    await page.goto("/perfil");
    await page.getByRole("button", { name: /^Configuración Datos/ }).click();
    await expect(page).toHaveURL(/\/ecosistema\/configuracion$/);
  });
});

test.describe("Configuración", () => {
  test("muestra la organización y el equipo", async ({ page }) => {
    await page.goto("/configuracion");
    await expect(page.getByText(/Test Org/).first()).toBeVisible();
    await expect(page.getByRole("row", { name: /Test User \(tú\)/ })).toBeVisible();
    // El usuario actual no se puede eliminar a sí mismo.
    await expect(page.getByRole("button", { name: "Eliminar Test User" })).toHaveCount(0);
  });

  test("crear un usuario del equipo", async ({ page }) => {
    await page.goto("/configuracion");
    await page.getByRole("button", { name: "+ Nuevo usuario" }).click();
    await page.getByRole("textbox", { name: "Nombre" }).fill("Luis Cobranza");
    await page.getByRole("textbox", { name: "Correo" }).fill("luis@ownterra.com");
    await page.getByRole("textbox", { name: "Contraseña temporal" }).fill("temporal-2026");
    await page.getByRole("combobox", { name: "Rol" }).selectOption({ label: "Colaborador" });
    await page.getByRole("button", { name: "Crear" }).click();
    await expect.poll(() => writes(/^\/users$/).length).toBe(1);
    expect(writes(/^\/users$/)[0].body).toMatchObject({ name: "Luis Cobranza", email: "luis@ownterra.com" });
    await expect(page.getByRole("row", { name: /Luis Cobranza/ })).toBeVisible();
  });

  test("cancelar el alta de usuario no guarda", async ({ page }) => {
    await page.goto("/configuracion");
    await page.getByRole("button", { name: "+ Nuevo usuario" }).click();
    await page.getByRole("textbox", { name: "Nombre" }).fill("No guardar");
    await page.getByRole("button", { name: "Cancelar" }).click();
    expect(writes(/^\/users$/)).toHaveLength(0);
  });

  test("restablecer contraseña de un colaborador", async ({ page }) => {
    await page.goto("/configuracion");
    await page.getByRole("button", { name: "Restablecer contraseña de Vera Vendedora" }).click();
    await expect.poll(() => writes(/^\/users\/u2\/reset-password$/).length).toBe(1);
  });

  test("eliminar un usuario pide confirmación", async ({ page }) => {
    await page.goto("/configuracion");
    await page.getByRole("button", { name: "Eliminar Vera Vendedora" }).click();
    let dialog = page.getByRole("dialog", { name: "¿Eliminar usuario Vera Vendedora?" });
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    expect(writes(/^\/users\/u2$/)).toHaveLength(0);
    await page.getByRole("button", { name: "Eliminar Vera Vendedora" }).click();
    dialog = page.getByRole("dialog", { name: "¿Eliminar usuario Vera Vendedora?" });
    await dialog.getByRole("button", { name: "Eliminar usuario" }).click();
    await expect.poll(() => db.log.filter((r) => r.method !== "GET" && r.path.startsWith("/users/u2")).length).toBeGreaterThan(0);
    await expect(page.getByRole("row", { name: /Vera Vendedora/ })).toHaveCount(0);
  });

  test("Ver planes abre la página de planes y Gestionar facturación abre el portal", async ({ page, context }) => {
    await page.goto("/configuracion");
    const [planes] = await Promise.all([context.waitForEvent("page"), page.getByRole("button", { name: "Ver planes" }).click()]);
    await expect(planes).toHaveURL(/\/planes$/);
    await planes.close();
    await page.getByRole("button", { name: "Gestionar facturación" }).click();
    await expect.poll(() => writes(/^\/billing\/portal$/).length).toBe(1);
  });
});
