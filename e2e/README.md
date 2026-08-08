# Pruebas E2E — OwnTerra Frontend

La suite usa Playwright + Chromium y simula la API con mocks. Es segura para
desarrollo: nunca crea, modifica ni elimina datos en el backend.

---

## Primera instalación

```bash
npm install
npx playwright install chromium
```

---

## Comandos

```bash
# Suite completa
npm run test:e2e

# Build de producción + suite completa (igual que CI)
npm run test:e2e:check

# Solo el smoke de rutas (más rápido, buen punto de partida)
npm run test:e2e:smoke

# Ver el navegador mientras corre
npm run test:e2e:headed

# Interfaz visual paso a paso
npm run test:e2e:ui
```

Playwright levanta Vite automáticamente en `http://localhost:5173`.
Si el frontend ya está corriendo en otro puerto:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npm run test:e2e
```

Cuando una prueba falla se guarda una captura en `test-results/`.
En CI también se guarda un trace en el primer reintento.

---

## Specs disponibles

| Archivo | Qué prueba |
|---|---|
| `login.spec.js` | Flujo de login: credenciales correctas, inválidas y campos vacíos |
| `app-routes.spec.js` | Todas las rutas autenticadas cargan sin errores de render |
| `authorization.spec.js` | Control de acceso por rol: admin vs vendor, rutas restringidas |
| `messages.spec.js` | Toast, InlineError: render, severidad, cierre manual y con Escape |
| `critical-workflows.spec.js` | Validaciones de formularios clave, modales y cierre con Escape |
| `public-flows.spec.js` | Rutas públicas: verificación de correo y formularios públicos (`/f/:slug`) |
| `responsive-navigation.spec.js` | Topbar y navegación en tamaño iPad |
| `agenda.spec.js` | Vista de agenda del ecosistema |

---

## Cómo funciona el sistema de mocks

### `seedSession(page, overrides?)`

Inyecta una sesión válida en el `localStorage` (`lm_session`) antes de
navegar. Sin esto, la app redirige al login.

```js
// Sesión de admin (por defecto)
await seedSession(page);

// Sesión de vendedor con apps y permisos específicos
await seedSession(page, {
  role: "vendor",
  apps: ["lands"],
  permissions: [],
});
```

### `mockCoreEndpoints(page, userOverrides?)`

Registra un handler global `GET /api/v1/**` que responde con datos mínimos
para que la app no quede en loading. Intercepta los endpoints más importantes
(`/auth/me`, `/organization`, `/billing/subscription`, etc.) con respuestas
coherentes con la sesión inyectada.

```js
await mockCoreEndpoints(page);

// Con el mismo usuario que seedSession para que /auth/me coincida
await mockCoreEndpoints(page, { role: "vendor", apps: ["lands"] });
```

> **Regla de Playwright:** el handler más reciente gana. Si en tu spec
> necesitas una respuesta distinta en un endpoint específico, registra tu
> `page.route()` *después* de `mockCoreEndpoints` y será el que se use.

### Interceptar un endpoint puntual en un test

```js
await page.route(`${API}/users`, async (route) => {
  if (route.request().method() !== "POST") return route.fallback();
  return route.fulfill({
    status: 403,
    contentType: "application/json",
    body: JSON.stringify({ error: { code: "OT-SUB-4001", message: "Límite alcanzado" } }),
  });
});
```

---

## Patrón base de un spec

```js
import { expect, test } from "@playwright/test";
import { mockCoreEndpoints, seedSession } from "./helpers/session.js";

test.describe("Nombre del módulo o flujo", () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await mockCoreEndpoints(page);
  });

  test("descripción breve de lo que verifica este caso", async ({ page }) => {
    await page.goto("/ruta-a-probar");

    // actuar
    await page.getByRole("button", { name: "Texto del botón" }).click();

    // afirmar
    await expect(page.getByText("Mensaje esperado")).toBeVisible();
  });
});
```

---

## Qué NO hacer

- **No uses `page.waitForTimeout()`** — usa `expect(...).toBeVisible()` o
  `expect(...).toHaveCount()`, Playwright espera automáticamente.
- **No importes componentes React** en los specs — los tests son de caja negra,
  solo interactúan por el DOM.
- **No hagas peticiones reales al backend** en la suite local — usa
  `page.route()` para todo. Las pruebas live están en `e2e/live/` y tienen
  sus propias instrucciones.

---

## Pruebas contra backend real (suite live)

Las pruebas `live` sí crean datos y requieren el backend encendido. Se
mantienen separadas para evitar mutaciones accidentales:

```bash
npm run test:e2e:live
npm run test:e2e:live:headed
```

Consulta `e2e/live/helpers.js` para las variables de URL y credenciales.

---

## Archivos de referencia

```
e2e/
├── helpers/
│   └── session.js          # seedSession, mockCoreEndpoints, API constante
├── live/                   # specs contra backend real (no corren por defecto)
├── README.md               # este archivo
├── PARA_CLAUDE.md          # contexto para pedirle specs a Claude
├── app-routes.spec.js
├── authorization.spec.js
├── critical-workflows.spec.js
├── login.spec.js
├── messages.spec.js
├── public-flows.spec.js
├── responsive-navigation.spec.js
└── agenda.spec.js
```
