import React from 'react';
import { useAuth } from '../hooks/AuthProvider';

export default function PermissionGate({ 
  perm, 
  children, 
  fallback = null, 
  hint = 'View-only: missing permission' 
}) {
  const { permissions = [] } = useAuth();
  const allowed = permissions.includes(perm);

  if (allowed) return children;

  if (fallback !== null) return fallback;

  // Subtle inline hint when no fallback is provided
  return (
    <span 
      className="text-xs select-none" 
      style={{ 
        color: 'var(--md-on-surface-variant)',
        opacity: 0.6
      }}
      title={hint} 
      data-cy={`hint-${perm.replace(/:/g, '-')}`}
    >
      {/* Reserved space to reduce layout shift */}
    </span>
  );
}
