import { useState } from "react";
import { HiCheckCircle, HiExclamationCircle, HiExclamationTriangle, HiInformationCircle, HiXMark } from "react-icons/hi2";
import { useAppContext } from "@/context/AppContext";
import { errorClipboardText } from "@/errors/parseApiError";
import useEscapeKey from "@/hooks/useEscapeKey";
import { useLocale } from "@/i18n";

const TOAST_VARIANTS = {
  success: { titleKey: "feedback.success", Icon: HiCheckCircle },
  warning: { titleKey: "feedback.warning", Icon: HiExclamationTriangle },
  error: { titleKey: "feedback.error", Icon: HiExclamationCircle },
  info: { titleKey: "feedback.info", Icon: HiInformationCircle },
};

function ErrorToast({ data }) {
  const [copied, setCopied] = useState(false);
  const { dismissToast } = useAppContext();
  const { t } = useLocale();
  const severity = data.severity || "error";
  const Icon = severity === "warning" ? HiExclamationTriangle : HiExclamationCircle;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(errorClipboardText(data));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="app-toast app-toast--error" data-severity={severity} role="alert" aria-live="assertive">
      <span className="app-toast__icon" aria-hidden="true"><Icon /></span>
      <div className="app-toast__content">
        <strong className="app-toast__title">{data.title}</strong>
        <span className="app-toast__message">{data.message}</span>
        {data.action ? <span className="error-toast__action">{data.action}</span> : null}
        <div className="error-toast__meta">
          <span className="error-toast__codes">{data.code}{data.requestId ? ` · ${data.requestId}` : ""}</span>
          <button type="button" className="error-toast__copy" onClick={copy}>{copied ? t("feedback.copied") : t("feedback.copy")}</button>
        </div>
      </div>
      <button type="button" className="app-toast__close" onClick={dismissToast} aria-label={t("feedback.close")}><HiXMark /></button>
    </div>
  );
}

function Toast() {
  const { toast, dismissToast } = useAppContext();
  const { t } = useLocale();
  useEscapeKey(dismissToast, Boolean(toast));

  if (!toast) return null;
  if (typeof toast === "object" && toast.kind === "error" && toast.code) return <ErrorToast data={toast} />;

  const data = typeof toast === "object" ? toast : { kind: "success", message: toast };
  const variant = TOAST_VARIANTS[data.kind] || TOAST_VARIANTS.info;
  const { Icon } = variant;
  const isAlert = data.kind === "warning" || data.kind === "error";
  return (
    <div className={`app-toast app-toast--${data.kind || "info"}`} role={isAlert ? "alert" : "status"} aria-live={isAlert ? "assertive" : "polite"}>
      <span className="app-toast__icon" aria-hidden="true"><Icon /></span>
      <span className="app-toast__content">
        <strong className="app-toast__title">{data.title || t(variant.titleKey)}</strong>
        <span className="app-toast__message">{data.message}</span>
      </span>
      <button type="button" className="app-toast__close" onClick={dismissToast} aria-label={t("feedback.close")}><HiXMark /></button>
    </div>
  );
}

export default Toast;
