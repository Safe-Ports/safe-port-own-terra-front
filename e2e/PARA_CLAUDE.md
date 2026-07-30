# Contexto para Claude: suite E2E de OwnTerra Frontend

Pega este archivo completo al inicio de tu conversación con Claude y luego
describe el módulo o flujo que quieres probar. Claude escribirá el spec listo
para correr.

---

## Qué es este proyecto

OwnTerra Frontend es una SPA en React + Vite que sirve como panel de
administración inmobiliaria (lotes, contratos, pagos, clientes, documentos,
agenda, reportes). Las pruebas E2E usan **Playwright** con Chromium y simulan
la API con mocks — nunca tocan el backend real.

---

## Cómo correr las pruebas

```bash
npm run test:e2e          # suite completa
npm run test:e2e:smoke    # solo rutas (rápido)
npm run test:e2e:headed   # con navegador visible
npm run test:e2e:ui       # interfaz Playwright paso a paso
```

---

## Estructura de archivos relevante

```
src/
├── components/shared/
│   ├── Toast.jsx           # notificaciones globales (éxito, error, warning, info)
│   └── InlineError.jsx     # mensaje de error dentro de un formulario o tarjeta
├── context/AppContext.jsx  # estado global: sesión, showToast, showError, dismissToast
├── services/api.js         # axios con interceptor de errores + refresh de token
└── errors/parseApiError.js # normaliza errores de API en { code, message, action, severity }

e2e/
├── helpers/session.js      # seedSession, mockCoreEndpoints, API (constante de base URL)
├── app-routes.spec.js      # smoke: todas las rutas autenticadas
├── authorization.spec.js   # roles y permisos
├── messages.spec.js        # Toast e InlineError
├── critical-workflows.spec.js  # validaciones y flujos clave
├── public-flows.spec.js    # /verify-email y /f/:slug
├── login.spec.js           # flujo de autenticación
├── responsive-navigation.spec.js
└── agenda.spec.js
```

---

## Rutas de la aplicación

### Públicas (sin sesión)
| Ruta | Qué muestra |
|---|---|
| `/verify-email` | Verifica token de correo; sin token muestra error |
| `/f/:slug` | Formulario público de captura de prospectos |

### Autenticadas (requieren sesión en localStorage)
| Ruta | Módulo |
|---|---|
| `/dashboard` | Dashboard principal con KPIs |
| `/lotes` | Inventario de lotes |
| `/fraccionamientos` | Fraccionamientos / desarrollos |
| `/clientes` | CRM de clientes |
| `/ventas` | Pipeline de ventas |
| `/contratos` | Contratos de compraventa |
| `/pagos` | Pagos y cobranza |
| `/reportes` | Reportes financieros y operativos |
| `/calculadora` | Calculadora de amortización |
| `/documentos` | Gestor documental |
| `/perfil` | Perfil del usuario |
| `/configuracion` | Configuración de organización, equipo y roles |
| `/planes` | Planes de suscripción |
| `/ecosistema` | Hub del ecosistema Own Terra |
| `/ecosistema/clientes` | Clientes del ecosistema |
| `/ecosistema/documentos` | Documentos del ecosistema |
| `/ecosistema/mi-dia` | Vista de agenda personal |
| `/ecosistema/finanzas` | Finanzas del ecosistema |
| `/ecosistema/agenda` | Agenda de citas |
| `/ecosistema/equipo` | Gestión de usuarios y permisos |
| `/ecosistema/formularios` | Formularios públicos de captura |
| `/sin-acceso` | Pantalla de acceso denegado |

---

## Helpers disponibles

### `seedSession(page, overrides?)`

Inyecta una sesión válida en `localStorage` (clave `lm_session`) antes de
navegar, evitando el flujo de login en cada test.

```js
import { seedSession } from "./helpers/session.js";

// Sesión de administrador (por defecto)
await seedSession(page);

// Sesión con rol y apps personalizados
await seedSession(page, {
  role: "vendor",
  apps: ["lands"],          // apps a las que tiene acceso
  permissions: [],          // permisos granulares adicionales
});
```

**Estructura completa de la sesión por defecto:**
```json
{
  "token": "mock-access-token",
  "refresh_token": "mock-refresh-token",
  "id": "u1",
  "name": "Test User",
  "initials": "TU",
  "email": "test@ownterra.com",
  "role": "admin",
  "apps": ["core", "lands"],
  "permissions": [],
  "organization": { "id": "org1", "name": "Test Org" },
  "remember": true
}
```

Roles disponibles: `"admin"` | `"vendor"`
Apps disponibles: `"core"` | `"lands"`

---

### `mockCoreEndpoints(page, userOverrides?)`

Registra un handler `GET /api/v1/**` que responde con datos mínimos para que
el AppContext no quede en loading. Intercepta:

| Endpoint | Respuesta |
|---|---|
| `/auth/me` | Usuario mockeado (acepta `userOverrides` igual que `seedSession`) |
| `/organization` | Org de prueba con plan `trial` |
| `/billing/subscription` | `null` |
| `/billing/plans` | `[]` |
| `/appointments` | `[]` |
| `/document-folders` | `[]` |
| `/forms/templates` | `[]` |
| `/calculators` | `[]` |
| `/forms/templates/form-e2e` | Formulario de prueba con 1 campo |
| Cualquier otro GET | `{ items: [], total: 0, page: 1, limit: 20, pages: 1 }` |
| Cualquier mutación (POST/PUT/PATCH/DELETE) | `{}` con status 200 |

```js
import { API, mockCoreEndpoints } from "./helpers/session.js";

// Mock básico
await mockCoreEndpoints(page);

// Mock con usuario específico (debe coincidir con seedSession)
await mockCoreEndpoints(page, { role: "vendor", apps: ["lands"] });
```

**Regla clave:** en Playwright el handler más reciente gana. Si necesitas una
respuesta diferente en un endpoint puntual, registra tu `page.route()` después
de `mockCoreEndpoints` y tomará precedencia.

---

### `API`

Constante con la URL base de la API: `"http://127.0.0.1:8000/api/v1"`.
Úsala al construir rutas en `page.route()`.

```js
import { API } from "./helpers/session.js";

await page.route(`${API}/clients`, async (route) => { ... });
```

---

## Patrones comunes

### Patron base de un spec

```js
import { expect, test } from "@playwright/test";
import { API, mockCoreEndpoints, seedSession } from "./helpers/session.js";

test.describe("Nombre del módulo o flujo", () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await mockCoreEndpoints(page);
  });

  test("descripción del caso", async ({ page }) => {
    await page.goto("/ruta");

    await page.getByRole("button", { name: "Texto" }).click();

    await expect(page.getByText("Resultado esperado")).toBeVisible();
  });
});
```

---

### Simular un error de API

```js
await page.route(`${API}/clients`, async (route) => {
  if (route.request().method() !== "POST") return route.fallback();
  return route.fulfill({
    status: 422,
    contentType: "application/json",
    body: JSON.stringify({
      error: {
        code: "OT-CLI-1001",
        message: "El correo ya está registrado.",
        details: {},
        request_id: "ref_e2e_test",
      },
    }),
  });
});
```

---

### Simular lista de datos

```js
await page.route(`${API}/clients**`, (route) => {
  if (route.request().method() !== "GET") return route.fallback();
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      items: [
        { id: "c1", name: "Ana García", email: "ana@test.com", status: "active" },
        { id: "c2", name: "Luis Torres", email: "luis@test.com", status: "active" },
      ],
      total: 2,
      page: 1,
      limit: 20,
      pages: 1,
    }),
  });
});
```

---

### Verificar Toast de éxito

```js
// El Toast de éxito aparece brevemente (6s) y tiene role="status"
const toast = page.locator(".app-toast");
await expect(toast).toBeVisible();
await expect(toast).toHaveClass(/app-toast--success/);
await expect(toast).toContainText("texto del mensaje");
```

### Verificar Toast de error

```js
// Los errores no tienen auto-dismiss, permanecen hasta que el usuario los cierra
const toast = page.locator(".app-toast--error");
await expect(toast).toBeVisible();
await expect(toast).toContainText("mensaje de error");

// Cerrar con botón
await page.locator(".app-toast__close").click();
await expect(toast).toHaveCount(0);

// Cerrar con Escape
await page.keyboard.press("Escape");
await expect(toast).toHaveCount(0);
```

### Verificar InlineError dentro de un formulario

```js
// InlineError es un bloque dentro del formulario, no un overlay
const error = page.getByRole("alert");
await expect(error).toBeVisible();
await expect(error).toContainText("texto del error");
await expect(error).toHaveAttribute("data-severity", "error"); // o "warning", "fatal"
```

### Verificar que NO aparece un Toast cuando hay error de campo

```js
// Las validaciones de campo van en FieldError, no en Toast
await page.getByRole("button", { name: "Guardar" }).click();
await expect(page.getByText("El nombre es obligatorio.")).toBeVisible(); // FieldError
await expect(page.locator(".app-toast")).toHaveCount(0);                 // sin Toast global
```

### Abrir y cerrar un modal

```js
// Abrir
await page.getByRole("button", { name: "Texto del botón" }).click();
const modal = page.locator(".nombre-del-modal");   // busca el selector real en el JSX
await expect(modal).toBeVisible();

// Cerrar con Escape
await page.keyboard.press("Escape");
await expect(modal).toHaveCount(0);
```

### Probar acceso denegado por rol

```js
const vendor = { role: "vendor", apps: ["lands"], permissions: [] };
await seedSession(page, vendor);
await mockCoreEndpoints(page, vendor);

await page.goto("/configuracion");
await expect(page).toHaveURL(/\/sin-acceso$/);
await expect(page.getByRole("heading", { name: "Sin acceso" })).toBeVisible();
```

---

## Estructura de error de la API

Todos los errores del backend siguen este formato:

```json
{
  "error": {
    "code": "OT-CLI-1001",
    "message": "Descripción legible del error.",
    "action": "Qué puede hacer el usuario (opcional).",
    "details": {},
    "request_id": "ref_xxxxxxxx"
  }
}
```

Los códigos siguen el patrón `OT-<DOMINIO>-<NNNN>`:
- `OT-AUTH-*` — autenticación y sesión
- `OT-CLI-*` — clientes
- `OT-LOT-*` — lotes
- `OT-CNT-*` — contratos
- `OT-PAY-*` — pagos
- `OT-DOC-*` — documentos
- `OT-SUB-*` — suscripciones y planes
- `OT-FORM-*` — formularios públicos

---

## Lo que NO debes hacer en los specs

- **No uses `page.waitForTimeout()`** — usa `expect(...).toBeVisible()` o
  `expect(...).toHaveCount()`. Playwright tiene auto-retry.
- **No importes componentes React** — los tests son caja negra, solo DOM.
- **No hagas peticiones reales al backend** — usa `page.route()` para todo.
- **No asumas clases CSS que no hayas verificado** — usa `getByRole`,
  `getByText`, `getByLabel` primero; las clases como fallback.

---

## Ejemplo completo: spec de un módulo nuevo

Supón que quieres probar el módulo de Pagos (`/pagos`).

```js
import { expect, test } from "@playwright/test";
import { API, mockCoreEndpoints, seedSession } from "./helpers/session.js";

const PAYMENTS = [
  { id: "p1", client_name: "Ana García", amount: 5000, status: "pending", due_date: "2026-07-01" },
  { id: "p2", client_name: "Luis Torres", amount: 3500, status: "paid",    due_date: "2026-06-01" },
];

test.describe("Módulo de pagos", () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await mockCoreEndpoints(page);

    // Sobreescribir solo el endpoint de pagos
    await page.route(`${API}/payments**`, (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: PAYMENTS, total: 2, page: 1, limit: 20, pages: 1 }),
      });
    });
  });

  test("lista los pagos pendientes y pagados", async ({ page }) => {
    await page.goto("/pagos");

    await expect(page.getByText("Ana García")).toBeVisible();
    await expect(page.getByText("Luis Torres")).toBeVisible();
  });

  test("registrar un pago muestra toast de éxito", async ({ page }) => {
    await page.route(`${API}/payments/p1/register`, async (route) => {
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.goto("/pagos");

    // Aquí adapta los selectores a los botones reales de la pantalla
    await page.getByRole("button", { name: "Registrar pago" }).first().click();
    await expect(page.locator(".app-toast--success")).toBeVisible();
  });

  test("error del servidor muestra toast de error persistente", async ({ page }) => {
    await page.route(`${API}/payments/p1/register`, async (route) => {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "OT-PAY-9001", message: "Error interno al registrar el pago.", request_id: "ref_e2e" },
        }),
      });
    });

    await page.goto("/pagos");
    await page.getByRole("button", { name: "Registrar pago" }).first().click();

    const toast = page.locator(".app-toast--error");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("OT-PAY-9001");

    // Verificar que no se cierra solo (los errores son persistentes)
    await page.waitForTimeout(1000);
    await expect(toast).toBeVisible();

    // Cerrar manualmente
    await page.locator(".app-toast__close").click();
    await expect(toast).toHaveCount(0);
  });
});
```

---

## Cómo pedirle un spec a Claude

Una vez que pegues este archivo, dile a Claude algo como:

> "Escríbeme un spec E2E para el módulo de Contratos (`/contratos`). Necesito
> probar que la lista carga con datos, que el filtro por estado funciona, y que
> si el backend devuelve 500 aparece el toast de error."

Claude usará exactamente los helpers, patrones y convenciones de este documento
para generar el spec.
