import { test, expect } from "@playwright/test";
import { API, mockCoreEndpoints, seedSession } from "./helpers/session.js";

// Mismo martes fijo usado en los tests unitarios de Agenda, para que el
// rango de semana visible y la cita de la fixture sean deterministas.
const TODAY = new Date(2026, 6, 14, 9, 0, 0);
const APPOINTMENT = {
  id: "appt-1",
  scheduled_at: new Date(2026, 6, 14, 10, 0, 0).toISOString(),
  title: "Visita con Ana",
  contact_name: "Ana",
  app_key: "core",
  appt_type: "visita",
  status: "pending",
};

async function mockAppointments(page, { items = [APPOINTMENT] } = {}) {
  let created = null;
  await page.route(`${API}/appointments**`, async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(items) });
    }
    if (request.method() === "POST") {
      created = await request.postDataJSON();
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: "appt-new", status: "pending", ...created }),
      });
    }
    return route.continue();
  });
  return () => created;
}

test.describe("Agenda — vista de calendario", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: TODAY });
    await seedSession(page);
    await mockCoreEndpoints(page);
  });

  test("muestra el evento de la semana visible y el resumen del día", async ({ page }) => {
    await mockAppointments(page);
    await page.goto("/ecosistema/agenda");

    await expect(page.getByText("Visita con Ana").first()).toBeVisible();
    await expect(page.getByText("eventos programados")).toBeVisible();
  });

  test("cambia entre las vistas Semana, Día y Mes", async ({ page }) => {
    await mockAppointments(page, { items: [] });
    await page.goto("/ecosistema/agenda");

    await expect(page.getByText("Sin eventos para este día")).toBeVisible();

    await page.getByRole("button", { name: "Día", exact: true }).click();
    await expect(page.locator(".ag-timegrid-day")).toBeVisible();

    await page.getByRole("button", { name: "Mes", exact: true }).click();
    await expect(page.locator(".ag-calendar-grid")).toBeVisible();

    await page.getByRole("button", { name: "Semana", exact: true }).click();
    await expect(page.locator(".ag-timegrid-week")).toBeVisible();
  });

  test("crea un evento con el popover rápido al hacer clic en una celda vacía", async ({ page }) => {
    const getCreated = await mockAppointments(page, { items: [] });
    await page.goto("/ecosistema/agenda");
    await expect(page.getByText("Sin eventos para este día")).toBeVisible();

    await page.getByRole("button", { name: "Crear evento 11:00" }).first().click();
    await page.getByPlaceholder("Añadir título").fill("Llamada rápida");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByText("Evento guardado")).toBeVisible();
    await expect.poll(getCreated).toMatchObject({ title: "Llamada rápida", appt_type: "evento", app_key: "core" });
  });

  test("crea un evento completo desde el modal 'Nuevo evento'", async ({ page }) => {
    const getCreated = await mockAppointments(page, { items: [] });
    await page.goto("/ecosistema/agenda");
    await expect(page.getByText("Sin eventos para este día")).toBeVisible();

    await page.getByRole("button", { name: "Nuevo evento" }).click();
    await page.getByPlaceholder("Ej: Junta con equipo, Recordatorio pago...").fill("Junta de seguimiento");
    await page.getByRole("button", { name: "Guardar evento" }).click();

    await expect(page.getByText("Evento guardado")).toBeVisible();
    await expect.poll(getCreated).toMatchObject({ title: "Junta de seguimiento", appt_type: "evento" });
  });
});
