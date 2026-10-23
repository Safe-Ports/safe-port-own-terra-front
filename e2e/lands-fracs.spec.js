// Fraccionamientos: lista de proyectos, vista de un proyecto (filtros, matriz,
// cotizador) y acciones sobre un lote (apartar, extender, liberar, vender,
// agendar cita y subir documentos).
import { test, expect } from "@playwright/test";
import { installLandsApi } from "./helpers/landsApi.js";

const PDF = (name = "comprobante.pdf") => ({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 prueba") });

let db;
test.beforeEach(async ({ page }) => { db = await installLandsApi(page); });

const writes = (re) => db.log.filter((r) => r.method !== "GET" && re.test(r.path));

async function openProject(page, name = "Proyecto Norte") {
  await page.goto("/fraccionamientos");
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
}

async function openLot(page, code) {
  await openProject(page);
  await page.getByRole("button", { name: new RegExp(`^${code} `) }).click();
  return page.getByRole("complementary", { name: `Detalle del lote ${code}` });
}

async function pickClient(scope, page, name) {
  await scope.getByRole("textbox", { name: "Buscar cliente por nombre, correo o teléfono" }).fill(name.split(" ")[0]);
  await page.getByRole("button").filter({ hasText: name }).last().click();
}

test("lista de proyectos: búsqueda y apertura", async ({ page }) => {
  await page.goto("/fraccionamientos");
  await expect(page.getByRole("heading", { name: "Proyectos", level: 1 })).toBeVisible();
  await page.getByPlaceholder("Buscar proyecto").fill("bosque");
  await expect(page.getByRole("button", { name: /Bosque Sur/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Proyecto Norte/ })).toHaveCount(0);
  await page.getByPlaceholder("Buscar proyecto").fill("");
  await openProject(page);
  await page.getByRole("button", { name: "Proyectos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Proyectos", level: 1 })).toBeVisible();
});

test("vista del proyecto: filtros por estado, búsqueda y modos de vista", async ({ page }) => {
  await openProject(page);
  await expect(page.getByText(/Total lotes/)).toBeVisible();
  const lotButtons = () => page.getByRole("button", { name: /^N-\d /, exact: false });
  await expect(lotButtons()).toHaveCount(4);
  await page.getByRole("button", { name: "Disponible", exact: true }).click();
  await expect(lotButtons()).toHaveCount(2);
  await page.getByRole("button", { name: "Vendido", exact: true }).click();
  await expect(lotButtons()).toHaveCount(1);
  await page.getByRole("button", { name: "Todos", exact: true }).click();
  await page.getByPlaceholder("Buscar lote o manzana").fill("N-3");
  await expect(lotButtons()).toHaveCount(1);
  await page.getByPlaceholder("Buscar lote o manzana").fill("");
  await page.getByRole("button", { name: "Vista matriz" }).click();
  await expect(page.getByText("N-4", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Plano de referencia")).toHaveCount(0);
  await page.getByRole("button", { name: "Plano y matriz" }).click();
  await expect(page.getByText("Plano de referencia")).toBeVisible();
});

test("Exportar descarga el inventario de lotes", async ({ page }) => {
  await openProject(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar" }).click();
  await download;
  expect(db.log.some((r) => r.path === "/export/lots")).toBeTruthy();
});

// BUG conocido (2026-10-23): "Editar" arma el borrador del proyecto y navega a
// /lotes, pero LotsPage reinicia el borrador al montarse (useEffect inicial) y
// el usuario cae en el portafolio en vez del tablero del proyecto.
test("Editar abre el tablero de lotes del proyecto", async ({ page }) => {
  test.fail(true, "Bug: Carga de Lotes descarta el borrador que arma Fraccionamientos");
  await openProject(page);
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page).toHaveURL(/\/lotes$/);
  await expect(page.getByRole("textbox", { name: "Nombre del fraccionamiento" })).toHaveValue("Proyecto Norte");
});

test("detalle del lote: ficha técnica, subir documento y cerrar", async ({ page }) => {
  const panel = await openLot(page, "N-2");
  await expect(panel).toContainText(/Superficie\s*200\s*m²/);
  await expect(panel).toContainText(/Precio financiado\s*\$240,000/);
  await panel.getByRole("button", { name: "Subir", exact: true }).click();
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), panel.getByRole("button", { name: /Elegir archivo/ }).click()]);
  await chooser.setFiles(PDF("escritura.pdf"));
  await panel.getByRole("textbox", { name: "Nombre del documento *" }).fill("Escritura N-2");
  await panel.getByRole("combobox", { name: "Categoría" }).selectOption({ label: "Escritura" });
  await panel.getByRole("combobox", { name: "Carpeta (opcional)" }).selectOption({ label: "Sin carpeta (raíz)" });
  await panel.getByRole("textbox", { name: "Notas (opcional)" }).fill("Original en notaría");
  await panel.getByRole("button", { name: "Guardar documento" }).click();
  await expect.poll(() => writes(/^\/documents\/upload$/).length).toBe(1);
  const upload = writes(/^\/documents\/upload$/)[0];
  expect(upload.query).toMatchObject({ entity_type: "inventory_unit", entity_id: "l2", category: "escritura", name: "Escritura N-2", notes: "Original en notaría" });
  expect(upload.body.files[0].filename).toBe("escritura.pdf");
  await panel.getByRole("button", { name: "Cerrar" }).click();
  await expect(panel).toBeHidden();
});

test("apartar un lote con cliente, vencimiento, monto y comprobantes", async ({ page }) => {
  const panel = await openLot(page, "N-2");
  await panel.getByRole("button", { name: "Apartar lote" }).click();
  await expect(panel.getByRole("button", { name: "Confirmar apartado" })).toBeDisabled();
  await pickClient(panel, page, "Carla Ruiz");
  await panel.getByRole("button", { name: "15 días" }).click();
  await panel.getByRole("spinbutton", { name: "Monto del apartado (opcional)" }).fill("5000");
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), panel.getByRole("button", { name: /Elegir archivos/ }).click()]);
  await chooser.setFiles([PDF("transferencia.pdf"), PDF("ine.pdf")]);
  await panel.getByRole("button", { name: "Confirmar apartado" }).click();
  await expect(page.getByText("Lote apartado")).toBeVisible();

  const patch = writes(/^\/lots\/l2$/)[0].body;
  expect(patch).toMatchObject({ status: "reserved", client_id: "c3", reserved_amount: 5000 });
  const days = (new Date(patch.reserved_until) - Date.now()) / 86400000;
  expect(days).toBeGreaterThan(14);
  expect(days).toBeLessThan(16);
  expect(writes(/^\/lots\/l2\/reservation-receipt$/)[0].body.files).toHaveLength(2);
});

test("apartar sin vencimiento válido muestra el error y no guarda", async ({ page }) => {
  const panel = await openLot(page, "N-2");
  await panel.getByRole("button", { name: "Apartar lote" }).click();
  await pickClient(panel, page, "Carla Ruiz");
  await panel.getByRole("textbox", { name: "Vence el *" }).fill("2020-01-01T10:00");
  await panel.getByRole("button", { name: "Confirmar apartado" }).click();
  await expect(panel.getByText("Elige un vencimiento posterior a este momento.")).toBeVisible();
  expect(writes(/^\/lots\/l2$/)).toHaveLength(0);
});

test("lote apartado: extender vencimiento y liberar", async ({ page }) => {
  const panel = await openLot(page, "N-3");
  await panel.getByRole("button", { name: "Extender vencimiento" }).click();
  await panel.getByRole("button", { name: "30 días" }).click();
  await panel.getByRole("button", { name: "Guardar vencimiento" }).click();
  await expect(page.getByText("Vencimiento actualizado")).toBeVisible();
  expect(writes(/^\/lots\/l3$/)[0].body).toMatchObject({ client_id: "c2" });

  await panel.getByRole("button", { name: "Liberar lote" }).click();
  await expect(page.getByText("Lote liberado")).toBeVisible();
  expect(writes(/^\/lots\/l3$/).at(-1).body).toEqual({ status: "available" });
});

test("registrar venta lleva al contrato con comprador y lote cargados", async ({ page }) => {
  const panel = await openLot(page, "N-2");
  await panel.getByRole("button", { name: "Registrar venta" }).click();
  await expect(panel.getByRole("button", { name: "Continuar al contrato →" })).toBeDisabled();
  await pickClient(panel, page, "Diego Mora");
  await panel.getByRole("button", { name: "Continuar al contrato →" }).click();
  const dialog = page.getByRole("dialog", { name: /Generar Contrato/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("#cf-clientId")).toHaveValue("Diego Mora");
  await expect(dialog).toContainText("N-2");
});

test("agendar una cita desde el lote", async ({ page }) => {
  const panel = await openLot(page, "N-2");
  await panel.getByRole("button", { name: "Agendar cita" }).click();
  await pickClient(panel, page, "Ana López");
  await panel.getByRole("textbox", { name: "Fecha" }).fill("2026-11-05");
  await panel.getByRole("textbox", { name: "Hora" }).fill("10:30");
  await panel.getByRole("textbox", { name: "Notas" }).fill("Visita al terreno");
  await panel.getByRole("button", { name: "Guardar cita" }).click();
  await expect(page.getByText("Cita agendada")).toBeVisible();
  expect(writes(/^\/appointments$/)[0].body).toMatchObject({ lot_id: "l2", client_id: "c1", contact_name: "Ana López", notes: "Visita al terreno" });
});

test("volver desde un formulario regresa a la ficha del lote", async ({ page }) => {
  const panel = await openLot(page, "N-2");
  await panel.getByRole("button", { name: "Agendar cita" }).click();
  await panel.getByRole("button", { name: "← Volver" }).click();
  await expect(panel).toContainText("Ficha técnica");
});

test("cotizador rápido y completo usan el plan activo", async ({ page }) => {
  await openProject(page);
  await page.getByRole("button", { name: /Cotizador rapido/ }).click();
  await expect(page.getByText(/Plan: Plan aprobado/)).toBeVisible();
  await page.getByRole("button", { name: "Abrir cotizador completo" }).click();
  const dialog = page.getByRole("dialog", { name: "Cotizador" });
  await dialog.getByLabel("Precio financiado").fill("120000");
  await dialog.getByLabel("Enganche", { exact: true }).fill("20000");
  await dialog.getByLabel("Plazo (meses)").fill("10");
  await expect(dialog.locator(".frac-quote-result")).toContainText("10,000");
});
