import React from 'react';

export default function Badge({ children, className = '' }) {
  return (
    <span className={`pf-pill ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {children}
    </span>
  );
}
