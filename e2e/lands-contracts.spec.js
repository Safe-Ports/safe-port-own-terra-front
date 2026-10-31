// Contratos: aprobación y rechazo, filtros del repositorio, alta completa con
// documentos, edición, PDF, estado de cuenta y devoluciones de lotes liberados.
import { test, expect } from "@playwright/test";
import { installLandsApi } from "./helpers/landsApi.js";

const PDF = (name) => ({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 prueba") });

let db;
test.beforeEach(async ({ page }) => { db = await installLandsApi(page); });

const writes = (re) => db.log.filter((r) => r.method !== "GET" && re.test(r.path));
const contractsQuery = () => db.log.filter((r) => r.path === "/contracts" && r.method === "GET").at(-1)?.query;
const tableBody = (page) => page.locator(".tbl tbody").first();

test("aprobar un contrato pendiente lo saca de la bandeja", async ({ page }) => {
  await page.goto("/contratos");
  const pendiente = page.getByRole("listitem").filter({ hasText: "CT-002" });
  await expect(pendiente).toContainText("Lo armó Test User");
  await pendiente.getByRole("button", { name: "Aprobar" }).click();
  await expect.poll(() => writes(/^\/contracts\/ct2\/approve$/).length).toBe(1);
  await expect(page.getByText("Contratos por aprobar")).toHaveCount(0);
  await expect(page.getByRole("row", { name: /CT-002/ })).toContainText("Vigente");
});

test("rechazar exige motivo y se puede cancelar", async ({ page }) => {
  await page.goto("/contratos");
  const pendiente = page.getByRole("listitem").filter({ hasText: "CT-002" });
  await pendiente.getByRole("button", { name: "Rechazar" }).click();
  await expect(pendiente.getByRole("button", { name: "Rechazar" })).toBeDisabled();
  await pendiente.getByRole("button", { name: "Cancelar" }).click();
  await expect(pendiente.getByRole("textbox", { name: "Motivo del rechazo" })).toHaveCount(0);

  await pendiente.getByRole("button", { name: "Rechazar" }).click();
  await pendiente.getByRole("textbox", { name: "Motivo del rechazo" }).fill("El enganche no cuadra con lo acordado");
  await pendiente.getByRole("button", { name: "Rechazar" }).click();
  await expect.poll(() => writes(/^\/contracts\/ct2\/reject$/).length).toBe(1);
  expect(JSON.stringify(writes(/^\/contracts\/ct2\/reject$/)[0].body)).toContain("El enganche no cuadra");
});

test("filtros del repositorio: número, cliente y estado", async ({ page }) => {
  await page.goto("/contratos");
  await page.getByRole("searchbox", { name: "Buscar contrato por número" }).fill("CT-002");
  await expect(tableBody(page)).toContainText("CT-002");
  await expect(tableBody(page)).not.toContainText("CT-001");
  expect(contractsQuery()).toMatchObject({ search: "CT-002" });
  await page.getByRole("searchbox", { name: "Buscar contrato por número" }).fill("");

  await page.getByRole("combobox", { name: "Estado" }).selectOption({ label: "Vigente" });
  await expect(tableBody(page)).toContainText("CT-001");
  await expect(tableBody(page)).not.toContainText("CT-002");
  expect(contractsQuery()).toMatchObject({ status: "active" });
  await page.getByRole("combobox", { name: "Estado" }).selectOption({ label: "Todos los estados" });

  await page.getByRole("textbox", { name: "Buscar cliente por nombre, correo o teléfono" }).fill("Bruno");
  await page.getByRole("button").filter({ hasText: "Bruno Díaz" }).last().click();
  await expect(tableBody(page)).toContainText("CT-002");
  await expect(tableBody(page)).not.toContainText("CT-001");
  expect(contractsQuery()).toMatchObject({ client_id: "c2" });
});

test("generar contrato: valida obligatorios", async ({ page }) => {
  await page.goto("/contratos");
  await page.getByRole("button", { name: "+ Generar Contrato" }).click();
  const dialog = page.getByRole("dialog", { name: "Generar Contrato" });
  await expect(dialog.getByText("Selecciona un cliente")).toBeVisible();
  await dialog.getByRole("button", { name: "Registrar" }).click();
  expect(writes(/^\/contracts$/)).toHaveLength(0);
  await expect(dialog).toBeVisible();
});

test("generar contrato completo con vendedor, condiciones y documento", async ({ page, isMobile }) => {
  // BUG conocido (2026-10-23): en móvil la fila del documento se encoge hasta
  // dejar solo el ícono y no se ve qué archivo se adjuntó.
  test.fail(isMobile, "Bug: en móvil no se ve el nombre del archivo adjunto al contrato");
  await page.goto("/contratos");
  await page.getByRole("button", { name: "+ Generar Contrato" }).click();
  const dialog = page.getByRole("dialog", { name: "Generar Contrato" });
  await dialog.getByRole("textbox", { name: "N° de Contrato (opcional)" }).fill("CT-100");
  await dialog.getByRole("combobox", { name: "Fraccionamiento*" }).selectOption({ label: "Proyecto Norte · 2 disponibles" });
  await dialog.getByRole("textbox", { name: "Lote*" }).fill("N-2");
  await dialog.getByText("N-2", { exact: true }).click();
  await dialog.getByRole("textbox", { name: "Buscar cliente por nombre, correo o teléfono" }).fill("Carla");
  await page.getByRole("button").filter({ hasText: "Carla Ruiz" }).last().click();
  await dialog.getByRole("combobox", { name: "Tipo de Contrato" }).selectOption({ label: "Compraventa" });
  await dialog.getByRole("textbox", { name: "Fecha de firma*" }).fill("2026-10-20");
  await dialog.getByRole("textbox", { name: "Primer pago*" }).fill("2026-11-20");
  await dialog.getByRole("textbox", { name: "Buscar vendedor por nombre o correo" }).fill("Vera");
  await dialog.getByRole("button").filter({ hasText: "Vera Vendedora" }).last().click();
  await dialog.getByRole("textbox", { name: "Notas" }).fill("Firma en notaría 12");
  await dialog.getByRole("textbox", { name: "Monto total ($)*" }).fill("200000");
  await dialog.getByRole("textbox", { name: "Enganche ($)" }).fill("20000");
  await dialog.getByRole("spinbutton", { name: "Plazo (meses)*" }).fill("12");
  await dialog.getByRole("combobox", { name: "Método de pago del enganche" }).selectOption({ label: "Transferencia" });
  await expect(dialog).toContainText("15,000");

  // Cada "Agregar documento" suma una fila: archivo, categoría y carpeta destino.
  await dialog.getByRole("button", { name: "Agregar documento" }).click();
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), dialog.getByRole("button", { name: /Seleccionar archivo/ }).click()]);
  await chooser.setFiles(PDF("contrato-firmado.pdf"));
  await expect(dialog.getByText("contrato-firmado.pdf")).toBeVisible();

  await dialog.getByRole("button", { name: "Registrar" }).click();
  await expect.poll(() => writes(/^\/contracts$/).length).toBe(1);
  expect(writes(/^\/contracts$/)[0].body).toMatchObject({
    client_id: "c3", lot_id: "l2", type: "sale",
    contract_date: "2026-10-20", first_payment_date: "2026-11-20", seller_id: "u2",
    notes: "Firma en notaría 12", down_payment_method: "transfer", total_months: 12,
  });
  expect(Number(writes(/^\/contracts$/)[0].body.amount)).toBe(200000);
  expect(Number(writes(/^\/contracts$/)[0].body.down_payment)).toBe(20000);
  await expect.poll(() => writes(/^\/documents\/upload$/).length).toBe(1);
  expect(writes(/^\/documents\/upload$/)[0].body.files[0].filename).toBe("contrato-firmado.pdf");
});

test("venta de contado sin calculadora y con método de pago Otro", async ({ page }) => {
  // Sin calculadora activa la venta ya no se bloquea.
  db.calculators.forEach((c) => { c.is_active = false; });
  await page.goto("/contratos");
  await page.getByRole("button", { name: "+ Generar Contrato" }).click();
  const dialog = page.getByRole("dialog", { name: "Generar Contrato" });
  await dialog.getByRole("combobox", { name: "Fraccionamiento*" }).selectOption({ label: "Proyecto Norte · 2 disponibles" });
  await dialog.getByRole("textbox", { name: "Lote*" }).fill("N-2");
  await dialog.getByText("N-2", { exact: true }).click();
  await dialog.getByRole("textbox", { name: "Buscar cliente por nombre, correo o teléfono" }).fill("Carla");
  await page.getByRole("button").filter({ hasText: "Carla Ruiz" }).last().click();
  await dialog.getByRole("combobox", { name: "Tipo de Contrato" }).selectOption({ label: "Compraventa" });
  await dialog.getByRole("radio", { name: /De contado/ }).click();
  await expect(dialog.getByRole("textbox", { name: "Enganche ($)" })).toHaveCount(0);
  await expect(dialog.getByRole("spinbutton", { name: /Plazo/ })).toHaveCount(0);
  await dialog.getByRole("textbox", { name: "Fecha de firma*" }).fill("2026-10-20");
  await dialog.getByRole("textbox", { name: "Fecha de pago*" }).fill("2026-10-20");
  await dialog.getByRole("textbox", { name: "Monto total ($)*" }).fill("350000");
  await expect(dialog.getByRole("textbox", { name: "Monto total ($)*" })).toHaveValue("350,000");
  await dialog.getByRole("combobox", { name: "Método de pago" }).selectOption({ label: "Otro" });
  await dialog.getByRole("button", { name: "Registrar" }).click();
  await expect(dialog.getByText("Describe cómo se va a pagar")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Describe el método de pago*" }).fill("Permuta de un terreno");
  await dialog.getByRole("button", { name: "Registrar" }).click();
  await expect.poll(() => writes(/^\/contracts$/).length).toBe(1);
  const body = writes(/^\/contracts$/)[0].body;
  expect(body).toMatchObject({ type: "sale", total_months: 1, interest_rate: 0, down_payment_method: "other", down_payment_method_detail: "Permuta de un terreno" });
  expect(Number(body.down_payment)).toBe(0);
  expect(body.calculator_id).toBeUndefined();
});

test("venta en parcialidades: sin intereses ni calculadora", async ({ page }) => {
  db.calculators.forEach((c) => { c.is_active = false; });
  await page.goto("/contratos");
  await page.getByRole("button", { name: "+ Generar Contrato" }).click();
  const dialog = page.getByRole("dialog", { name: "Generar Contrato" });
  await dialog.getByRole("combobox", { name: "Fraccionamiento*" }).selectOption({ label: "Proyecto Norte · 2 disponibles" });
  await dialog.getByRole("textbox", { name: "Lote*" }).fill("N-2");
  await dialog.getByText("N-2", { exact: true }).click();
  await dialog.getByRole("textbox", { name: "Buscar cliente por nombre, correo o teléfono" }).fill("Carla");
  await page.getByRole("button").filter({ hasText: "Carla Ruiz" }).last().click();
  await dialog.getByRole("combobox", { name: "Tipo de Contrato" }).selectOption({ label: "Compraventa" });
  await dialog.getByRole("radio", { name: /En parcialidades/ }).click();
  await expect(dialog.getByText("Falta la calculadora de financiamiento")).toHaveCount(0);
  await dialog.getByRole("textbox", { name: "Fecha de firma*" }).fill("2026-10-20");
  await dialog.getByRole("textbox", { name: "Primer pago*" }).fill("2026-11-20");
  await dialog.getByRole("textbox", { name: "Monto total ($)*" }).fill("120000");
  await dialog.getByRole("textbox", { name: "Enganche ($)" }).fill("20000");
  await dialog.getByRole("spinbutton", { name: "Número de pagos*" }).fill("4");
  await dialog.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect.poll(() => writes(/^\/contracts$/).length).toBe(1);
  expect(writes(/^\/contracts$/)[0].body).toMatchObject({ total_months: 4, interest_rate: 0 });
  expect(writes(/^\/contracts$/)[0].body.calculator_id).toBeUndefined();
});

// La calculadora es opcional: sin ella (o si la venta elige no usarla) el backend
// aplica la amortización estándar con la tasa anual del formulario.
async function fillFinancedSale(page, dialog) {
  await dialog.getByRole("combobox", { name: "Fraccionamiento*" }).selectOption({ label: "Proyecto Norte · 2 disponibles" });
  await dialog.getByRole("textbox", { name: "Lote*" }).fill("N-2");
  await dialog.getByText("N-2", { exact: true }).click();
  await dialog.getByRole("textbox", { name: "Buscar cliente por nombre, correo o teléfono" }).fill("Carla");
  await page.getByRole("button").filter({ hasText: "Carla Ruiz" }).last().click();
  await dialog.getByRole("combobox", { name: "Tipo de Contrato" }).selectOption({ label: "Compraventa" });
  await dialog.getByRole("radio", { name: /A mensualidades/ }).click();
  await dialog.getByRole("textbox", { name: "Fecha de firma*" }).fill("2026-10-20");
  await dialog.getByRole("textbox", { name: "Primer pago*" }).fill("2026-11-20");
  await dialog.getByRole("textbox", { name: "Monto total ($)*" }).fill("120000");
  await dialog.getByRole("textbox", { name: "Enganche ($)" }).fill("20000");
  await dialog.getByRole("spinbutton", { name: "Plazo (meses)*" }).fill("12");
}

test("a mensualidades sin calculadora usa la amortización estándar", async ({ page }) => {
  db.calculators.forEach((c) => { c.is_active = false; });
  await page.goto("/contratos");
  await page.getByRole("button", { name: "+ Generar Contrato" }).click();
  const dialog = page.getByRole("dialog", { name: "Generar Contrato" });
  await fillFinancedSale(page, dialog);
  await expect(dialog.getByText("Mensualidad con amortización estándar")).toBeVisible();
  await expect(dialog.getByRole("radio", { name: /Amortización estándar/ })).toHaveCount(0);
  // 100,000 a 12 meses al 12% anual: pago fijo francés.
  await expect(dialog).toContainText("8,884.88");
  await dialog.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect.poll(() => writes(/^\/contracts$/).length).toBe(1);
  const body = writes(/^\/contracts$/)[0].body;
  expect(body).toMatchObject({ total_months: 12, interest_rate: 0.12 });
  expect(body.calculator_id).toBeUndefined();
});

test("con calculadora activa la venta puede elegir la amortización estándar", async ({ page }) => {
  await page.goto("/contratos");
  await page.getByRole("button", { name: "+ Generar Contrato" }).click();
  const dialog = page.getByRole("dialog", { name: "Generar Contrato" });
  await fillFinancedSale(page, dialog);
  await expect(dialog.getByRole("radio", { name: /Calculadora/ })).toHaveAttribute("aria-checked", "true");
  await dialog.getByRole("radio", { name: /Amortización estándar/ }).click();
  await expect(dialog.getByText("Esta venta no usa la calculadora", { exact: false })).toBeVisible();
  await dialog.getByRole("spinbutton", { name: /Tasa anual/ }).fill("0.1");
  await dialog.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect.poll(() => writes(/^\/contracts$/).length).toBe(1);
  const body = writes(/^\/contracts$/)[0].body;
  expect(body).toMatchObject({ total_months: 12, interest_rate: 0.1 });
  expect(body.calculator_id).toBeUndefined();
});

test("registrar incompleto avisa qué falta", async ({ page }) => {
  await page.goto("/contratos");
  await page.getByRole("button", { name: "+ Generar Contrato" }).click();
  const dialog = page.getByRole("dialog", { name: "Generar Contrato" });
  await dialog.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect(page.getByText(/El contrato todavía no está completo\. Revisa: .*lote.*cliente/)).toBeVisible();
});

// BUG conocido (2026-10-23): el formulario ofrece "N° de Contrato (opcional)" y
// lands-back lo acepta en ContractCreate, pero saveContract solo lo manda al
// editar: al crear se pierde y el contrato queda con el número automático.
test("el número de contrato escrito al crear se envía", async ({ page }) => {
  test.fail(true, "Bug: contract_number no se envía al crear el contrato");
  await page.goto("/contratos");
  await page.getByRole("button", { name: "+ Generar Contrato" }).click();
  const dialog = page.getByRole("dialog", { name: "Generar Contrato" });
  await dialog.getByRole("textbox", { name: "N° de Contrato (opcional)" }).fill("CT-100");
  await dialog.getByRole("textbox", { name: "Lote*" }).fill("N-2");
  await dialog.getByText("N-2", { exact: true }).click();
  await dialog.getByRole("textbox", { name: "Buscar cliente por nombre, correo o teléfono" }).fill("Carla");
  await page.getByRole("button").filter({ hasText: "Carla Ruiz" }).last().click();
  await dialog.getByRole("textbox", { name: "Monto total ($)*" }).fill("200000");
  await dialog.getByRole("button", { name: "Registrar" }).click();
  await expect.poll(() => writes(/^\/contracts$/).length).toBe(1);
  expect(writes(/^\/contracts$/)[0].body.contract_number).toBe("CT-100");
});

test("editar contrato guarda los cambios y cancelar no", async ({ page }) => {
  await page.goto("/contratos");
  await page.getByRole("row", { name: /CT-001/ }).getByRole("button", { name: "Editar" }).click();
  let dialog = page.getByRole("dialog", { name: "Editar Contrato" });
  await expect(dialog.getByRole("combobox", { name: "Fraccionamiento" })).toBeDisabled();
  await dialog.getByRole("textbox", { name: "Notas" }).fill("No guardar");
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toBeHidden();
  expect(writes(/^\/contracts\/ct1$/)).toHaveLength(0);

  await page.getByRole("button", { name: "CT-001", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Editar Contrato" });
  await dialog.getByRole("textbox", { name: "Notas" }).fill("Cliente pidió factura");
  await dialog.getByRole("spinbutton", { name: "Plazo (meses)" }).fill("24");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect.poll(() => writes(/^\/contracts\/ct1$/).length).toBe(1);
  expect(writes(/^\/contracts\/ct1$/)[0].body).toMatchObject({ notes: "Cliente pidió factura", total_months: 24 });
});

test("acciones de fila: adjuntar documento, estado de cuenta y PDF", async ({ page }) => {
  await page.goto("/contratos");
  const row = page.getByRole("row", { name: /CT-001/ });
  await row.getByRole("button", { name: "Adjuntar documento a CT-001" }).click();
  const upload = page.getByRole("dialog").last();
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), upload.getByRole("button", { name: /Elegir archivo/ }).click()]);
  await chooser.setFiles(PDF("anexo.pdf"));
  await upload.getByRole("textbox", { name: "Nombre del documento *" }).fill("Anexo A");
  await upload.getByRole("button", { name: "Guardar documento" }).click();
  await expect.poll(() => writes(/^\/documents\/upload$/).length).toBe(1);
  expect(writes(/^\/documents\/upload$/)[0].query).toMatchObject({ name: "Anexo A", entity_id: "ct1" });

  await row.getByRole("button", { name: "Estado de cuenta de Ana López" }).click();
  await expect(page.getByRole("dialog", { name: "Estado de cuenta · Ana López" })).toBeVisible();
  await page.getByRole("dialog", { name: "Estado de cuenta · Ana López" }).getByRole("button", { name: "Cerrar" }).first().click();

  const download = page.waitForEvent("download");
  await row.getByRole("button", { name: "PDF" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  expect(db.log.some((r) => r.path === "/contracts/ct1/pdf")).toBeTruthy();
});

test("lotes liberados: registrar devolución con comprobante", async ({ page }) => {
  await page.goto("/contratos");
  const fila = page.getByRole("row", { name: /N-4 · Proyecto Norte/ });
  await expect(fila).toContainText("Carla Ruiz");
  await fila.getByRole("button", { name: "Registrar devolución" }).click();
  const dialog = page.getByRole("dialog", { name: "Registrar devolución" });
  await dialog.getByLabel("¿Cuánto se le devolvió?").fill("25000");
  await dialog.locator('input[type="file"]').setInputFiles(PDF("devolucion.pdf"));
  await dialog.getByRole("button", { name: /Registrar|Guardar|Liquidar/ }).last().click();
  await expect.poll(() => writes(/^\/contracts\/releases\/settle$/).length).toBe(1);
  expect(writes(/^\/contracts\/releases\/settle$/)[0].body.fields).toMatchObject({ kind: "contract", ref_id: "ct9", refunded: "25000" });
  await expect(fila).toContainText("Liquidado");
});

test("/ventas abre el mismo repositorio de contratos", async ({ page }) => {
  await page.goto("/ventas");
  await expect(page.getByText("Repositorio de Contratos")).toBeVisible();
  await expect(tableBody(page)).toContainText("CT-001");
});
