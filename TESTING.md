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
├── playwright.config.js          # Configuración de Playwright (base URL, proyectos)
│
├── src/
│   ├── test/
│   │   ├── setup.js              # Setup global: jest-dom + ciclo de vida de MSW
│   │   └── mocks/
│   │       ├── handlers.js       # Interceptores MSW (auth, clients, dashboard)
│   │       └── server.js         # Servidor MSW para entorno Node (Vitest)
│   │
│   ├── services/
│   │   └── formulaEngine.test.js # Tests del motor de fórmulas
│   │
│   ├── errors/
│   │   └── parseApiError.test.js # Tests del parser de errores de API
│   │
│   ├── components/
│   │   ├── Button.test.jsx       # Tests del componente Button
│   │   └── Input.test.jsx        # Tests del componente Input
│   │
│   └── hooks/
│       └── useFieldErrors.test.js # Tests del hook de validación por campo
│
└── e2e/
    └── login.spec.js             # Tests E2E del flujo de login
```

---

## Tests unitarios

### `formulaEngine.test.js` — 45 tests

Motor de fórmulas que espeja la lógica del backend (`formula_engine.py`). Es el módulo de mayor riesgo del frontend ya que calcula enganches, mensualidades y tablas de amortización.

| Suite | Qué verifica |
|---|---|
| Aritmética básica | Suma, resta, multiplicación, división, potencia, módulo, paréntesis, unario negativo, redondeo a 2 decimales |
| Variables | Sustitución correcta, múltiples variables, error si falta variable, error si variable está vacía |
| Funciones | `min`, `max`, `abs`, `round` (con ndigits), `floor`, `ceil`, `sqrt`, `pow` |
| Constantes | `pi` y `e` con el redondeo final aplicado por `evaluate()` |
| Errores | División por cero, paréntesis desbalanceados, carácter no permitido, fórmula vacía |
| `extractVariables` | Orden de aparición, sin duplicados, excluye funciones y constantes |
| `buildFlatSchedule` | N cuotas exactas, saldo final = 0, totalPaid/totalInterest, capital + interés = cuota |

```bash
# Correr solo formulaEngine
npx vitest run src/services/formulaEngine.test.js
```

---

### `parseApiError.test.js` — 17 tests

Normaliza cualquier error (axios, red, proxy) al modelo homologado del catálogo OT-. Crítico porque todos los toasts, modales y refs de soporte pasan por aquí.

| Suite | Qué verifica |
|---|---|
| Envelope homologado | Código, mensaje, requestId y httpStatus del backend |
| Error de red | Código `OT-NET-9001`, isLocalRef = true, reutilización de `__refLocal` |
| HTTP sin envelope | Mapeo correcto de 401→OT-AUTH-2010, 403→OT-AUTH-2003, 404→OT-SYS-3000, 429→OT-SYS-4000, 500→OT-SYS-9000 |
| Campos siempre presentes | code, title, message, severity nunca son null |
| `errorClipboardText` | Formato "Código: OT-… · Ref: ref_…" para copiar al ticket |

```bash
npx vitest run src/errors/parseApiError.test.js
```

---

### `Button.test.jsx` — 8 tests

| Qué verifica |
|---|
| Renderiza el texto hijo |
| Clases correctas por variante (`primary` → `btn-p`, `secondary` → `btn-s`, `danger` → `btn-dan`) |
| `disabled` deshabilita el botón y bloquea el click |
| `onClick` se llama exactamente una vez |
| `className` adicional se aplica |

```bash
npx vitest run src/components/Button.test.jsx
```

---

### `Input.test.jsx` — 6 tests

| Qué verifica |
|---|
| Renderiza con el valor dado |
| Muestra el placeholder |
| Llama `onChange` con el valor nuevo al escribir |
| Atributo `type` se aplica correctamente |
| `className` adicional se aplica |
| No lanza error si `onChange` es `undefined` |

```bash
npx vitest run src/components/Input.test.jsx
```

---

### `useFieldErrors.test.js` — 17 tests

Hook de validación por campo. Separa los errores de campo (rojo en el input) de los errores de catálogo OT- (toast/modal).

| Suite | Qué verifica |
|---|---|
| `validate` | Devuelve `true` si pasan todas las reglas; `false` + setea errores si hay fallas |
| `clear` | Elimina solo el campo especificado; no muta si el campo no existe |
| `clearAll` | Vacía todos los errores |
| `fieldProps` | Sin error: solo clase base; con error: agrega `is-invalid` y `aria-invalid` |
| `fromServer` | Devuelve `false` sin detalles de campo; devuelve `true` y setea errores con 422 + `details` |

```bash
npx vitest run src/hooks/useFieldErrors.test.js
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

```bash
# Requiere el servidor de dev (o se levanta solo si no está corriendo)
npm run test:e2e

# Ver la ejecución paso a paso
npm run test:e2e:ui
```

---

## Cobertura de código

```bash
npm run test:coverage
```

Genera un reporte en la terminal y en `coverage/index.html`. Los módulos cubiertos son:

- `src/services/**` (formulaEngine, etc.)
- `src/errors/**`
- `src/hooks/**`
- `src/components/**`

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
