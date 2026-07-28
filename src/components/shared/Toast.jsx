import { useState } from "react";
import { HiCheckCircle, HiExclamationCircle, HiExclamationTriangle, HiInformationCircle } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { errorClipboardText } from "@/errors/parseApiError";
import { useLocale } from "@/i18n";

const TOAST_VARIANTS = {
  success: { titleKey: "feedback.success", Icon: HiCheckCircle },
  warning: { titleKey: "feedback.warning", Icon: HiExclamationTriangle },
  error: { titleKey: "feedback.error", Icon: HiExclamationCircle },
  info: { titleKey: "feedback.info", Icon: HiInformationCircle },
};

function ErrorToast({ data }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLocale();
  const severity = data.severity || "error";
  const ICON = { fatal: "✕", error: "⚠", warning: "!" };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(errorClipboardText(data));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard no disponible */ }
  };

  return (
    <div className="app-toast app-toast--error" data-severity={severity} role="alert" aria-live="assertive">
      <div className="error-toast__title">{ICON[severity] ?? "⚠"} {data.title}</div>
      <div className="error-toast__msg">{data.message}</div>
      {data.action ? <div className="error-toast__action">{data.action}</div> : null}
      <div className="error-toast__meta">
        <span className="error-toast__codes">{data.code}{data.requestId ? ` · ${data.requestId}` : ""}</span>
        <button type="button" className="error-toast__copy" onClick={copy}>{copied ? t("feedback.copied") : t("feedback.copy")}</button>
      </div>
    </div>
  );
}

function Toast() {
  const { toast } = useAppContext();
  const { t } = useLocale();
  if (!toast) return null;
  if (typeof toast === "object" && toast.kind === "error" && toast.code) return <ErrorToast data={toast} />;

  const data = typeof toast === "object" ? toast : { kind: "success", message: toast };
  const variant = TOAST_VARIANTS[data.kind] || TOAST_VARIANTS.info;
  const { Icon } = variant;
  return (
    <div className={`app-toast app-toast--${data.kind || "info"}`} role={data.kind === "warning" || data.kind === "error" ? "alert" : "status"} aria-live={data.kind === "warning" || data.kind === "error" ? "assertive" : "polite"}>
      <span className="app-toast__icon" aria-hidden="true"><Icon /></span>
      <span className="app-toast__content">
        <strong className="app-toast__title">{data.title || t(variant.titleKey)}</strong>
        <span className="app-toast__message">{data.message}</span>
      </span>
    </div>
  );
}

export default Toast;
