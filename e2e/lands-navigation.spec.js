// Navegación de Lands: barra lateral, encabezado, regresos al ecosistema,
// redirecciones de rutas viejas y atajos del dashboard.
import { test, expect } from "@playwright/test";
import { installLandsApi } from "./helpers/landsApi.js";

const SECTIONS = [
  ["Dashboard", "/dashboard", "Dashboard"],
  ["Carga de Lotes", "/lotes", "Carga de Lotes"],
  ["Fraccionamientos", "/fraccionamientos", "Fraccionamientos"],
  ["Track de Lotes", "/track-lotes", "Track de Lotes"],
  ["Clientes & CRM", "/clientes", "Clientes & CRM"],
  ["Contratos", "/contratos", "Contratos"],
  ["Pagos", "/pagos", "Control de Pagos"],
  ["Documentos", "/documentos", "Gestión Documental"],
  ["Calculadora", "/calculadora", "Calculadora de Amortización"],
  ["Reportes", "/reportes", "OwnTerra Lands"],
  ["Configuracion", "/configuracion", "Configuración"],
];

let db;
test.beforeEach(async ({ page }) => { db = await installLandsApi(page); });

const sidebar = (page) => page.getByRole("complementary");

// En móvil la barra lateral vive detrás del botón "Abrir menú".
async function openSidebar(page) {
  const menu = page.getByRole("button", { name: "Abrir menú" });
  if (await menu.isVisible().catch(() => false)) await menu.click();
}

test("la barra lateral abre cada sección con su encabezado", async ({ page }) => {
  await page.goto("/dashboard");
  for (const [link, path, title] of SECTIONS) {
    await openSidebar(page);
    await sidebar(page).getByRole("link", { name: new RegExp(`^${link.replace(/[&]/g, "\\$&")}`) }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("banner").first()).toContainText(title);
  }
});

test("el logo y el enlace Ecosistema regresan al hub", async ({ page }) => {
  await page.goto("/clientes");
  await openSidebar(page);
  await sidebar(page).getByRole("link", { name: "Ir al Ecosistema OwnTerra" }).click();
  await expect(page).toHaveURL(/\/ecosistema$/);
  await page.goto("/pagos");
  await openSidebar(page);
  await sidebar(page).getByRole("link", { name: "Ecosistema", exact: true }).click();
  await expect(page).toHaveURL(/\/ecosistema$/);
});

test("el perfil se abre desde la barra lateral y desde el encabezado", async ({ page }) => {
  await page.goto("/dashboard");
  await openSidebar(page);
  await sidebar(page).getByRole("link", { name: /Ver perfil/ }).click();
  await expect(page).toHaveURL(/\/perfil$/);
  await page.goto("/contratos");
  await page.getByRole("button", { name: /Ver perfil de Test User|Perfil/ }).first().click();
  await expect(page).toHaveURL(/perfil$/);
});

test("la barra lateral se colapsa y se vuelve a expandir", async ({ page, isMobile }) => {
  test.skip(isMobile, "En móvil la barra es un menú desplegable, no se colapsa");
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Colapsar la barra" }).click();
  const expand = page.getByRole("button", { name: "Fijar la barra abierta" });
  await expect(expand).toBeVisible();
  await expand.click();
  await expect(page.getByRole("button", { name: "Colapsar la barra" })).toBeVisible();
});

test("cerrar sesión avisa al backend y regresa al login", async ({ page }) => {
  await page.goto("/dashboard");
  await openSidebar(page);
  await sidebar(page).getByRole("button", { name: "Cerrar sesión" }).click();
  const confirm = page.getByRole("dialog");
  if (await confirm.isVisible().catch(() => false)) await confirm.getByRole("button", { name: /Cerrar sesión|Salir|Confirmar/ }).last().click();
  await expect(page.getByText("Bienvenido")).toBeVisible();
  expect(db.log.some((r) => r.method === "POST" && r.path === "/auth/logout")).toBeTruthy();
});

test("rutas viejas o inexistentes redirigen", async ({ page }) => {
  await page.goto("/alertas");
  await expect(page).toHaveURL(/\/pagos$/);
  await page.goto("/ruta-que-no-existe");
  await expect(page).toHaveURL(/\/ecosistema$/);
});

test("los atajos del dashboard llevan a su sección", async ({ page }) => {
  const shortcuts = [
    [() => page.getByRole("button", { name: "Ver inventario completo" }), /\/lotes$/],
    [() => page.getByRole("button", { name: "Ver todas" }).first(), /\/ventas$/],
    [() => page.getByRole("button", { name: "Ver todas" }).last(), /\/reportes$/],
    [() => page.getByRole("row", { name: /CT-001/ }), /\/contratos$/],
    [() => page.getByRole("button", { name: "+ Generar contrato" }), /\/(ventas|contratos)/],
    [() => page.getByRole("button", { name: "+ Ver reportes" }), /\/reportes$/],
  ];
  for (const [target, url] of shortcuts) {
    await page.goto("/dashboard");
    await target().click();
    await expect(page).toHaveURL(url);
  }
});

test("el dashboard muestra cifras, ventas recientes y top vendedores", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Cobrado del mes")).toBeVisible();
  await expect(page.getByText("Inventario total")).toBeVisible();
  await expect(page.getByRole("row", { name: /CT-001 Ana López/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /CT-002 Bruno Díaz/ })).toContainText("Pendiente");
  await expect(page.getByRole("row", { name: /1 Test User 2/ })).toBeVisible();
});
