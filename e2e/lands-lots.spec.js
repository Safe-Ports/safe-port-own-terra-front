// Carga de Lotes: alta de fraccionamiento con plano, matriz manual de lotes,
// edición de un lote, importación por archivo, portafolio y migración.
import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { installLandsApi } from "./helpers/landsApi.js";

// El front recomprime el plano, así que tiene que ser una imagen real.
const PLANO = { name: "plano.jpg", mimeType: "image/jpeg", buffer: fs.readFileSync(new URL("../public/apps/lands.jpg", import.meta.url)) };
const csv = (name, rows) => ({ name, mimeType: "text/csv", buffer: Buffer.from(rows) });
const LOTES_CSV = csv("lotes.csv", "Sección,ID Lote,Superficie,Precio contado\nManzana A,A-1,200,150000\nManzana A,A-2,210,155000\n");
const CLIENTES_CSV = csv("clientes.csv", "Clave Cliente,Nombre,Correo\nCLI-1,Cliente Migrado,migrado@example.com\n");
const CONTRATOS_CSV = csv("contratos.csv", "Numero de Contrato,Clave Cliente,ID Lote,Fecha,Precio,Enganche,Plazo,Cuotas pagadas\nM-001,CLI-1,A-1,2025-01-10,150000,15000,24,9\n");

let db;
test.beforeEach(async ({ page }) => { db = await installLandsApi(page); });

const writes = (re) => db.log.filter((r) => r.method !== "GET" && re.test(r.path));

async function newProject(page, name = "Valle Verde", { withPlan = true } = {}) {
  await page.goto("/lotes");
  await page.getByRole("button", { name: "+ Nuevo proyecto" }).click();
  if (name) await page.getByRole("textbox", { name: "Nombre del fraccionamiento" }).fill(name);
  if (withPlan) await page.locator('input[type="file"][accept*="image"]').first().setInputFiles(PLANO);
  await page.getByRole("button", { name: "Guardar y continuar" }).click();
}

async function addSection(page, name, count) {
  await page.getByRole("textbox", { name: "Ej: Manzana A, Frente Norte..." }).fill(name);
  await page.getByRole("textbox", { name: "Número de lotes" }).fill(String(count));
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(`${name} agregada · ${count} lotes`);
}

test("nuevo proyecto: guarda el nombre y sube el plano", async ({ page, isMobile }) => {
  await newProject(page);
  await expect(page.getByRole("status")).toContainText('Fraccionamiento "Valle Verde" guardado');
  expect(writes(/^\/inmuebles$/)[0].body).toMatchObject({ name: "Valle Verde" });
  await expect.poll(() => writes(/\/upload-map$/).length).toBe(1);
  expect(writes(/\/upload-map$/)[0].body.files[0].field).toBe("file");
  // En móvil el tablero oculta el plano para dar espacio a la matriz.
  if (!isMobile) await expect(page.getByRole("img", { name: "Plano" })).toBeVisible();
});

test("nuevo proyecto sin nombre se guarda con un nombre provisional", async ({ page }) => {
  await newProject(page, "", { withPlan: false });
  await expect.poll(() => writes(/^\/inmuebles$/).length).toBe(1);
  expect(writes(/^\/inmuebles$/)[0].body.name).toBe("Nuevo Fraccionamiento");
  await expect(page.getByRole("textbox", { name: "Nombre del fraccionamiento" })).toHaveValue("Nuevo Fraccionamiento");
});

test("matriz manual: secciones, edición de un lote con imagen y guardado", async ({ page }) => {
  await newProject(page, "Valle Verde", { withPlan: false });
  // Iniciales distintas: con "Manzana A"/"Manzana B" los códigos chocan (ver prueba de abajo).
  await addSection(page, "Etapa 1", 3);
  await addSection(page, "Frente Norte", 2);
  await expect(page.getByText(/5 lotes · 2 sec/)).toBeVisible();

  await page.getByRole("button", { name: /^E-02 Libre/ }).first().click();
  const dialog = page.getByRole("dialog", { name: "Editar lote" });
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), dialog.getByRole("button", { name: "Subir imagen" }).click()]);
  await chooser.setFiles(PLANO);
  await dialog.getByRole("button", { name: "Apartado", exact: true }).click();
  await dialog.getByRole("spinbutton", { name: "Frente (ML) (opcional)" }).fill("12");
  await dialog.getByRole("spinbutton", { name: "Fondo (ML) (opcional)" }).fill("25");
  await dialog.getByRole("spinbutton", { name: "Superficie (m²) (opcional)" }).fill("300");
  // Las especificaciones son interruptores: el checkbox real va oculto tras la etiqueta.
  for (const spec of ["Agua potable", "Lote de esquina"]) {
    await dialog.getByText(spec, { exact: true }).click();
    await expect(dialog.getByRole("checkbox", { name: spec })).toBeChecked();
  }
  await dialog.getByRole("button", { name: "Aplicar al borrador" }).click();
  await expect(dialog).toBeHidden();

  // Cancelar en el editor no aplica cambios.
  await page.getByRole("button", { name: /^E-03 Libre/ }).first().click();
  await page.getByRole("dialog", { name: "Editar lote" }).getByRole("button", { name: "Vendido", exact: true }).click();
  await page.getByRole("dialog", { name: "Editar lote" }).getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("button", { name: /^E-03 Libre/ }).first()).toBeVisible();

  await page.getByRole("button", { name: "Guardar lotes" }).click();
  await expect.poll(() => writes(/^\/lots(\/bulk)?$/).length).toBeGreaterThan(0);
  const saved = JSON.stringify(writes(/^\/lots(\/bulk)?$/).map((r) => r.body));
  expect(saved).toContain("E-02");
  expect(saved).toMatch(/"area_m2":"?300/);
});

// BUG conocido (2026-10-23): el prefijo del código sale de la inicial de la
// sección, así que "Manzana A" y "Manzana B" generan los dos M-01, M-02… y el
// editor rechaza cualquier cambio con "Ya existe un lote con este código".
// `test.fail` mantiene la suite en verde mientras el bug exista y avisa cuando
// se corrija (entonces hay que quitar la marca).
test("secciones con la misma inicial generan códigos distintos", async ({ page }) => {
  test.fail(true, "Bug: códigos de lote duplicados entre secciones con la misma inicial");
  await newProject(page, "Valle Verde", { withPlan: false });
  await addSection(page, "Manzana A", 2);
  await addSection(page, "Manzana B", 2);
  const codes = (await page.getByRole("button", { name: /Libre$/ }).allInnerTexts()).map((t) => t.split(/\s/)[0]);
  expect(new Set(codes).size).toBe(codes.length);
});

test("eliminar una sección quita sus lotes del borrador", async ({ page }) => {
  await newProject(page, "Valle Verde", { withPlan: false });
  await addSection(page, "Manzana A", 3);
  await page.getByRole("button", { name: "Eliminar sección" }).click();
  const confirm = page.getByRole("dialog");
  if (await confirm.isVisible().catch(() => false)) await confirm.getByRole("button", { name: /Eliminar|Confirmar|Sí/ }).last().click();
  await expect(page.getByText(/0 lotes · 0 sec/)).toBeVisible();
});

test("importar lotes: plantilla, formato y archivo CSV", async ({ page }) => {
  await newProject(page, "Valle Verde", { withPlan: false });
  await page.getByRole("button", { name: "Importar archivo Excel o CSV" }).click();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Plantilla" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.(xlsx|csv)$/);

  await page.getByRole("button", { name: "Ver formato" }).click();
  const formato = page.getByRole("dialog");
  await expect(formato).toBeVisible();
  await formato.getByRole("button", { name: /Cerrar|Entendido|×/ }).first().click();
  await expect(formato).toBeHidden();

  await page.locator('input[type="file"][accept=".xlsx,.xls,.csv,.txt"]').setInputFiles(LOTES_CSV);
  await expect(page.getByText("2 importados")).toBeVisible();
  const upload = writes(/^\/lots\/import-csv$/)[0];
  expect(upload.body.files[0].filename).toBe("lotes.csv");
  expect(upload.body.fields.fraccionamiento_id).toBeTruthy();
  await expect(page.getByRole("button", { name: /A-1/ })).toBeVisible();
});

test("portafolio: Ver abre el fraccionamiento y Editar lotes abre el tablero", async ({ page }) => {
  await page.goto("/lotes");
  const norte = page.getByRole("article").filter({ hasText: "Proyecto Norte" });
  await expect(norte).toContainText(/Vendido\s*1/);
  await norte.getByRole("button", { name: "Ver" }).click();
  await expect(page).toHaveURL(/fraccionamientos/);
  await page.goto("/lotes");
  await page.getByRole("article").filter({ hasText: "Proyecto Norte" }).getByRole("button", { name: "Editar lotes" }).click();
  await expect(page.getByRole("textbox", { name: "Nombre del fraccionamiento" })).toHaveValue("Proyecto Norte");
  await expect(page.getByRole("button", { name: /N-2/ })).toBeVisible();
});

test("importar CAD está marcado como próximamente", async ({ page }) => {
  await page.goto("/lotes");
  await expect(page.getByRole("button", { name: "Importar CAD, próximamente" })).toBeVisible();
});

test("migrar fraccionamiento: lotes, clientes y contratos en tres pasos", async ({ page }) => {
  await page.goto("/lotes");
  await page.getByRole("button", { name: "Migrar fraccionamiento" }).click();
  await expect(page.getByRole("heading", { name: "Migrar un fraccionamiento" })).toBeVisible();
  await expect(page.getByRole("button", { name: "2. Clientes" })).toBeDisabled();
  await page.getByRole("combobox").selectOption({ label: "Proyecto Norte" });

  const step = async (file, label) => {
    await page.locator('input[type="file"][accept=".xlsx,.xls,.csv"]').setInputFiles(file);
    await page.getByRole("button", { name: "Revisar archivo" }).click();
    await page.getByRole("button", { name: /^Cargar \d+ registros$/ }).click();
    if (label) await page.getByRole("button", { name: label }).click();
  };
  await step(LOTES_CSV, "Continuar al paso 2");
  await step(CLIENTES_CSV, "Continuar al paso 3");
  await step(CONTRATOS_CSV);
  await expect(page.getByText("Migración completa")).toBeVisible();

  // Cada fase se revisa en seco antes de escribir.
  const lotes = writes(/^\/lots\/import-csv$/);
  expect(lotes.map((r) => r.body.fields.dry_run === "true")).toEqual([true, false]);
  expect(lotes[1].body.fields).toMatchObject({ fraccionamiento_id: "f1", mode: "tolerant", update_existing: "true" });
  expect(writes(/^\/clients\/import$/).map((r) => r.body.fields.dry_run)).toEqual(["true", "false"]);
  const contratos = writes(/^\/contracts\/import\/batch$/);
  expect(contratos.map((r) => r.body.dry_run)).toEqual([true, false]);
  expect(contratos[1].body.rows[0]).toMatchObject({ numero_contrato: "M-001", id_lote: "A-1", fraccionamiento: "Proyecto Norte" });

  await page.getByRole("button", { name: "Ver los lotes de Proyecto Norte →" }).click();
  await expect(page).toHaveURL(/\/fraccionamientos\?frac=f1/);
});

test("migrar: volver regresa a Carga de Lotes", async ({ page }) => {
  await page.goto("/lotes");
  await page.getByRole("button", { name: "Migrar fraccionamiento" }).click();
  await page.getByRole("button", { name: "Volver a Carga de Lotes" }).click();
  await expect(page.getByRole("heading", { name: "Lotes y proyectos" })).toBeVisible();
});
