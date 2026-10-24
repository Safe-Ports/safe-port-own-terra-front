// Cotización pública (/cotizacion/:token): lo que ve el prospecto sin sesión.
// Nota (2026-10-23): GET /public/quotes/{token} todavía no existe en lands-back
// ni en core-back; estas pruebas fijan el contrato que la página espera.
import { test, expect } from "@playwright/test";
import { API } from "./helpers/session.js";

const QUOTE = {
  development: { name: "Proyecto Norte", description: "Lotes campestres a 10 minutos de la ciudad.", latitude: 20.65, longitude: -105.22 },
  lot: { code: "N-2", status: "available", price: 240000, area_m2: 200, front_m: 10, depth_m: 20 },
  quotation: { principal: 240000, down_payment: 20000, months: 12, monthly_payment: 18333.33, annual_rate: 0, total_paid: 220000 },
  prospect_name: "Carla Ruiz",
  notice: "Cotización válida por 7 días.",
};

test("muestra la cotización del lote con plan, ubicación y contacto", async ({ page }) => {
  await page.route(`${API}/public/quotes/tok123`, (route) => route.fulfill({ json: QUOTE }));
  await page.goto("/cotizacion/tok123");
  await expect(page.getByRole("heading", { name: "Proyecto Norte" })).toBeVisible();
  await expect(page.getByText("Preparada para Carla Ruiz")).toBeVisible();
  await expect(page.getByText("Disponible", { exact: true })).toBeVisible();
  await expect(page.locator(".pq-lot-id")).toContainText("N-2");
  await expect(page.locator(".pq-facts")).toContainText("200 m²");
  await expect(page.locator(".pq-facts")).toContainText("10 × 20 m");
  await expect(page.locator(".pq-payment")).toContainText("$18,333");
  await expect(page.getByText("Cotización válida por 7 días.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver ubicación" })).toHaveAttribute("href", /google\.com\/maps.*20\.65,-105\.22/);
  await expect(page.getByRole("link", { name: "Me interesa" })).toHaveAttribute("href", /wa\.me.*N-2/);
});

test("sin coordenadas no ofrece la ubicación y las medidas quedan por confirmar", async ({ page }) => {
  const sinDatos = { ...QUOTE, development: { name: "Bosque Sur" }, lot: { ...QUOTE.lot, area_m2: null, front_m: null }, prospect_name: null };
  await page.route(`${API}/public/quotes/tok456`, (route) => route.fulfill({ json: sinDatos }));
  await page.goto("/cotizacion/tok456");
  await expect(page.getByText("Información comercial del lote")).toBeVisible();
  await expect(page.locator(".pq-facts")).toContainText("Por confirmar");
  await expect(page.getByRole("link", { name: "Ver ubicación" })).toHaveCount(0);
});

test("una cotización vencida o inexistente lo explica", async ({ page }) => {
  await page.route(`${API}/public/quotes/vencida`, (route) => route.fulfill({ status: 404, json: { error: { code: "OT-SYS-4040", message: "No encontrada" } } }));
  await page.goto("/cotizacion/vencida");
  await expect(page.getByRole("heading", { name: "Cotización no disponible" })).toBeVisible();
  await expect(page.getByText("Esta cotización venció o ya no está disponible.")).toBeVisible();
});
