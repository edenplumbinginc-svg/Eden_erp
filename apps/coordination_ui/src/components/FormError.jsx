import React from 'react';

export default function FormError({ error, className = '' }) {
  if (!error) return null;

  return (
    <div className={`text-caption text-red-600 mt-1 flex items-center gap-1 ${className}`}>
      <span>⚠️</span>
      <span>{error}</span>
    </div>
  );
}

export function FormField({ label, error, required = false, children, className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-caption text-muted">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}
      {children}
      <FormError error={error} />
    </div>
  );
}
