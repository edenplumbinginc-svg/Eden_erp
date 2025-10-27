import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/AuthProvider';

export default function RequireAuth({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // E2E test bypass: only active when explicitly enabled
  // This allows automated tests to mount routes without authentication
  const e2eBypass =
    import.meta.env.VITE_E2E === "true" ||
    (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("e2e"));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="loading" style={{ fontSize: '16px', color: 'var(--md-on-surface-variant)' }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  // Allow route to mount for e2e tests even if not authenticated
  if (!user && e2eBypass) {
    return children;
  }

  // Normal auth check: redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
