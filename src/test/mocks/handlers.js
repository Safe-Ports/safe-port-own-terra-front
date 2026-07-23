import { http, HttpResponse } from "msw";

// Debe coincidir con el fallback de desarrollo de src/services/api.js
// (VITE_API_URL en .env también apunta aquí).
const BASE = "http://127.0.0.1:8000/api/v1";

export const handlers = [
  // ── Auth ─────────────────────────────────────────────────────────────────────
  http.post(`${BASE}/auth/token`, async ({ request }) => {
    const body = await request.json();
    if (body.email === "test@ownterra.com" && body.password === "password123") {
      return HttpResponse.json({
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        user: { id: "u1", name: "Test User", email: "test@ownterra.com", role: "admin" },
      });
    }
    return HttpResponse.json(
      {
        error: {
          code: "OT-AUTH-2010",
          message: "Credenciales incorrectas.",
          request_id: "ref_test_001",
        },
      },
      { status: 401 }
    );
  }),

  // ── Clients ───────────────────────────────────────────────────────────────────
  http.get(`${BASE}/clients`, () =>
    HttpResponse.json({
      items: [
        {
          id: "c1",
          name: "Juan Pérez",
          email: "juan@test.com",
          phone: "9991234567",
          pipeline_stage: "new",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      pages: 1,
    })
  ),

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  http.get(`${BASE}/dashboard/stats`, () =>
    HttpResponse.json({
      available_lots: 42,
      active_clients: 18,
      pending_payments: 5,
      monthly_revenue: 350000,
    })
  ),

  // ── Appointments (Agenda) ────────────────────────────────────────────────────
  http.get(`${BASE}/appointments`, () => HttpResponse.json([])),
  http.post(`${BASE}/appointments`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: "appt-mock-1", status: "pending", ...body }, { status: 201 });
  }),
  http.patch(`${BASE}/appointments/:id`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: params.id, status: "pending", ...body });
  }),
  http.delete(`${BASE}/appointments/:id`, () => new HttpResponse(null, { status: 204 })),
];
