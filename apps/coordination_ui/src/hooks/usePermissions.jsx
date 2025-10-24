import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthProvider';

/**
 * Hook to check if current user has a specific permission
 * @param {string} permission - Permission code to check (e.g., 'task.delete', 'project.create')
 * @returns {boolean} - Whether user has the permission
 */
export function useHasPermission(permission) {
  const [hasPermission, setHasPermission] = useState(false);
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) {
      setHasPermission(false);
      return;
    }

    const loadPermissions = async () => {
      try {
        const response = await api.get('/me/permissions');
        const userPermissions = response.data?.permissions || [];
        setHasPermission(userPermissions.includes(permission));
      } catch (err) {
        console.error('Failed to load permissions:', err);
        setHasPermission(false);
      }
    };

    loadPermissions();
  }, [permission, user]);

  return hasPermission;
}

/**
 * Hook to get all roles and permissions for current user
 * @returns {{ roles: string[], permissions: Set, loading: boolean }} - User's roles and permissions
 */
export function usePermissions() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    const loadPermissions = async () => {
      try {
        const response = await api.get('/me/permissions');
        setRoles(response.data?.roles || []);
        setPermissions(new Set(response.data?.permissions || []));
      } catch (err) {
        console.error('Failed to load permissions:', err);
        setRoles([]);
        setPermissions(new Set());
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [user]);

  return { roles, permissions, loading };
}

/**
 * Component wrapper that only renders children if user has permission
 * @param {Object} props
 * @param {string} props.permission - Permission code required
 * @param {React.ReactNode} props.children - Content to render if has permission
 * @param {React.ReactNode} props.fallback - Content to render if no permission (optional)
 */
export function PermissionGate({ permission, children, fallback = null }) {
  const hasPermission = useHasPermission(permission);
  
  return hasPermission ? children : fallback;
}

/**
 * Higher-order component to require permission for a component
 * @param {React.Component} Component - Component to wrap
 * @param {string} permission - Permission required
 * @param {React.Component} FallbackComponent - Component to show if no permission
 */
export function withPermission(Component, permission, FallbackComponent = null) {
  return function PermissionWrapper(props) {
    const hasPermission = useHasPermission(permission);
    
    if (!hasPermission) {
      return FallbackComponent ? <FallbackComponent {...props} /> : null;
    }
    
    return <Component {...props} />;
  };
}
