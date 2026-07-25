import { useState } from "react";
import {
  HiCheckCircle,
  HiExclamationCircle,
  HiExclamationTriangle,
  HiInformationCircle,
  HiXMark,
} from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { errorClipboardText } from "@/errors/parseApiError";
import useEscapeKey from "@/hooks/useEscapeKey";

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
  const { dismissToast } = useAppContext();

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
  const Icon = severity === "warning" ? HiExclamationTriangle : HiExclamationCircle;

  return (
    <div className="app-toast app-toast--error" data-severity={severity} role="alert" aria-live="assertive">
      <span className="app-toast__icon" aria-hidden="true"><Icon /></span>
      <div className="app-toast__content">
        <strong className="app-toast__title">{data.title}</strong>
        <span className="app-toast__message">{data.message}</span>
        {data.action ? <span className="error-toast__action">{data.action}</span> : null}
        <div className="error-toast__meta">
          <span className="error-toast__codes">
            {data.code}{data.requestId ? ` · ${data.requestId}` : ""}
          </span>
          <button type="button" className="error-toast__copy" onClick={copy}>
            {copied ? "¡Copiado!" : "Copiar"}
          </button>
        </div>
      </div>
      <button type="button" className="app-toast__close" onClick={dismissToast} aria-label="Cerrar mensaje">
        <HiXMark />
      </button>
    </div>
  );
}

function Toast() {
  const { toast, dismissToast } = useAppContext();
  useEscapeKey(dismissToast, Boolean(toast));

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
      <button type="button" className="app-toast__close" onClick={dismissToast} aria-label="Cerrar mensaje">
        <HiXMark />
      </button>
    </div>
  );
}

export default Toast;
