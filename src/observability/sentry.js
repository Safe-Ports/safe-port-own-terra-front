import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

/**
 * Inicializa Sentry SOLO si hay un DSN configurado (variable VITE_SENTRY_DSN).
 *
 * Así, en local/desarrollo sin DSN no se envía nada. La configuración es
 * deliberadamente ligera: solo monitoreo de errores, sin Session Replay ni
 * performance tracing, para no sumar peso al bundle.
 */
export function initSentry() {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Solo errores: sin tracing de performance (mantener ligero).
    tracesSampleRate: 0,
    // Adjunta IP/usuario a los eventos para saber a quién le pasó el error.
    sendDefaultPii: true,
    // Quitamos la integración "Dedupe" (activa por defecto): descartaba eventos con el
    // mismo mensaje/stack aunque tuvieran distinto `request_id` (p. ej. varios
    // "Network Error" seguidos). Queremos capturar e identificar CADA ocurrencia por su Ref.
    integrations: (defaults) => defaults.filter((integration) => integration.name !== "Dedupe"),
  });
}

export { Sentry };
