import { useState } from "react";
import { errorClipboardText } from "@/errors/parseApiError";
import useEscapeKey from "@/hooks/useEscapeKey";
import { useLocale } from "@/i18n";

const ICON = { fatal: "✕", error: "⚠", warning: "!" };
const BG = { fatal: "#fce4e0", error: "#fdecea", warning: "#fefbeb" };
const BD = { fatal: "#9b1212", error: "#c0392b", warning: "#b2760e" };
const CLR = { fatal: "#5E0A0A", error: "#7F1C10", warning: "#7A4F00" };

function InlineError({ error, onDismiss, children }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLocale();
  useEscapeKey(onDismiss, Boolean(error && onDismiss));

  if (!error) return null;

  const severity = error.severity || "error";
  const icon = ICON[severity] ?? "⚠";
  const bg = BG[severity] ?? BG.error;
  const bd = BD[severity] ?? BD.error;
  const clr = CLR[severity] ?? CLR.error;
  const label = severity === "fatal" ? t("feedback.criticalError") : severity === "warning" ? t("feedback.warningLabel") : t("feedback.error");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(errorClipboardText(error));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard no disponible */ }
  };

  const card = (
    <div className="ie-card" style={{ background: bg, border: `1.5px solid ${bd}`, color: clr }} onClick={(e) => e.stopPropagation()}>
      <div className="ie-head">
        <span className="ie-icon">{icon}</span>
        <div className="ie-body">
          {onDismiss && <div className="ie-title">{label}</div>}
          <div className="ie-msg">{error.message}</div>
          {error.action && <div className="ie-action">{error.action}</div>}
          {children}
        </div>
        {onDismiss && <button type="button" className="ie-close" onClick={onDismiss} aria-label={t("common.close")}>×</button>}
      </div>
      {error.code && (
        <div className="ie-meta" style={{ borderTopColor: `${bd}33` }}>
          <div className="ie-meta-left">
            <div className="ie-support">{t("feedback.supportReference")}</div>
            <span className="ie-codes">{error.code}{error.requestId ? ` · ${error.requestId}` : ""}</span>
          </div>
          <button type="button" className="ie-copy" style={{ borderColor: `${bd}44`, color: clr }} onClick={copy}>
            {copied ? t("feedback.copied") : t("feedback.copy")}
          </button>
        </div>
      )}
    </div>
  );

  if (onDismiss) return <div className="ie-backdrop" onClick={onDismiss}>{card}</div>;
  return <div className="lf-error" data-severity={severity} role="alert">{card}</div>;
}

export default InlineError;
