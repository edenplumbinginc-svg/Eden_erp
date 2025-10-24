import React from 'react';
import { useAuth } from '../hooks/AuthProvider';

const ROLE_LABELS = {
  admin: 'Admin',
  operations: 'Operations',
  contributor: 'Contributor',
  viewer: 'Viewer',
  coord: 'Coordinator',
  estimator: 'Estimator',
  procurement: 'Procurement',
  pm: 'Project Manager',
  tech: 'Technician',
  hr: 'HR'
};

const ROLE_COLORS = {
  admin: '#ef4444',
  operations: '#f59e0b',
  contributor: '#10b981',
  viewer: '#3b82f6',
  coord: '#8b5cf6',
  estimator: '#ec4899',
  procurement: '#14b8a6',
  pm: '#f97316',
  tech: '#06b6d4',
  hr: '#a855f7'
};

export default function RoleBadge() {
  const { roles = [] } = useAuth();
  const primaryRole = roles[0] || 'viewer';
  const label = ROLE_LABELS[primaryRole] || primaryRole;
  const color = ROLE_COLORS[primaryRole] || '#3b82f6';

  return (
    <span
      title={`Signed in as ${label}`}
      className="inline-flex items-center gap-2"
      style={{
        padding: '4px 12px',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--md-divider)',
        backgroundColor: 'var(--md-surface-variant)',
        fontSize: '12px',
        fontWeight: 500,
        letterSpacing: '0.3px',
        opacity: 0.9
      }}
      data-cy="role-badge"
    >
      <span
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: color
        }}
      />
      {label}
    </span>
  );
}
