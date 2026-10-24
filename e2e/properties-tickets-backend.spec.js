import { test, expect } from "@playwright/test";
import { prepare } from "./helpers/properties.js";
import { API } from "./helpers/session.js";

test("tickets staff con backend", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await prepare(page);
  const now = new Date().toISOString();
  const tickets = [{ id: "t1", community_id: "community", property_id: "unit", folio: "OT-000001", title: "Fuga en lavabo", description: "Goteo constante en el baño principal.", ticket_type: "maintenance", priority: "high", status: "open", reported_by_user_id: null, reported_by_persona_id: "person", sla_due_at: null, resolved_at: null, version: 1, created_at: now }];
  const comments = { t1: [{ id: "c1", ticket_id: "t1", author_user_id: null, author_persona_id: "person", body: "Ya cerré la llave de paso.", visibility: "participants", created_at: now }] };
  let order = null; const calls = [];
  await page.route(`${API}/**`, async (route, request) => {
    const path = new URL(request.url()).pathname.replace(/^.*\/api\/v1/, ""); const m = request.method();
    const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/communities/community/tickets" && m === "GET") return json(tickets);
    if (path === "/communities/community/tickets" && m === "POST") { const b = request.postDataJSON(); calls.push(["create", b]); const row = { ...tickets[0], id: "t2", folio: "OT-000002", property_id: b.property_id, title: b.title, description: b.description, ticket_type: b.ticket_type, priority: b.priority, reported_by_persona_id: null, reported_by_user_id: "u", status: "open", created_at: new Date().toISOString() }; tickets.unshift(row); comments.t2 = []; return json(row, 201); }
    let hit = path.match(/^\/tickets\/(t\d)$/); if (hit) { const t = tickets.find(x => x.id === hit[1]); return json({ ...t, comments: comments[t.id] }); }
    hit = path.match(/^\/tickets\/(t\d)\/assign$/); if (hit) { calls.push(["assign", request.postDataJSON()]); order = { id: "w1", ticket_id: hit[1], folio: "OT-OT-000001", service_provider_id: "provider", assignee_user_id: null, status: "dispatched", scheduled_at: null, accepted_at: null, completed_at: null, rejection_reason: null, evidence_document_id: null, version: 1 }; tickets.find(x => x.id === hit[1]).status = "in_progress"; return json(order, 201); }
    hit = path.match(/^\/work-orders\/w1\/status$/); if (hit) { const b = request.postDataJSON(); calls.push(["wo", b]); order = { ...order, status: b.status, version: order.version + 1 }; return json(order); }
    hit = path.match(/^\/tickets\/(t\d)\/comments$/); if (hit) { const b = request.postDataJSON(); calls.push(["comment", b]); const c = { id: "c" + Date.now(), ticket_id: hit[1], author_user_id: "u", author_persona_id: null, body: b.body, visibility: b.visibility, created_at: new Date().toISOString() }; comments[hit[1]].push(c); return json(c, 201); }
    hit = path.match(/^\/tickets\/(t\d)\/resolve$/); if (hit) { const t = tickets.find(x => x.id === hit[1]); t.status = "resolved"; t.resolved_at = new Date().toISOString(); calls.push(["resolve"]); return json(t); }
    return route.fallback();
  });
  await page.goto("/properties/tickets");
  await expect(page.getByRole("heading", { name: "Tickets de mantenimiento" })).toBeVisible();
  await expect(page.getByText(/Reportó Mariana Torres/)).toBeVisible();

  await page.getByRole("button", { name: "Nuevo ticket" }).click();
  const dialog = page.getByRole("dialog", { name: "Crear ticket" });
  await dialog.getByLabel("Asunto *").fill("Revisar bomba de agua");
  await dialog.locator(`label:has(> span:text-is("Propiedad")) select`).selectOption({ label: "Comunidad Jacarandas" });
  await dialog.locator(`label:has(> span:text-is("Unidad")) select`).selectOption({ label: "Departamento 302" });
  await dialog.locator(`label:has(> span:text-is("Responsable")) select`).selectOption({ label: "Plomería Díaz" });
  await dialog.getByRole("button", { name: "Crear ticket" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Revisar bomba de agua")).toBeVisible();

  await page.getByRole("button", { name: "Abrir seguimiento de Revisar bomba de agua" }).click();
  const trace = page.getByRole("dialog", { name: "Seguimiento de Revisar bomba de agua" });
  await expect(trace.getByText("Enviada al proveedor").first()).toBeVisible();
  await trace.getByLabel(/Nota interna/).check();
  await trace.getByLabel("Comentario del ticket").fill("El proveedor pidió acceso al cuarto de máquinas.");
  await trace.getByRole("button", { name: "Enviar comentario" }).click();
  await expect(trace.getByText("Interno", { exact: true })).toBeVisible();
  await expect(trace.getByRole("button", { name: "Marcar resuelto" })).toBeDisabled();
  await trace.getByRole("button", { name: "Marcar aceptada" }).click();
  await trace.getByRole("button", { name: "Iniciar trabajo" }).click();
  await trace.getByRole("button", { name: "Marcar terminada" }).click();
  await expect(trace.getByRole("button", { name: "Marcar resuelto" })).toBeEnabled();
  await trace.getByRole("button", { name: "Marcar resuelto" }).click();
  await expect(trace.getByText("Resuelto").first()).toBeVisible();
  expect(calls.map(([kind]) => kind)).toEqual(["create", "assign", "comment", "wo", "wo", "wo", "resolve"]);
  expect(calls[0][1]).toEqual({ property_id: "unit", title: "Revisar bomba de agua", description: null, ticket_type: "maintenance", priority: "medium" });
  expect(calls[1][1]).toEqual({ service_provider_id: "provider", scheduled_at: null });
  expect(calls[2][1].visibility).toBe("internal");
  expect(calls.slice(3, 6).map(([, body]) => body)).toEqual([{ status: "accepted", version: 1 }, { status: "in_progress", version: 2 }, { status: "done", version: 3 }]);
});
