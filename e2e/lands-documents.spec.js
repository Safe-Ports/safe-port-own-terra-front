// Gestión Documental: carpetas (crear, subcarpeta, renombrar, eliminar),
// subir, buscar, ordenar, mover, ver, descargar y eliminar documentos.
import { test, expect } from "@playwright/test";
import { installLandsApi } from "./helpers/landsApi.js";

const PDF = (name) => ({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 prueba") });

let db;
test.beforeEach(async ({ page }) => { db = await installLandsApi(page); });

const writes = (re) => db.log.filter((r) => r.method !== "GET" && re.test(r.path));
const sidebar = (page) => page.getByRole("complementary").filter({ hasText: "Mis carpetas" });
const folderRow = (page, name) => page.locator(".doc-folder-row").filter({ hasText: name });

async function openFolderMenu(page, name) {
  await folderRow(page, name).locator(".doc-folder-menu-btn").click();
  return page.locator(".doc-folder-menu");
}

test("crear una carpeta nueva", async ({ page }) => {
  await page.goto("/documentos");
  await sidebar(page).getByRole("button", { name: "Nueva carpeta" }).click();
  await page.getByRole("textbox", { name: "Nombre de la nueva carpeta" }).fill("Escrituras");
  await page.getByRole("textbox", { name: "Nombre de la nueva carpeta" }).press("Enter");
  await expect.poll(() => writes(/^\/document-folders$/).length).toBe(1);
  expect(writes(/^\/document-folders$/)[0].body).toMatchObject({ name: "Escrituras" });
  await expect(folderRow(page, "Escrituras")).toBeVisible();
});

test("menú de carpeta: subcarpeta, renombrar y eliminar", async ({ page }) => {
  await page.goto("/documentos");
  let menu = await openFolderMenu(page, "Expedientes");
  await menu.getByRole("button", { name: "Nueva subcarpeta" }).click();
  await page.getByRole("textbox", { name: "Nombre de la nueva carpeta" }).fill("2026");
  await page.getByRole("textbox", { name: "Nombre de la nueva carpeta" }).press("Enter");
  await expect.poll(() => writes(/^\/document-folders$/).length).toBe(1);
  expect(writes(/^\/document-folders$/)[0].body).toMatchObject({ name: "2026", parent_id: "fd1" });

  menu = await openFolderMenu(page, "Expedientes");
  await menu.getByRole("button", { name: "Renombrar" }).click();
  const rename = page.getByRole("textbox", { name: "Nombre de la carpeta Expedientes" });
  await rename.fill("Expedientes 2026");
  await rename.press("Enter");
  await expect.poll(() => writes(/^\/document-folders\/fd1$/).length).toBe(1);
  expect(writes(/^\/document-folders\/fd1$/)[0].body).toEqual({ name: "Expedientes 2026" });

  menu = await openFolderMenu(page, "Expedientes 2026");
  await menu.getByRole("button", { name: "Eliminar" }).click();
  await expect.poll(() => writes(/^\/document-folders\/fd1$/).filter((r) => r.method === "DELETE").length).toBe(1);
});

test("renombrar con Escape cancela el cambio", async ({ page }) => {
  await page.goto("/documentos");
  const menu = await openFolderMenu(page, "Expedientes");
  await menu.getByRole("button", { name: "Renombrar" }).click();
  const rename = page.getByRole("textbox", { name: "Nombre de la carpeta Expedientes" });
  await rename.fill("Otro nombre");
  await rename.press("Escape");
  await expect(folderRow(page, "Expedientes")).toBeVisible();
  expect(writes(/^\/document-folders\/fd1$/)).toHaveLength(0);
});

test("subir un documento a una carpeta", async ({ page, isMobile }) => {
  // BUG conocido (2026-10-23): en móvil el panel de carpetas ocupa casi todo
  // el ancho y la lista de archivos queda aplastada y cortada a la derecha.
  test.fail(isMobile, "Bug: Gestión Documental no se adapta a móvil");
  // Que la falla esperada sea un error de acción y no un timeout de la prueba.
  if (isMobile) page.setDefaultTimeout(5000);
  await page.goto("/documentos");
  await page.getByRole("button", { name: "Subir", exact: true }).click();
  const dialog = page.getByRole("dialog").last();
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), dialog.getByRole("button", { name: /Elegir archivo/ }).click()]);
  await chooser.setFiles(PDF("plano-general.pdf"));
  await dialog.getByRole("textbox", { name: "Nombre del documento *" }).fill("Plano general");
  await dialog.getByRole("combobox", { name: "Categoría" }).selectOption({ label: "Plano" });
  await dialog.getByRole("combobox", { name: "Carpeta (opcional)" }).selectOption({ label: "Expedientes" });
  await dialog.getByRole("textbox", { name: "Notas (opcional)" }).fill("Versión aprobada");
  await dialog.getByRole("button", { name: "Guardar documento" }).click();
  await expect(dialog).toBeHidden();
  const upload = writes(/^\/documents\/upload$/)[0];
  expect(upload.query).toMatchObject({ name: "Plano general", category: "plano", folder_id: "fd1", notes: "Versión aprobada" });
  expect(upload.body.files[0].filename).toBe("plano-general.pdf");
  await expect(page.getByText("plano-general.pdf")).toBeVisible();
});

test("buscar, ordenar y filtrar por carpeta", async ({ page, isMobile }) => {
  // BUG conocido (2026-10-23): en móvil el panel de carpetas ocupa casi todo
  // el ancho y la lista de archivos queda aplastada y cortada a la derecha.
  test.fail(isMobile, "Bug: Gestión Documental no se adapta a móvil");
  // Que la falla esperada sea un error de acción y no un timeout de la prueba.
  if (isMobile) page.setDefaultTimeout(5000);
  db.documents.push({ ...db.documents[0], id: "d2", name: "Anexo técnico.pdf", folder_id: "fd1", entity_label: null, uploaded_at: "2026-09-01T10:00:00Z" });
  await page.goto("/documentos");
  await expect(page.getByText("2 archivos")).toBeVisible();
  await page.getByPlaceholder("Buscar documento…").fill("anexo");
  await expect(page.getByText("Anexo técnico.pdf")).toBeVisible();
  await expect(page.getByText("Contrato CT-001.pdf")).toHaveCount(0);
  await page.getByPlaceholder("Buscar documento…").fill("");
  await page.getByRole("combobox").first().selectOption({ label: "Nombre A-Z" });
  await expect(page.getByText(/\.pdf$/).first()).toHaveText("Anexo técnico.pdf");
  await sidebar(page).getByRole("button", { name: /^Sin carpeta/ }).click();
  await expect(page.getByText("Anexo técnico.pdf")).toHaveCount(0);
  await folderRow(page, "Expedientes").click();
  await expect(page.getByText("Anexo técnico.pdf")).toBeVisible();
  await expect(page.getByText("Contrato CT-001.pdf")).toHaveCount(0);
});

test("mover un documento a otra carpeta", async ({ page }) => {
  await page.goto("/documentos");
  await page.getByRole("button", { name: "Mover a carpeta" }).click();
  const dialog = page.getByRole("dialog", { name: "Mover archivo" });
  await expect(dialog.getByRole("button", { name: /Sin carpeta \(raíz\) actual/ })).toBeVisible();
  await dialog.getByRole("button", { name: "Expedientes" }).click();
  await expect.poll(() => writes(/^\/documents\/d1$/).length).toBe(1);
  expect(writes(/^\/documents\/d1$/)[0].body).toMatchObject({ folder_id: "fd1" });
});

test("ver un documento, descargarlo y cerrar la vista previa", async ({ page }) => {
  await page.goto("/documentos");
  await page.getByRole("button", { name: "Ver", exact: true }).click();
  const viewer = page.getByRole("dialog", { name: "Contrato CT-001.pdf" });
  await expect(viewer.locator("iframe")).toBeVisible();
  const download = page.waitForEvent("download");
  await viewer.getByRole("button", { name: "Descargar" }).click();
  await download;
  await viewer.getByRole("button", { name: "Cerrar" }).first().click();
  await expect(viewer).toBeHidden();
  const direct = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar", exact: true }).click();
  await direct;
});

test("eliminar un documento pide confirmación", async ({ page }) => {
  await page.goto("/documentos");
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  let confirm = page.getByRole("dialog", { name: "Eliminar documento" });
  await confirm.getByRole("button", { name: "Cancelar" }).click();
  expect(writes(/^\/documents\/d1$/)).toHaveLength(0);
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  confirm = page.getByRole("dialog", { name: "Eliminar documento" });
  await confirm.getByRole("button", { name: "Eliminar" }).click();
  await expect.poll(() => writes(/^\/documents\/d1$/).filter((r) => r.method === "DELETE").length).toBe(1);
  await expect(page.getByText("Contrato CT-001.pdf")).toHaveCount(0);
});

// BUG conocido (2026-10-23): el botón ⋮ de cada carpeta no tiene nombre
// accesible (un lector de pantalla solo dice "botón").
test("el menú de carpeta tiene nombre accesible", async ({ page }) => {
  test.fail(true, "Bug: botón de menú de carpeta sin aria-label");
  await page.goto("/documentos");
  await expect(folderRow(page, "Expedientes").getByRole("button", { name: /Opciones|Acciones|Menú/ })).toBeVisible({ timeout: 1000 });
});
