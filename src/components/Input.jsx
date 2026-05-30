import React from 'react';

export default function Input({ value, onChange, placeholder, type = 'text', className = '', ...props }) {
  return (
    <input
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      type={type}
      className={`mobile-input ${className}`}
      {...props}
    />
  );
}
