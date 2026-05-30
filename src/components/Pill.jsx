import React from 'react';

export default function Pill({ children, active = false, className = '', onClick }) {
  return (
    <button className={`pv2-pill ${active ? 'act' : ''} ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}
