import { test, expect } from "@playwright/test";
import { prepare } from "./helpers/properties.js";
import { API } from "./helpers/session.js";

test("accesos staff con backend", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await prepare(page);
  const points = []; const events = []; const calls = []; let n = 0;
  await page.route(`${API}/**`, async (route, request) => {
    const path = new URL(request.url()).pathname.replace(/^.*\/api\/v1/, ""); const m = request.method();
    const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/communities/community/access-points" && m === "GET") return json(points);
    if (path === "/communities/community/access-points") { const b = request.postDataJSON(); const p = { id: "p" + points.length, community_id: "community", name: b.name, kind: b.kind, is_active: true }; points.push(p); calls.push(["point", b]); return json(p, 201); }
    if (path === "/communities/community/access-events") return json(events);
    if (path === "/communities/community/visitors") { const b = request.postDataJSON(); calls.push(["visitor", b]); return json({ visitor_id: "v1", credential_id: "cred1", qr_token: "eyJjIjoiY3JlZDEifQ.firma", valid_until: b.valid_until }, 201); }
    if (path === "/access/validate") { const b = request.postDataJSON(); calls.push(["validate", b]); n++; const ok = b.qr_token.startsWith("eyJ") && n === 1; const r = ok ? { decision: "granted", reason_code: null, visitor: { full_name: "Luis Ramírez", property_label: "Departamento 302", message: "Acceso permitido" } } : { decision: "denied", reason_code: n === 1 ? "UNKNOWN_CODE" : "MAX_ENTRIES", visitor: n === 1 ? null : { full_name: "Luis Ramírez", property_label: "Departamento 302", message: "Ya se usó" } }; events.unshift({ id: "e" + n, credential_id: "cred1", access_point_id: b.access_point_id, direction: b.direction, decision: r.decision, reason_code: r.reason_code, client_event_id: b.client_event_id, occurred_at: new Date().toISOString() }); return json(r); }
    if (path === "/access-credentials/cred1/revoke") { calls.push(["revoke", request.postDataJSON()]); return route.fulfill({ status: 204 }); }
    return route.fallback();
  });
  await page.goto("/properties/accesos");
  await expect(page.getByRole("heading", { name: "Visitas con QR" })).toBeVisible();
  await page.getByLabel("Nombre de la entrada").fill("Caseta principal");
  await page.getByRole("article", { name: "Entradas de la comunidad" }).getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Entrada" })).toBeVisible();

  const card = page.getByRole("article", { name: "Crear pase" });
  await card.getByLabel("Nombre de quien viene").fill("Luis Ramírez");
  await card.locator("label:has(> small:text-is('Unidad que recibe')) select").selectOption({ label: "Departamento 302" });
  await card.getByRole("button", { name: "Crear pase" }).click();
  await expect(page.getByRole("article", { name: "Pase de Luis Ramírez" })).toBeVisible();

  const gate = page.getByRole("article", { name: "Validar en caseta" });
  await gate.getByLabel("Código del pase").fill("eyJjIjoiY3JlZDEifQ.firma");
  await gate.getByRole("button", { name: "Validar" }).click();
  await expect(gate.getByText("Puede pasar")).toBeVisible();
  await gate.getByLabel("Código del pase").fill("eyJjIjoiY3JlZDEifQ.firma");
  await gate.getByRole("button", { name: "Validar" }).click();
  await expect(gate.getByText("No puede pasar")).toBeVisible();
  await expect(gate.getByText("El pase ya se usó todas las veces permitidas.")).toBeVisible();
  await expect(page.getByRole("article", { name: "Bitácora de caseta" }).getByText("Luis Ramírez").first()).toBeVisible();
  await page.getByRole("list", { name: "Pases creados en esta sesión" }).getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByText("Cancelado", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  expect(calls.map(([kind]) => kind)).toEqual(["point", "visitor", "validate", "validate", "revoke"]);
  expect(calls[1][1]).toMatchObject({ property_id: "unit", full_name: "Luis Ramírez", visitor_type: "guest", max_entries: 1 });
  expect(calls[2][1]).toMatchObject({ qr_token: "eyJjIjoiY3JlZDEifQ.firma", access_point_id: "p0", direction: "in" });
  expect(calls[2][1].client_event_id).not.toBe(calls[3][1].client_event_id);
});
