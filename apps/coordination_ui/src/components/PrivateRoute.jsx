import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

export default function PrivateRoute({ children }) {
  const { roles, permissions, loading } = usePermissions();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="loading" style={{ fontSize: '16px', color: 'var(--md-on-surface-variant)' }}>
            Loading permissions...
          </div>
        </div>
      </div>
    );
  }
  
  const hasAccess = roles.length > 0 || permissions.size > 0;
  
  return hasAccess ? children : <Navigate to="/login" replace />;
}
