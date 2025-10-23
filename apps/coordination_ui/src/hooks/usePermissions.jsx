import { useState, useEffect } from 'react';
import { devAuth } from '../services/api';

// Mock permission data for each role (will be replaced with real API call later)
const ROLE_PERMISSIONS = {
  'admin@edenplumbing.com': [
    'projects:read', 'projects:write', 'project.view', 'project.create', 'project.edit', 'project.delete',
    'tasks:read', 'tasks:write', 'task.view', 'task.create', 'task.edit', 'task.delete',
    'task.comment', 'comments:read', 'comments:write'
  ],
  'test@edenplumbing.com': [
    'tasks:read', 'tasks:write', 'task.view', 'task.create', 'task.edit',
    'task.comment', 'comments:read', 'comments:write', 'project.view'
  ],
  'contributor@edenplumbing.com': [
    'task.view', 'task.create', 'task.edit', 'task.comment',
    'comments:read', 'comments:write', 'project.view'
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
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  
  useEffect(() => {
    // Get current dev user from devAuth
    const currentUser = devAuth.getCurrentUser();
    const userEmail = currentUser?.email || '';
    setCurrentUserEmail(userEmail);
    
    if (!userEmail) {
      setHasPermission(false);
      return;
    }

    // Check if user has permission
    const userPermissions = ROLE_PERMISSIONS[userEmail] || [];
    setHasPermission(userPermissions.includes(permission));
    
    // Listen for user changes (custom event fired by DevAuthSwitcher)
    const handleUserChange = () => {
      const updatedUser = devAuth.getCurrentUser();
      const updatedEmail = updatedUser?.email || '';
      setCurrentUserEmail(updatedEmail);
      
      const updatedPermissions = ROLE_PERMISSIONS[updatedEmail] || [];
      setHasPermission(updatedPermissions.includes(permission));
    };
    
    window.addEventListener('dev-user-changed', handleUserChange);
    return () => window.removeEventListener('dev-user-changed', handleUserChange);
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
    // Get current dev user from devAuth
    const currentUser = devAuth.getCurrentUser();
    const userEmail = currentUser?.email || '';
    
    if (!userEmail) {
      setPermissions([]);
      return;
    }

    const userPermissions = ROLE_PERMISSIONS[userEmail] || [];
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
