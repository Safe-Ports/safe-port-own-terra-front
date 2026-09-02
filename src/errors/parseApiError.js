// Normaliza cualquier error (axios u otro) a un modelo común basado en el catálogo.
import { getErrorMeta, getErrorTitle, FALLBACK_CODE, NET_CODE } from "./catalog.js";

/** Ref local para fallos que nunca llegaron al backend (red, crash de cliente). */
export function localRef() {
  const rand = Math.random().toString(16).slice(2, 14).padEnd(12, "0");
  return `ref_local_${rand}`;
}

// Mapa de status HTTP -> código del catálogo cuando la respuesta NO trae nuestro envelope.
const STATUS_TO_CODE = {
  400: "OT-SYS-1000",
  401: "OT-AUTH-2010",
  403: "OT-AUTH-2003",
  404: "OT-SYS-3000",
  409: "OT-SYS-1000",
  413: "OT-DOC-1010",
  422: "OT-SYS-1000",
  429: "OT-SYS-4000",
  500: "OT-SYS-9000",
  502: "OT-SYS-9001",
  503: "OT-SYS-9001",
};

/**
 * @returns {{
 *   code: string, title: string, message: string, action: string,
 *   requestId: (string|null), httpStatus: (number|null), severity: string,
 *   isLocalRef: boolean, details: Object
 * }}
 */
export function parseApiError(error, fallbackMessage) {
  const response = error?.response;
  const status = response?.status ?? error?.status ?? null;
  const data = response?.data ?? error?.data ?? null;
  const headerRef = response?.headers?.["x-request-id"] || null;

  let code;
  let backendMessage = "";
  let requestId = null;
  let isLocalRef = false;
  // Los `details` del envelope (qué contratos bloquean, qué lote falló…) son lo
  // único que le permite a la pantalla decir algo accionable en vez de repetir
  // el mensaje genérico del catálogo.
  const details = data?.error?.details ?? {};

  if (data?.error?.code) {
    // Caso ideal: el backend ya respondió con nuestro envelope homologado.
    code = data.error.code;
    backendMessage = typeof data.error.message === "string" ? data.error.message : "";
    requestId = data.error.request_id || headerRef || null;
  } else if (!response) {
    // Sin respuesta: red caída, timeout, CORS.
    code = NET_CODE;
    // Reusa la Ref local que ya generó el interceptor (api.js) para que coincida con Sentry.
    requestId = error?.__refLocal || localRef();
    isLocalRef = true;
  } else {
    // Respuesta sin nuestro envelope (5xx crudo, proxy, etc.): mapear por status.
    code = STATUS_TO_CODE[status] || FALLBACK_CODE;
    requestId = headerRef || error?.__refLocal || localRef();
    isLocalRef = !headerRef;
  }

  const meta = getErrorMeta(code);
  return {
    code: meta.code,
    title: getErrorTitle(meta),
    // Preferimos el mensaje del backend (ya viene amigable y homologado); si no, el del catálogo.
    message: backendMessage || meta.message || fallbackMessage || "Ocurrió un error.",
    action: meta.action || "",
    requestId,
    httpStatus: status,
    severity: meta.severity,
    isLocalRef,
    details,
  };
}

/** Texto listo para copiar al ticket: "Código: OT-… · Ref: ref_…". */
export function errorClipboardText(parsed) {
  return `Código: ${parsed.code} · Ref: ${parsed.requestId ?? "—"}`;
}
