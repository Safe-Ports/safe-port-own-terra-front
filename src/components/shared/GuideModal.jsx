import { createPortal } from "react-dom";
import useEscapeKey from "@/hooks/useEscapeKey";
import { useLocale } from "@/i18n";

export default function GuideModal({ open, onClose, title, subtitle, steps }) {
  const { t } = useLocale();
  useEscapeKey(onClose, open);

  if (!open) return null;
  return createPortal(
    <div className="guide-overlay" onClick={onClose}>
      <div
        className="guide-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="guide-head">
          <div className="guide-icon">?</div>
          <div className="guide-head-text">
            <div className="guide-title">{title}</div>
            {subtitle && <div className="guide-sub">{subtitle}</div>}
          </div>
          <button className="guide-close-x" onClick={onClose} aria-label={t("common.close")}>×</button>
        </div>
        <div className="guide-body">
          {steps.map(({ title: t, text }, i) => (
            <div key={i} className="guide-step">
              <div className="guide-step-num">{i + 1}</div>
              <div className="guide-step-content">
                <div className="guide-step-title">{t}</div>
                <div className="guide-step-text">{text}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="guide-foot">
          <button className="guide-ok" onClick={onClose}>{t("common.understood")}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
