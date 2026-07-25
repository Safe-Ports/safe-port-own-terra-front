import { useState } from "react";
import { HiExclamationCircle, HiExclamationTriangle, HiXMark } from "react-icons/hi2";
import { errorClipboardText } from "@/errors/parseApiError";

const LABEL = { fatal: "Error crítico", error: "Error", warning: "Advertencia" };

/**
 * Mensaje contextual persistente. Nunca abre una segunda capa encima del
 * formulario: los diálogos se reservan para decisiones, no para feedback.
 */
function InlineError({ error, onDismiss, children }) {
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const severity = error.severity || "error";
  const Icon = severity === "warning" ? HiExclamationTriangle : HiExclamationCircle;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(errorClipboardText(error));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* no disponible */ }
  };

  return (
    <div
      className="ie-card"
      data-severity={severity}
      role="alert"
      aria-live="assertive"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="ie-head">
        <span className="ie-icon" aria-hidden="true"><Icon /></span>
        <div className="ie-body">
          <div className="ie-title">{LABEL[severity] ?? "Error"}</div>
          <div className="ie-msg">{error.message}</div>
          {error.action && <div className="ie-action">{error.action}</div>}
          {children}
        </div>
        {onDismiss && (
          <button type="button" className="ie-close" onClick={onDismiss} aria-label="Cerrar mensaje">
            <HiXMark />
          </button>
        )}
      </div>
      {error.code && (
        <div className="ie-meta">
          <div className="ie-support">Si no se soluciona, contacta a soporte con este código de referencia</div>
          <div className="ie-reference-row">
            <span className="ie-codes">{error.code}{error.requestId ? ` · ${error.requestId}` : ""}</span>
            <button type="button" className="ie-copy" onClick={copy}>
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default InlineError;
