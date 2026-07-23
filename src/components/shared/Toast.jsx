import { useState } from "react";
import {
  HiCheckCircle,
  HiExclamationTriangle,
  HiInformationCircle,
} from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { errorClipboardText } from "@/errors/parseApiError";

const TOAST_VARIANTS = {
  success: {
    title: "Listo",
    Icon: HiCheckCircle,
  },
  warning: {
    title: "Atención",
    Icon: HiExclamationTriangle,
  },
  info: {
    title: "Información",
    Icon: HiInformationCircle,
  },
};

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

  const data = typeof toast === "object"
    ? toast
    : { kind: "success", message: toast };
  const variant = TOAST_VARIANTS[data.kind] || TOAST_VARIANTS.info;
  const { Icon } = variant;

  return (
    <div
      className={`app-toast app-toast--${data.kind || "info"}`}
      role={data.kind === "warning" ? "alert" : "status"}
      aria-live={data.kind === "warning" ? "assertive" : "polite"}
    >
      <span className="app-toast__icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="app-toast__content">
        <strong className="app-toast__title">{data.title || variant.title}</strong>
        <span className="app-toast__message">{data.message}</span>
      </span>
    </div>
  );
}

export default Toast;
