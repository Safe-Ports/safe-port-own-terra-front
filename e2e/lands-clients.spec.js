// Clientes & CRM: directorio, filtros, alta y edición, ficha (contacto,
// contratos, estado de cuenta, cancelación) y documentos del cliente.
import { test, expect } from "@playwright/test";
import { installLandsApi } from "./helpers/landsApi.js";

const PDF = (name) => ({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 prueba") });

let db;
test.beforeEach(async ({ page }) => { db = await installLandsApi(page); });

const writes = (re) => db.log.filter((r) => r.method !== "GET" && re.test(r.path));
const clientCard = (page, name) => page.getByRole("button", { name: `Ver cliente ${name}`, exact: true });

test("directorio: filtros por tipo y búsqueda", async ({ page }) => {
  await page.goto("/clientes");
  await expect(clientCard(page, "Ana López")).toBeVisible();
  await page.getByRole("button", { name: "Prospectos" }).click();
  await expect(clientCard(page, "Carla Ruiz")).toBeVisible();
  await expect(clientCard(page, "Ana López")).toHaveCount(0);
  await page.getByRole("button", { name: "Compradores" }).click();
  await expect(clientCard(page, "Bruno Díaz")).toBeVisible();
  await expect(clientCard(page, "Carla Ruiz")).toHaveCount(0);
  await page.getByRole("button", { name: "Todos" }).click();
  await page.getByRole("searchbox", { name: "Buscar clientes" }).fill("diego");
  await expect(clientCard(page, "Diego Mora")).toBeVisible();
  await expect(clientCard(page, "Ana López")).toHaveCount(0);
});

test("la ficha muestra contacto, resumen financiero y contratos", async ({ page }) => {
  await page.goto("/clientes");
  await clientCard(page, "Ana López").click();
  await expect(page.getByRole("link", { name: "Llamar a Ana López" })).toHaveAttribute("href", /^tel:/);
  await expect(page.getByRole("link", { name: "Enviar correo a Ana López" })).toHaveAttribute("href", "mailto:c1@example.com");
  await expect(page.getByRole("link", { name: "WhatsApp de Ana López" })).toHaveAttribute("href", /wa\.me/);
  await expect(page.getByText(/Total pagado/)).toBeVisible();
  await expect(page.getByRole("row", { name: /N-1 Proyecto Norte Vendido/ })).toBeVisible();
  await clientCard(page, "Bruno Díaz").click();
  await expect(page.getByRole("link", { name: "Llamar a Bruno Díaz" })).toBeVisible();
});

test("alta de cliente valida el nombre y guarda todos los datos", async ({ page }) => {
  await page.goto("/clientes");
  await page.getByRole("button", { name: "+ Agregar cliente" }).click();
  const dialog = page.getByRole("dialog", { name: "Agregar cliente" });
  await dialog.getByRole("button", { name: /Guardar|Agregar/ }).last().click();
  expect(writes(/^\/clients$/)).toHaveLength(0);
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Nombre *", { exact: true }).fill("Mariana");
  await dialog.getByLabel("Apellidos (opcional)").fill("Torres");
  await dialog.getByLabel("Teléfono (opcional)").fill("3312345678");
  await dialog.getByLabel("Correo electrónico (opcional)").fill("mariana@example.com");
  await dialog.getByLabel("Tipo de cliente").selectOption({ label: "Prospecto" });
  await dialog.getByLabel("Notas (opcional)").fill("Viene por recomendación");
  await dialog.getByRole("button", { name: /Guardar|Agregar/ }).last().click();
  await expect(dialog).toBeHidden();
  expect(writes(/^\/clients$/)[0].body).toMatchObject({ name: "Mariana Torres", email: "mariana@example.com", type: "lead", notes: "Viene por recomendación" });
  expect(writes(/^\/clients$/)[0].body.phone).toContain("3312345678");
  expect(writes(/^\/clients\/[^/]+\/apps\/lands$/)).toHaveLength(1);
  await expect(clientCard(page, "Mariana Torres")).toBeVisible();
});

test("cancelar el alta no guarda nada", async ({ page }) => {
  await page.goto("/clientes");
  await page.getByRole("button", { name: "+ Agregar cliente" }).click();
  const dialog = page.getByRole("dialog", { name: "Agregar cliente" });
  await dialog.getByLabel("Nombre *", { exact: true }).fill("Temporal");
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toBeHidden();
  expect(writes(/^\/clients$/)).toHaveLength(0);
});

test("editar cliente actualiza teléfono y notas", async ({ page }) => {
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Editar cliente" });
  await expect(dialog.getByRole("textbox", { name: "Nombre *" })).toHaveValue("Ana");
  await dialog.getByRole("textbox", { name: "Teléfono (opcional)" }).fill("3398765432");
  await dialog.getByRole("textbox", { name: "Notas (opcional)" }).fill("Prefiere WhatsApp");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog).toBeHidden();
  const patch = writes(/^\/clients\/c1$/)[0].body;
  expect(patch).toMatchObject({ name: "Ana López", notes: "Prefiere WhatsApp" });
  expect(patch.phone).toContain("3398765432");
});

// BUG conocido (2026-10-23): el formulario de edición deja cambiar "Tipo de
// cliente", pero el backend no acepta `type` al actualizar y saveClient lo
// descarta sin avisar. O se guarda, o el campo no debe ser editable.
test("al editar, el tipo de cliente se guarda o no se ofrece", async ({ page }) => {
  test.fail(true, "Bug: el tipo de cliente se puede cambiar al editar pero se descarta");
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Editar cliente" });
  const type = dialog.getByRole("combobox", { name: "Tipo de cliente" });
  if (await type.isDisabled()) return;
  await type.selectOption({ label: "Arrendatario" });
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect.poll(() => writes(/^\/clients\/c1$/).length).toBe(1);
  expect(writes(/^\/clients\/c1$/)[0].body.type).toBe("tenant");
});

test("eliminar cliente lo archiva y lo quita del directorio", async ({ page }) => {
  await page.goto("/clientes");
  await clientCard(page, "Diego Mora").click();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByRole("dialog", { name: "Editar cliente" }).getByRole("button", { name: "Eliminar" }).click();
  await expect.poll(() => writes(/^\/clients\/c4$/).filter((r) => r.method === "DELETE").length).toBe(1);
  await expect(clientCard(page, "Diego Mora")).toHaveCount(0);
});

// BUG conocido (2026-10-23): "Eliminar" en la edición del cliente llama a
// deleteClient directo, sin confirmación, para una acción destructiva.
test("eliminar cliente pide confirmación antes de borrar", async ({ page }) => {
  test.fail(true, "Bug: eliminar cliente no pide confirmación");
  await page.goto("/clientes");
  await clientCard(page, "Diego Mora").click();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByRole("dialog", { name: "Editar cliente" }).getByRole("button", { name: "Eliminar" }).click();
  await page.waitForTimeout(300);
  expect(writes(/^\/clients\/c4$/)).toHaveLength(0);
});

test("Editar en el core y Gestionar en el core llevan al directorio del ecosistema", async ({ page }) => {
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Gestionar en el core →" }).click();
  await expect(page).toHaveURL(/\/ecosistema\/clientes/);
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByRole("dialog", { name: "Editar cliente" }).getByRole("button", { name: "Editar en el core →" }).click();
  await expect(page).toHaveURL(/\/ecosistema\/clientes/);
});

test("estado de cuenta: enviar por correo y descargar PDF", async ({ page }) => {
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Estado de Cuenta" }).click();
  const dialog = page.getByRole("dialog", { name: "Estado de cuenta · Ana López" });
  await expect(dialog).toContainText("CT-001");
  await expect(dialog).toContainText("Cuota 1");
  await dialog.getByRole("button", { name: "Enviar por correo" }).click();
  await expect.poll(() => writes(/^\/clients\/c1\/statement\/send-email$/).length).toBe(1);
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Descargar PDF" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  await dialog.getByRole("button", { name: "Cerrar" }).first().click();
  await expect(dialog).toBeHidden();
});

test("cancelar un contrato exige motivo y manda el reembolso", async ({ page }) => {
  await page.goto("/clientes");
  await page.getByRole("row", { name: /N-1 Proyecto Norte/ }).getByRole("button", { name: "Cancelar" }).click();
  const dialog = page.getByRole("dialog", { name: "Cancelar contrato" });
  await expect(dialog.getByRole("button", { name: "Confirmar cancelación" })).toBeDisabled();
  await dialog.getByRole("textbox", { name: "Motivo de cancelación *" }).fill("Solicitud del cliente");
  await dialog.getByRole("spinbutton", { name: "Monto de reembolso ($) — opcional" }).fill("10000");
  await dialog.getByRole("button", { name: "Confirmar cancelación" }).click();
  await expect.poll(() => writes(/^\/contracts\/ct1\/cancel$/).length).toBe(1);
  const body = JSON.stringify(writes(/^\/contracts\/ct1\/cancel$/)[0].body);
  expect(body).toContain("Solicitud del cliente");
  expect(body).toContain("10000");
});

test("cerrar la cancelación no cancela el contrato", async ({ page }) => {
  await page.goto("/clientes");
  await page.getByRole("row", { name: /N-1 Proyecto Norte/ }).getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("dialog", { name: "Cancelar contrato" }).getByRole("button", { name: "Cerrar" }).click();
  expect(writes(/\/cancel$/)).toHaveLength(0);
});

test("Nuevo Contrato abre el formulario con el cliente cargado", async ({ page }) => {
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Nuevo Contrato" }).click();
  const dialog = page.getByRole("dialog", { name: "Generar Contrato" });
  await expect(dialog.getByRole("textbox", { name: "Cliente seleccionado" })).toHaveValue("Ana López");
});

test("subir un documento al expediente del cliente", async ({ page }) => {
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Subir", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Subir documento" });
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), dialog.getByRole("button", { name: /Elegir archivo/ }).click()]);
  await chooser.setFiles(PDF("ine-ana.pdf"));
  await dialog.getByRole("textbox", { name: "Nombre del documento *" }).fill("INE Ana");
  await dialog.getByRole("combobox", { name: "Categoría" }).selectOption({ label: "Identificación" });
  await dialog.getByRole("button", { name: "Guardar documento" }).click();
  await expect(dialog).toBeHidden();
  const upload = writes(/^\/documents\/upload$/)[0];
  expect(upload.query).toMatchObject({ name: "INE Ana", entity_id: "c1" });
  expect(upload.body.files[0].filename).toBe("ine-ana.pdf");
});
