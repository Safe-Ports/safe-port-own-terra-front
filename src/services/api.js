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
      Sentry.captureException(error, {
        level,
        tags: { source: "api", kind, code, request_id: requestId },
        extra: {
          method: error.config?.method?.toUpperCase(),
          url: error.config?.url,
          status: status ?? null,
          responseData: error.response?.data ?? null,
        },
      });
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

export default api;
