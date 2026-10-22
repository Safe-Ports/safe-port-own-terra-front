import { expect, test } from "@playwright/test";
import { API } from "./helpers/session.js";
import { prepare, expectFits } from "./helpers/properties.js";

const core = { id: "core-electrician", name: "Electricidad López", categoria: "Electricidad" };
const specialty = { id: "electricity", label: "Electricidad" };

async function mockNetwork(page) {
  const providers = [{ id: "provider", name: "Plomería Díaz", kind: "company", status: "active", specialty_ids: [] }];
  const contacts = [];
  let applications = ["Norte", "Sur"].map((name, index) => ({ id: `app-${index}`, folio: `SOL-${index}`, name: `Servicios ${name}`, kind: "company", email_normalized: `${name}@example.com`, specialty_ids: [specialty.id], coverage: "Zona centro", experience: "Instalaciones eléctricas" }));
  const writes = [];
  await page.route(`${API}/**`, async (route, request) => {
    const path = new URL(request.url()).pathname.replace(/^.*\/api\/v1/, "");
    const method = request.method();
    let body;
    if (method !== "GET") writes.push({ path, body: request.postDataJSON() });
    if (path === "/providers") body = { items: [core], total: 1 };
    else if (path === "/service-specialties") body = [specialty];
    else if (path === "/service-providers" && method === "GET") body = { items: providers, total: providers.length };
    else if (path === "/service-providers" && method === "POST") { body = { id: "enabled", name: core.name, status: "active", ...request.postDataJSON() }; providers.push(body); }
    else if (/^\/service-providers\/[^/]+\/contacts$/.test(path)) {
      if (method === "POST") { body = { id: "contact", persona_name: "Ana Técnica", status: "active", ...request.postDataJSON() }; contacts.push(body); } else body = contacts;
    } else if (path === "/personas" && method === "POST") body = { id: "new-person" };
    else if (path === "/service-enrollment-links") body = method === "POST" ? { id: "link", token: "public-test" } : [];
    else if (path === "/service-provider-applications") body = applications;
    else if (/\/service-provider-applications\/[^/]+\/(approve|reject)$/.test(path)) { applications = applications.filter(item => !path.includes(item.id)); body = {}; }
    else if (/\/service-providers\/[^/]+\/(suspend|reactivate|archive)$/.test(path)) {
      const row = providers.find(item => path.includes(`/${item.id}/`)); row.status = path.endsWith("/suspend") ? "suspended" : path.endsWith("/archive") ? "archived" : "active"; body = row;
    } else if (path.startsWith("/service-provider-contacts/")) body = { id: "invite", status: "sent" };
    else { if (method !== "GET") writes.pop(); return route.fallback(); }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  return writes;
}

for (const width of [360, 390, 430]) test.describe(`Red de proveedores a ${width}px`, () => {
  test.use({ viewport: { width, height: 844 } });

  test("habilita especialidades, agrega e invita un contacto y opera estados", async ({ page }, testInfo) => {
    await prepare(page); const writes = await mockNetwork(page);
    await page.goto("/properties/responsables");
    await page.getByRole("button", { name: "Habilitar proveedor" }).click();
    let dialog = page.getByRole("dialog", { name: "Habilitar proveedor" });
    await dialog.getByLabel("Buscar proveedor en Core").fill("Electricidad");
    await dialog.getByRole("button", { name: /Electricidad López/ }).click();
    await dialog.getByRole("combobox", { name: "Tipo", exact: true }).selectOption("company");
    await dialog.getByRole("checkbox", { name: "Electricidad", exact: true }).check();
    await expectFits(page); await dialog.getByRole("button", { name: "Habilitar", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(writes.find(item => item.path === "/service-providers").body).toMatchObject({ core_provider_id: core.id, kind: "company", specialty_ids: [specialty.id] });
    await page.locator(".service-directory").getByRole("button", { name: /Electricidad López/ }).click();
    await page.getByRole("button", { name: "Agregar contacto" }).click();
    dialog = page.getByRole("dialog", { name: "Agregar contacto" });
    await dialog.getByLabel("Nombre completo").fill("Ana Técnica");
    await dialog.getByLabel("Correo", { exact: true }).fill("ana@example.com");
    await dialog.getByLabel("Teléfono").fill("+525500000000");
    await expectFits(page); await dialog.getByRole("button", { name: "Agregar", exact: true }).click();
    await expect(page.getByText("Ana Técnica", { exact: true })).toBeVisible();
    expect(writes.find(item => item.path === "/service-providers/enabled/contacts").body).toEqual({ persona_id: "new-person", role: "technician", invitation_mode: "permanent" });
    await page.getByRole("button", { name: "Invitar", exact: true }).click();
    await expect.poll(() => writes.some(item => item.path === "/service-provider-contacts/contact/invite")).toBe(true);
    await page.getByRole("button", { name: "Suspender", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "¿Suspender a Electricidad López?" });
    await dialog.getByPlaceholder("Explica brevemente por qué.").fill("Revisión del perfil");
    await dialog.getByRole("button", { name: "Suspender", exact: true }).click();
    await page.getByRole("button", { name: "Reactivar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Suspender", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Archivar", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "¿Archivar a Electricidad López?" });
    await dialog.getByPlaceholder("Explica brevemente por qué.").fill("Ya no colabora");
    await dialog.getByRole("button", { name: "Archivar", exact: true }).click();
    await expect(dialog).toHaveCount(0); await expectFits(page);
    expect(writes.find(item => item.path === "/service-providers/enabled/archive").body).toEqual({ reason: "Ya no colabora" });
    if (width === 390) await page.screenshot({ path: testInfo.outputPath("providers.png") });
  });

  test("genera el enlace y revisa solicitudes con aprobación y rechazo", async ({ page }) => {
    await prepare(page); const writes = await mockNetwork(page);
    await page.goto("/properties/responsables");
    await page.getByRole("button", { name: "Generar y copiar enlace" }).click();
    await expect(page.getByLabel("Enlace público de inscripción")).toHaveValue(/\/servicio\/registro\?token=public-test$/);
    await page.getByRole("button", { name: "Revisar solicitudes" }).click();
    const requests = page.getByRole("dialog", { name: "Solicitudes pendientes" });
    await expect(requests.getByText("Experiencia: Instalaciones eléctricas").first()).toBeVisible();
    await requests.getByRole("button", { name: "Aprobar", exact: true }).first().click();
    let dialog = page.getByRole("dialog", { name: "Aprobar solicitud", exact: true });
    await dialog.getByRole("button", { name: /Electricidad López/ }).click();
    await expectFits(page); await dialog.getByRole("button", { name: "Aprobar y vincular" }).click();
    await expect(dialog).toHaveCount(0);
    expect(writes.find(item => item.path === "/service-provider-applications/app-0/approve").body).toEqual({ existing_core_provider_id: core.id });
    await requests.getByRole("button", { name: "Rechazar", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "¿Rechazar la solicitud de Servicios Sur?" });
    await dialog.getByPlaceholder("Explica brevemente por qué.").fill("Sin cobertura");
    await dialog.getByRole("button", { name: "Rechazar solicitud" }).click();
    await expect(dialog).toHaveCount(0); await expect(requests.getByText("No hay solicitudes pendientes.")).toBeVisible();
    expect(writes.find(item => item.path === "/service-provider-applications/app-1/reject").body).toEqual({ reason: "Sin cobertura" });
  });

  test("envía una solicitud pública sin iniciar sesión y conserva el folio", async ({ page }, testInfo) => {
    let submitted;
    await page.route(`${API}/public/service-enrollment/**`, async (route, request) => {
      if (request.method() === "POST") { expect(request.headers().authorization).toBeUndefined(); submitted = request.postDataJSON(); }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(request.method() === "POST" ? { folio: "SOL-0099" } : { organization_name: "Jacarandas", specialties: [specialty] }) });
    });
    await page.goto("/servicio/registro?token=public-test");
    await page.getByPlaceholder("Tu nombre y apellidos").fill("Juan Pérez");
    await page.getByPlaceholder("contacto@correo.mx").fill("juan@example.com");
    await page.getByPlaceholder("+52 55 0000 0000").fill("+525500000000");
    await page.getByRole("checkbox", { name: "Electricidad", exact: true }).check();
    await page.getByRole("checkbox", { name: /Confirmo/ }).check();
    await expectFits(page);
    for (const input of await page.locator("input:visible:not([type=checkbox])").all()) expect(await input.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    expect(await page.locator(".registration-consent>span").evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(12);
    expect(await page.locator(".registration-types strong").first().evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
    if (width === 390) await page.screenshot({ path: testInfo.outputPath("registration.png"), fullPage: true });
    await page.getByRole("button", { name: "Enviar solicitud para revisión" }).click();
    await expect(page.getByRole("status")).toContainText("Solicitud SOL-0099");
    expect(submitted).toMatchObject({ name: "Juan Pérez", specialty_ids: [specialty.id], consent_accepted: true });
  });
});
