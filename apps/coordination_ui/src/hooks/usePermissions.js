import { useState, useEffect } from 'react';
import { api } from '../services/api';

// Mock permission data for each role (will be replaced with real API call later)
const ROLE_PERMISSIONS = {
  'admin@edenplumbing.com': [
    'projects:read', 'projects:write', 'project.view', 'project.create', 'project.edit', 'project.delete',
    'tasks:read', 'tasks:write', 'task.view', 'task.create', 'task.edit', 'task.delete',
    'task.comment', 'comments:read', 'comments:write'
  ],
  'test@edenplumbing.com': [
    'tasks:read', 'tasks:write', 'task.view', 'task.create', 'task.edit',
    'task.comment', 'comments:read', 'comments:write'
  ],
  'contributor@edenplumbing.com': [
    'task.view', 'task.create', 'task.edit', 'task.comment',
    'comments:read', 'comments:write'
  ],
  'viewer@edenplumbing.com': [
    'tasks:read', 'task.view', 'project.view', 'comments:read'
  ]
};

/**
 * Hook to check if current user has a specific permission
 * @param {string} permission - Permission code to check (e.g., 'task.delete', 'project.create')
 * @returns {boolean} - Whether user has the permission
 */
export function useHasPermission(permission) {
  const [hasPermission, setHasPermission] = useState(false);
  
  useEffect(() => {
    // Get current dev user from api.js
    const currentUser = api.defaults.headers['X-Dev-User-Email'];
    
    if (!currentUser) {
      setHasPermission(false);
      return;
    }

    // Check if user has permission
    const userPermissions = ROLE_PERMISSIONS[currentUser] || [];
    setHasPermission(userPermissions.includes(permission));
  }, [permission]);

  return hasPermission;
}

/**
 * Hook to get all permissions for current user
 * @returns {string[]} - Array of permission codes
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    // Get current dev user from api.js
    const currentUser = api.defaults.headers['X-Dev-User-Email'];
    
    if (!currentUser) {
      setPermissions([]);
      return;
    }

    const userPermissions = ROLE_PERMISSIONS[currentUser] || [];
    setPermissions(userPermissions);
  }, []);

  return permissions;
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
