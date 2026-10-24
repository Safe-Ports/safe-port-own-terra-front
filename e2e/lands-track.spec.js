// Track de Lotes: filtros (servidor), búsqueda, orden, archivados, historial
// del lote y contacto del cliente.
import { test, expect } from "@playwright/test";
import { installLandsApi } from "./helpers/landsApi.js";

let db;
test.beforeEach(async ({ page }) => { db = await installLandsApi(page); });

const trackQueries = () => db.log.filter((r) => r.path === "/lots/track").map((r) => r.query);
const rows = (page) => page.getByRole("table").getByRole("row").filter({ hasText: /^[NS]-\d/ });

test("muestra todos los lotes con quién apartó, cliente y vencimiento", async ({ page }) => {
  await page.goto("/track-lotes");
  await expect(page.getByRole("heading", { name: "Track de lotes" })).toBeVisible();
  await expect(rows(page)).toHaveCount(6);
  const reservado = page.getByRole("row", { name: /^N-3 / });
  await expect(reservado).toContainText("Apartado");
  await expect(reservado).toContainText("Test User");
  await expect(reservado).toContainText("Bruno Díaz");
  await expect(page.getByText("1–6 de 6 lotes")).toBeVisible();
});

test("filtros por estado y fraccionamiento consultan al servidor", async ({ page }) => {
  await page.goto("/track-lotes");
  await page.getByRole("button", { name: "Apartados" }).click();
  await expect(rows(page)).toHaveCount(1);
  expect(trackQueries().at(-1)).toMatchObject({ status: "reserved" });
  await page.getByRole("button", { name: "Vendidos" }).click();
  await expect(rows(page)).toHaveCount(2);
  await page.getByRole("button", { name: "Disponibles" }).click();
  await expect(rows(page)).toHaveCount(3);
  await page.getByRole("button", { name: "Todos los estados" }).click();
  await page.getByRole("combobox").first().selectOption({ label: "Bosque Sur" });
  await expect(rows(page)).toHaveCount(2);
  expect(trackQueries().at(-1)).toMatchObject({ inmueble_id: "f2" });
});

test("búsqueda por cliente, orden e incluir archivados", async ({ page }) => {
  db.lots.find((l) => l.id === "l4").is_archived = true;
  await page.goto("/track-lotes");
  await expect(rows(page)).toHaveCount(5);
  await page.getByRole("textbox", { name: "Buscar lote, cliente o vendedor…" }).fill("bruno");
  await expect(rows(page)).toHaveCount(2);
  expect(trackQueries().at(-1)).toMatchObject({ search: "bruno" });
  await page.getByRole("textbox", { name: "Buscar lote, cliente o vendedor…" }).fill("");
  await page.getByRole("combobox", { name: "Ordenar por" }).selectOption("code");
  await expect.poll(() => trackQueries().at(-1)?.sort).toBe("code");
  await expect(rows(page).first()).toContainText("N-1");
  await page.getByRole("button", { name: "Incluir archivados" }).click();
  await expect(rows(page)).toHaveCount(6);
  expect(trackQueries().at(-1)).toMatchObject({ include_archived: "true" });
});

test("click en la fila abre el historial del lote y se cierra", async ({ page }) => {
  await page.goto("/track-lotes");
  await page.getByRole("row", { name: /^N-3 / }).click();
  const historial = page.getByRole("complementary", { name: "Historial del lote N-3" });
  await expect(historial).toContainText(/Apartó\s*Test User/);
  await expect(historial).toContainText(/Cliente\s*Bruno Díaz/);
  await expect(historial).toContainText("Lote creado");
  expect(db.log.some((r) => r.path === "/lots/l3/timeline")).toBeTruthy();
  await historial.getByRole("button", { name: "Cerrar" }).click();
  await expect(historial).toBeHidden();
});

test("el ojito muestra el contacto del cliente", async ({ page }) => {
  await page.goto("/track-lotes");
  // En móvil la tabla se desplaza de lado: primero se trae el ojito a la vista.
  const eye = page.getByRole("row", { name: /^N-1 / }).getByRole("button", { name: "Ver contacto de Ana López" });
  await eye.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await eye.click();
  const contacto = page.getByRole("dialog").filter({ hasText: "Ana López" });
  await expect(contacto).toContainText("c1@example.com");
  await expect(contacto).toContainText("+525500000001");
  // Abrir el contacto no abre el historial de la fila.
  await expect(page.getByRole("complementary", { name: /Historial del lote/ })).toHaveCount(0);
});
