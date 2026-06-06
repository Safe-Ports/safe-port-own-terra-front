import React from 'react';

export default function Button({ children, variant = 'primary', size = 'md', className = '', disabled = false, ...props }) {
  const base = variant === 'primary' ? 'btn-p' : variant === 'secondary' ? 'btn-s' : variant === 'danger' ? 'btn-dan' : 'tb-btn';
  const sizes = {
    sm: 'py-1 px-3 text-sm',
    md: 'py-2 px-4',
    lg: 'py-3 px-5',
  };
  return (
    <button className={`${base} ${className}`} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
