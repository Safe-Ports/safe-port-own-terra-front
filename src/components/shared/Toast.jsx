import { useState } from "react";
import { createPortal } from "react-dom";
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
  const [open, setOpen] = useState(false);

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
  const ICON = { fatal: "✕", error: "!", warning: "!" };
  // Encabezado = mensaje general; el detalle informativo va dentro de "Detalles".
  const headline = data.title || data.message || "Ocurrió un error";
  const detailMsg = data.message && data.message !== headline ? data.message : null;

  return (
    <div className="app-toast app-toast--error" data-severity={severity} role="alert">
      <div className="etoast-row">
        <span className="etoast-ico" aria-hidden="true">{ICON[severity] ?? "!"}</span>
        <span className="etoast-headline">{headline}</span>
        <button
          type="button"
          className="etoast-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          Detalles <span className={`etoast-chev ${open ? "up" : ""}`} aria-hidden="true">▾</span>
        </button>
      </div>

      {open && (
        <div className="etoast-more">
          {detailMsg ? <div className="etoast-detail">{detailMsg}</div> : null}
          {data.action ? <div className="etoast-detail etoast-action">{data.action}</div> : null}
          <div className="etoast-meta">
            <span className="etoast-codes">
              {data.code}{data.requestId ? ` · ${data.requestId}` : ""}
            </span>
            <button type="button" className="etoast-copy" onClick={copy}>
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Toast() {
  const { toast } = useAppContext();

  if (!toast || typeof document === "undefined") return null;

  // `.eco-root` es `position:fixed` con su propio z-index: eso abre un
  // contexto de apilamiento propio. Un toast montado ahí queda atrapado
  // dentro de ese contexto — su z-index (por alto que sea) nunca puede
  // ganarle a un modal, que se porta aparte a `document.body` y por lo
  // tanto vive en OTRO contexto de apilamiento montado después. El síntoma:
  // el toast de error de un formulario en un modal quedaba tapado por el
  // propio modal. Portar el toast también a `document.body`, fuera de
  // `.eco-root`, lo saca de esa trampa.
  // Toast enriquecido de error (showError) vs. toast de texto plano (showToast).
  if (typeof toast === "object" && toast.kind === "error") {
    return createPortal(<ErrorToast data={toast} />, document.body);
  }

  const data = typeof toast === "object"
    ? toast
    : { kind: "success", message: toast };
  const variant = TOAST_VARIANTS[data.kind] || TOAST_VARIANTS.info;
  const { Icon } = variant;

  return createPortal(
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
    </div>,
    document.body
  );
}

export default Toast;
