import { useState } from "react";
import { HiExclamationCircle, HiExclamationTriangle, HiXMark } from "react-icons/hi2";
import { errorClipboardText } from "@/errors/parseApiError";
import { useLocale } from "@/i18n";

/** Persistent contextual feedback that stays within the form or page. */
function InlineError({ error, onDismiss, children }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLocale();

  if (!error) return null;

  const severity = error.severity || "error";
  const Icon = severity === "warning" ? HiExclamationTriangle : HiExclamationCircle;
  const label = severity === "fatal"
    ? t("feedback.criticalError")
    : severity === "warning"
      ? t("feedback.warningLabel")
      : t("feedback.error");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(errorClipboardText(error));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="ie-card" data-severity={severity} role="alert" aria-live="assertive" onClick={(e) => e.stopPropagation()}>
      <div className="ie-head">
        <span className="ie-icon" aria-hidden="true"><Icon /></span>
        <div className="ie-body">
          <div className="ie-title">{label}</div>
          <div className="ie-msg">{error.message}</div>
          {error.action && <div className="ie-action">{error.action}</div>}
          {children}
        </div>
        {onDismiss && (
          <button type="button" className="ie-close" onClick={onDismiss} aria-label={t("feedback.close")}>
            <HiXMark />
          </button>
        )}
      </div>
      {error.code && (
        <div className="ie-meta">
          <div className="ie-support">{t("feedback.supportReference")}</div>
          <div className="ie-reference-row">
            <span className="ie-codes">{error.code}{error.requestId ? ` · ${error.requestId}` : ""}</span>
            <button type="button" className="ie-copy" onClick={copy}>
              {copied ? t("feedback.copied") : t("feedback.copy")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default InlineError;
