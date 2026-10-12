import { useRef } from "react";
import DialogPortal from "./DialogPortal";
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
  const box = useRef(null);
  const isSaving = () => Boolean(box.current?.querySelector('form[aria-busy="true"]'));
  const close = () => { if (!isSaving()) onClose?.(); };
  useEscapeKey(close, open);

  if (!open) return null;

  return (
    <DialogPortal className={`modal-overlay open ${overlayClassName}`.trim()} onClick={close}>
      <div
        ref={box}
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
          <button className="modal-close" onClick={close} aria-label="Cerrar">
            <HiXMark />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot" onClickCapture={event => {
          if (isSaving()) { event.preventDefault(); event.stopPropagation(); }
        }}>{footer}</div> : null}
      </div>
    </DialogPortal>
  );
}

export default Modal;
