// Control de Pagos: tarjetas, filtros de amortizaciones, acciones por cliente,
// ingresos y egresos manuales con comprobante.
import { test, expect } from "@playwright/test";
import { installLandsApi } from "./helpers/landsApi.js";

const PDF = (name) => ({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 prueba") });

let db;
test.beforeEach(async ({ page }) => { db = await installLandsApi(page); });

const writes = (re) => db.log.filter((r) => r.method !== "GET" && re.test(r.path));
const amortRows = (page) => page.getByRole("table").getByRole("row").filter({ hasText: /·/ });

test("tarjetas de cobranza con montos y conteos reales", async ({ page }) => {
  await page.goto("/pagos");
  await expect(page.getByRole("heading", { name: "Control Financiero" })).toBeVisible();
  await expect(page.getByText("1 cuotas saldadas")).toBeVisible();
  await expect(page.getByText(/1 cliente en mora/)).toBeVisible();
  await expect(page.getByText(/undefined/)).toHaveCount(0);
});

test("amortizaciones: filtros por estado, proyecto y búsqueda", async ({ page }) => {
  await page.goto("/pagos");
  await expect(amortRows(page).filter({ hasText: "Ana López" })).toContainText("Atrasado");
  await page.getByRole("button", { name: "Atrasados" }).click();
  await expect(amortRows(page).filter({ hasText: "Ana López" })).toBeVisible();
  await page.getByRole("button", { name: "Al día" }).click();
  await expect(amortRows(page).filter({ hasText: "Ana López" })).toHaveCount(0);
  await page.getByRole("button", { name: "Todos", exact: true }).click();
  await page.getByPlaceholder("Buscar cliente o lote…").fill("N-1");
  await expect(amortRows(page).filter({ hasText: "Ana López" })).toBeVisible();
  await page.getByPlaceholder("Buscar cliente o lote…").fill("zzz");
  await expect(amortRows(page)).toHaveCount(0);
  await page.getByPlaceholder("Buscar cliente o lote…").fill("");
  await page.getByRole("combobox").first().selectOption({ label: "Proyecto Norte" });
  await expect(amortRows(page).filter({ hasText: "Ana López" })).toBeVisible();
});

test("acciones por cliente: registrar pago, WhatsApp e historial", async ({ page }) => {
  await page.goto("/pagos");
  const row = amortRows(page).filter({ hasText: "Ana López" });
  const wa = row.getByRole("link", { name: "Recordatorio por WhatsApp" });
  await expect(wa).toHaveAttribute("href", /^https:\/\/wa\.me\/525500000001\?text=.*Ana/);
  await row.getByRole("button", { name: "Registrar pago" }).click();
  const dialog = page.getByRole("dialog", { name: "Registrar cobro" });
  await expect(dialog).toContainText("Ana López");
  await dialog.getByRole("button", { name: /Cancelar|Cerrar/ }).first().click();
  await expect(dialog).toBeHidden();
  await row.getByRole("button", { name: "Historial de amortización" }).click();
  await expect(page).toHaveURL(/\/reportes\?client=c1$/);
});

test("registrar un ingreso recibido con comprobante", async ({ page }) => {
  await page.goto("/pagos");
  await page.getByRole("button", { name: "Registrar ingreso", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Registrar ingreso" });
  await dialog.getByRole("textbox", { name: "Concepto" }).fill("Renta de bodega");
  await dialog.getByRole("combobox").first().selectOption({ label: "Renta" });
  await dialog.getByRole("textbox", { name: "Monto" }).fill("8500");
  await dialog.getByRole("textbox", { name: "Fecha del ingreso" }).fill("2026-10-15");
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), dialog.getByRole("button", { name: /Elegir archivo/ }).click()]);
  await chooser.setFiles(PDF("deposito.pdf"));
  await dialog.getByRole("button", { name: "Registrar ingreso" }).click();
  await expect(dialog).toBeHidden();
  const body = writes(/^\/incomes$/)[0].body;
  expect(body).toMatchObject({ concepto: "Renta de bodega", categoria: "renta", received: true });
  expect(Number(body.monto)).toBe(8500);
  await expect.poll(() => writes(/^\/incomes\/[^/]+\/receipt$/).length).toBe(1);

  await page.getByRole("button", { name: "Registro de Ingresos" }).click();
  await expect(page.getByRole("row", { name: /Renta de bodega/ })).toBeVisible();
  await page.getByPlaceholder("Buscar por concepto…").fill("bodega");
  await expect(page.getByRole("row", { name: /CT-001/ })).toHaveCount(0);
});

test("un ingreso esperado queda pendiente con su fecha", async ({ page }) => {
  await page.goto("/pagos");
  await page.getByRole("button", { name: "Registrar ingreso", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Registrar ingreso" });
  await dialog.getByRole("textbox", { name: "Concepto" }).fill("Comisión por venta");
  await dialog.getByRole("textbox", { name: "Monto" }).fill("12000");
  await dialog.getByRole("radio", { name: /Se espera/ }).check();
  await dialog.getByRole("button", { name: "Registrar ingreso" }).click();
  await expect(dialog).toBeHidden();
  expect(writes(/^\/incomes$/)[0].body).toMatchObject({ concepto: "Comisión por venta", received: false });
});

test("registrar un egreso pagado, recurrente y con comprobante", async ({ page }) => {
  await page.goto("/pagos");
  await page.getByRole("button", { name: "Registrar egreso", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Egreso" });
  await dialog.getByRole("textbox", { name: "Concepto" }).fill("Nómina octubre");
  await dialog.getByRole("combobox", { name: "Categoría" }).selectOption({ label: "Nómina" });
  await dialog.getByRole("textbox", { name: "Monto" }).fill("45000");
  await dialog.getByRole("radio", { name: /Ya está pagado/ }).check();
  await dialog.getByRole("combobox", { name: "Recurrencia" }).selectOption({ label: "Mensual" });
  await dialog.getByRole("textbox", { name: "Notas (opcional)" }).fill("Pago quincenal consolidado");
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), dialog.getByRole("button", { name: /Elegir archivo/ }).click()]);
  await chooser.setFiles(PDF("nomina.pdf"));
  await dialog.getByRole("button", { name: "Guardar egreso" }).click();
  await expect(dialog).toBeHidden();
  const body = writes(/^\/expenses$/)[0].body;
  expect(body).toMatchObject({ concepto: "Nómina octubre", categoria: "nomina", paid: true, recurrencia: "mensual", notes: "Pago quincenal consolidado" });
  expect(Number(body.monto)).toBe(45000);
  expect(body.paid_date).toBe(body.due_date);
  await expect.poll(() => writes(/^\/expenses\/[^/]+\/receipt$/).length).toBe(1);

  await page.getByRole("button", { name: "Registro de Egresos" }).click();
  await expect(page.getByRole("row", { name: /Nómina octubre/ })).toBeVisible();
  await page.locator("select").filter({ has: page.locator("option", { hasText: "Vencido" }) }).selectOption({ label: "Pendiente" });
  await expect(page.getByRole("row", { name: /Nómina octubre/ })).toHaveCount(0);
});

test("cerrar los formularios de ingreso y egreso no guarda", async ({ page }) => {
  await page.goto("/pagos");
  for (const [button, name] of [["Registrar ingreso", "Registrar ingreso"], ["Registrar egreso", "Egreso"]]) {
    await page.getByRole("button", { name: button, exact: true }).click();
    const dialog = page.getByRole("dialog", { name });
    await dialog.getByRole("textbox", { name: "Concepto" }).fill("No guardar");
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog).toBeHidden();
  }
  expect(writes(/^\/(incomes|expenses)$/)).toHaveLength(0);
});

// BUG conocido (2026-10-23): en Payments/index.jsx (modal de ingreso) hay
// secuencias \u00.. escritas como texto JSX y en un placeholder, donde no se
// interpretan: el usuario ve "Categoría" y "¿El dinero ya entró?".
test("el formulario de ingreso no muestra secuencias unicode crudas", async ({ page }) => {
  test.fail(true, "Bug: texto con \\u00.. literal en el modal de ingreso");
  await page.goto("/pagos");
  await page.getByRole("button", { name: "Registrar ingreso", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Registrar ingreso" });
  await expect(dialog).toContainText("Categoría");
  expect(await dialog.innerText()).not.toMatch(/\\u[0-9a-f]{4}/i);
});

test("cobro con método Otro exige describirlo y lo manda en las notas", async ({ page }) => {
  await page.goto("/pagos");
  await amortRows(page).filter({ hasText: "Ana López" }).getByRole("button", { name: "Registrar pago" }).click();
  const dialog = page.getByRole("dialog", { name: "Registrar cobro" });
  const cuota = dialog.getByRole("combobox", { name: "Cuota" });
  await cuota.selectOption({ index: 1 });
  await dialog.getByRole("combobox", { name: "Método de pago" }).selectOption({ label: "Otro" });
  await dialog.getByRole("button", { name: /^Registrar cobro|^Registrar abono|^Cobrar/ }).last().click();
  await expect(dialog.getByText("Describe el método de pago.")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Describe el método de pago*" }).fill("Depósito de un familiar");
  await dialog.getByRole("button", { name: /^Registrar cobro|^Registrar abono|^Cobrar/ }).last().click();
  await expect.poll(() => writes(/^\/payments\/[^/]+\/mark-paid$/).length).toBe(1);
  expect(writes(/^\/payments\/[^/]+\/mark-paid$/)[0].body).toMatchObject({ payment_method: "other", notes: "Método de pago: Depósito de un familiar" });
});
