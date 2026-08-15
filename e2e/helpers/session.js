export const API = "http://127.0.0.1:8000/api/v1";

// Sesión válida inyectada directamente en localStorage antes de la primera
// navegación — evita repetir el flujo de login (ya cubierto en login.spec.js)
// en cada spec que solo necesita estar autenticado.
export async function seedSession(page, overrides = {}) {
  await page.addInitScript((session) => {
    window.localStorage.setItem("lm_session", JSON.stringify(session));
  }, {
    token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    id: "u1",
    name: "Test User",
    initials: "TU",
    email: "test@ownterra.com",
    role: "admin",
    apps: ["core", "lands"],
    permissions: [],
    organization: { id: "org1", name: "Test Org" },
    remember: true,
    ...overrides,
  });
}

// Mock genérico para las queries que el AppContext dispara al montar
// (clients, inmuebles, contracts, payments, documents, notifications, ...).
// Se registra ANTES de los mocks específicos de cada spec: en Playwright el
// handler más reciente gana, así que un route.route() posterior con un
// patrón más específico (p. ej. /appointments) lo sobreescribe sin problema.
export async function mockCoreEndpoints(page) {
  await page.route(`${API}/**`, (route) => {
    if (route.request().method() !== "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], total: 0, page: 1, limit: 20, pages: 1 }),
    });
  });
}
