// Backend simulado de Lands para los E2E: estado en memoria con la forma real
// de las respuestas (esquemas OpenAPI de core-back y lands-back). Lo que una
// prueba crea, edita o archiva se refleja en las lecturas siguientes, y cada
// petición queda en `db.log` para revisar el body que mandó el front.
import { API } from "./session.js";

const NOW = "2026-10-20T15:00:00Z";
const money = (n) => (n === null || n === undefined ? null : Number(n).toFixed(2));
const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
const initialsOf = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export const LANDS_USER = {
  id: "u1",
  name: "Test User",
  initials: "TU",
  email: "test@ownterra.com",
  role: "admin",
  color: "#355E3B",
  avatar_url: null,
  apps: [{ app_key: "core", role: "admin" }, { app_key: "lands", role: "manager" }],
  permissions: [],
  tours_seen: ["lands", "dashboard", "lots", "fracs", "clients", "sales", "payments", "documents", "reports", "calculator", "settings", "profile", "track"],
};

function lot(id, code, inmueble, status, extra = {}) {
  return {
    id, inmueble_id: inmueble.id, inmueble_name: inmueble.name, code, status,
    price_contado: money(200000), price_financiado: money(240000), down_payment: money(20000),
    interest_rate: money(0), months: 12, seller_id: null, seller_name: null,
    area_m2: money(200), frente_ml: money(10), fondo_ml: money(20), orientacion: "Norte",
    especificaciones: {}, reserved_at: null, reserved_until: null, reserved_amount: null,
    reserved_receipt_url: null, client_id: null, client_name: null, reserved_by_id: null,
    reserved_by_name: null, is_archived: false, created_at: NOW, ...extra,
  };
}

function client(id, name, extra = {}) {
  return {
    id, name, email: `${id}@example.com`, phone: `+5255000000${id.replace(/\D/g, "").padStart(2, "0")}`,
    type: "buyer", pipeline_stage: "new", account_health: "good",
    seller: { id: "u1", name: "Test User", initials: "TU", color: "#355E3B" },
    initials: initialsOf(name), color: "#6FAF6B", last_contact_at: null, notes: null,
    is_archived: false, created_at: NOW, ...extra,
  };
}

function payment(id, contract, n, status, extra = {}) {
  return {
    id, installment_n: n, due_date: `2026-${String(9 + n).padStart(2, "0")}-10`,
    amount: money(18333.33), amount_paid: status === "paid" ? money(18333.33) : money(0),
    capital: money(18333.33), interest: money(0), remaining_balance: money(220000 - 18333.33 * n),
    paid_date: status === "paid" ? "2026-10-10" : null, status, days_late: status === "overdue" ? 12 : 0,
    late_fee: money(0), payment_method: status === "paid" ? "transfer" : null,
    receipt_number: null, receipt_url: null, notes: null, created_at: NOW,
    contract: { id: contract.id, contract_number: contract.contract_number, type: contract.type },
    client: { id: contract.client.id, name: contract.client.name, phone: null, email: null },
    lot: { code: contract.lot.code, inmueble_name: contract.lot.inmueble_name },
    ...extra,
  };
}

function contract(id, number, c, l, status, extra = {}) {
  return {
    id, contract_number: number, type: "sale", status,
    client: { id: c.id, name: c.name, initials: c.initials, color: c.color },
    lot: { id: l.id, code: l.code, inmueble_name: l.inmueble_name, area_m2: 200, lot_status: l.status },
    seller: { id: "u1", name: "Test User" },
    amount: money(240000), down_payment: money(20000), interest_rate: money(0), total_months: 12,
    monthly_payment: money(18333.33), contract_date: "2026-09-10", first_payment_date: "2026-10-10",
    expiration_date: "2027-09-10", signed_date: null, cancelled_date: null, has_signed_docs: false,
    down_payment_method: "transfer", notes: null, calculator_id: "calc1", calculator_snapshot: null,
    payments_summary: { total: 12, paid: 1, pending: 10, overdue: 1, next_due_date: "2026-11-10" },
    rejection_reason: null, approved_at: status === "active" ? NOW : null, created_at: NOW, last_activity: NOW,
    ...extra,
  };
}

/** Datos semilla: dos fraccionamientos, lotes en todos los estados, clientes y contratos con pagos. */
export function createLandsDb() {
  const norte = { id: "f1", name: "Proyecto Norte", description: "Fraccionamiento de prueba", image_url: null, is_archived: false, created_at: NOW };
  const sur = { id: "f2", name: "Bosque Sur", description: null, image_url: null, is_archived: false, created_at: NOW };
  const clients = [
    client("c1", "Ana López", { pipeline_stage: "won" }),
    client("c2", "Bruno Díaz", { pipeline_stage: "reserved" }),
    client("c3", "Carla Ruiz", { pipeline_stage: "contacted", type: "lead" }),
    client("c4", "Diego Mora", { pipeline_stage: "new", type: "lead" }),
  ];
  const lots = [
    lot("l1", "N-1", norte, "sold", { client_id: "c1", client_name: "Ana López" }),
    lot("l2", "N-2", norte, "available"),
    lot("l3", "N-3", norte, "reserved", { client_id: "c2", client_name: "Bruno Díaz", reserved_at: "2026-10-15T10:00:00Z", reserved_until: "2026-10-30T10:00:00Z", reserved_amount: money(5000), reserved_by_id: "u1", reserved_by_name: "Test User" }),
    lot("l4", "N-4", norte, "available"),
    lot("l5", "S-1", sur, "available"),
    lot("l6", "S-2", sur, "sold", { client_id: "c2", client_name: "Bruno Díaz" }),
  ];
  const contracts = [
    contract("ct1", "CT-001", clients[0], lots[0], "active"),
    contract("ct2", "CT-002", clients[1], lots[5], "pending_approval", { approved_at: null }),
  ];
  const payments = [
    payment("p1", contracts[0], 1, "paid"),
    payment("p2", contracts[0], 2, "overdue"),
    payment("p3", contracts[0], 3, "pending"),
    payment("p4", contracts[1], 1, "pending"),
  ];
  return {
    inmuebles: [norte, sur],
    lots,
    clients,
    contracts,
    payments,
    documents: [{
      id: "d1", name: "Contrato CT-001.pdf", category: "contract", status: "valid", file_size: 20480,
      mime_type: "application/pdf", entity_type: "contract", entity_id: "ct1", entity_label: "CT-001",
      uploaded_by: { id: "u1", name: "Test User" }, uploaded_at: NOW, notes: null, folder_id: null, download_url: null,
    }],
    folders: [{ id: "fd1", name: "Expedientes", parent_id: null, created_by: "u1", created_at: NOW, document_count: 0, app_key: "lands" }],
    calculators: [{
      id: "calc1", app_key: "lands", name: "Plan aprobado", description: "Mensualidad sin intereses",
      formula: "(PRECIO - ENGANCHE) / MESES", variables: ["PRECIO", "ENGANCHE", "MESES"],
      is_active: true, created_by: "u1", created_at: NOW,
    }],
    users: [
      { id: "u1", name: "Test User", email: "test@ownterra.com", role: "admin", is_active: true, phone: null, color: "#355E3B", initials: "TU", avatar_url: null, last_login_at: NOW, created_at: NOW, app_keys: ["core", "lands"] },
      { id: "u2", name: "Vera Vendedora", email: "vera@ownterra.com", role: "vendor", is_active: true, phone: null, color: "#6FAF6B", initials: "VV", avatar_url: null, last_login_at: null, created_at: NOW, app_keys: ["lands"] },
    ],
    // Un contrato cancelado con dinero cobrado, pendiente de liquidar.
    releases: [{
      kind: "contract", contract_id: "ct9", contract_number: "CT-009", lot_id: "l4", lot_label: "N-4 · Proyecto Norte",
      client_name: "Carla Ruiz", date: "2026-10-01", collected: 30000, refunded: null, retained: null,
      settled: false, receipt_url: null, files: [],
    }],
    expenses: [],
    incomes: [],
    appointments: [],
    notifications: [],
    log: [],
  };
}

// Apps asignadas de un cliente; sin dato, sólo Lands.
const clientApps = (c) => c.apps || ["lands"];

const page1 = (items, u, fallbackLimit = 20) => {
  const limit = Number(u.searchParams.get("limit") || fallbackLimit);
  const page = Number(u.searchParams.get("page") || 1);
  return { items: items.slice((page - 1) * limit, page * limit), total: items.length, page, limit, pages: Math.max(1, Math.ceil(items.length / limit)) };
};

function inmuebleView(db, f) {
  const own = db.lots.filter((l) => l.inmueble_id === f.id && !l.is_archived);
  return {
    ...f,
    total_lots: own.length,
    available_lots: own.filter((l) => l.status === "available").length,
    sold_lots: own.filter((l) => l.status === "sold").length,
    reserved_lots: own.filter((l) => l.status === "reserved").length,
    last_activity: NOW,
  };
}

function clientSummary(db, c) {
  const cts = db.contracts.filter((k) => k.client?.id === c.id);
  const pays = db.payments.filter((p) => p.client?.id === c.id);
  return {
    contracts_count: cts.length, total_invested: money(cts.reduce((s, k) => s + Number(k.amount || 0), 0)),
    total_paid: money(pays.reduce((s, p) => s + Number(p.amount_paid || 0), 0)),
    balance: money(cts.reduce((s, k) => s + Number(k.amount || 0), 0) - pays.reduce((s, p) => s + Number(p.amount_paid || 0), 0)),
    pending_payments: pays.filter((p) => p.status === "pending").length,
    overdue_payments: pays.filter((p) => p.status === "overdue").length,
    last_payment_date: pays.find((p) => p.paid_date)?.paid_date || null, next_payment: null,
  };
}

const kpiCard = (value) => ({ value, detail: "", delta: 0.1, series: [1, 2, 3, 2, 4, value || 5].map(Number) });

function json(route, status, body) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body ?? null) });
}

/** Lee el body JSON o, si es multipart, los nombres de campo y archivos. */
function readBody(req) {
  const type = req.headers()["content-type"] || "";
  if (type.includes("application/json")) {
    try { return req.postDataJSON(); } catch { return null; }
  }
  if (type.includes("multipart/form-data")) {
    const raw = req.postDataBuffer()?.toString("latin1") || "";
    const files = [...raw.matchAll(/name="([^"]+)"; filename="([^"]*)"/g)].map((m) => ({ field: m[1], filename: m[2] }));
    const fields = Object.fromEntries([...raw.matchAll(/name="([^"]+)"\r\n\r\n([^\r]*)/g)].map((m) => [m[1], m[2]]));
    return { multipart: true, files, fields };
  }
  return req.postData();
}

/**
 * Registra el backend simulado. Devuelve `db` para preparar datos y revisar
 * `db.log` ({ method, path, query, body }).
 */
export async function installLandsApi(page, db = createLandsDb(), { user = LANDS_USER } = {}) {
  await page.addInitScript((session) => {
    window.localStorage.setItem("lm_session", JSON.stringify(session));
  }, {
    token: "mock-access-token", refresh_token: "mock-refresh-token", ...user,
    apps: user.apps, organization: { id: "org1", name: "Test Org" }, remember: true,
  });

  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const method = req.method();
    const u = new URL(req.url());
    const p = u.pathname.replace(/^.*\/api\/v1/, "");
    const body = method === "GET" ? null : readBody(req);
    db.log.push({ method, path: p, query: Object.fromEntries(u.searchParams), body });
    const m = (re) => p.match(re);
    let hit;

    // ── Core: sesión, organización, usuarios, billing, notificaciones ──
    if (p === "/auth/me") return json(route, 200, { user, organization: { id: "org1", name: "Test Org", slug: "test-org", plan: "pro", trial_ends_at: null, subscription_status: "active", logo_url: null } });
    if (p === "/auth/refresh") return json(route, 200, { access_token: "mock-access-token", refresh_token: "mock-refresh-token", token_type: "bearer" });
    if (p === "/auth/logout") return route.fulfill({ status: 204 });
    if (p === "/auth/me/password") return json(route, 200, { access_token: "mock-access-token", refresh_token: "mock-refresh-token", token_type: "bearer" });
    if (p.startsWith("/auth/me/tours/")) return json(route, 200, { user, organization: { id: "org1", name: "Test Org" } });
    if (p === "/organization") {
      if (method === "PATCH") Object.assign(db.org ??= {}, body);
      return json(route, 200, { id: "org1", name: "Test Org", slug: "test-org", logo_url: null, tax_id: null, address: null, phone: null, email: "org@ownterra.com", plan: "pro", trial_ends_at: null, subscription_status: "active", stats: { total_users: db.users.length, total_lots: db.lots.length, total_clients: db.clients.length, total_contracts: db.contracts.length }, ...db.org });
    }
    if (p === "/organization/upload-logo") return json(route, 200, { logo_url: null });
    if (p === "/users" && method === "GET") return json(route, 200, page1(db.users.filter((x) => x.is_active), u, 50));
    if (p === "/users" && method === "POST") { const nu = { id: uid("u"), is_active: true, created_at: NOW, app_keys: [], initials: initialsOf(body?.name), ...body }; db.users.push(nu); return json(route, 201, nu); }
    if ((hit = m(/^\/users\/([^/]+)$/))) {
      const found = db.users.find((x) => x.id === hit[1]);
      if (method === "PATCH") Object.assign(found, body);
      if (method === "DELETE") { found.is_active = false; return route.fulfill({ status: 204 }); }
      return json(route, 200, found ?? user);
    }
    if (m(/^\/users\/[^/]+\/avatar$/)) return json(route, 200, { ...user, avatar_url: "/brand/ownterra-mark-color.svg" });
    if (m(/^\/users\/[^/]+\/apps/)) return json(route, 200, { items: [{ app_key: "lands", role: "manager" }] });
    if (m(/^\/users\/[^/]+\/(reset-password|transfer-data)$/)) return json(route, 200, { ok: true });
    if (p === "/billing/subscription") return json(route, 200, { plan: "pro", status: "active", trial_end: null, current_period_end: "2026-11-20T00:00:00Z", cancel_at_period_end: false, cancelled_at: null });
    if (p === "/billing/plans") return json(route, 200, [{ price_id: "price_pro_m", interval: "month", plan: "pro", amount: 19900, currency: "usd" }]);
    if (p === "/billing/checkout" || p === "/billing/portal") return json(route, 200, { url: "about:blank" });
    if (p === "/notifications/unread-count") return json(route, 200, { count: db.notifications.filter((n) => !n.is_read).length });
    if (p === "/notifications") return json(route, 200, { items: db.notifications, total: db.notifications.length, unread_count: 0 });
    if (p.startsWith("/notifications/")) return json(route, 200, { marked: 0 });
    if (p.startsWith("/activity")) return json(route, 200, p === "/activity" ? { items: [], total: 0, page: 1, limit: 20, pages: 1 } : []);
    if (p === "/search") return json(route, 200, { query: u.searchParams.get("q") || "", total_results: 0, results: {} });
    if (p.startsWith("/calendar/")) return json(route, 200, { connected: false });
    if (p.startsWith("/employees")) return json(route, 200, p.endsWith("job-titles") ? [] : { items: [], total: 0, page: 1, limit: 20, pages: 1 });
    if (p.startsWith("/providers")) return json(route, 200, { items: [], total: 0, page: 1, limit: 20, pages: 1 });
    if (p.startsWith("/forms")) return json(route, 200, []);
    if (p.startsWith("/tasks")) return json(route, 200, method === "GET" ? [] : { id: uid("t"), ...body });
    // Ingresos manuales (IncomeResponse) y la cobranza de lotes como filas de ingreso.
    if (p === "/incomes/collections") return json(route, 200, db.payments.filter((x) => x.status === "paid").map((x) => ({ id: `col-${x.id}`, concepto: `Cuota ${x.installment_n} · ${x.contract.contract_number}`, categoria: "cobranza", monto: x.amount_paid, due_date: x.due_date, received_date: x.paid_date, status: "received", origin: "cobranza", client_name: x.client.name })));
    if (p === "/incomes/summary") return json(route, 200, { received: 18333.33, expected: 0, count: db.incomes.length });
    if (p === "/incomes" && method === "GET") return json(route, 200, page1(db.incomes, u, 200));
    if (p === "/incomes" && method === "POST") { const i = { id: uid("in"), status: body?.received ? "received" : "pending", receipt_url: null, client_id: null, client_name: null, created_at: NOW, notes: null, ...body }; db.incomes.push(i); return json(route, 201, i); }
    if ((hit = m(/^\/incomes\/([^/]+)\/receipt$/))) return json(route, 200, { receipt_url: "/recibo.pdf" });
    if ((hit = m(/^\/incomes\/([^/]+)$/))) {
      if (method === "DELETE") { db.incomes = db.incomes.filter((i) => i.id !== hit[1]); return route.fulfill({ status: 204 }); }
      const i = db.incomes.find((x) => x.id === hit[1]); Object.assign(i, body); return json(route, 200, i);
    }

    // ── Agenda ──
    if (p === "/appointments") {
      if (method === "POST") { const a = { id: uid("ap"), ...body }; db.appointments.push(a); return json(route, 201, a); }
      return json(route, 200, db.appointments);
    }
    if (m(/^\/appointments\/[^/]+$/)) return method === "DELETE" ? route.fulfill({ status: 204 }) : json(route, 200, body);

    // ── Dashboard ──
    if (p === "/dashboard/kpis") {
      const sold = db.lots.filter((l) => l.status === "sold").length;
      return json(route, 200, {
        revenue: kpiCard(240000), sales: kpiCard(db.contracts.length), lots_available: kpiCard(db.lots.filter((l) => l.status === "available").length),
        lots_sold: kpiCard(sold), lots_total: kpiCard(db.lots.length), collection: kpiCard(85),
      });
    }
    if (p === "/dashboard/stats") return json(route, 200, { period: u.searchParams.get("period") || "month", from_date: "2026-01-01", to_date: "2026-12-31", revenue: 240000, sales_count: db.contracts.length, new_clients: 2, new_leads: 2, collection_rate: 85, chart_data: { labels: ["Ago", "Sep", "Oct"], revenue: [0, 120000, 240000], sales: [0, 1, 2] } });
    if (p === "/dashboard/midia") return json(route, 200, { greeting: "Buenos días", user_first_name: "Test", date_long: "martes, 20 de octubre", kpis: {}, tasks: [], recent_activity: [], upcoming: [], team_pulse: [] });
    if (p === "/dashboard/team-performance") return json(route, 200, { period: "month", team: [{ user_id: "u1", name: "Test User", sales_count: 2, revenue: 240000, clients_managed: 4, conversion_rate: 50, rank: 1 }] });

    // ── Gastos ──
    if (p === "/expenses") {
      if (method === "POST") { const e = { id: uid("e"), receipt_url: null, created_by: "u1", created_at: NOW, employee_id: null, provider_id: null, paid_date: null, notes: null, recurrencia: null, ...body, status: body?.paid ? "paid" : "pending" }; db.expenses.push(e); return json(route, 201, e); }
      return json(route, 200, page1(db.expenses, u, 500));
    }
    if ((hit = m(/^\/expenses\/([^/]+)\/receipt$/))) return json(route, 200, { receipt_url: "/recibo.pdf" });
    if ((hit = m(/^\/expenses\/([^/]+)$/))) {
      if (method === "DELETE") { db.expenses = db.expenses.filter((e) => e.id !== hit[1]); return route.fulfill({ status: 204 }); }
      const e = db.expenses.find((x) => x.id === hit[1]); Object.assign(e, body); return json(route, 200, e);
    }

    // ── Fraccionamientos (inmuebles) ──
    if (p === "/inmuebles" && method === "GET") return json(route, 200, page1(db.inmuebles.filter((f) => !f.is_archived).map((f) => inmuebleView(db, f)), u, 50));
    if (p === "/inmuebles" && method === "POST") { const f = { id: uid("f"), description: null, image_url: null, is_archived: false, created_at: NOW, ...body }; db.inmuebles.push(f); return json(route, 201, inmuebleView(db, f)); }
    if ((hit = m(/^\/inmuebles\/([^/]+)\/upload-map$/))) { const f = db.inmuebles.find((x) => x.id === hit[1]); if (f) f.image_url = "/apps/lands.jpg"; return json(route, 200, { image_url: "/apps/lands.jpg" }); }
    if ((hit = m(/^\/inmuebles\/([^/]+)$/))) {
      const f = db.inmuebles.find((x) => x.id === hit[1]);
      if (!f) return json(route, 404, { error: { code: "OT-LOT-4040", message: "No encontrado" } });
      if (method === "PATCH") Object.assign(f, body);
      if (method === "DELETE") { f.is_archived = true; return route.fulfill({ status: 204 }); }
      return json(route, 200, inmuebleView(db, f));
    }

    // ── Lotes ──
    if (p === "/lots/track") {
      const q = (u.searchParams.get("search") || "").toLowerCase();
      const st = u.searchParams.get("status");
      const inm = u.searchParams.get("inmueble_id");
      const archived = u.searchParams.get("include_archived") === "true";
      let rows = db.lots.filter((l) => (archived || !l.is_archived) && (!st || l.status === st) && (!inm || l.inmueble_id === inm)
        && (!q || `${l.code} ${l.client_name || ""} ${l.reserved_by_name || ""}`.toLowerCase().includes(q))).map((l) => ({ ...l, client_email: db.clients.find((c) => c.id === l.client_id)?.email || null, client_phone: db.clients.find((c) => c.id === l.client_id)?.phone || null, client_type: null, client_since: null, closed_by_id: null, closed_by_name: null, buyer_id: l.status === "sold" ? l.client_id : null, buyer_name: l.status === "sold" ? l.client_name : null, contract_number: db.contracts.find((k) => k.lot?.id === l.id)?.contract_number || null, contract_date: null, contract_amount: null, last_activity: NOW }));
      if (u.searchParams.get("sort") === "code") rows = [...rows].sort((x, y) => x.code.localeCompare(y.code));
      if (u.searchParams.get("sort") === "expiring") rows = [...rows].sort((x, y) => String(x.reserved_until || "9").localeCompare(String(y.reserved_until || "9")));
      return json(route, 200, { summary: { available: rows.filter((r) => r.status === "available").length, reserved: rows.filter((r) => r.status === "reserved").length, sold: rows.filter((r) => r.status === "sold").length, total: rows.length, expiring_soon: 1 }, ...page1(rows, u, 50) });
    }
    if (p === "/lots/import-template" || p === "/lots/matrix-export") return route.fulfill({ status: 200, contentType: "text/csv", body: "codigo,area_m2\nN-9,200\n" });
    if (p === "/lots/import-csv") {
      // ImportResult de lands-back; en dry_run no persiste y devuelve preview_lots.
      const dry = body?.fields?.dry_run === "true";
      const f = db.inmuebles.find((i) => i.id === body?.fields?.fraccionamiento_id) || db.inmuebles[0];
      const nuevos = [lot(uid("l"), "A-1", f, "available", { section: "Manzana A" }), lot(uid("l"), "A-2", f, "available", { section: "Manzana A" })];
      if (!dry) db.lots.push(...nuevos);
      return json(route, 200, { imported: dry ? 0 : 2, updated: 0, failed: 0, errors: [], warnings: [], summary: { available: 2 }, fraccionamientos_created: [], ...(dry ? { preview_lots: nuevos } : {}) });
    }
    if (p === "/lots/bulk") {
      const items = (body?.lots || body?.items || []).map((x) => { const f = db.inmuebles.find((i) => i.id === (x.inmueble_id || body?.inmueble_id)) || db.inmuebles[0]; const l = lot(uid("l"), x.code, f, x.status || "available", x); db.lots.push(l); return l; });
      return json(route, 201, { created: items.length, items });
    }
    if (p === "/lots/bulk-update") return json(route, 200, { updated: (body?.ids || []).length });
    if (p === "/lots" && method === "GET") {
      const inm = u.searchParams.get("inmueble_id") || u.searchParams.get("fraccionamiento_id");
      const status = u.searchParams.get("status");
      return json(route, 200, page1(db.lots.filter((l) => !l.is_archived && (!inm || l.inmueble_id === inm) && (!status || l.status === status)), u, 500));
    }
    if (p === "/lots" && method === "POST") { const f = db.inmuebles.find((i) => i.id === body?.inmueble_id) || db.inmuebles[0]; const l = lot(uid("l"), body?.code, f, body?.status || "available", body); db.lots.push(l); return json(route, 201, l); }
    if ((hit = m(/^\/lots\/([^/]+)\/timeline$/))) return json(route, 200, [{ at: NOW, tone: "info", text: "Lote creado", detail: null, actor_name: "Test User" }]);
    if ((hit = m(/^\/lots\/([^/]+)\/quotation$/))) return json(route, 200, { lot_id: hit[1], price: 240000, down_payment: 20000, months: 12, monthly_payment: 18333.33 });
    if ((hit = m(/^\/lots\/([^/]+)\/reservation-receipt$/))) { const l = db.lots.find((x) => x.id === hit[1]); if (l) l.reserved_receipt_url = "/recibo.pdf"; return json(route, 200, l); }
    if ((hit = m(/^\/lots\/([^/]+)$/))) {
      const l = db.lots.find((x) => x.id === hit[1]);
      if (!l) return json(route, 404, { error: { code: "OT-LOT-4040", message: "Lote no encontrado" } });
      if (method === "PATCH") Object.assign(l, body);
      if (method === "DELETE") { l.is_archived = true; return route.fulfill({ status: 204 }); }
      return json(route, 200, l);
    }

    // ── Clientes ──
    if (p === "/clients/import/template") return route.fulfill({ status: 200, contentType: "text/csv", body: "nombre,correo\n" });
    if (p === "/clients/import") {
      if (body?.fields?.dry_run !== "true") db.clients.push(client(uid("c"), "Cliente Migrado"));
      return json(route, 200, { imported: 1, updated: 0, failed: 0, errors: [], warnings: [] });
    }
    if (p === "/clients/cold-leads") return json(route, 200, []);
    if (p === "/clients" && method === "GET") {
      const q = (u.searchParams.get("search") || "").toLowerCase();
      const type = u.searchParams.get("type");
      const appKey = u.searchParams.get("app_key");
      // Como lands-back: filtra por app antes de paginar y cada cliente trae sus apps.
      const rows = db.clients.filter((c) => !c.is_archived && `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q) && (!type || c.type === type) && (!appKey || clientApps(c).includes(appKey)));
      return json(route, 200, page1(rows.map((c) => ({ ...c, apps: clientApps(c) })), u, 100));
    }
    if (p === "/clients" && method === "POST") { const c = client(uid("c"), body?.name || "Sin nombre", body); db.clients.push(c); return json(route, 201, c); }
    if ((hit = m(/^\/clients\/([^/]+)\/apps(\/[^/]+)?$/))) return json(route, method === "POST" ? 201 : 200, method === "GET" ? { apps: clientApps(db.clients.find((c) => c.id === hit[1]) || {}) } : {});
    if ((hit = m(/^\/clients\/([^/]+)\/contracts$/))) return json(route, 200, { items: db.contracts.filter((k) => k.client?.id === hit[1]) });
    if ((hit = m(/^\/clients\/([^/]+)\/payments$/))) return json(route, 200, { items: db.payments.filter((x) => x.client?.id === hit[1]) });
    if ((hit = m(/^\/clients\/([^/]+)\/timeline$/))) return json(route, 200, { items: [], total: 0, page: 1, limit: 20, pages: 1 });
    if ((hit = m(/^\/clients\/([^/]+)\/statement\/pdf$/))) return route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4" });
    if ((hit = m(/^\/clients\/([^/]+)\/statement\/send-email$/))) return json(route, 202, { ok: true });
    if ((hit = m(/^\/clients\/([^/]+)\/statement$/))) { const c = db.clients.find((x) => x.id === hit[1]); return json(route, 200, { client: c, summary: clientSummary(db, c), contracts: db.contracts.filter((k) => k.client?.id === hit[1]), payments: db.payments.filter((x) => x.client?.id === hit[1]) }); }
    if ((hit = m(/^\/clients\/([^/]+)\/(stage|contact)$/))) { const c = db.clients.find((x) => x.id === hit[1]); if (c && body?.stage) c.pipeline_stage = body.stage; if (c && body?.pipeline_stage) c.pipeline_stage = body.pipeline_stage; return json(route, 200, c); }
    if ((hit = m(/^\/clients\/([^/]+)$/))) {
      const c = db.clients.find((x) => x.id === hit[1]);
      if (!c) return json(route, 404, { error: { code: "OT-CLI-4040", message: "Cliente no encontrado" } });
      if (method === "PATCH") Object.assign(c, body, body?.name ? { initials: initialsOf(body.name) } : {});
      if (method === "DELETE") { c.is_archived = true; return route.fulfill({ status: 204 }); }
      return json(route, 200, { ...c, tax_id: null, id_number: null, summary: clientSummary(db, c) });
    }

    // ── Contratos ──
    if (p === "/contracts/import/template") return route.fulfill({ status: 200, contentType: "text/csv", body: "contrato\n" });
    if (p === "/contracts/import/batch") {
      const rows = body?.rows || body?.items || [];
      return json(route, 200, { created: rows.length, skipped: 0, failed: 0, installments: rows.length * 12, opening_balance: "0.00", outcomes: rows.map((r, i) => ({ row: i + 1, status: "ok", message: null })) });
    }
    if (p === "/contracts/releases") return json(route, 200, db.releases);
    if (p === "/contracts/releases/settle") {
      const f = body?.fields || {};
      const r = db.releases.find((x) => (x.kind === "contract" ? x.contract_id : x.lot_id) === f.ref_id);
      if (r) Object.assign(r, { settled: true, refunded: Number(f.refunded), retained: r.collected - Number(f.refunded), receipt_url: body?.files?.length ? "/devolucion.pdf" : null });
      return json(route, 200, r);
    }
    if (p === "/contracts" && method === "GET") {
      const q = (u.searchParams.get("search") || "").toLowerCase();
      const status = u.searchParams.get("status");
      const cid = u.searchParams.get("client_id");
      return json(route, 200, page1(db.contracts.filter((k) => (!q || `${k.contract_number} ${k.client?.name}`.toLowerCase().includes(q)) && (!status || k.status === status) && (!cid || k.client?.id === cid)), u, 100));
    }
    if (p === "/contracts" && method === "POST") {
      const c = db.clients.find((x) => x.id === body?.client_id) || db.clients[0];
      const l = db.lots.find((x) => x.id === body?.lot_id) || db.lots[1];
      const k = contract(uid("ct"), `CT-${String(db.contracts.length + 1).padStart(3, "0")}`, c, l, "pending_approval", { amount: money(body?.amount), down_payment: money(body?.down_payment), total_months: body?.total_months || 12, approved_at: null });
      db.contracts.push(k);
      return json(route, 201, { ...k, payments: [] });
    }
    if ((hit = m(/^\/contracts\/([^/]+)\/pdf$/))) return route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4" });
    if ((hit = m(/^\/contracts\/([^/]+)\/send-email$/))) return json(route, 202, { ok: true });
    if ((hit = m(/^\/contracts\/([^/]+)\/amortization$/))) return json(route, 200, { rows: [] });
    if ((hit = m(/^\/contracts\/([^/]+)\/collect$/))) {
      const pend = db.payments.filter((x) => x.contract?.id === hit[1] && x.status !== "paid");
      if (pend[0]) Object.assign(pend[0], { status: "paid", amount_paid: pend[0].amount, paid_date: "2026-10-20", payment_method: body?.payment_method || "cash" });
      return json(route, 200, { receipt_id: uid("r"), amount: money(body?.amount || 18333.33), paid_date: "2026-10-20", installments: pend[0] ? [{ payment_id: pend[0].id, installment_n: pend[0].installment_n, applied: pend[0].amount, status: "paid", outstanding: money(0) }] : [], contract_outstanding: money(200000), contract_status: "active" });
    }
    if ((hit = m(/^\/contracts\/([^/]+)\/(approve|reject|complete|cancel)$/))) {
      const k = db.contracts.find((x) => x.id === hit[1]);
      const next = { approve: "active", reject: "rejected", complete: "completed", cancel: "cancelled" }[hit[2]];
      if (k) Object.assign(k, { status: next }, hit[2] === "reject" ? { rejection_reason: body?.reason || body?.rejection_reason || null } : {});
      return hit[2] === "cancel" ? route.fulfill({ status: 204 }) : json(route, 200, { ...k, payments: [] });
    }
    if ((hit = m(/^\/contracts\/([^/]+)$/))) {
      const k = db.contracts.find((x) => x.id === hit[1]);
      if (!k) return json(route, 404, { error: { code: "OT-CON-4040", message: "Contrato no encontrado" } });
      if (method === "PATCH") Object.assign(k, body);
      if (method === "DELETE") { db.contracts = db.contracts.filter((x) => x.id !== k.id); return route.fulfill({ status: 204 }); }
      return json(route, 200, { ...k, payments: db.payments.filter((x) => x.contract?.id === k.id) });
    }

    // ── Pagos ──
    if (p === "/payments/kpis") {
      const sum = (st) => db.payments.filter((x) => st.includes(x.status));
      const card = (items, field = "amount") => ({ amount: items.reduce((t, x) => t + Number(x[field] || 0), 0), count: items.length, series: [1, 2, 3, 2, 4, items.length], delta: 0.1 });
      return json(route, 200, { collected: card(sum(["paid"]), "amount_paid"), outstanding: card(sum(["pending", "overdue"])), overdue: { ...card(sum(["overdue"])), clients: 1 }, expenses: { amount: db.expenses.reduce((t, e) => t + Number(e.monto || 0), 0), count: db.expenses.length, series: [], delta: null }, net_flow: 18333.33 });
    }
    if (p === "/payments/stats") return json(route, 200, { total_collected: 18333.33, total_pending: 54999.99, total_overdue: 18333.33, overdue_count: 1, collection_rate: 85 });
    if (p === "/payments/upcoming") return json(route, 200, db.payments.filter((x) => x.status === "pending"));
    if (p === "/payments/overdue") return json(route, 200, db.payments.filter((x) => x.status === "overdue"));
    if (p === "/payments/bulk-reminders") return json(route, 200, { sent: (body?.payment_ids || []).length });
    if (p === "/payments" && method === "GET") {
      const cid = u.searchParams.get("contract_id");
      const status = u.searchParams.get("status");
      return json(route, 200, page1(db.payments.filter((x) => (!cid || x.contract?.id === cid) && (!status || x.status === status)), u, 200));
    }
    if ((hit = m(/^\/payments\/receipts\/([^/]+)\/upload-receipt$/))) return json(route, 200, { id: hit[1], receipt_url: "/recibo.pdf" });
    if ((hit = m(/^\/payments\/([^/]+)\/(mark-paid|reverse-payment|send-reminder|upload-receipt)$/))) {
      const x = db.payments.find((y) => y.id === hit[1]);
      if (x && hit[2] === "mark-paid") Object.assign(x, { status: "paid", amount_paid: x.amount, paid_date: "2026-10-20", payment_method: body?.payment_method || null });
      if (x && hit[2] === "reverse-payment") Object.assign(x, { status: "pending", amount_paid: money(0), paid_date: null });
      if (x && hit[2] === "upload-receipt") x.receipt_url = "/recibo.pdf";
      return json(route, hit[2] === "send-reminder" ? 202 : 200, x);
    }
    if ((hit = m(/^\/payments\/([^/]+)$/))) return json(route, 200, db.payments.find((y) => y.id === hit[1]));

    // ── Documentos y carpetas ──
    if (p === "/document-folders" && method === "GET") return json(route, 200, db.folders);
    if (p === "/document-folders" && method === "POST") { const f = { id: uid("fd"), parent_id: null, created_by: "u1", created_at: NOW, document_count: 0, app_key: "lands", ...body }; db.folders.push(f); return json(route, 201, f); }
    if ((hit = m(/^\/document-folders\/([^/]+)$/))) {
      if (method === "DELETE") { db.folders = db.folders.filter((f) => f.id !== hit[1]); return route.fulfill({ status: 204 }); }
      const f = db.folders.find((x) => x.id === hit[1]); Object.assign(f, body); return json(route, 200, f);
    }
    if (p === "/documents/upload") {
      const file = body?.files?.[0];
      const d = { id: uid("d"), name: file?.filename || "archivo", category: u.searchParams.get("category") || "other", status: "valid", file_size: 1024, mime_type: "application/pdf", entity_type: u.searchParams.get("entity_type"), entity_id: u.searchParams.get("entity_id"), entity_label: null, uploaded_by: { id: "u1", name: "Test User" }, uploaded_at: NOW, notes: null, folder_id: u.searchParams.get("folder_id"), download_url: null };
      db.documents.unshift(d);
      return json(route, 201, d);
    }
    if (p === "/documents/stats") return json(route, 200, { total: db.documents.length, by_category: {} });
    if (p === "/documents/for-entity" || p === "/documents/for-lots") return json(route, 200, db.documents.filter((d) => !u.searchParams.get("entity_id") || d.entity_id === u.searchParams.get("entity_id")));
    if (p === "/documents" && method === "GET") return json(route, 200, page1(db.documents, u, 100));
    if ((hit = m(/^\/documents\/([^/]+)\/download$/))) return route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4" });
    if ((hit = m(/^\/documents\/([^/]+)$/))) {
      if (method === "DELETE") { db.documents = db.documents.filter((d) => d.id !== hit[1]); return route.fulfill({ status: 204 }); }
      const d = db.documents.find((x) => x.id === hit[1]); if (method === "PATCH") Object.assign(d, body); return json(route, 200, d);
    }

    // ── Calculadoras ──
    if (p === "/calculators/active") return json(route, 200, db.calculators.find((c) => c.is_active) || null);
    if (p === "/calculators/analyze") return json(route, 200, { variables: ["PRECIO", "ENGANCHE", "MESES"], valid: true, errors: [] });
    if (p === "/calculators/test") return json(route, 200, { result: 18333.33, valid: true, error: null });
    if (p === "/calculators" && method === "GET") return json(route, 200, db.calculators);
    if (p === "/calculators" && method === "POST") { const c = { id: uid("calc"), app_key: "lands", description: null, variables: [], is_active: false, created_by: "u1", created_at: NOW, ...body }; db.calculators.push(c); return json(route, 201, c); }
    if ((hit = m(/^\/calculators\/([^/]+)\/activate$/))) { db.calculators.forEach((c) => { c.is_active = c.id === hit[1]; }); return json(route, 200, db.calculators.find((c) => c.id === hit[1])); }
    if ((hit = m(/^\/calculators\/([^/]+)$/))) {
      if (method === "DELETE") { db.calculators = db.calculators.filter((c) => c.id !== hit[1]); return route.fulfill({ status: 204 }); }
      const c = db.calculators.find((x) => x.id === hit[1]); Object.assign(c, body); return json(route, 200, c);
    }

    // ── Reportes y exportaciones ──
    if (p === "/reports/sales") return json(route, 200, { total_sales: db.contracts.length, total_amount: 480000, by_month: [{ month: "2026-10", count: 2, amount: 480000 }], by_seller: [{ seller_id: "u1", seller_name: "Test User", count: 2, amount: 480000 }], items: db.contracts });
    if (p === "/reports/collection") return json(route, 200, { period: "month", collected: 18333.33, expected: 73333.32, rate: 25, overdue: 18333.33, by_month: [] });
    if (p === "/reports/inventory") return json(route, 200, { total: db.lots.length, available: 3, reserved: 1, sold: 2, by_inmueble: db.inmuebles.map((f) => ({ inmueble_id: f.id, inmueble_name: f.name, ...inmuebleView(db, f) })) });
    if (p.startsWith("/export/")) return route.fulfill({ status: 200, contentType: "text/csv", body: "id\n1\n" });

    return json(route, 404, { error: { code: "OT-SYS-4040", message: `Sin mock: ${method} ${p}` } });
  });

  return db;
}
