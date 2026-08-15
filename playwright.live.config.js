import { defineConfig, devices } from "@playwright/test";

// Config para E2E "en vivo": sin page.route(), contra un backend real.
// Requiere: backend corriendo (docker compose -f docker-compose.local.yml up -d
// en own-terra-backend) y LIVE_E2E_EMAIL/LIVE_E2E_PASSWORD de una cuenta real
// y verificada. Ver TESTING.md → "Tests E2E en vivo".
// Milisegundos de pausa entre cada acción de Playwright (click, fill, ...)
// para poder seguir la prueba a simple vista en --headed. Ajustable con
// LIVE_E2E_SLOWMO=0 para volver a velocidad normal.
const SLOW_MO = Number(process.env.LIVE_E2E_SLOWMO ?? 900);

export default defineConfig({
  testDir: "./e2e/live",
  // Con slowMo cada acción tarda más — más margen que el suite mockeado.
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "es-MX",
    launchOptions: { slowMo: SLOW_MO },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
