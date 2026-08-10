import { useState } from "react";
import { errorClipboardText } from "@/errors/parseApiError";
import useEscapeKey from "@/hooks/useEscapeKey";

const ICON   = { fatal: "✕", error: "!", warning: "!" };
const LABEL  = { fatal: "Error crítico", error: "Error", warning: "Advertencia" };
// Estilo elegante = superficie neutra; la severidad la lleva SOLO el chip del ícono
// (igual que el toast nuevo). accent = color del glifo, chip = fondo suave.
const ACCENT = { fatal: "var(--danger)", error: "var(--danger)", warning: "#b0791f" };
const CHIP   = { fatal: "#FBE7E4", error: "#FBE7E4", warning: "#FBF0DC" };

/**
 * Sin onDismiss → bloque inline (LoginScreen).
 * Con onDismiss → tarjeta flotante centrada sobre todo (modales, formularios).
 */
function InlineError({ error, onDismiss, children }) {
  const [copied, setCopied] = useState(false);
  useEscapeKey(onDismiss, Boolean(error && onDismiss));

  if (!error) return null;

  const severity = error.severity || "error";
  const icon   = ICON[severity]   ?? "!";
  const accent = ACCENT[severity] ?? ACCENT.error;
  const chip   = CHIP[severity]   ?? CHIP.error;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(errorClipboardText(error));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* no disponible */ }
  };

  const card = (
    <div className="ie-card" onClick={(e) => e.stopPropagation()}>
      <div className="ie-head">
        <span className="ie-icon" style={{ background: chip, color: accent }} aria-hidden="true">{icon}</span>
        <div className="ie-body">
          {onDismiss && <div className="ie-title">{LABEL[severity] ?? "Error"}</div>}
          <div className="ie-msg">{error.message}</div>
          {error.action && <div className="ie-action">{error.action}</div>}
          {children}
        </div>
        {onDismiss && (
          <button type="button" className="ie-close" onClick={onDismiss} aria-label="Cerrar">×</button>
        )}
      </div>
      {error.code && (
        <div className="ie-meta">
          <div className="ie-meta-left">
            <div className="ie-support">Si no se soluciona, contacta a soporte con este código de referencia</div>
            <span className="ie-codes">{error.code}{error.requestId ? ` · ${error.requestId}` : ""}</span>
          </div>
          <button type="button" className="ie-copy" onClick={copy}>
            {copied ? "¡Copiado!" : "Copiar"}
          </button>
        </div>
      )}
    </div>
  );

  if (onDismiss) {
    return (
      <div className="ie-backdrop" onClick={onDismiss}>
        {card}
      </div>
    );
  }

  return <div className="lf-error" data-severity={severity} role="alert">{card}</div>;
}

export default InlineError;
