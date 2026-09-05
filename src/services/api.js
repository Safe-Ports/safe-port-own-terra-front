import axios from "axios";
import * as Sentry from "@sentry/react";
import { localRef } from "@/errors/parseApiError";

const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();
export const BASE_URL = configuredBaseUrl || (import.meta.env.DEV ? "http://127.0.0.1:8000/api/v1" : "");

if (!BASE_URL) {
  throw new Error("VITE_API_URL es obligatoria para ejecutar un build de producción");
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

/**
 * Timeout para las peticiones que GENERAN un archivo: PDF de contrato, estado de
 * cuenta, exportaciones a Excel.
 *
 * El de 15 s de arriba está pensado para una llamada normal, y a estas no les
 * alcanza: en un fraccionamiento grande el navegador cortaba a los 15 s mientras
 * el servidor seguía armando el archivo, así que el usuario veía un error de red
 * sobre una operación que en realidad terminaba bien — y solía reintentarla,
 * duplicando el trabajo del servidor.
 *
 * Los mismos 120 s que ya usaban las importaciones masivas.
 */
export const TIMEOUT_ARCHIVO = 120000;

const SESSION_KEY = "lm_session";

function getSession() {
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function saveSession(session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

api.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // ── Reporte a Sentry de TODOS los fallos de API, distinguidos por severidad ─
    // - Sin respuesta (red/timeout) y 5xx → level "error" (fallas graves).
    // - 4xx (validación, 403, 404, login fallido) → level "warning" (esperados).
    // Se OMITE el 401 "rutinario" que dispara el refresh silencioso de token
    // (status 401 + sin reintento previo + hay refresh_token): es flujo normal.
    const status = error.response?.status;
    const isRoutineRefresh =
      status === 401 && !error.config?._retry && Boolean(getSession()?.refresh_token);

    if (!isRoutineRefresh) {
      const level = !error.response || status >= 500 ? "error" : "warning";
      const kind = !error.response ? "network" : status >= 500 ? "server_5xx" : "client_4xx";
      // Tags homologados: el `code` del catálogo y el `request_id` (Ref) que dicta el
      // usuario. Así el dashboard de Sentry es buscable por lo que copian del toast.
      const envelope = error.response?.data?.error;
      const code = envelope?.code || (!error.response ? "OT-NET-9001" : undefined);
      const headerRef = error.response?.headers?.["x-request-id"];
      // Si el fallo no trae Ref del backend (red, o respuesta sin envelope), generamos una
      // Ref local AQUÍ y la guardamos en el error para que parseApiError reuse la MISMA.
      // Así la Ref que el usuario copia del toast es la que se encuentra en Sentry.
      if (!envelope?.request_id && !headerRef && !error.__refLocal) {
        error.__refLocal = localRef();
      }
      const requestId = envelope?.request_id || headerRef || error.__refLocal;
      // Lo que se manda a Sentry va DEPURADO. Antes viajaba `error.response.data`
      // entero y la URL con su query string, o sea que nombres, correos,
      // teléfonos y montos de clientes finales terminaban en un tercero fuera
      // del circuito. Son datos de los que OwnTerra es ENCARGADO, no dueño.
      //
      // Para diagnosticar alcanza con el código del catálogo, la Ref y —de los
      // 422— qué campos fallaron, nunca con qué valores.
      const camposInvalidos = Array.isArray(error.response?.data?.error?.details)
        ? error.response.data.error.details
            .map((d) => (Array.isArray(d?.loc) ? d.loc.join(".") : d?.loc))
            .filter(Boolean)
        : undefined;

      Sentry.captureException(error, {
        level,
        tags: { source: "api", kind, code, request_id: requestId },
        extra: {
          method: error.config?.method?.toUpperCase(),
          // Sin query string: ahí viajan los términos de búsqueda, que suelen
          // ser el nombre de un cliente.
          url: error.config?.url?.split("?")[0],
          status: status ?? null,
          errorCode: code ?? null,
          errorMessage: envelope?.message ?? null,
          camposInvalidos,
        },
      });

      // Tope de plan alcanzado (OT-SUB-4001): emite un evento global para que la app
      // muestre SIEMPRE el aviso "mejora tu plan", aunque el call site no lo capture.
      if (code === "OT-SUB-4001") {
        window.dispatchEvent(
          new CustomEvent("ownterra:quota-exceeded", { detail: error.response?.data })
        );
      }
    }

    const original = error.config;

    // Un 401 de los endpoints de auth (login/registro/refresh en sí) es una
    // respuesta normal de credenciales inválidas o token vencido — no hay
    // sesión que refrescar ni nada que redirigir; debe llegar tal cual al
    // catch de quien hizo la llamada (p. ej. LoginScreen) para mostrar su
    // propio error inline, en vez de recargar la app a "/".
    const isAuthEndpoint = /^\/auth\/(login|register|refresh)/.test(original?.url || "");

    if (error.response?.status !== 401 || original._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    const session = getSession();
    if (!session?.refresh_token) {
      clearSession();
      window.location.href = "/";
      return Promise.reject(error);
    }

    original._retry = true;

    if (!refreshPromise) {
      refreshPromise = axios
        .post(`${BASE_URL}/auth/refresh`, { refresh_token: session.refresh_token })
        .then((r) => {
          const updated = {
            ...session,
            token: r.data.access_token,
            refresh_token: r.data.refresh_token,
          };
          saveSession(updated);
          return updated.token;
        })
        .catch(() => {
          clearSession();
          window.location.href = "/";
          return Promise.reject(new Error("Session expired"));
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const newToken = await refreshPromise;
    original.headers.Authorization = `Bearer ${newToken}`;
    return api(original);
  }
);

/**
 * Reemplaza el par de tokens de la sesión guardada, dejando el resto igual.
 *
 * Lo usa el cambio de contraseña: al cambiarla el backend cierra todas las
 * sesiones y devuelve un par nuevo para el dispositivo desde el que se hizo. Sin
 * guardarlo, la siguiente petición viajaría con el token viejo —ya del lado
 * muerto del corte— y al usuario lo echaría la app justo después de cambiarla.
 */
export function replaceSessionTokens({ access_token, refresh_token }) {
  const session = getSession();
  if (!session) return;
  saveSession({ ...session, token: access_token, refresh_token });
}

// ── Este módulo es el dueño de los tokens ────────────────────────────────────
// Los renueva el interceptor de arriba, en cualquier momento y sin avisarle a
// React. Por eso el estado de React NO puede ser la fuente de los tokens: entre
// que se lee y se vuelve a escribir puede haber pasado una renovación, y el
// escritor de React devolvería el par viejo a localStorage. El refresh siguiente
// viajaría con un refresh_token cuyo `sid` el backend ya revocó al rotarlo, y al
// usuario lo echaría a la pantalla de acceso en mitad de lo que estuviera
// haciendo. Las dos funciones de acá abajo son el contrato con AppContext:
// React guarda el PERFIL, este módulo guarda los TOKENS.

/**
 * Los tokens vigentes en este instante, leídos de localStorage.
 *
 * @returns {{token: string, refresh_token: string} | null} El par vigente, o
 *   null si no hay sesión.
 */
export function readSessionTokens() {
  const session = getSession();
  if (!session?.token) return null;
  return { token: session.token, refresh_token: session.refresh_token };
}

/**
 * Estrena el par de tokens de una sesión nueva (inicio de sesión, registro).
 *
 * Se llama ANTES de guardar el perfil en React, para que el perfil se escriba ya
 * sobre los tokens buenos. A diferencia de `replaceSessionTokens`, no exige que
 * exista una sesión previa.
 *
 * @param {{access_token: string, refresh_token: string}} par Tokens recién
 *   emitidos por el backend.
 */
export function startSession({ access_token, refresh_token }) {
  saveSession({ ...(getSession() || {}), token: access_token, refresh_token });
}

export default api;
