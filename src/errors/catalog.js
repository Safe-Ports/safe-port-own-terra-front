// Acceso al catálogo de errores homologado (copia generada del backend).
// Ver scripts/sync-errors.mjs y CATALOGO_ERRORES.md.
import { ERROR_CATALOG, CATALOG_VERSION } from "./catalog.generated.js";

export { ERROR_CATALOG, CATALOG_VERSION };

// Códigos transversales que el front usa como fallback.
export const FALLBACK_CODE = "OT-SYS-9000";
export const NET_CODE = "OT-NET-9001";
export const UI_CODE = "OT-UI-9001";

/**
 * Devuelve los metadatos de un código del catálogo.
 * Si el código es desconocido, cae a OT-SYS-9000 (nunca inventa nada).
 * @returns {{code:string, message:string, action:string, severity:string, http_status:(number|null), domain:string, name:string}}
 */
export function getErrorMeta(code) {
  const meta = ERROR_CATALOG[code] || ERROR_CATALOG[FALLBACK_CODE];
  const resolvedCode = ERROR_CATALOG[code] ? code : FALLBACK_CODE;
  return { code: resolvedCode, ...meta };
}

/** Título corto y amigable a partir de la severidad/dominio (para encabezar el toast/modal). */
export function getErrorTitle(meta) {
  switch (meta.severity) {
    case "fatal":
      return "Algo salió mal";
    case "error":
      return "No se pudo completar";
    default:
      return "Revisa esto";
  }
}
