import { HiXMark } from "react-icons/hi2";
import useEscapeKey from "@/hooks/useEscapeKey";

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
          <div className="modal-ico">{icon}</div>
          <div>
            <div className="modal-title">{title}</div>
            {subtitle ? <div className="modal-sub">{subtitle}</div> : null}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            <HiXMark />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export default Modal;
