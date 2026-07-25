# Pruebas E2E de OwnTerra Frontend

La suite predeterminada usa Chromium y simula la API. Es segura para desarrollo:
no crea, modifica ni elimina información del backend.

## Primera instalación

```bash
npm install
npx playwright install chromium
```

## Comandos

```bash
# Suite completa: login, rutas, módulos, validaciones, responsive y mensajes
npm run test:e2e

# Build de producción + suite completa
npm run test:e2e:check

# Barrido rápido de todas las rutas
npm run test:e2e:smoke

# Ver el navegador mientras corre
npm run test:e2e:headed

# Depurar paso a paso
npm run test:e2e:ui
```

Playwright inicia Vite automáticamente en `http://localhost:5173`. Si el frontend
ya está encendido en otro puerto:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npm run test:e2e
```

Cuando una prueba falla se guarda una captura en `test-results/`. En CI también
se conserva un trace en el primer reintento.

## Cobertura de la suite local

- Login correcto, credenciales inválidas y campos vacíos.
- Todas las rutas autenticadas de Core y Lands, incluidas rutas dinámicas de formularios.
- Redirecciones, página de acceso denegado y rutas desconocidas.
- Formularios públicos y verificación de correo.
- Validaciones críticas de formularios, calculadora, equipo y carga de lotes.
- Cierre de componentes con `Escape`.
- Navegación y topbar responsive en tamaño iPad.
- Mensajes de error, advertencia, éxito, referencias y cierre.

## Pruebas contra backend real

Las pruebas `live` sí crean datos de prueba y requieren un backend encendido. Se
mantienen separadas para evitar mutaciones accidentales:

```bash
npm run test:e2e:live
npm run test:e2e:live:headed
```

Consulta `e2e/live/helpers.js` para las variables de URL y credenciales admitidas.
