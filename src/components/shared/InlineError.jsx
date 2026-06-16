import { useState } from "react";
import { errorClipboardText } from "@/errors/parseApiError";

/**
 * Error homologado mostrado INLINE (no toast): mensaje + acción + `código · Ref` + Copiar.
 * Para formularios (login, registro) donde el error vive dentro del propio form.
 *
 * @param {{ error: {code,message,action,requestId}|null, children?: any }} props
 */
function InlineError({ error, children }) {
  const [copied, setCopied] = useState(false);
  if (!error) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(errorClipboardText(error));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard no disponible */
    }
  };

  const severity = error.severity || "error";

  return (
    <div className="lf-error" data-severity={severity} role="alert">
      <div>{error.message}</div>
      {error.action ? <div className="lf-error__action">{error.action}</div> : null}
      {children}
      {error.code ? (
        <div className="lf-error__meta">
          <span className="lf-error__codes">
            {error.code}{error.requestId ? ` · ${error.requestId}` : ""}
          </span>
          <button type="button" className="lf-error__copy" onClick={copy}>
            {copied ? "¡Copiado!" : "Copiar"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default InlineError;
