import { createPortal } from "react-dom";
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

  // El modal se saca del árbol de la página: cualquier ancestro con
  // position/z-index, transform, filter u overflow abre un contexto de
  // apilamiento y lo atrapa por debajo del topbar, pida el z-index que pida
  // (ver la regla de z-index en AGENTS.md).
  //
  // El destino es la raíz del layout (`.eco-root` / `.app-shell`), no <body>:
  // ahí viven las variables de tema y ~890 reglas escritas como
  // `.eco-root .algo`, que dejarían de aplicar si el modal colgara de <body>.
  // Esa raíz ya está fuera de `.content`, que es el contenedor que atrapaba.
  const host =
    (typeof document !== "undefined" && document.querySelector(".eco-root, .app-shell")) ||
    (typeof document !== "undefined" ? document.body : null);
  if (!host) return null;

  return createPortal(
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
    </div>,
    host,
  );
}

export default Modal;
