# Pruebas Automatizadas — OwnTerra Frontend

Guía completa del stack de pruebas, qué se prueba, cómo correrlas y cómo extenderlas.

---

## Stack de herramientas

| Herramienta | Versión | Para qué |
|---|---|---|
| [Vitest](https://vitest.dev/) | ^4 | Test runner nativo de Vite — mismo pipeline de transformación, muy rápido |
| [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) | ^16 | Renderizar y probar componentes desde la perspectiva del usuario |
| [@testing-library/user-event](https://testing-library.com/docs/user-event/intro/) | ^14 | Simular interacciones reales (click, teclado, etc.) |
| [MSW (Mock Service Worker)](https://mswjs.io/) | ^2 | Interceptar llamadas HTTP en tests sin tocar el código de producción |
| [Playwright](https://playwright.dev/) | ^1.61 | Tests E2E en navegador real (Chromium) |

---

## Comandos

```bash
# Correr todos los tests unitarios y de componentes (una sola pasada)
npm test

# Modo watch — recorre los tests en tiempo real mientras editas
npm run test:watch

# Reporte de cobertura de código (genera HTML en coverage/)
npm run test:coverage

# Tests end-to-end (requiere el servidor de dev corriendo o se levanta solo)
npm run test:e2e

# Tests E2E con interfaz visual de Playwright
npm run test:e2e:ui
```

---

## Estructura de archivos

```
own-terra-frontend/
├── vitest.config.js              # Configuración de Vitest (env, alias, cobertura)
├── playwright.config.js          # Configuración de Playwright mockeado (ignora e2e/live)
├── playwright.live.config.js     # Configuración de Playwright en vivo (solo e2e/live, serial)
│
├── src/
│   ├── test/
│   │   ├── setup.js              # Setup global: jest-dom + ciclo de vida de MSW + cleanup de RTL
│   │   └── mocks/
│   │       ├── handlers.js       # Interceptores MSW (auth, clients, dashboard, appointments)
│   │       └── server.js         # Servidor MSW para entorno Node (Vitest)
│   │
│   └── pages/Ecosystem/
│       ├── agendaShared.test.jsx     # Rangos de fecha, mapeo API ↔ UI
│       ├── AgendaTimeGrid.test.jsx   # Rejilla horaria: slots, eventos, layout de traslapes
│       ├── AgendaQuickCreate.test.jsx# Popover de creación rápida
│       └── Agenda.test.jsx           # Página completa: KPIs, vistas, crear/editar/eliminar
│
└── e2e/
    ├── helpers/session.js        # Sesión mockeada + mocks genéricos para specs autenticados
    ├── login.spec.js             # Tests E2E del flujo de login (mockeado)
    ├── agenda.spec.js            # Tests E2E de la Agenda (mockeado)
    └── live/                     # Tests E2E en vivo, sin mocks — ver sección abajo
        ├── helpers.js            # Env vars + skip si faltan credenciales o el backend no responde
        └── login.smoke.spec.js   # Login real contra own-terra-backend
```

> Este stack se portó desde la rama `feature/pruebas-automaticas` (parqueada, no mergeada a
> `develop`) y se completó con los tests de Agenda. Los tests de `formulaEngine`, `parseApiError`,
> `Button`/`Input` y `useFieldErrors` que existen en esa rama **no** se trajeron aquí — quedan
> pendientes de portar cuando esa rama se retome.

---

## Tests unitarios

### `agendaShared.test.jsx` — 4 tests

Funciones puras de fecha y mapeo API↔UI usadas por toda la Agenda (`agendaShared.jsx`).

| Suite | Qué verifica |
|---|---|
| Rangos de fecha | Semana domingo-a-sábado, grid de mes de 6 filas completas, rango válido para día/semana/mes |
| Mapeo API | `buildAppointmentBody` arma el payload con `scheduled_at` en UTC; `normalizeAppt` normaliza la respuesta del backend |

```bash
npx vitest run src/pages/Ecosystem/agendaShared.test.jsx
```

---

### `AgendaTimeGrid.test.jsx` — 3 tests

Rejilla horaria de las vistas Semana/Día.

| Suite | Qué verifica |
|---|---|
| Interacción | Clic en una celda vacía crea un evento en esa hora; clic en un evento existente lo abre sin crear uno nuevo |
| `layoutDayEvents` | Eventos sin traslape ocupan el ancho completo; eventos que se traslapan se reparten en carriles |

```bash
npx vitest run src/pages/Ecosystem/AgendaTimeGrid.test.jsx
```

---

### `AgendaQuickCreate.test.jsx` — 5 tests

Popover de creación rápida que aparece al hacer clic en una celda de la rejilla.

| Suite | Qué verifica |
|---|---|
| Slot fijo | Muestra la fecha/hora de la celda clicada |
| Submit | Envía el payload correcto con fecha/hora fijas y cierra el popover |
| "Más opciones" | Delega al formulario completo sin enviar nada |
| Cierre | Escape y clic fuera del popover cierran sin enviar |

```bash
npx vitest run src/pages/Ecosystem/AgendaQuickCreate.test.jsx
```

---

### `Agenda.test.jsx` — 6 tests

Integración de la página completa: contexto de la app mockeado (`@/context/AppContext`), API real (`appointmentService`) interceptada con MSW.

| Suite | Qué verifica |
|---|---|
| Carga inicial | Trae las citas de la semana visible y refleja los KPIs (total, pendientes) |
| Cambio de vista | Día / Semana / Mes renderizan la rejilla o el grid mensual correcto |
| Crear (modal completo) | "Nuevo evento" → POST correcto → toast "Evento guardado" |
| Crear (popover rápido) | Clic en celda vacía → popover con el título correcto |
| Editar | Clic en un bloque de la rejilla → PATCH correcto → toast "Evento actualizado" |
| Eliminar | Botón "Eliminar" en la lista lateral → DELETE correcto → toast "Evento eliminado" |

```bash
npx vitest run src/pages/Ecosystem/Agenda.test.jsx
```

---

## Tests E2E

### `e2e/login.spec.js` — 4 tests

Cubren el flujo de autenticación completo en Chromium con la aplicación corriendo. Los endpoints de API se interceptan con `page.route()` de Playwright.

| Test | Qué verifica |
|---|---|
| Pantalla de login visible | El formulario aparece sin sesión activa |
| Error con credenciales incorrectas | El backend responde 401 → el mensaje de error aparece en pantalla |
| Redirect tras login exitoso | Login exitoso → redirect a `/ecosistema` |
| Campos vacíos no disparan request | Botón sin datos no hace submit |

### `e2e/agenda.spec.js` — 4 tests

Usan `e2e/helpers/session.js` para inyectar una sesión válida en `localStorage` (sin repetir el flujo de login) y `page.clock` para fijar "hoy" a una fecha determinista.

| Test | Qué verifica |
|---|---|
| Vista de semana | El evento de la fixture aparece en la rejilla y en el panel lateral |
| Cambio de vista | Semana → Día → Mes → Semana renderizan la rejilla/grid correcta |
| Crear con popover rápido | Clic en celda vacía → llena título → POST correcto → toast visible |
| Crear con modal completo | "Nuevo evento" → llena título → POST correcto → toast visible |

```bash
# Requiere el servidor de dev (o se levanta solo si no está corriendo)
npm run test:e2e

# Ver la ejecución paso a paso
npm run test:e2e:ui
```

---

## Tests E2E en vivo (backend real)

Todo lo anterior en `e2e/` intercepta el API con `page.route()` — nunca toca un
backend real. `e2e/live/` es la excepción: specs que hablan de verdad con
`own-terra-backend`, sin ningún mock. Sirven para validar que un flujo
completo (login, lectura de datos reales) funciona contra el backend tal como
está hoy, no contra una respuesta inventada.

### Requisitos

1. **Backend corriendo de verdad**, en `http://127.0.0.1:8000` (o la URL que
   pongas en `LIVE_E2E_API_URL`):

   ```bash
   cd ../own-terra-backend
   docker compose -f docker-compose.local.yml up -d
   ```

   Usa `docker-compose.yml` (Postgres local, no Supabase dev) si prefieres
   aislamiento total y no te importa levantar Postgres tú mismo.

2. **Una cuenta real y ya verificada** en ese backend. El registro exige
   confirmar el correo antes de poder iniciar sesión, así que estos specs
   **no crean la cuenta por ti** — créala una vez a mano (UI o
   `POST /auth/register` + verificación) y reutilízala. No apuntes esto nunca
   a una base de datos de producción o compartida.

3. Exporta las credenciales antes de correr los tests:

   ```bash
   export LIVE_E2E_EMAIL="tu-cuenta-de-prueba@ejemplo.mx"
   export LIVE_E2E_PASSWORD="su-contraseña-real"
   # Opcional, si el backend no vive en localhost:8000:
   # export LIVE_E2E_API_URL="http://127.0.0.1:8000/api/v1"
   ```

### Correrlos

```bash
# Headless, para CI o correrlo rápido
npm run test:e2e:live

# Con navegador visible — ves el login real ocurrir en Chromium
npm run test:e2e:live:headed

# Modo UI de Playwright: timeline, DOM por paso, re-ejecutar un test suelto
npm run test:e2e:live:ui
```

Si falta alguna variable de entorno o el backend no responde en `/health`,
cada spec se salta (`skipped`) con un mensaje explicando qué falta — no falla
en rojo por error de configuración.

`--headed` abre el Chromium que trae Playwright (no el Google Chrome
instalado en tu Mac, aunque se ven casi idénticos). Si quieres literalmente
tu Chrome, agrega `use: { channel: "chrome" }` en `playwright.live.config.js`
— requiere tener Chrome instalado y, la primera vez, `npx playwright install chrome`.

### `e2e/live/login.smoke.spec.js`

| Test | Qué verifica |
|---|---|
| Login real | Credenciales reales → el backend real autentica → llega a `/ecosistema` con el layout autenticado cargado |
| Error real | Contraseña incorrecta → aparece el mensaje real del backend (`OT-AUTH-2001`), no uno inventado |

### Por qué está separado del resto

- `npm run test:e2e` (CI y local) sigue sin depender de ningún servicio
  externo — `playwright.config.js` ignora `e2e/live/**` explícitamente.
- Los specs en vivo escriben/leen contra un backend real y corren en serie
  (`workers: 1`, sin `fullyParallel`) para evitar carreras de sesión.
- Añade specs nuevos aquí solo para flujos que de verdad necesites validar
  end-to-end contra datos reales (p. ej. después de un cambio en el
  contrato de login o de un endpoint crítico) — para todo lo demás, el
  suite mockeado en `e2e/` es más rápido y no depende de infraestructura.

---

## Cobertura de código

```bash
npm run test:coverage
```

Genera un reporte en la terminal y en `coverage/index.html`. Los módulos cubiertos son:

- `src/services/**`
- `src/errors/**`
- `src/hooks/**`
- `src/components/**`
- `src/pages/**`

> `src/services/api.js` está excluido de la cobertura intencionalmente: es la capa de infraestructura HTTP que se mockea con MSW en tests.

---

## Cómo agregar nuevos tests

### Test unitario de un servicio

Crea `src/services/miServicio.test.js`:

```js
import { describe, it, expect } from "vitest";
import { miFuncion } from "./miServicio";

describe("miFuncion", () => {
  it("hace lo esperado", () => {
    expect(miFuncion(input)).toBe(expectedOutput);
  });
});
```

### Test de componente con API mock

```js
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";
import MiComponente from "./MiComponente";

describe("MiComponente", () => {
  it("muestra datos del API", async () => {
    server.use(
      http.get("http://localhost:8000/api/v1/mi-endpoint", () =>
        HttpResponse.json({ items: [{ id: "1", name: "Test" }] })
      )
    );
    render(<MiComponente />);
    await waitFor(() => expect(screen.getByText("Test")).toBeInTheDocument());
  });
});
```

### Test E2E nuevo

Crea `e2e/miFlow.spec.js`:

```js
import { test, expect } from "@playwright/test";

test.describe("Mi flujo", () => {
  test("descripción del escenario", async ({ page }) => {
    await page.goto("/mi-ruta");
    await page.getByRole("button", { name: /mi botón/i }).click();
    await expect(page.getByText("Resultado esperado")).toBeVisible();
  });
});
```

---

## Convenciones

- Los archivos de test viven junto al archivo que prueban: `Button.jsx` → `Button.test.jsx`
- Los tests E2E viven en `e2e/` en la raíz del proyecto
- Los mocks de MSW se agregan en `src/test/mocks/handlers.js`
- Usar `screen.getByRole` y `screen.getByText` sobre `querySelector` cuando sea posible — son más resistentes a refactors
- No hacer assertions sobre clases CSS de Tailwind directamente; preferir `toBeVisible()`, `toBeDisabled()`, `toHaveValue()`
