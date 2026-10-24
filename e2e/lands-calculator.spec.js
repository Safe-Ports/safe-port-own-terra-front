// Calculadora de financiamiento: crear con fórmula y modo prueba, validar,
// editar, activar y eliminar calculadoras.
import { test, expect } from "@playwright/test";
import { installLandsApi } from "./helpers/landsApi.js";

let db;
test.beforeEach(async ({ page }) => {
  db = await installLandsApi(page);
  db.calculators.push({
    id: "calc2", app_key: "lands", name: "Plan 12%", description: "Interés simple",
    formula: "(PRECIO - ENGANCHE) * 1.12 / MESES", variables: ["PRECIO", "ENGANCHE", "MESES"],
    is_active: false, created_by: "u1", created_at: "2026-10-01T10:00:00Z",
  });
});

const writes = (re) => db.log.filter((r) => r.method !== "GET" && re.test(r.path));
const calcItem = (page, name) => page.getByRole("button", { name: new RegExp(`^${name}`) });

test("nueva calculadora: analizar, probar y guardar", async ({ page }) => {
  await page.goto("/calculadora");
  await page.getByRole("button", { name: "+ Nueva calculadora" }).click();
  await page.getByRole("textbox", { name: "Nombre *" }).fill("Plan con tasa");
  await page.getByRole("textbox", { name: "Descripción (opcional)" }).fill("Tasa simple anual");
  await page.getByRole("textbox", { name: "Fórmula matemática *" }).fill("(PRECIO - ENGANCHE) * (1 + TASA / 100) / MESES");
  await page.getByRole("button", { name: "Analizar fórmula" }).click();
  await expect(page.getByText(/Modo prueba/)).toBeVisible();
  const inputs = page.getByRole("spinbutton");
  await expect(inputs).toHaveCount(4);
  for (const [i, v] of ["110000", "10000", "20", "10"].entries()) await inputs.nth(i).fill(v);
  await expect(page.locator(".calc-result")).toContainText("12,000");

  await page.getByRole("button", { name: "Guardar configuración" }).click();
  await expect(page.getByText("Calculadora creada")).toBeVisible();
  expect(writes(/^\/calculators$/)[0].body).toMatchObject({
    app_key: "lands", name: "Plan con tasa", description: "Tasa simple anual",
    formula: "(PRECIO - ENGANCHE) * (1 + TASA / 100) / MESES",
  });
  await expect(calcItem(page, "Plan con tasa")).toBeVisible();
});

test("validaciones: nombre y fórmula obligatorios, fórmula inválida", async ({ page }) => {
  await page.goto("/calculadora");
  await page.getByRole("button", { name: "+ Nueva calculadora" }).click();
  await page.getByRole("button", { name: "Guardar configuración" }).click();
  expect(writes(/^\/calculators$/)).toHaveLength(0);
  await expect(page.getByRole("textbox", { name: "Nombre *" })).toHaveAttribute("aria-invalid", "true");

  await page.getByRole("textbox", { name: "Nombre *" }).fill("Mala");
  await page.getByRole("textbox", { name: "Fórmula matemática *" }).fill("(PRECIO - ");
  await page.getByRole("button", { name: "Guardar configuración" }).click();
  expect(writes(/^\/calculators$/)).toHaveLength(0);
  await expect(page.getByRole("textbox", { name: "Fórmula matemática *" })).toHaveAttribute("aria-invalid", "true");
});

test("Usar ejemplo llena la fórmula", async ({ page }) => {
  await page.goto("/calculadora");
  await page.getByRole("button", { name: "+ Nueva calculadora" }).click();
  await page.getByRole("button", { name: "Usar ejemplo →" }).click();
  await expect(page.getByRole("textbox", { name: "Fórmula matemática *" })).not.toHaveValue("");
});

test("editar una calculadora existente", async ({ page }) => {
  await page.goto("/calculadora");
  await calcItem(page, "Plan aprobado").click();
  await expect(page.getByRole("textbox", { name: "Fórmula matemática *" })).toHaveValue("(PRECIO - ENGANCHE) / MESES");
  await page.getByRole("textbox", { name: "Descripción (opcional)" }).fill("Mensualidad fija sin intereses");
  await page.getByRole("button", { name: "Guardar configuración" }).click();
  await expect(page.getByText("Calculadora actualizada")).toBeVisible();
  expect(writes(/^\/calculators\/calc1$/)[0].body).toMatchObject({ description: "Mensualidad fija sin intereses" });
  await page.getByRole("button", { name: "+ Nueva", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Nombre *" })).toHaveValue("");
});

test("activar otra calculadora deja solo una activa", async ({ page }) => {
  await page.goto("/calculadora");
  await calcItem(page, "Plan 12%").getByRole("button").click();
  await expect(page.getByText("«Plan 12%» es ahora la calculadora activa")).toBeVisible();
  expect(writes(/^\/calculators\/calc2\/activate$/)).toHaveLength(1);
  await expect(calcItem(page, "Plan 12%")).toContainText("ACTIVA");
  await expect(calcItem(page, "Plan aprobado")).not.toContainText("ACTIVA");
});

test("eliminar una calculadora pide confirmación", async ({ page }) => {
  await page.goto("/calculadora");
  await calcItem(page, "Plan 12%").click();
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  const confirm = page.getByRole("dialog");
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Cancelar" }).click();
  expect(writes(/^\/calculators\/calc2$/)).toHaveLength(0);
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Eliminar/ }).last().click();
  await expect(page.getByText("Calculadora eliminada")).toBeVisible();
  await expect(calcItem(page, "Plan 12%")).toHaveCount(0);
});
