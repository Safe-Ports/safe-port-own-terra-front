import useEscapeKey from "@/hooks/useEscapeKey";

const ICON_LABELS = {
  "🔍": "SE",
  "👤": "CL",
  "💳": "PG",
  "👁": "PV",
  "🖨": "RP",
  "📁": "DC",
  "📄": "CT",
  "▦": "LT",
};

function Modal({
  open,
  title,
  subtitle,
  icon,
  onClose,
  width = "max-w-[560px]",
  children,
  footer,
  overlayClassName = "",
}) {
  useEscapeKey(onClose, open);

  if (!open) return null;
  const visualIcon = typeof icon === "string" ? ICON_LABELS[icon] || icon : icon;

  return (
    <div className={`modal-overlay open ${overlayClassName}`.trim()} onClick={onClose}>
      <div
        className={`modal-box ${width}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-hd">
          <div className="modal-ico">{visualIcon}</div>
          <div>
            <div className="modal-title">{title}</div>
            {subtitle ? <div className="modal-sub">{subtitle}</div> : null}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export default Modal;
