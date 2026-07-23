import React from 'react';
import useEscapeKey from "@/hooks/useEscapeKey";

export default function Modal({ title, children, footer, onClose }) {
  useEscapeKey(onClose);

  return (
    <div className="modal-backdrop">
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-hd">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-ft">{footer}</div>}
      </div>
    </div>
  );
}
