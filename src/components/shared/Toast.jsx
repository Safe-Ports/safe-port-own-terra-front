import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { errorClipboardText } from "@/errors/parseApiError";

function ErrorToast({ data }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(errorClipboardText(data));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard no disponible: el usuario puede copiar manualmente */
    }
  };

  const severity = data.severity || "error";
  const ICON = { fatal: "✕", error: "⚠", warning: "!" };

  return (
    <div className="app-toast app-toast--error" data-severity={severity} role="alert">
      <div className="error-toast__title">{ICON[severity] ?? "⚠"} {data.title}</div>
      <div className="error-toast__msg">{data.message}</div>
      {data.action ? <div className="error-toast__action">{data.action}</div> : null}
      <div className="error-toast__meta">
        <span className="error-toast__codes">
          {data.code}{data.requestId ? ` · ${data.requestId}` : ""}
        </span>
        <button type="button" className="error-toast__copy" onClick={copy}>
          {copied ? "¡Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

function Toast() {
  const { toast } = useAppContext();

  if (!toast) return null;

  // Toast enriquecido de error (showError) vs. toast de texto plano (showToast).
  if (typeof toast === "object" && toast.kind === "error") {
    return <ErrorToast data={toast} />;
  }

  return <div className="app-toast app-toast--success">{toast}</div>;
}

export default Toast;
