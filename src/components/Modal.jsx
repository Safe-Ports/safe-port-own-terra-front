import React from 'react';

export default function Modal({ title, children, footer, onClose }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-hd">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-ft">{footer}</div>}
      </div>
    </div>
  );
}
