import { test, expect } from "@playwright/test";

// Mismo default que src/services/api.js en dev. Se puede sobreescribir con
// LIVE_E2E_API_URL si el backend real no corre en localhost:8000.
export const LIVE_API_BASE = (process.env.LIVE_E2E_API_URL || "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");
const LIVE_BACKEND_ROOT = LIVE_API_BASE.replace(/\/api\/v1$/, "");

export const LIVE_EMAIL = process.env.LIVE_E2E_EMAIL;
export const LIVE_PASSWORD = process.env.LIVE_E2E_PASSWORD;

// El registro real exige confirmar el correo antes de poder iniciar sesión,
// así que estos specs no pueden crear su propia cuenta: necesitan una
// cuenta real y ya verificada, provista por variables de entorno.
export function skipUnlessLiveCredentials() {
  test.skip(
    !LIVE_EMAIL || !LIVE_PASSWORD,
    "Faltan LIVE_E2E_EMAIL / LIVE_E2E_PASSWORD — define credenciales de una cuenta real y verificada. Ver TESTING.md."
  );
}

export async function skipUnlessLiveBackend() {
  try {
    const res = await fetch(`${LIVE_BACKEND_ROOT}/health`, { signal: AbortSignal.timeout(3000) });
    test.skip(!res.ok, `El backend en ${LIVE_BACKEND_ROOT} respondió ${res.status} en /health.`);
  } catch {
    test.skip(
      true,
      `No se pudo contactar al backend en ${LIVE_BACKEND_ROOT}. Levántalo con ` +
        `"docker compose -f docker-compose.local.yml up -d" en own-terra-backend.`
    );
  }
}

// Login real, reutilizado por todos los specs autenticados en e2e/live/.
// Deja la sesión real (token real de own-terra-backend) en localStorage.
export async function loginLive(page, { email = LIVE_EMAIL, password = LIVE_PASSWORD } = {}) {
  // Sin addInitScript: persiste para toda la vida de la página y se
  // re-ejecutaría en cada page.goto() posterior al login, borrando la
  // sesión recién creada. No hace falta de todos modos — cada test de
  // Playwright arranca con un contexto/localStorage limpio.
  await page.goto("/");
  await page.getByPlaceholder("correo@empresa.mx").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /ingresar|iniciar sesión/i }).click();
  await expect(page).toHaveURL(/ecosistema/, { timeout: 15_000 });
}

// Token real de la sesión, para que los specs limpien (soft-delete) lo que
// crearon llamando al API directamente con el fixture `request` de Playwright.
export async function getAuthToken(page) {
  return page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem("lm_session"))?.token || null;
    } catch {
      return null;
    }
  });
}
